# Modifications de sécurité réalisées

- Suppression du compte administrateur et du mot de passe codés en dur dans React.
- Suppression complète des champs carte bancaire, expiration et CVV.
- Redirection vers Stripe Checkout créée côté serveur.
- Recalcul du prix total et validation des stocks côté serveur.
- Authentification serveur avec `scrypt` et comparaison en temps constant.
- Sessions aléatoires stockées dans un cookie `HttpOnly`, `SameSite=Lax` et `Secure` en production.
- Contrôle du rôle administrateur sur les routes utilisateurs, produits et commandes.
- Limitation des tentatives de connexion.
- Validation des noms, emails, mots de passe, prix, stocks et quantités.
- Identifiants UUID non prévisibles.
- En-têtes de sécurité Helmet et suppression de l'en-tête Express.
- Secrets exclus de Git avec `.env` et `.gitignore`.

## Limites restantes avant production

Le stockage JSON doit être remplacé par PostgreSQL/Prisma. Le webhook Stripe signé doit être ajouté avant d'accepter un véritable paiement afin de confirmer la commande et décrémenter le stock de manière transactionnelle. Une revue de déploiement HTTPS/CSP, des tests automatisés et une sauvegarde de base de données restent nécessaires.

## Rachat de matériel
- Nouvelle page publique cohérente avec l'interface existante.
- Formulaire validé dans le navigateur et surtout côté serveur.
- Limitation à 8 demandes par heure et par adresse IP.
- Enregistrement dans `buybackRequests` sans exposition publique.
- Consultation réservée à l'API administrateur authentifiée.
