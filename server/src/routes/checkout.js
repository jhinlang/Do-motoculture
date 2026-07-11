import express from 'express';
import { prisma } from '../db.js';
import Stripe from 'stripe';
import { z } from 'zod';
import rawBody from 'raw-body';
import { config } from '../config.js';

const stripe = config.stripeSecretKey ? new Stripe(config.stripeSecretKey, { apiVersion: '2022-11-15' }) : null;

const router = express.Router();

const sessionSchema = z.object({ customer: z.object({ name: z.string().min(2), email: z.string().email(), phone: z.string().optional() }), items: z.array(z.object({ productId: z.string(), quantity: z.number().int().min(1).max(20) })) });

router.post('/session', async (req, res, next) => {
  try {
    const data = sessionSchema.parse(req.body);
    // Recalculate prices from DB
    let subtotal = 0;
    const normalized = [];
    for (const it of data.items) {
      const product = await prisma.product.findUnique({ where: { id: it.productId } });
      if (!product || !product.isActive) return res.status(400).json({ error: 'Produit invalide.' });
      if (it.quantity > product.stock) return res.status(400).json({ error: 'Stock insuffisant.' });
      subtotal += product.price * it.quantity;
      normalized.push({ productId: product.id, productNameSnapshot: product.name, unitPriceSnapshot: product.price, quantity: it.quantity, totalPrice: product.price * it.quantity });
    }
    const shipping = 0;
    const total = subtotal + shipping;
    if (!stripe) return res.status(503).json({ error: 'Stripe non configuré.' });

    // Create order in DB
    const order = await prisma.order.create({ data: { orderNumber: `CMD-${Date.now()}`, email: data.customer.email.toLowerCase(), firstName: data.customer.name.split(' ')[0] || data.customer.name, lastName: data.customer.name.split(' ').slice(1).join(' ') || '', phone: data.customer.phone || '', status: 'PENDING', paymentStatus: 'PENDING', subtotalAmount: subtotal, shippingAmount: shipping, totalAmount: total } });

    // create order items
    for (const it of normalized) {
      await prisma.orderItem.create({ data: { orderId: order.id, productId: it.productId, productNameSnapshot: it.productNameSnapshot, unitPriceSnapshot: it.unitPriceSnapshot, quantity: it.quantity, totalPrice: it.totalPrice } });
    }

    const line_items = normalized.map(i => ({ price_data: { currency: 'eur', product_data: { name: i.productNameSnapshot }, unit_amount: i.unitPriceSnapshot }, quantity: i.quantity }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items,
      customer_email: data.customer.email,
      metadata: { orderId: order.id },
      success_url: `${config.frontendUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.frontendUrl}/?payment=cancelled`,
    });

    await prisma.order.update({ where: { id: order.id }, data: { stripeCheckoutSessionId: session.id } });

    res.status(201).json({ url: session.url });
  } catch (err) { next(err); }
});

// Stripe webhook endpoint - use raw body verification
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !config.stripeWebhookSecret) return res.status(501).send('Webhook not configured');
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, config.stripeWebhookSecret);
  } catch (err) {
    console.error('Webhook signature error', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;
    if (!orderId) return res.status(200).end();
    // idempotent processing
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(200).end();
    if (order.paymentStatus === 'PAID') return res.status(200).end();
    // transaction: verify stock and decrement
    await prisma.$transaction(async (tx) => {
      const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
      for (const it of items) {
        const prod = await tx.product.findUnique({ where: { id: it.productId } });
        if (!prod || prod.stock < it.quantity) throw new Error('Stock insuffisant lors du paiement');
        await tx.product.update({ where: { id: prod.id }, data: { stock: prod.stock - it.quantity } });
      }
      await tx.order.update({ where: { id: order.id }, data: { paymentStatus: 'PAID', status: 'PROCESSING', stripePaymentIntentId: session.payment_intent } });
      await tx.auditLog.create({ data: { userId: null, action: 'order_paid', entityType: 'Order', entityId: order.id, metadata: { sessionId: session.id } } });
    });
  }
  res.status(200).end();
});

export default router;
