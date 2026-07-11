import express from 'express';
import { prisma } from '../db.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    // map to frontend-friendly shape (price in euros)
    const out = products.map(p => ({ id: p.id, name: p.name, slug: p.slug, description: p.description, shortDescription: p.shortDescription, price: p.price / 100, stock: p.stock, category: p.category, brand: p.brand, image: p.imageUrl, additionalImages: p.additionalImages, isActive: p.isActive, createdAt: p.createdAt }));
    res.json(out);
  } catch (err) { next(err); }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const slug = req.params.slug;
    const p = await prisma.product.findUnique({ where: { slug } });
    if (!p) return res.status(404).json({ error: 'Produit introuvable.' });
    res.json({ id: p.id, name: p.name, slug: p.slug, description: p.description, shortDescription: p.shortDescription, price: p.price / 100, stock: p.stock, category: p.category, brand: p.brand, image: p.imageUrl, additionalImages: p.additionalImages, isActive: p.isActive, createdAt: p.createdAt });
  } catch (err) { next(err); }
});

export default router;
