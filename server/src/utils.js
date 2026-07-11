import crypto from "node:crypto";
import argon2 from "argon2";

export const hashPassword = async (password) => {
  return argon2.hash(password, { type: argon2.argon2id });
};

export const verifyPassword = async (password, hash) => {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
};

export const createSessionToken = () => crypto.randomBytes(32).toString("base64url");

export const createOrderNumber = () => {
  const id = crypto.randomUUID().split("-")[0].toUpperCase();
  return `CMD-${id}`;
};

export const sanitizeText = (value) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

export const publicUser = (user) => {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
};
