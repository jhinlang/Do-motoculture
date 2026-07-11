# Audit et plan d’implémentation

## 1. Architecture actuelle

### Frontend
- Application React + Vite dans `src/`.
- Point d’entrée `src/app/App.tsx` qui contient l’intégralité de l’UI, la navigation, les pages, le panier, les formulaires et l’administration.
- `index.html` contient les métadonnées SEO basiques et le titre.
- Styles via Tailwind CSS et composants UI locaux (`src/app/components/ui/*`).
- Usage direct de `fetch` vers `/api/*` depuis le frontend.
- Aucun routeur React dédié, navigation gérée par état local `page`.
- Données de produits, blog, commandes, admin et formulaire présentes en dur dans `App.tsx`.

### Backend
- Serveur Express minimal dans `server/index.js`.
- Stockage JSON local via `server/store.js` et `server/data/db.json`.
- Authentification par sessions stockées en JSON et cookie `dm_session`.
- Sécurité très basique : `helmet`, `express-rate-limit`, `cookie-parser`, pas de middleware d’erreur centralisé complet.
- Stripe Checkout utilisé avec web request direct vers l’API Stripe.
- Pas de webhook Stripe implémenté.
- Pas de base de données relationnelle.
- Pas de TypeScript côté backend.

### Données et fonctionnalités visibles
- Produits / boutique
- Panier + checkout Stripe
- Page rachat matériel avec formulaire
- Blog et page article
- Dashboard admin simplifié
- Auth login admin
- Gestion produit/admin/users/order

## 2. Problèmes détectés

### Sécurité et backend
- Stockage JSON local non adapté en production.
- Authentification faible, possible attaque par session si stockage JSON compromis.
- Cookies non explicitement invalidés côté serveur sur logout.
- Pas de hachage moderne explicite (scrypt utilisé, mais on doit migrer vers Argon2/bcrypt ou au moins un package standard).
- Pas de validation centralisée via Zod.
- Pas de middleware d’erreur/validation cohérent.
- Pas de protection CSRF/Content Security Policy adaptée.
- Pas de gestion des rôles admin côté serveur suffisamment solide.
- Stripe Checkout intégré, mais pas de webhook signé.
- Partie checkout frontend propose adresse/livraison non traitée sur serveur.
- Pas de protection contre injection ou brute force au-delà des taux limités.

### Données, logique commandes, stock
- Prix et stock calculés côté frontend depuis données en dur et JSON.
- Commande créée avant confirmation Stripe et sans webhook.
- Stock non garanti transactionnellement.
- Possibilité d’acheter plus que le stock en raison de logique client.
- Données sensibles comme mot de passe admin en clair dans `.env` initial.
- Pas de distinction entre produits actifs/inactifs, pas de slug produit.

### Frontend / expérience
- Application monolithique `App.tsx` énorme et difficile à maintenir.
- Navigation gérée par état local plutôt que router dédié.
- Manque d’accessibilité : labels pas tous associés, alt parfois manquants, focus non géré, `aria` limité.
- Formulaires de rachat et checkout partiellement validés, mais logique côté frontend trop légère.
- Pas de page 404 explicite.
- SEO minimal et `robots` interdit automatiquement.
- Dashboard admin visible via frontend et pas clairement séparé pour non-indexation.
- L’UI existe mais contient du code mort / comportements non sécurisés.

### Projet / configuration
- `package.json` mélange dépendances frontend/backend, pas de `prisma`, pas de test.
- `.gitignore` basique mais valide.
- `README.md` très court and outdated.
- `README copy.md` inutile.
- `dist/` et `node_modules/` présents dans le repo (probablement build artefacts / dependency folder) ; il faudra vérifier suppression/ignorés.
- Aucun fichier `.env.example` révélé, mais existe un `.env.example` dans racine vidée ? À vérifier.

## 3. Modifications prévues

### Phase 1 : audit et mise en place du socle backend
- Créer `server/src/` TypeScript ou `server/` avec structure modulaire.
- Installer et configurer `prisma`, `@prisma/client`, `typescript`, `ts-node-dev`, `zod`, `argon2`, `stripe`, `dotenv`, `express`, `helmet`, `cookie-parser`, `express-rate-limit`, `cors`, `morgan`/logger.
- Créer `prisma/schema.prisma` avec entités : User, Product, Order, OrderItem, Address, BuybackRequest, AuditLog, éventuellement BlogPost et ContactRequest si nécessaire.
- Mettre en place `server/prisma/seed.ts` et `npm run seed`.
- Supprimer/archiver stockage JSON et migrer les données initiales via script si nécessaire.
- Ajouter `server/src/config.ts`, `server/src/middleware/*`, `server/src/routes/*`, `server/src/controllers/*`, `server/src/services/*`.
- Vérifier et préserver les routes visibles existantes : `/api/products`, `/api/auth/*`, `/api/buyback-requests`, `/api/checkout/session`, `/api/stripe/webhook`, `/api/health`.

### Phase 2 : sécurité et validation
- Centraliser validation des entrées via Zod.
- Ajouter `authMiddleware`, `adminMiddleware`, `errorHandler`, `requestLogger`, `rateLimit`.
- Utiliser cookies `HttpOnly`, `Secure` en production, `SameSite=Lax`, expiration de session.
- Implémenter sessions serveur ou token opaque avec Redis si possible. Si pas de Redis, sessions en DB / cookies opaque.
- Créer `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.
- Protéger routes admin `/api/admin/*` et route utilisateur `/api/orders`.
- Installer et configurer `Helmet` avec CSP minimale.
- Ajouter limite de taille de requête, CORS, méthode stricte, suppression de x-powered-by.
- Implémenter audit log pour actions admin critiques.

### Phase 3 : stripe et commandes transactionnelles
- Implémenter logique serveur pour créer commande en attente et session Stripe Checkout.
- Recalculer prix et vérifier stock depuis PostgreSQL.
- Support des quantités entières, limites max, panier sans prix côté client.
- Ajouter webhook `/api/stripe/webhook` signé + logique idempotente.
- Mettre à jour commande, stock et audit dans une transaction Prisma.
- Enregistrement `stripeCheckoutSessionId`, `stripePaymentIntentId`.
- Ajouter pages/états côté frontend pour confirmation.

### Phase 4 : rachat et administration
- Améliorer formulaire rachat dans App.tsx sans toucher visuel.
- Ajouter validation frontend accessible, message de confirmation, anti-spam (honeypot / rate limit).
- Enregistrer `BuybackRequest` en DB avec statut, notes admin.
- Ajouter admin route GET `/api/admin/buyback-requests`, PATCH pour statut.
- Mettre à jour dashboard admin pour lister demandes, recherche, filtres, détails, changement de statut, notes internes.

### Phase 5 : frontend propre, accessibilité, SEO
- Extraire navigation/pages depuis `App.tsx` si possible en composants réutilisables sans changer visuel.
- Ajouter `react-router` ou conserver état local si nécessaire pour préserver UI, mais clarifier navigation et ajouter 404.
- Ajouter skeleton loaders et états de chargement/disabling sur boutons.
- Ajouter `aria-label`, `role`, `alt` et focus visible.
- Mettre à jour `index.html` + `README.md` + créer `robots.txt` + `sitemap.xml` + favicon si existante.
- Ajouter pages légales placeholders dans discrets sections si besoin.

### Phase 6 : documentation et déploiement
- Mettre à jour `README.md` avec architecture, installation, `.env`, Prisma, Stripe, lancement, test, déploiement.
- Créer `.env.example` complet.
- Ajouter script `npm run dev`, `npm run build`, `npm run seed`, `npm run prisma:migrate`, `npm run prisma:studio`.
- Éventuellement créer `render.yaml`, `.dockerignore`, `Dockerfile` si utile.
- Nettoyer fichiers inutiles (`README copy.md`, `SECURITY_FILE_LIST.txt` si obsolète, `dist/` build générés présents dans repo, `package-lock.json` si pnpm géré) après validation.

## 4. Fichiers concernés

### Frontend
- `src/app/App.tsx`
- `src/app/components/ui/*` éventuellement
- `src/app/components/figma/ImageWithFallback.tsx`
- `src/main.tsx`
- `index.html`
- `vite.config.ts`
- `package.json`
- `.gitignore`
- `README.md`
- `robots.txt`, `sitemap.xml` (nouveaux)

### Backend
- `server/index.js` (remplacer ou refactorer en TS)
- `server/security.js`
- `server/store.js`
- `server/data/db.json`
- `server/package.json` (pas existant, mais peut rester mono repo)
- nouvelles structures : `server/src/...`, `prisma/schema.prisma`, `prisma/.env`, `prisma/migrations`, `prisma/seed.ts`
- `.env.example`

### Projet global
- `package.json`
- `README.md`
- `.gitignore`
- `README copy.md` (possible suppression)
- `SECURITY_FILE_LIST.txt` (révision)

## 5. Risques

- Risque de rupture visuelle si l’on modifie trop profondément `App.tsx` ; priorité : ne pas altérer l’identité graphique.
- Risque de désynchronisation entre frontend et backend lors de refactorisation de routes.
- Migration des données existantes depuis JSON vers Prisma peut nécessiter attention aux formats.
- Stripe nécessite clé secrète et webhook ; en dev, usage Stripe CLI et mode test.
- Ajout de TypeScript côté backend peut allonger l’intégration, mais cela reste souhaitable si bien organisé.
- Pas de base de données existante PostgreSQL dans le dépôt : la mise en place doit être documentée clairement.
- L’état actuel du dashboard admin est partiellement fictif (`orders` et `users` en dur/admin), il faudra l’adapter aux données réelles.

## 6. Ordre d’implémentation

1. Nettoyage initial et vérification de l’état actuel.
   - Vérifier `package.json`, node_modules, dist et .gitignore.
   - Valider que le projet actuel compile et lancer le serveur existant.

2. Mise en place de Prisma + PostgreSQL local.
   - Ajouter `prisma/schema.prisma`.
   - Configurer `DATABASE_URL` et migration initiale.
   - Créer seed admin et produits de démonstration.

3. Refonte backend en structure modulaire.
   - Implémenter config, middleware, routes REST, services.
   - Migrer authentification et sessions serveur.
   - Conserver routes publiques existantes.

4. Validation et sécurité.
   - Ajouter Zod schemas et centraliser erreurs.
   - Configurer Helmet, rate limiting, CORS, cookies.

5. Stripe Checkout + webhook.
   - Ajouter route `/api/checkout/session` et webhook signé.
   - Écrire logique transactionnelle de commande et stock.

6. Rachat matériel et administration.
   - Valider formulaire rachat, routes admin, dashboard.
   - Ajouter vues admin pour demandes de rachat.

7. Frontend UX / accessibilité.
   - Améliorer loaders, erreurs, validations, navigation.
   - Ajouter SEO, pages légales placeholders.

8. Documentation et nettoyage final.
   - Mettre à jour README, `.env.example`, scripts.
   - Supprimer ou archiver fichiers inutiles.

## 7. Prochaines étapes immédiates

1. Vérifier l’exécution actuelle du frontend et du backend.
2. Créer les fichiers de configuration Prisma et TS.
3. Commencer par refactorer le backend sans toucher au rendu visuel.

---

> Note : ce plan conserve strictement l’identité visuelle actuelle. Les modifications seront limitées aux validations, à la sécurité, aux performances et à la solidité API.