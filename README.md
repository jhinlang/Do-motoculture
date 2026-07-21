# Do’ Motoculture

Application e-commerce et atelier de motoculture. Le frontend React/Vite et l’API Express sont servis par un même service Node en production. PostgreSQL est géré avec Prisma et les paiements utilisent Stripe Checkout hébergé.

## Prérequis

- Node.js 22 LTS
- npm
- PostgreSQL 16
- Stripe CLI pour les tests de webhook
- Docker, facultatif

## Installation locale

1. Copier .env.example vers .env.
2. Choisir une valeur aléatoire d’au moins 32 caractères pour SESSION_SECRET.
3. Choisir un ADMIN_INITIAL_PASSWORD unique d’au moins 12 caractères avec majuscule, minuscule et chiffre.
4. Démarrer PostgreSQL :

       docker compose up -d postgres

5. Installer et générer Prisma :

       npm ci
       npm run prisma:generate
       npm run prisma:migrate:deploy
       npm run seed

6. Démarrer le frontend et l’API :

       npm run dev

Frontend : http://localhost:5173
API : http://localhost:3001

Le seed est idempotent : il ne modifie jamais un administrateur déjà présent. Après la première connexion, changer le mot de passe administrateur et faire tourner la valeur initiale dans le gestionnaire de secrets.

## Commandes

    npm run dev
    npm run build
    npm start
    npm test
    npm run prisma:generate
    npm run prisma:migrate:dev -- --name description
    npm run prisma:migrate:deploy
    npm run prisma:studio
    npm run seed
    npm audit

Ne jamais exécuter prisma migrate dev en production. La commande de production est npm run prisma:migrate:deploy.

## Variables d’environnement

Obligatoires en production :

- NODE_ENV=production
- PORT
- DATABASE_URL
- APP_URL : URL publique du service unique
- FRONTEND_URL : URL publique du frontend, identique à APP_URL pour le service unique
- ALLOWED_ORIGINS : liste séparée par des virgules, sans joker
- TRUST_PROXY : false ou nombre explicitement adapté à l’hébergeur
- SESSION_SECRET
- PUBLIC_REGISTRATION_ENABLED, false par défaut
- ADMIN_EMAIL
- ADMIN_INITIAL_PASSWORD, uniquement nécessaire à la création initiale
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET

Facultatives :

- CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
- EMAIL_PROVIDER, EMAIL_FROM et EMAIL_SMTP_HOST/PORT/USER/PASS

Les images sont actuellement enregistrées par URL persistante validée. Les secrets Cloudinary restent côté serveur si un upload est ajouté ultérieurement. Aucune clé Stripe publique n’est nécessaire pour une redirection vers session.url.

## Stripe en mode test

1. Créer un compte Stripe et activer le mode test.
2. Copier la clé secrète de test sk_test_... dans STRIPE_SECRET_KEY.
3. Installer Stripe CLI, puis s’authentifier :

       stripe login

4. Lancer l’application et transférer les événements :

       stripe listen --forward-to localhost:3001/api/checkout/webhook

5. Copier le secret whsec_... affiché dans STRIPE_WEBHOOK_SECRET, puis redémarrer l’API.
6. Réaliser un achat avec une carte de test Stripe, par exemple 4242 4242 4242 4242, une date future et un CVC quelconque.
7. Vérifier que la commande passe à PAID via le webhook et que le stock n’est décrémenté qu’une fois.
8. Relancer un événement pour confirmer l’idempotence :

       stripe events resend evt_xxx

Ne jamais utiliser de clés live pendant les tests locaux. La page de succès ne confirme pas le paiement : elle interroge l’API, et seul le webhook signé rend la commande payée.

En production, créer un endpoint Stripe HTTPS vers :

    https://votre-domaine.example/api/checkout/webhook

Sélectionner au minimum checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed et checkout.session.expired. Stocker le nouveau secret whsec_... dans le gestionnaire de secrets de l’hébergeur.

## Déploiement Docker

Construire l’image :

    docker build -t domotoculture:latest .

Avant chaque nouvelle version, sauvegarder la base puis appliquer les migrations avec les mêmes variables de production :

    docker run --rm --env-file .env.production domotoculture:latest npm run prisma:migrate:deploy

Démarrer le service :

    docker run --rm -p 3001:3001 --env-file .env.production domotoculture:latest

L’image est multi-stage et le processus s’exécute avec l’utilisateur non-root node. Elle ne contient aucun fichier .env. En production, injecter les variables via le gestionnaire de secrets de la plateforme.

Ordre conseillé :

1. Sauvegarde PostgreSQL.
2. Construction et analyse de l’image.
3. Migration reproductible.
4. Déploiement du service.
5. Vérification de /api/health et /api/readiness.
6. Test d’une liste produit et d’une connexion administrateur.
7. Test d’un paiement Stripe en mode test avant activation live.
8. Procédure de retour à la version précédente si un contrôle échoue.

## Santé et exploitation

- GET /api/health vérifie le processus HTTP.
- GET /api/readiness vérifie PostgreSQL.
- Les logs sont des lignes JSON avec identifiant de requête.
- Les mots de passe, cookies, jetons et corps contenant des données personnelles ne doivent jamais être journalisés.
- SIGTERM et SIGINT ferment le serveur et Prisma proprement.

Sauvegarde quotidienne indicative :

    pg_dump --format=custom --no-owner "$DATABASE_URL" > domotoculture.dump

Restauration dans une base vide :

    pg_restore --clean --if-exists --no-owner --dbname "$DATABASE_URL" domotoculture.dump

Tester régulièrement la restauration hors production. Définir avec le responsable du traitement la durée de conservation des commandes, demandes de contact, demandes de rachat et journaux d’audit. Prévoir la collecte centralisée des logs et un futur outil de suivi d’erreurs tel que Sentry.

## Vérifications avant livraison

    npm ci
    npm run build
    npm test
    npx prisma format
    npx prisma validate
    npx prisma generate
    npm audit
    git diff --check

Vérifier aussi les migrations sur une base PostgreSQL vide, le seed idempotent, le démarrage en NODE_ENV=production, les endpoints de santé et l’absence de secrets suivis par Git.

## Sécurité

- Sessions serveur avec jetons hachés et cookies HttpOnly.
- Cookie Secure en production et SameSite=Lax.
- CORS par liste blanche et contrôle Origin/Referer sur les mutations.
- Limitation de débit globale et renforcée sur les routes sensibles.
- Helmet, CSP, HSTS en production et Permissions-Policy.
- Validation Zod et erreurs sans stack trace en production.
- Webhook Stripe signé et idempotent.
- Prix et stock recalculés côté serveur.
- Actions administrateur journalisées.

PUBLIC_REGISTRATION_ENABLED doit rester false si l’inscription publique ne fait pas partie du besoin commercial.

## Éléments nécessitant une validation humaine

- Mentions légales, politique de confidentialité, CGV, livraison/retours et politique cookies.
- Coordonnées légales de l’entreprise et délais commerciaux.
- Durées de conservation RGPD.
- Origines, proxy et domaine exacts de production.
- Stratégie de sauvegarde et responsabilités d’astreinte.
- Activation des clés Stripe live seulement après recette complète.
