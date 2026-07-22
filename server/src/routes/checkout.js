import { randomBytes } from 'node:crypto';
import { Agent as HttpsAgent } from 'node:https';
import express from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import { prisma } from '../db.js';
import { config } from '../config.js';

const stripe = config.stripeSecretKey ? new Stripe(config.stripeSecretKey, {
  httpAgent: new HttpsAgent({ keepAlive: true, family: 4 }),
  maxNetworkRetries: 2,
  timeout: 20_000,
}) : null;
const router = express.Router();

const sessionSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
    phone: z.string().trim().max(30).optional(),
  }),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(20),
  })).min(1).max(20),
}).superRefine(({ items }, ctx) => {
  const ids = new Set();
  for (const item of items) {
    if (ids.has(item.productId)) ctx.addIssue({ code: 'custom', message: 'Produit dupliqué dans le panier.', path: ['items'] });
    ids.add(item.productId);
  }
});

const makeOrderNumber = () => `CMD-${randomBytes(8).toString('hex').toUpperCase()}`;

async function createStripeCheckoutSession(params) {
  const body = new URLSearchParams();
  body.set('mode', params.mode);
  body.set('customer_email', params.customer_email);
  body.set('client_reference_id', params.client_reference_id);
  body.set('metadata[orderId]', params.metadata.orderId);
  body.set('success_url', params.success_url);
  body.set('cancel_url', params.cancel_url);
  body.set('expires_at', String(params.expires_at));
  params.line_items.forEach((item, index) => {
    const prefix = `line_items[${index}]`;
    body.set(`${prefix}[price_data][currency]`, item.price_data.currency);
    body.set(`${prefix}[price_data][product_data][name]`, item.price_data.product_data.name);
    body.set(`${prefix}[price_data][unit_amount]`, String(item.price_data.unit_amount));
    body.set(`${prefix}[quantity]`, String(item.quantity));
  });

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    signal: AbortSignal.timeout(20_000),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw Object.assign(new Error(payload?.error?.message || 'Stripe checkout creation failed.'), {
      type: payload?.error?.type,
      code: payload?.error?.code,
    });
  }
  return payload;
}

router.post('/session', async (req, res, next) => {
  let order;
  try {
    const data = sessionSchema.parse(req.body);
    if (!stripe) return res.status(503).json({ error: 'Stripe non configuré.' });

    const productIds = data.items.map((item) => item.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds }, isActive: true } });
    const productsById = new Map(products.map((product) => [product.id, product]));
    const normalized = data.items.map((item) => {
      const product = productsById.get(item.productId);
      if (!product) throw Object.assign(new Error('Produit invalide.'), { statusCode: 400 });
      if (item.quantity > product.stock) throw Object.assign(new Error('Stock insuffisant.'), { statusCode: 409 });
      return {
        productId: product.id,
        productNameSnapshot: product.name,
        unitPriceSnapshot: product.price,
        quantity: item.quantity,
        totalPrice: product.price * item.quantity,
      };
    });
    const subtotal = normalized.reduce((sum, item) => sum + item.totalPrice, 0);
    const shipping = 0;
    const total = subtotal + shipping;
    const [firstName, ...lastNameParts] = data.customer.name.split(/\s+/);

    const reservationExpiresAt = new Date(Date.now() + (65 * 60 * 1000));
    order = await prisma.$transaction(async (tx) => {
      for (const item of normalized) {
        const reserved = await tx.product.updateMany({
          where: { id: item.productId, isActive: true, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (reserved.count !== 1) throw Object.assign(new Error('Stock insuffisant.'), { status: 409 });
      }
      return tx.order.create({
        data: {
          orderNumber: makeOrderNumber(),
          email: data.customer.email,
          firstName,
          lastName: lastNameParts.join(' '),
          phone: data.customer.phone || '',
          status: 'PENDING',
          paymentStatus: 'PENDING',
          stockReservationStatus: 'RESERVED',
          reservationExpiresAt,
          subtotalAmount: subtotal,
          shippingAmount: shipping,
          totalAmount: total,
          orderItems: { create: normalized },
        },
        include: { orderItems: true },
      });
    });

    let session;
    try {
      session = await createStripeCheckoutSession({
        mode: 'payment',
        line_items: normalized.map((item) => ({
          price_data: {
            currency: 'eur',
            product_data: { name: item.productNameSnapshot },
            unit_amount: item.unitPriceSnapshot,
          },
          quantity: item.quantity,
        })),
        customer_email: data.customer.email,
        client_reference_id: order.id,
        metadata: { orderId: order.id },
        success_url: `${config.frontendUrl}/commande/succes?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${config.frontendUrl}/commande/annulee`,
        expires_at: Math.floor(Date.now() / 1000) + (60 * 60),
      });
    } catch (stripeError) {
      console.error('Stripe checkout creation failed', {
        type: stripeError?.type,
        code: stripeError?.code,
        message: stripeError?.message,
      });
      await prisma.$transaction((tx) => releaseReservation(tx, order.id, 'FAILED'));
      throw stripeError;
    }

    await prisma.order.update({ where: { id: order.id }, data: { stripeCheckoutSessionId: session.id } });
    return res.status(201).json({ url: session.url });
  } catch (error) {
    return next(error);
  }
});

router.get('/session/:sessionId', async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { stripeCheckoutSessionId: req.params.sessionId },
      select: { orderNumber: true, status: true, paymentStatus: true, totalAmount: true },
    });
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' });
    return res.json(order);
  } catch (error) {
    return next(error);
  }
});

async function releaseReservation(tx, orderId, paymentStatus = 'FAILED') {
  const order = await tx.order.findUnique({ where: { id: orderId }, include: { orderItems: true } });
  if (!order || order.stockReservationStatus !== 'RESERVED') return order;
  for (const item of order.orderItems) {
    if (item.productId) await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
  }
  return tx.order.update({
    where: { id: order.id },
    data: { stockReservationStatus: 'RELEASED', paymentStatus },
  });
}

async function markPaid(tx, session) {
  const orderId = session.metadata?.orderId || session.client_reference_id;
  if (!orderId) return;
  const order = await tx.order.findUnique({ where: { id: orderId }, include: { orderItems: true } });
  if (!order || order.paymentStatus === 'PAID') return;
  if (session.payment_status !== 'paid' || session.currency !== 'eur' || session.amount_total !== order.totalAmount) {
    throw new Error('Incohérence entre Stripe et la commande.');
  }
  if (order.stockReservationStatus !== 'RESERVED') {
    throw new Error('Réservation de stock indisponible lors du paiement.');
  }
  await tx.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: 'PAID',
      status: 'PROCESSING',
      stockReservationStatus: 'CONSUMED',
      stripePaymentIntentId: String(session.payment_intent || ''),
    },
  });
  await tx.auditLog.create({
    data: { action: 'order_paid', entityType: 'Order', entityId: order.id, metadata: { sessionId: session.id } },
  });
}

export async function releaseExpiredReservations(limit = 100) {
  const expired = await prisma.order.findMany({
    where: { stockReservationStatus: 'RESERVED', reservationExpiresAt: { lte: new Date() } },
    select: { id: true },
    orderBy: { reservationExpiresAt: 'asc' },
    take: limit,
  });
  for (const order of expired) {
    await prisma.$transaction((tx) => releaseReservation(tx, order.id, 'FAILED'));
  }
  return expired.length;
}

export async function stripeWebhookHandler(req, res) {
  if (!stripe || !config.stripeWebhookSecret) return res.status(503).send('Webhook not configured');
  const signature = req.headers['stripe-signature'];
  if (typeof signature !== 'string') return res.status(400).send('Missing Stripe signature');
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, config.stripeWebhookSecret);
  } catch {
    return res.status(400).send('Invalid Stripe signature');
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.stripeEvent.create({ data: { stripeEventId: event.id, type: event.type } });
      const session = event.data.object;
      if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
        await markPaid(tx, session);
      } else if (event.type === 'checkout.session.async_payment_failed' || event.type === 'checkout.session.expired') {
        const orderId = session.metadata?.orderId || session.client_reference_id;
        if (orderId) await releaseReservation(tx, orderId, 'FAILED');
      }
    });
  } catch (error) {
    if (error?.code === 'P2002') return res.status(200).end();
    console.error('Stripe webhook processing failed', { eventId: event.id, type: event.type });
    return res.status(500).send('Webhook processing failed');
  }
  return res.status(200).end();
}

export default router;
