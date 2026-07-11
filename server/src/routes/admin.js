import express from 'express';
import { prisma } from '../db.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { z } from 'zod';

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/users', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users.map(u => ({ id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, role: u.role, isActive: u.isActive, createdAt: u.createdAt })));
  } catch (err) { next(err); }
});

router.post('/users', async (req, res, next) => {
  try {
    const schema = z.object({ firstName: z.string().min(2), lastName: z.string().min(2), email: z.string().email(), password: z.string().min(12), role: z.enum(['USER','ADMIN']).optional() });
    const data = schema.parse(req.body);
    const exists = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (exists) return res.status(409).json({ error: 'Email existe déjà.' });
    const user = await prisma.user.create({ data: { firstName: data.firstName, lastName: data.lastName, email: data.email.toLowerCase(), passwordHash: await import('argon2').then(m=>m.hash(data.password)), role: data.role || 'USER' } });
    res.status(201).json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role });
  } catch (err) { next(err); }
});

router.get('/orders', async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(orders);
  } catch (err) { next(err); }
});

router.get('/buyback-requests', async (req, res, next) => {
  try {
    const list = await prisma.buybackRequest.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(list);
  } catch (err) { next(err); }
});

router.patch('/buyback-requests/:id', async (req, res, next) => {
  try {
    const schema = z.object({ status: z.enum(['NEW','CONTACTED','OFFER_SENT','ACCEPTED','REFUSED','CLOSED']), adminNotes: z.string().optional() });
    const data = schema.parse(req.body);
    const updated = await prisma.buybackRequest.update({ where: { id: req.params.id }, data: { status: data.status, adminNotes: data.adminNotes } });
    res.json(updated);
  } catch (err) { next(err); }
});

export default router;
