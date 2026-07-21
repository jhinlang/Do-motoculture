import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

function requiredAdminConfiguration() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_INITIAL_PASSWORD;

  if (!email || !email.includes('@')) {
    throw new Error('ADMIN_EMAIL doit contenir une adresse email valide.');
  }
  if (!password || password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error('ADMIN_INITIAL_PASSWORD doit contenir au moins 12 caractères, une minuscule, une majuscule et un chiffre.');
  }
  if (/change[_ -]?me|password|motdepasse|admin123/i.test(password)) {
    throw new Error('ADMIN_INITIAL_PASSWORD est trop prévisible.');
  }
  return { email, password };
}

async function main() {
  const { email, password } = requiredAdminConfiguration();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.info('Administrateur déjà présent : aucune donnée ni mot de passe modifié.');
    return;
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await prisma.user.create({
    data: {
      firstName: 'Administrateur',
      lastName: 'Do Motoculture',
      email,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.info('Administrateur initial créé. Faites immédiatement tourner ADMIN_INITIAL_PASSWORD après la première connexion.');
}

main()
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
