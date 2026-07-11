import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './src/config.js';
import { errorHandler, notFoundHandler } from './src/middleware/errorHandler.js';

import authRoutes from './src/routes/auth.js';
import productRoutes from './src/routes/products.js';
import buybackRoutes from './src/routes/buyback.js';
import checkoutRoutes from './src/routes/checkout.js';
import adminRoutes from './src/routes/admin.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors({ origin: config.frontendUrl, credentials: true }));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
app.use(apiLimiter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/buyback-requests', buybackRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/admin', adminRoutes);

// Stripe webhook needs raw body parsing; handled in checkout route file

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = Number(process.env.PORT || config.port || 3001);
app.listen(PORT, '0.0.0.0', () => console.log(`API Do' Motoculture sur http://0.0.0.0:${PORT}`));
