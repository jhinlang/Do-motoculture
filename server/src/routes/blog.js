import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = Router();
const idSchema = z.string().uuid();
const postSchema = z.object({
  title: z.string().trim().min(3).max(180),
  excerpt: z.string().trim().min(10).max(600),
  content: z.string().trim().min(20).max(50000),
  imageUrl: z.string().url().max(2048),
  category: z.string().trim().min(2).max(80),
  author: z.string().trim().min(2).max(120).default("Équipe Do' Motoculture"),
  readTime: z.coerce.number().int().min(1).max(120).default(5),
});

function slugify(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 170);
}

async function uniqueSlug(title, excludeId) {
  const base = slugify(title) || 'article';
  let slug = base;
  let suffix = 2;
  while (await prisma.blogPost.findFirst({ where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } })) {
    slug = base + '-' + suffix++;
  }
  return slug;
}

router.get('/', async (_req, res, next) => {
  try {
    res.json(await prisma.blogPost.findMany({ orderBy: { createdAt: 'desc' } }));
  } catch (error) { next(error); }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const post = await prisma.blogPost.findUnique({ where: { slug: req.params.slug } });
    if (!post) return res.status(404).json({ error: 'Article introuvable.' });
    res.json(post);
  } catch (error) { next(error); }
});

router.post('/', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const data = postSchema.parse(req.body);
    const slug = await uniqueSlug(data.title);
    const post = await prisma.$transaction(async tx => {
      const created = await tx.blogPost.create({ data: { ...data, slug } });
      await tx.auditLog.create({ data: { userId: req.user.id, action: 'ADMIN_BLOG_CREATED', entityType: 'BlogPost', entityId: created.id, metadata: { title: created.title, slug }, ipAddress: req.ip } });
      return created;
    });
    res.status(201).json(post);
  } catch (error) { next(error); }
});

router.patch('/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const data = postSchema.partial().parse(req.body);
    const current = await prisma.blogPost.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ error: 'Article introuvable.' });
    const update = { ...data };
    if (data.title && data.title !== current.title) update.slug = await uniqueSlug(data.title, id);
    const post = await prisma.$transaction(async tx => {
      const saved = await tx.blogPost.update({ where: { id }, data: update });
      await tx.auditLog.create({ data: { userId: req.user.id, action: 'ADMIN_BLOG_UPDATED', entityType: 'BlogPost', entityId: id, metadata: { changes: Object.keys(update) }, ipAddress: req.ip } });
      return saved;
    });
    res.json(post);
  } catch (error) { next(error); }
});

router.delete('/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const id = idSchema.parse(req.params.id);
    const current = await prisma.blogPost.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ error: 'Article introuvable.' });
    await prisma.$transaction([
      prisma.auditLog.create({ data: { userId: req.user.id, action: 'ADMIN_BLOG_DELETED', entityType: 'BlogPost', entityId: id, metadata: { title: current.title }, ipAddress: req.ip } }),
      prisma.blogPost.delete({ where: { id } }),
    ]);
    res.status(204).send();
  } catch (error) { next(error); }
});

export default router;
