import { randomBytes } from 'node:crypto';
import express from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import { prisma } from '../db.js';
import { config } from '../config.js';

const stripe = config.stripeSecretKey ? new Stripe(config.stripeSecretKey) : null;
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

    order = await prisma.$transaction((tx) => tx.order.create({
      data: {
        orderNumber: makeOrderNumber(),
        email: data.customer.email,
        firstName,
        lastName: lastNameParts.join(' '),
        phone: data.customer.phone || '',
        status: 'PENDING',
        paymentStatus: 'PENDING',
        subtotalAmount: subtotal,
        shippingAmount: shipping,
        totalAmount: total,
        orderItems: { create: normalized },
      },
      include: { orderItems: true },
    }));

    let session;
    try {
      session = await stripe.checkout.sessions.create({
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
        expires_at: Math.floor(Date.now() / 1000) + (30 * 60),
      });
    } catch (stripeError) {
      await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'FAILED' } });
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

async function markPaid(tx, session) {
  const orderId = session.metadata?.orderId || session.client_reference_id;
  if (!orderId) return;
  const order = await tx.order.findUnique({ where: { id: orderId }, include: { orderItems: true } });
  if (!order || order.paymentStatus === 'PAID') return;
  if (session.payment_status !== 'paid' || session.currency !== 'eur' || session.amount_total !== order.totalAmount) {
    throw new Error('Incohérence entre Stripe et la commande.');
  }
  for (const item of order.orderItems) {
    const result = await tx.product.updateMany({
      where: { id: item.productId, isActive: true, stock: { gte: item.quantity } },
      data: { stock: { decrement: item.quantity } },
    });
    if (result.count !== 1) throw new Error('Stock insuffisant lors du paiement.');
  }
  await tx.order.update({
    where: { id: order.id },
    data: { paymentStatus: 'PAID', status: 'PROCESSING', stripePaymentIntentId: String(session.payment_intent || '') },
  });
  await tx.auditLog.create({
    data: { action: 'order_paid', entityType: 'Order', entityId: order.id, metadata: { sessionId: session.id } },
  });
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
        if (orderId) await tx.order.updateMany({ where: { id: orderId, paymentStatus: 'PENDING' }, data: { paymentStatus: 'FAILED' } });
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
