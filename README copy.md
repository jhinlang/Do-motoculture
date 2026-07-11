# Do' Motoculture — version sécurisée de développement

Cette version retire les identifiants administrateur et le faux formulaire bancaire du frontend. Elle ajoute une API Node/Express avec mots de passe hachés par `scrypt`, sessions en cookie `HttpOnly`, contrôles de rôle, limitation des tentatives de connexion, validation serveur, recalcul des prix et contrôle du stock avant redirection vers Stripe Checkout.

## Lancement

1. Installer Node.js 20 ou plus récent.
2. Copier `.env.example` vers `.env`.
3. Remplacer `ADMIN_INITIAL_PASSWORD` par un mot de passe unique d'au moins 12 caractères.
4. Exécuter :

```bash
npm install
npm run dev
```

Frontend : `http://localhost:5173`  
API : `http://localhost:3001`

Le compte administrateur est créé au premier lancement uniquement, à partir de `ADMIN_EMAIL` et `ADMIN_INITIAL_PASSWORD`. Le fichier `server/data/db.json` est ignoré par Git.

## Stripe

Créer des clés Stripe en mode test, puis renseigner :

```env
PUBLIC_URL=http://localhost:5173
STRIPE_SECRET_KEY=sk_test_...
```

Le formulaire de carte a été supprimé : le navigateur est redirigé vers Stripe Checkout. La clé secrète Stripe ne doit jamais être placée dans `src/` ni commencer par `VITE_`.

## Important avant une vraie production

Cette livraison est une base sécurisée de développement, pas une certification de sécurité. Pour une boutique réelle, remplacez le stockage JSON par PostgreSQL/Prisma, ajoutez le webhook Stripe signé pour confirmer le paiement et décrémenter le stock, utilisez HTTPS, configurez une politique CSP adaptée, stockez les images dans un service contrôlé, ajoutez sauvegardes, logs d'audit et tests automatiques.

Ne marquez jamais une commande comme payée uniquement parce que le client revient sur l'URL de succès Stripe : seul un webhook Stripe signé doit faire foi.


## Page de rachat de matériel

La navigation contient désormais une page **Rachat matériel**. Elle présente le fonctionnement du service et un formulaire connecté à `POST /api/buyback-requests`. Les demandes sont validées, limitées en fréquence et enregistrées dans le stockage serveur. Une route administrateur protégée est disponible sur `GET /api/admin/buyback-requests`.
