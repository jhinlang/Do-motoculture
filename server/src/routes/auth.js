import express from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../db.js';
import { verifyPassword, hashPassword, publicUser } from '../utils.js';
import { authMiddleware, createSession, destroySession, getSessionCookie } from '../middleware/auth.js';
import { config } from '../config.js';

const router = express.Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });
const loginSchema = z.object({ email: z.string().trim().email().transform((value) => value.toLowerCase()), password: z.string().min(1).max(200) });
const registerSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(200).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/),
});
const dummyPasswordHash = hashPassword('Invalid-password-constant-2026');

router.get('/me', authMiddleware, (req, res) => res.json(publicUser(req.user)));

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    const validPassword = await verifyPassword(data.password, user?.passwordHash || await dummyPasswordHash);
    if (!user || !validPassword || !user.isActive) {
      await prisma.auditLog.create({ data: { userId: user?.id || null, action: 'login_failed', entityType: 'User', entityId: user?.id || null } }).catch(() => undefined);
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }
    await prisma.$transaction([
      prisma.session.deleteMany({ where: { userId: user.id } }),
      ...(user.role === 'ADMIN' ? [prisma.auditLog.create({ data: { userId: user.id, action: 'admin_login', entityType: 'User', entityId: user.id } })] : []),
    ]);
    await createSession(res, user.id);
    return res.json(publicUser(user));
  } catch (error) { return next(error); }
});

router.post('/logout', async (req, res, next) => {
  try {
    await destroySession(res, getSessionCookie(req));
    return res.status(204).end();
  } catch (error) { return next(error); }
});

router.post('/register', registerLimiter, async (req, res, next) => {
  try {
    if (!config.publicRegistrationEnabled) return res.status(404).json({ error: 'Route indisponible.' });
    const data = registerSchema.parse(req.body);
    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) return res.status(409).json({ error: 'Impossible de créer ce compte.' });
    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({ data: { firstName: data.firstName, lastName: data.lastName, email: data.email, passwordHash } });
    await prisma.auditLog.create({ data: { userId: user.id, action: 'account_created', entityType: 'User', entityId: user.id } });
    await createSession(res, user.id);
    return res.status(201).json(publicUser(user));
  } catch (error) { return next(error); }
});

export default router;
