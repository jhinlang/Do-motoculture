import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { prisma } from './src/db.js';
import { config } from './src/config.js';
import { errorHandler, notFoundHandler } from './src/middleware/errorHandler.js';
import { cleanupExpiredSessions } from './src/middleware/auth.js';
import { logger } from './src/logger.js';

import authRoutes from './src/routes/auth.js';
import productRoutes from './src/routes/products.js';
import blogRoutes from './src/routes/blog.js';
import contactRoutes from './src/routes/contact.js';
import buybackRoutes from './src/routes/buyback.js';
import checkoutRoutes, { stripeWebhookHandler } from './src/routes/checkout.js';
import adminRoutes from './src/routes/admin.js';

const app = express();
app.disable('x-powered-by');
if (config.trustProxy !== false) app.set('trust proxy', config.trustProxy);

app.use((req, res, next) => {
  req.id = req.get('x-request-id')?.slice(0, 100) || randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'", 'https://checkout.stripe.com'],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", ...config.allowedOrigins],
      upgradeInsecureRequests: config.isProduction ? [] : null,
    },
  },
  hsts: config.isProduction ? { maxAge: 15552000, includeSubDomains: true, preload: false } : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self)');
  next();
});
app.use(compression());

// Stripe signature verification requires the original, unparsed request body.
app.post('/api/checkout/webhook', express.raw({ type: 'application/json', limit: '256kb' }), stripeWebhookHandler);

app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser());
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.allowedOrigins.includes(origin)) return callback(null, true);
    const error = new Error('Origine CORS refusée.');
    error.status = 403;
    return callback(error);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Requested-With', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 600,
}));

app.use((req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const source = req.get('origin') || (() => {
    try { return req.get('referer') ? new URL(req.get('referer')).origin : null; } catch { return null; }
  })();
  if (!source && !config.isProduction) return next();
  if (!source || !config.allowedOrigins.includes(source)) {
    return res.status(403).json({ error: 'Origine de requête refusée.', requestId: req.id });
  }
  return next();
});

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 200, standardHeaders: true, legacyHeaders: false });
app.use(apiLimiter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/readiness', async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  } catch (error) { next(error); }
});
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/buyback-requests', buybackRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/admin', adminRoutes);

if (config.isProduction) {
  const distDirectory = fileURLToPath(new URL('../dist', import.meta.url));
  app.use(express.static(distDirectory, {
    index: false,
    maxAge: '1h',
    setHeaders(res, filePath) {
      if (filePath.includes(path.sep + 'assets' + path.sep)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    return res.sendFile(path.join(distDirectory, 'index.html'));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

const sessionCleanup = setInterval(() => cleanupExpiredSessions().catch(error => {
  logger.warn('session_cleanup_failed', { errorName: error?.name || 'Error' });
}), 60 * 60 * 1000);
sessionCleanup.unref();

const PORT = Number(process.env.PORT || config.port || 3001);
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info('server_started', { port: PORT, environment: config.nodeEnv });
});
server.requestTimeout = 30_000;
server.headersTimeout = 35_000;
server.keepAliveTimeout = 5_000;

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(sessionCleanup);
  logger.info('server_stopping', { signal });

  const forceExit = setTimeout(() => {
    logger.error('server_forced_shutdown', { signal });
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  server.close(async error => {
    try {
      await prisma.$disconnect();
      if (error) throw error;
      logger.info('server_stopped', { signal });
      process.exit(0);
    } catch (closeError) {
      logger.error('server_shutdown_failed', { signal, errorName: closeError?.name || 'Error' });
      process.exit(1);
    }
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', reason => {
  logger.error('unhandled_rejection', { errorName: reason?.name || 'Error' });
});
process.on('uncaughtException', error => {
  logger.error('uncaught_exception', { errorName: error?.name || 'Error' });
  shutdown('uncaughtException');
});
