import { Router } from 'express';
import argon2 from 'argon2';
import { z } from 'zod';
import { prisma } from '../db.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware, adminMiddleware);

const idSchema = z.string().uuid();
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
const roleSchema = z.enum(['USER', 'ADMIN']);
const buybackStatusSchema = z.enum(['NEW', 'CONTACTED', 'OFFER_SENT', 'ACCEPTED', 'REFUSED', 'CLOSED']);
const orderStatusSchema = z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELED']);

export const httpUrlSchema = z.string().trim().url().max(2048).refine((value) => {
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}, { message: 'URL HTTP(S) sans identifiants requise.' });

const productCreateSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180),
  description: z.string().trim().min(1).max(10000),
  shortDescription: z.string().trim().max(500).optional().nullable(),
  price: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative(),
  category: z.string().trim().min(1).max(100),
  brand: z.string().trim().max(100).optional().nullable(),
  imageUrl: httpUrlSchema,
  additionalImages: z.array(httpUrlSchema).max(12).default([]),
  isActive: z.boolean().default(true),
});
const productPatchSchema = productCreateSchema.partial().refine((value) => Object.keys(value).length > 0, { message: 'Au moins un champ doit être fourni' });
const userCreateSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(128),
  role: roleSchema.default('USER'),
});
const userPatchSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  role: roleSchema.optional(),
  isActive: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, { message: 'Au moins un champ doit être fourni' });

function pageOf(query) {
  const parsed = paginationSchema.parse(query);
  return { ...parsed, skip: (parsed.page - 1) * parsed.limit };
}
function setPaginationHeaders(res, page, limit, total) {
  res.set('X-Page', String(page));
  res.set('X-Page-Size', String(limit));
  res.set('X-Total-Count', String(total));
  res.set('Access-Control-Expose-Headers', 'X-Page, X-Page-Size, X-Total-Count');
}
function auditData(req, action, entityType, entityId, metadata) {
  return { userId: req.user.id, action, entityType, entityId, metadata, ipAddress: req.ip };
}
function badRequest(res, error) {
  if (error instanceof z.ZodError) return res.status(400).json({ error: 'Données invalides', details: error.flatten() });
  if (error?.code === 'P2002') return res.status(409).json({ error: 'Une ressource utilisant cette valeur existe déjà' });
  throw error;
}

router.get('/products', async (req, res, next) => {
  try {
    const { page, limit, skip } = pageOf(req.query);
    const where = req.query.active === undefined ? {} : { isActive: req.query.active === 'true' };
    const [items, total] = await prisma.$transaction([
      prisma.product.findMany({ where, orderBy: { updatedAt: 'desc' }, skip, take: limit }),
      prisma.product.count({ where }),
    ]);
    setPaginationHeaders(res, page, limit, total);
    res.json(items);
  } catch (error) { next(error); }
});

router.post('/products', async (req, res, next) => {
  try {
    const data = productCreateSchema.parse(req.body);
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({ data });
      await tx.auditLog.create({ data: auditData(req, 'ADMIN_PRODUCT_CREATED', 'Product', created.id, { name: created.name, slug: created.slug }) });
      return created;
    });
    res.status(201).json(product);
  } catch (error) { try { if (badRequest(res, error)) return; } catch (forwarded) { next(forwarded); } }
});

router.patch('/products/:id', async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const data = productPatchSchema.parse(req.body);
    const product = await prisma.$transaction(async (tx) => {
      const before = await tx.product.findUnique({ where: { id } });
      if (!before) return null;
      const updated = await tx.product.update({ where: { id }, data });
      await tx.auditLog.create({ data: auditData(req, 'ADMIN_PRODUCT_UPDATED', 'Product', id, { before, changes: data }) });
      return updated;
    });
    if (!product) return res.status(404).json({ error: 'Produit introuvable' });
    res.json(product);
  } catch (error) { try { if (badRequest(res, error)) return; } catch (forwarded) { next(forwarded); } }
});

router.delete('/products/:id', async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const product = await prisma.$transaction(async (tx) => {
      const existing = await tx.product.findUnique({ where: { id } });
      if (!existing) return null;
      const updated = await tx.product.update({ where: { id }, data: { isActive: false } });
      await tx.auditLog.create({ data: auditData(req, 'ADMIN_PRODUCT_DEACTIVATED', 'Product', id, { name: existing.name }) });
      return updated;
    });
    if (!product) return res.status(404).json({ error: 'Produit introuvable' });
    res.json(product);
  } catch (error) { try { if (badRequest(res, error)) return; } catch (forwarded) { next(forwarded); } }
});

router.get('/users', async (req, res, next) => {
  try {
    const { page, limit, skip } = pageOf(req.query);
    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({ orderBy: { createdAt: 'desc' }, skip, take: limit, select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true } }),
      prisma.user.count(),
    ]);
    setPaginationHeaders(res, page, limit, total);
    res.json(users);
  } catch (error) { next(error); }
});

router.post('/users', async (req, res, next) => {
  try {
    const { password, ...data } = userCreateSchema.parse(req.body);
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({ data: { ...data, passwordHash } });
      await tx.auditLog.create({ data: auditData(req, 'ADMIN_USER_CREATED', 'User', created.id, { email: created.email, role: created.role }) });
      return created;
    });
    const { passwordHash: omitted, ...safeUser } = user;
    res.status(201).json(safeUser);
  } catch (error) { try { if (badRequest(res, error)) return; } catch (forwarded) { next(forwarded); } }
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const data = userPatchSchema.parse(req.body);
    const user = await prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({ where: { id } });
      if (!current) return null;
      const removesActiveAdmin = current.role === 'ADMIN' && current.isActive && (data.role === 'USER' || data.isActive === false);
      if (removesActiveAdmin) {
        const otherActiveAdmins = await tx.user.count({ where: { role: 'ADMIN', isActive: true, id: { not: id } } });
        if (otherActiveAdmins === 0) throw new Error('LAST_ACTIVE_ADMIN');
      }
      const updated = await tx.user.update({ where: { id }, data, select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true } });
      if (data.isActive === false) await tx.session.deleteMany({ where: { userId: id } });
      await tx.auditLog.create({ data: auditData(req, 'ADMIN_USER_UPDATED', 'User', id, { previousRole: current.role, previousIsActive: current.isActive, changes: data }) });
      return updated;
    });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json(user);
  } catch (error) {
    if (error?.message === 'LAST_ACTIVE_ADMIN') return res.status(409).json({ error: 'Le dernier administrateur actif ne peut pas être désactivé ou rétrogradé' });
    try { if (badRequest(res, error)) return; } catch (forwarded) { next(forwarded); }
  }
});

router.get('/orders', async (req, res, next) => {
  try {
    const { page, limit, skip } = pageOf(req.query);
    const where = req.query.status ? { status: orderStatusSchema.parse(req.query.status) } : {};
    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit, include: { orderItems: true } }),
      prisma.order.count({ where }),
    ]);
    setPaginationHeaders(res, page, limit, total);
    res.json(orders);
  } catch (error) { try { if (badRequest(res, error)) return; } catch (forwarded) { next(forwarded); } }
});

router.get('/orders/:id', async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const [order, history] = await Promise.all([
      prisma.order.findUnique({ where: { id }, include: { orderItems: true } }),
      prisma.auditLog.findMany({ where: { entityType: 'Order', entityId: id }, orderBy: { createdAt: 'asc' } }),
    ]);
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });
    res.json({ ...order, statusHistory: history });
  } catch (error) { try { if (badRequest(res, error)) return; } catch (forwarded) { next(forwarded); } }
});

router.patch('/orders/:id/status', async (req, res, next) => {
  const transitions = { PENDING: ['CANCELED'], PROCESSING: ['SHIPPED', 'CANCELED'], SHIPPED: ['DELIVERED'], DELIVERED: [], CANCELED: [] };
  try {
    const id = idSchema.parse(req.params.id);
    const nextStatus = orderStatusSchema.parse(req.body?.status);
    const order = await prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id } });
      if (!current) return null;
      if (!transitions[current.status].includes(nextStatus)) {
        const error = new Error('INVALID_ORDER_TRANSITION');
        error.currentStatus = current.status;
        throw error;
      }
      const updated = await tx.order.update({ where: { id }, data: { status: nextStatus } });
      await tx.auditLog.create({ data: auditData(req, 'ADMIN_ORDER_STATUS_CHANGED', 'Order', id, { from: current.status, to: nextStatus }) });
      return updated;
    });
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });
    res.json(order);
  } catch (error) {
    if (error?.message === 'INVALID_ORDER_TRANSITION') return res.status(409).json({ error: 'Transition impossible depuis ' + error.currentStatus });
    try { if (badRequest(res, error)) return; } catch (forwarded) { next(forwarded); }
  }
});

router.get('/buyback-requests', async (req, res, next) => {
  try {
    const { page, limit, skip } = pageOf(req.query);
    const where = req.query.status ? { status: buybackStatusSchema.parse(req.query.status) } : {};
    const [requests, total] = await prisma.$transaction([
      prisma.buybackRequest.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.buybackRequest.count({ where }),
    ]);
    setPaginationHeaders(res, page, limit, total);
    res.json(requests);
  } catch (error) { try { if (badRequest(res, error)) return; } catch (forwarded) { next(forwarded); } }
});

router.get('/buyback-requests/:id', async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const request = await prisma.buybackRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ error: 'Demande de reprise introuvable' });
    res.json(request);
  } catch (error) { try { if (badRequest(res, error)) return; } catch (forwarded) { next(forwarded); } }
});

router.patch('/buyback-requests/:id', async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const data = z.object({
      status: buybackStatusSchema.optional(),
      adminNotes: z.string().trim().max(10000).optional().nullable(),
    }).refine((value) => Object.keys(value).length > 0, { message: 'Au moins un champ doit être fourni' }).parse(req.body);
    const request = await prisma.$transaction(async (tx) => {
      const current = await tx.buybackRequest.findUnique({ where: { id } });
      if (!current) return null;
      const updated = await tx.buybackRequest.update({ where: { id }, data });
      await tx.auditLog.create({ data: auditData(req, 'ADMIN_BUYBACK_UPDATED', 'BuybackRequest', id, { previousStatus: current.status, changes: data }) });
      return updated;
    });
    if (!request) return res.status(404).json({ error: 'Demande de reprise introuvable' });
    res.json(request);
  } catch (error) { try { if (badRequest(res, error)) return; } catch (forwarded) { next(forwarded); } }
});

export default router;
