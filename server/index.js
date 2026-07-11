import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { load, save } from './store.js';
import { verifyPassword, sessionToken, randomId, hashPassword } from './security.js';

const app = express();
const PORT = Number(process.env.PORT || 3001);
const isProd = process.env.NODE_ENV === 'production';
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
const publicFormLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false });

const clean = value => String(value ?? '').trim();
const emailOk = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const publicUser = ({ passwordHash, ...user }) => user;

function getSession(req) {
  const token = req.cookies.dm_session;
  if (!token) return null;
  const db = load();
  const session = db.sessions.find(s => s.token === token && Date.parse(s.expiresAt) > Date.now());
  if (!session) return null;
  const user = db.users.find(u => u.id === session.userId);
  return user ? { db, user, token } : null;
}
function auth(req, res, next) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Authentification requise.' });
  req.auth = session; next();
}
function admin(req, res, next) {
  if (req.auth?.user.role !== 'admin') return res.status(403).json({ error: 'Droits administrateur requis.' });
  next();
}

app.get('/api/health', (_req,res) => res.json({ ok:true }));
app.get('/api/products', (_req,res) => res.json(load().products));
app.get('/api/auth/me', auth, (req,res) => res.json(publicUser(req.auth.user)));
app.post('/api/auth/login', loginLimiter, (req,res) => {
  const email = clean(req.body.email).toLowerCase();
  const password = String(req.body.password ?? '');
  const db = load();
  const user = db.users.find(u => u.email === email);
  if (!user || !verifyPassword(password, user.passwordHash)) return res.status(401).json({ error:'Email ou mot de passe incorrect.' });
  db.sessions = db.sessions.filter(s => Date.parse(s.expiresAt) > Date.now());
  const token = sessionToken();
  db.sessions.push({ token, userId:user.id, expiresAt:new Date(Date.now()+8*60*60*1000).toISOString() });
  save(db);
  res.cookie('dm_session', token, { httpOnly:true, secure:isProd, sameSite:'lax', maxAge:8*60*60*1000, path:'/' });
  res.json(publicUser(user));
});
app.post('/api/auth/logout', (req,res) => {
  const token = req.cookies.dm_session;
  if (token) { const db=load(); db.sessions=db.sessions.filter(s=>s.token!==token); save(db); }
  res.clearCookie('dm_session', { path:'/' }); res.status(204).end();
});


app.post('/api/buyback-requests', publicFormLimiter, (req,res) => {
  const name=clean(req.body.name), email=clean(req.body.email).toLowerCase(), phone=clean(req.body.phone), equipment=clean(req.body.equipment), brandModel=clean(req.body.brandModel), condition=clean(req.body.condition), description=clean(req.body.description), desiredPriceRaw=clean(req.body.desiredPrice);
  const allowedEquipment=['Tondeuse','Autoportée','Tronçonneuse','Débroussailleuse','Taille-haies','Souffleur','Motoculteur','Pièces détachées','Autre'];
  const allowedConditions=['Fonctionnel','Fonctionne mal','Ne démarre plus','Cassé / incomplet','Pour pièces'];
  const desiredPrice=desiredPriceRaw==='' ? null : Number(desiredPriceRaw.replace(',','.'));
  if(name.length<2 || name.length>80 || !emailOk(email) || phone.length<6 || phone.length>30 || !allowedEquipment.includes(equipment) || !allowedConditions.includes(condition) || brandModel.length>120 || description.length<20 || description.length>2000 || (desiredPrice!==null && (!Number.isFinite(desiredPrice) || desiredPrice<0 || desiredPrice>100000))) return res.status(400).json({error:'Certaines informations de la demande sont invalides.'});
  const db=load();
  const request={id:randomId('buy_'),name,email,phone,equipment,brandModel,condition,description,desiredPrice:desiredPrice===null?null:Number(desiredPrice.toFixed(2)),status:'nouvelle',createdAt:new Date().toISOString()};
  db.buybackRequests.unshift(request); save(db); res.status(201).json({ok:true,id:request.id});
});

app.get('/api/admin/buyback-requests', auth, admin, (req,res) => res.json(req.auth.db.buybackRequests));

app.get('/api/admin/users', auth, admin, (req,res) => res.json(req.auth.db.users.map(publicUser)));
app.post('/api/admin/users', auth, admin, (req,res) => {
  const name=clean(req.body.name), email=clean(req.body.email).toLowerCase(), password=String(req.body.password??''), role=req.body.role==='admin'?'admin':'user';
  if (name.length<2 || name.length>80 || !emailOk(email) || password.length<12) return res.status(400).json({error:'Nom, email ou mot de passe invalide (12 caractères minimum).'});
  const db=req.auth.db; if(db.users.some(u=>u.email===email)) return res.status(409).json({error:'Cet email existe déjà.'});
  const user={id:randomId('u_'),name,email,passwordHash:hashPassword(password),role,createdAt:new Date().toISOString().slice(0,10)}; db.users.push(user); save(db); res.status(201).json(publicUser(user));
});
app.delete('/api/admin/users/:id', auth, admin, (req,res) => { const db=req.auth.db; const target=db.users.find(u=>u.id===req.params.id); if(!target||target.role==='admin') return res.status(400).json({error:'Utilisateur non supprimable.'}); db.users=db.users.filter(u=>u.id!==target.id); save(db); res.status(204).end(); });


app.post('/api/admin/products', auth, admin, (req,res) => {
  const db=req.auth.db; const name=clean(req.body.name), description=clean(req.body.description), category=clean(req.body.category), condition=clean(req.body.condition), image=clean(req.body.image); const price=Number(req.body.price), stock=Number(req.body.stock);
  if(name.length<2 || name.length>120 || description.length>1000 || !Number.isFinite(price) || price<=0 || price>100000 || !Number.isInteger(stock) || stock<0 || stock>10000) return res.status(400).json({error:'Produit invalide.'});
  const product={id:randomId('p_'),name,description,category,condition,image,price:Number(price.toFixed(2)),stock,createdAt:new Date().toISOString().slice(0,10)}; db.products.unshift(product); save(db); res.status(201).json(product);
});
app.put('/api/admin/products/:id', auth, admin, (req,res) => {
  const db=req.auth.db; const product=db.products.find(p=>p.id===req.params.id); if(!product)return res.status(404).json({error:'Produit introuvable.'}); const price=Number(req.body.price), stock=Number(req.body.stock), name=clean(req.body.name), description=clean(req.body.description);
  if(name.length<2 || name.length>120 || description.length>1000 || !Number.isFinite(price) || price<=0 || !Number.isInteger(stock) || stock<0) return res.status(400).json({error:'Produit invalide.'}); Object.assign(product,{name,description,category:clean(req.body.category),condition:clean(req.body.condition),image:clean(req.body.image),price:Number(price.toFixed(2)),stock}); save(db); res.json(product);
});
app.delete('/api/admin/products/:id', auth, admin, (req,res) => { const db=req.auth.db; if(!db.products.some(p=>p.id===req.params.id))return res.status(404).json({error:'Produit introuvable.'}); db.products=db.products.filter(p=>p.id!==req.params.id); save(db); res.status(204).end(); });

app.get('/api/admin/orders', auth, admin, (req,res) => res.json(req.auth.db.orders));
app.patch('/api/admin/orders/:id', auth, admin, (req,res) => { const allowed=['en_attente','en_cours','expédié','livré']; if(!allowed.includes(req.body.status)) return res.status(400).json({error:'Statut invalide.'}); const db=req.auth.db; const order=db.orders.find(o=>o.id===req.params.id); if(!order)return res.status(404).json({error:'Commande introuvable.'}); order.status=req.body.status; save(db); res.json(order); });

app.post('/api/checkout/session', async (req,res) => {
  const info=req.body.customer || {}; const items=Array.isArray(req.body.items)?req.body.items:[];
  if(!emailOk(clean(info.email)) || clean(info.name).length<2 || !items.length) return res.status(400).json({error:'Informations de commande invalides.'});
  const db=load(); let total=0; const normalized=[];
  for(const item of items){ const product=db.products.find(p=>p.id===item.productId); const qty=Number(item.quantity); if(!product || !Number.isInteger(qty) || qty<1 || qty>Math.min(product.stock,20)) return res.status(400).json({error:'Produit, quantité ou stock invalide.'}); total += product.price*qty; normalized.push({productId:product.id,name:product.name,unitPrice:product.price,quantity:qty}); }
  if(!process.env.STRIPE_SECRET_KEY || !process.env.PUBLIC_URL) return res.status(503).json({error:'Stripe n’est pas encore configuré. Ajoutez STRIPE_SECRET_KEY et PUBLIC_URL dans le fichier .env.'});
  const params=new URLSearchParams(); params.set('mode','payment'); params.set('success_url',`${process.env.PUBLIC_URL}/?payment=success&session_id={CHECKOUT_SESSION_ID}`); params.set('cancel_url',`${process.env.PUBLIC_URL}/?payment=cancelled`); params.set('customer_email',clean(info.email));
  normalized.forEach((i,index)=>{ params.set(`line_items[${index}][price_data][currency]`,'eur'); params.set(`line_items[${index}][price_data][product_data][name]`,i.name); params.set(`line_items[${index}][price_data][unit_amount]`,String(Math.round(i.unitPrice*100))); params.set(`line_items[${index}][quantity]`,String(i.quantity)); });
  const stripe=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:`Bearer ${process.env.STRIPE_SECRET_KEY}`,'Content-Type':'application/x-www-form-urlencoded'},body:params}); const data=await stripe.json(); if(!stripe.ok)return res.status(502).json({error:'Impossible de créer la session Stripe.'});
  const order={id:randomId('ord_'),customerName:clean(info.name),customerEmail:clean(info.email),items:normalized,total:Number(total.toFixed(2)),status:'en_attente',paymentStatus:'pending',stripeSessionId:data.id,date:new Date().toISOString().slice(0,10)}; db.orders.push(order); save(db); res.status(201).json({url:data.url});
});

app.use((err,_req,res,_next)=>{ console.error(err); res.status(500).json({error:'Erreur interne.'}); });
app.listen(PORT,()=>console.log(`API Do' Motoculture sur http://localhost:${PORT}`));
