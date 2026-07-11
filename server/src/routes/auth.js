import express from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../db.js';
import { verifyPassword, hashPassword, publicUser } from '../utils.js';
import { authMiddleware, createSession, destroySession, getSessionFromCookie } from '../middleware/auth.js';
import { z } from 'zod';

const router = express.Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

router.get('/me', authMiddleware, async (req, res) => {
  res.json(publicUser(req.user));
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    const ok = await verifyPassword(data.password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await createSession(res, user.id);
    res.json(publicUser(user));
  } catch (err) { next(err); }
});

router.post('/logout', async (req, res, next) => {
  try {
    const token = req.cookies?.dm_session;
    await destroySession(res, token);
    res.status(204).end();
  } catch (err) { next(err); }
});

router.post('/register', async (req, res, next) => {
  try {
    const schema = z.object({ firstName: z.string().min(2), lastName: z.string().min(2), email: z.string().email(), password: z.string().min(12) });
    const data = schema.parse(req.body);
    const exists = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (exists) return res.status(409).json({ error: 'Email déjà utilisé.' });
    const hashed = await hashPassword(data.password);
    const user = await prisma.user.create({ data: { firstName: data.firstName, lastName: data.lastName, email: data.email.toLowerCase(), passwordHash: hashed } });
    await createSession(res, user.id);
    res.status(201).json(publicUser(user));
  } catch (err) { next(err); }
});

export default router;
