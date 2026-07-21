import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../db.js';

const router = Router();
const contactLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });
const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(30).optional().default(''),
  subject: z.string().trim().min(2).max(120),
  message: z.string().trim().min(10).max(5000),
});

router.post('/', contactLimiter, async (req, res, next) => {
  try {
    const data = schema.parse(req.body);
    const names = data.name.split(/\s+/);
    const firstName = names.shift();
    const lastName = names.join(' ') || '-';
    const request = await prisma.contactRequest.create({ data: { firstName, lastName, email: data.email.toLowerCase(), phone: data.phone, subject: data.subject, message: data.message } });
    res.status(201).json({ id: request.id, status: request.status });
  } catch (error) { next(error); }
});

export default router;
