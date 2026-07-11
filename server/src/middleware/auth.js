import { prisma } from '../db.js';
import { createSessionToken, publicUser } from '../utils.js';
import { config } from '../config.js';

export async function getSessionFromCookie(req) {
  const token = req.cookies?.dm_session;
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { token } });
  if (!session) return null;
  if (new Date(session.expiresAt) < new Date()) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return null;
  return { session, user };
}

export async function authMiddleware(req, res, next) {
  try {
    const s = await getSessionFromCookie(req);
    if (!s) return res.status(401).json({ error: 'Authentification requise.' });
    req.user = s.user;
    req.session = s.session;
    next();
  } catch (err) { next(err); }
}

export function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Droits administrateur requis.' });
  next();
}

export async function createSession(res, userId) {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  await prisma.session.create({ data: { token, userId, expiresAt } });
  res.cookie('dm_session', token, { httpOnly: true, secure: config.isProduction, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000, path: '/' });
  return token;
}

export async function destroySession(res, token) {
  if (!token) return;
  await prisma.session.deleteMany({ where: { token } });
  res.clearCookie('dm_session', { path: '/' });
}
