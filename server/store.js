import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword, randomId } from './security.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const dbFile = path.join(dir, 'data', 'db.json');
const initialProducts = [
  { id:'p1', name:'Carburateur Husqvarna 135 Mark II', price:45, category:'Moteur', condition:'Bon état', image:'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=280&fit=crop&auto=format', description:"Carburateur d'occasion testé et fonctionnel.", stock:2, createdAt:'2024-06-01' },
  { id:'p2', name:'Lame de tondeuse universelle 46cm', price:18, category:'Coupe', condition:'Très bon état', image:'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=280&fit=crop&auto=format', description:'Lame peu usée, longueur 46 cm.', stock:5, createdAt:'2024-06-05' },
  { id:'p3', name:'Filtre à air Honda GCV160', price:8, category:'Filtration', condition:'Neuf', image:'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=280&fit=crop&auto=format', description:'Filtre à air neuf déstocké.', stock:10, createdAt:'2024-06-08' }
];

function seed() {
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  const users = password ? [{ id: randomId('u_'), name:'Administrateur', email:(process.env.ADMIN_EMAIL || 'admin@domotoculture.fr').toLowerCase(), passwordHash:hashPassword(password), role:'admin', createdAt:new Date().toISOString().slice(0,10) }] : [];
  return { users, products: initialProducts, orders: [], sessions: [], buybackRequests: [] };
}

export function load() {
  if (!fs.existsSync(dbFile)) {
    const data = seed();
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), { mode: 0o600 });
    return data;
  }
  const data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  data.users ??= []; data.products ??= []; data.orders ??= []; data.sessions ??= []; data.buybackRequests ??= [];
  return data;
}
export function save(data) {
  const tmp = `${dbFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, dbFile);
}
