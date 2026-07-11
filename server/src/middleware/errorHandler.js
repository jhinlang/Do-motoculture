export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const notFoundHandler = (_req, res) => {
  res.status(404).json({ error: "Route introuvable." });
};

export const errorHandler = (err, _req, res, _next) => {
  if (res.headersSent) return;
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "Erreur interne du serveur." });
};
