import { createHash } from 'node:crypto';
import { prisma } from '../db.js';
import { createSessionToken } from '../utils.js';
import { config } from '../config.js';

const COOKIE_NAME = config.isProduction ? '__Host-dm_session' : 'dm_session';
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;
const hashToken = (token) => createHash('sha256').update(token).digest('hex');

export async function getSessionFromCookie(req) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { token: hashToken(token) } });
  if (!session) return null;
  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.isActive) {
    await prisma.session.deleteMany({ where: { userId: session.userId } });
    return null;
  }
  return { session, user };
}

export async function authMiddleware(req, res, next) {
  try {
    const current = await getSessionFromCookie(req);
    if (!current) return res.status(401).json({ error: 'Authentification requise.' });
    req.user = current.user;
    req.session = current.session;
    return next();
  } catch (error) { return next(error); }
}

export function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Droits administrateur requis.' });
  return next();
}

export async function createSession(res, userId) {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);
  await prisma.session.create({ data: { token: hashToken(token), userId, expiresAt } });
  res.cookie(COOKIE_NAME, token, { httpOnly: true, secure: config.isProduction, sameSite: 'lax', maxAge: SESSION_MAX_AGE_MS, path: '/' });
}

export async function destroySession(res, token) {
  if (token) await prisma.session.deleteMany({ where: { token: hashToken(token) } });
  res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: config.isProduction, sameSite: 'lax', path: '/' });
}

export async function cleanupExpiredSessions() {
  return prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}

export function getSessionCookie(req) {
  return req.cookies?.[COOKIE_NAME];
}
