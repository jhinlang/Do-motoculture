import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { spawn } from 'node:child_process';

const port = 3199;
const baseUrl = 'http://127.0.0.1:' + port;
const allowedOrigin = 'http://localhost:5173';
let server;
let logs = '';

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { const response = await fetch(baseUrl + '/api/health'); if (response.ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Le serveur de test ne démarre pas. ' + logs.slice(-1000));
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  if (options.method && options.method !== 'GET') headers.Origin = allowedOrigin;
  return fetch(baseUrl + path, { ...options, headers });
}

before(async () => {
  server = spawn(process.execPath, ['--env-file=.env', 'server/index.js'], { cwd: process.cwd(), env: { ...process.env, PORT: String(port), NODE_ENV: 'test', STRIPE_SECRET_KEY: 'sk_test_fake_for_local_tests', STRIPE_WEBHOOK_SECRET: 'whsec_fake_for_local_tests' }, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', chunk => { logs += chunk; });
  server.stderr.on('data', chunk => { logs += chunk; });
  await waitForServer();
});

after(async () => {
  if (!server || server.exitCode !== null) return;
  server.kill('SIGTERM');
  await new Promise(resolve => { const timer = setTimeout(() => { server.kill('SIGKILL'); resolve(); }, 3000); server.once('exit', () => { clearTimeout(timer); resolve(); }); });
});

test('health et readiness confirment HTTP et PostgreSQL', async () => {
  const health = await request('/api/health'); assert.equal(health.status, 200); assert.deepEqual(await health.json(), { ok: true }); assert.ok(health.headers.get('x-request-id'));
  const readiness = await request('/api/readiness'); assert.equal(readiness.status, 200); assert.deepEqual(await readiness.json(), { ok: true });
});

test('la liste publique des produits est accessible et typée', async () => {
  const response = await request('/api/products'); assert.equal(response.status, 200); const products = await response.json(); assert.ok(Array.isArray(products));
  for (const product of products) { assert.equal(typeof product.id, 'string'); assert.equal(Number.isInteger(product.price), true); assert.ok(product.price >= 0); assert.ok(product.stock >= 0); }
});

test('les routes administrateur refusent une requête sans session', async () => {
  for (const path of ['/api/admin/products', '/api/admin/users', '/api/admin/orders']) { const response = await request(path); assert.equal(response.status, 401, path); }
});

test('la création de blog exige une session administrateur', async () => {
  const response = await request('/api/blog', { method: 'POST', body: JSON.stringify({ title: 'Article test', excerpt: 'Un extrait assez long', content: 'Un contenu suffisamment long pour le test.', imageUrl: 'https://example.com/image.jpg', category: 'Conseils' }) }); assert.equal(response.status, 401);
});

test('un mauvais mot de passe ne révèle pas si le compte existe', async () => {
  const response = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'personne-inexistante@example.com', password: 'MotDePasseIncorrect!123' }) }); assert.equal(response.status, 401); const body = await response.json(); assert.match(body.error, /identifiants|connexion|mot de passe/i); assert.equal('user' in body, false);
});

test('le checkout refuse panier vide et quantité invalide avant Stripe', async () => {
  const customer = { email: 'client@example.com', firstName: 'Jean', lastName: 'Martin', phone: '0612345678', address: '1 rue du Test', city: 'Paris', postalCode: '75001' };
  const empty = await request('/api/checkout/session', { method: 'POST', body: JSON.stringify({ items: [], customer }) }); assert.equal(empty.status, 400);
  const invalid = await request('/api/checkout/session', { method: 'POST', body: JSON.stringify({ items: [{ productId: '00000000-0000-4000-8000-000000000000', quantity: 0 }], customer }) }); assert.equal(invalid.status, 400);
});

test('un webhook Stripe sans signature valide est refusé', async () => {
  const response = await request('/api/checkout/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': 'invalide' }, body: JSON.stringify({ id: 'evt_fake', type: 'checkout.session.completed' }) }); assert.equal(response.status, 400);
});

test('les formulaires publics invalides produisent une erreur 400 traçable', async () => {
  const response = await request('/api/contact', { method: 'POST', body: JSON.stringify({ name: 'A', email: 'incorrect', subject: '', message: 'court' }) }); assert.equal(response.status, 400); const body = await response.json(); assert.equal(body.error, 'Données invalides.'); assert.ok(body.requestId); assert.ok(Array.isArray(body.details));
});

test('un JSON invalide retourne 400 sans stack trace', async () => {
  const response = await request('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{ invalide' }); assert.equal(response.status, 400); const body = await response.json(); assert.equal(body.error, 'Corps JSON invalide.'); assert.ok(body.requestId); assert.equal('stack' in body, false);
});

test('CORS refuse une origine étrangère', async () => {
  const response = await fetch(baseUrl + '/api/contact', { method: 'POST', headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' }, body: JSON.stringify({}) }); assert.equal(response.status, 403);
});
