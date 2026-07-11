import express from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../db.js';
import { z } from 'zod';

const router = express.Router();

const limiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 8, standardHeaders: true, legacyHeaders: false });

const schema = z.object({ name: z.string().min(2).max(80), email: z.string().email(), phone: z.string().min(6).max(30), equipment: z.string(), brandModel: z.string().max(120).optional(), condition: z.string(), description: z.string().min(20).max(2000), desiredPrice: z.string().optional() });

router.post('/', limiter, async (req, res, next) => {
  try {
    const data = schema.parse(req.body);
    const desiredPrice = data.desiredPrice ? Math.round(parseFloat(data.desiredPrice.replace(',', '.')) * 100) : null;
    const rec = await prisma.buybackRequest.create({ data: { firstName: data.name.split(' ')[0] || data.name, lastName: data.name.split(' ').slice(1).join(' ') || '', email: data.email.toLowerCase(), phone: data.phone, equipmentType: data.equipment, brand: data.brandModel || '', model: '', condition: data.condition, description: data.description, expectedPrice: desiredPrice, status: 'NEW' } });
    res.status(201).json({ ok: true, id: rec.id });
  } catch (err) { next(err); }
});

export default router;
