import dotenv from "dotenv";

dotenv.config();

const parseBoolean = (value, fallback = false) => value == null ? fallback : ['1', 'true', 'yes'].includes(value.toLowerCase());
const parseTrustProxy = (value) => value == null ? false : (/^\d+$/.test(value) ? Number(value) : parseBoolean(value, value));

const required = (key, fallback = undefined) => {
  const value = process.env[key] ?? fallback;
  if (!value) return undefined;
  return value;
};

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3001),
  appUrl: process.env.APP_URL || "http://localhost:3001",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  allowedOrigins: (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || "http://localhost:5173").split(",").map((value) => value.trim()).filter(Boolean),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  publicRegistrationEnabled: parseBoolean(process.env.PUBLIC_REGISTRATION_ENABLED, false),
  databaseUrl: required("DATABASE_URL"),
  sessionSecret: required("SESSION_SECRET"),
  adminEmail: required("ADMIN_EMAIL"),
  adminInitialPassword: required("ADMIN_INITIAL_PASSWORD"),
  stripeSecretKey: required("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: required("STRIPE_WEBHOOK_SECRET"),
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  emailProvider: process.env.EMAIL_PROVIDER || "console",
  emailFrom: process.env.EMAIL_FROM || "no-reply@domotoculture.fr",
  smtpHost: process.env.EMAIL_SMTP_HOST,
  smtpPort: process.env.EMAIL_SMTP_PORT,
  smtpUser: process.env.EMAIL_SMTP_USER,
  smtpPass: process.env.EMAIL_SMTP_PASS,
  isProduction: process.env.NODE_ENV === "production",
  isDevelopment: process.env.NODE_ENV !== "production",
};

export const cloudinaryConfigured = Boolean(
  config.cloudinaryCloudName && config.cloudinaryApiKey && config.cloudinaryApiSecret
);
