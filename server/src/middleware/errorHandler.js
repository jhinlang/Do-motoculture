import { ZodError } from 'zod';
import { logger } from '../logger.js';

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const notFoundHandler = (req, res) => {
  res.status(404).json({ error: 'Route introuvable.', requestId: req.id });
};

export const errorHandler = (err, req, res, _next) => {
  if (res.headersSent) return;

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Données invalides.',
      details: err.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })),
      requestId: req.id,
    });
  }

  if (err instanceof SyntaxError && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Corps JSON invalide.', requestId: req.id });
  }

  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Requête trop volumineuse.', requestId: req.id });
  }

  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message, requestId: req.id });
  }

  if (err?.code === 'P2002') {
    return res.status(409).json({ error: 'Cette ressource existe déjà.', requestId: req.id });
  }

  if (err?.code === 'P2025') {
    return res.status(404).json({ error: 'Ressource introuvable.', requestId: req.id });
  }

  const status = Number.isInteger(err?.status) && err.status >= 400 && err.status < 500 ? err.status : 500;
  logger.error('request_failed', {
    requestId: req.id,
    method: req.method,
    path: req.originalUrl,
    status,
    errorName: err?.name || 'Error',
    message: status < 500 ? err?.message : 'Internal server error',
  });
  res.status(status).json({ error: status === 500 ? 'Erreur interne du serveur.' : err.message, requestId: req.id });
};
