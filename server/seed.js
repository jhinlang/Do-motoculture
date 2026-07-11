import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@domotoculture.fr';
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'change_me_at_least_12';

  const hashed = await argon2.hash(adminPassword, { type: argon2.argon2id });

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    await prisma.user.create({
      data: {
        firstName: 'Administrateur',
        lastName: 'DoMotoculture',
        email: adminEmail.toLowerCase(),
        passwordHash: hashed,
        role: 'ADMIN',
      }
    });
    console.log('Admin user created:', adminEmail);
  } else {
    console.log('Admin user already exists:', adminEmail);
  }

  const products = [
    {
      name: 'Carburateur Husqvarna 135 Mark II',
      slug: 'carburateur-husqvarna-135-mark-ii',
      description: "Carburateur d'occasion testé et fonctionnel. Compatible Husqvarna 135 et 140.",
      shortDescription: 'Carburateur d’occasion testé',
      price: 4500,
      stock: 2,
      category: 'Moteur',
      brand: 'Husqvarna',
      imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=600&fit=crop&auto=format',
      additionalImages: [],
    },
    {
      name: 'Lame de tondeuse universelle 46cm',
      slug: 'lame-tondeuse-46cm',
      description: 'Lame peu usée. Épaisseur 3mm, longueur 46cm.',
      shortDescription: 'Lame universelle 46cm',
      price: 1800,
      stock: 5,
      category: 'Coupe',
      brand: null,
      imageUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&h=600&fit=crop&auto=format',
      additionalImages: [],
    },
    {
      name: 'Filtre à air Honda GCV160',
      slug: 'filtre-air-honda-gcv160',
      description: 'Filtre à air neuf déstocké.',
      shortDescription: 'Filtre à air neuf',
      price: 800,
      stock: 10,
      category: 'Filtration',
      brand: 'Honda',
      imageUrl: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&h=600&fit=crop&auto=format',
      additionalImages: [],
    }
  ];

  for (const p of products) {
    const exists = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (!exists) {
      await prisma.product.create({ data: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        shortDescription: p.shortDescription,
        price: p.price,
        stock: p.stock,
        category: p.category,
        brand: p.brand,
        imageUrl: p.imageUrl,
        additionalImages: p.additionalImages,
      }});
      console.log('Created product', p.slug);
    } else {
      console.log('Product exists', p.slug);
    }
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
