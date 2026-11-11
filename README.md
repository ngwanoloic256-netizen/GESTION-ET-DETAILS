# Plateforme SaaS — Commerce & marketing digital pour l'Afrique

Application web multi-organisations : chaque commerçant ou agence crée son espace,
invite son équipe et gère ses données de façon isolée.

Le cadrage produit complet (modules, modèle économique, feuille de route) est dans le
cahier conceptuel. Ce dépôt en est l'implémentation, phase par phase.

## État d'avancement

| Phase du cahier | État |
|---|---|
| 1. Fondations — comptes, organisations, rôles, onboarding, journal | **Fait** |
| 2. Creative Studio — catalogue produits, identité de marque, visuels en 3 modèles × 4 formats, textes par IA, export PNG | **Fait** (retouche d'image et vidéo par IA : à faire) |
| 3. Meta Ads MVP — préparation de campagne, fiche de lancement, suivi des résultats | **En partie** : le lancement se fait encore à la main dans Meta Ads Manager. Le lancement par API attend une application développeur Meta. |
| 4. Social Manager | À faire |
| 5. CRM & Analytics | À faire |
| 6. Monétisation | À faire (le champ `plan` existe et est verrouillé côté client) |
| 7. Expansion | À faire |

Le module historique « gestion de stock et de caisse » (secrétariat, Mobile Money,
boissons) reste disponible comme module activable par espace.

## Modèle de données (Firestore)

```
users/{uid}                              profil du compte
users/{uid}/memberships/{orgId}          index « mes espaces » (ne donne aucun droit)
organisations/{orgId}                    nom, type, secteur, pays, ville, devise, langue, WhatsApp, plan, modules
organisations/{orgId}/members/{uid}      rôle : owner | admin | member  ← source de vérité des droits
organisations/{orgId}/journal/{id}       journal d'activité, en ajout seul
organisations/{orgId}/produits/{id}      catalogue : nom, prix, promo, description, variantes, livraison, photos
organisations/{orgId}/medias/{id}        photos de produits (JPEG réduit, en data URL)
organisations/{orgId}/creations/{id}     créations enregistrées du studio
organisations/{orgId}/campagnes/{id}     campagnes : réglages, statut, résultats saisis
organisations/{orgId}/<collection>/{id}  données du module de gestion de stock et de caisse
invitations/{orgId}_{email}              invitation en attente
```

Rôles :

- **Propriétaire** : tout, et ne peut être ni rétrogradé ni retiré.
- **Administrateur** : paramètres, équipe, suppressions, outils de masse, lecture du journal.
- **Collaborateur** : saisie et consultation des données de l'espace.

Ces droits sont imposés par `firestore.rules`, pas seulement par l'interface.

## Studio de création

- Les visuels sont composés dans le navigateur (`src/studio/render.ts`) à partir de la vraie
  photo du produit : le produit n'est jamais redessiné, le prix et les textes sont exactement
  ceux saisis. L'export se fait en PNG aux dimensions de chaque réseau.
- L'IA ne sert qu'à proposer des textes (accroche, sous-titre, appel à l'action, légende,
  hashtags). Elle est appelée par le serveur (`server.ts`, route `POST /api/ai/textes`) :
  la clé ne quitte jamais le serveur, l'appel exige un compte connecté et est limité à
  30 générations par heure et par compte.
- Les photos sont réduites puis enregistrées dans Firestore, ce qui évite d'avoir à activer
  Firebase Storage. À migrer vers un stockage de fichiers quand les volumes grandiront.

Variables d'environnement du serveur :

| Variable | Rôle |
|---|---|
| `GEMINI_API_KEY` | Clé Gemini. Sans elle, le studio fonctionne mais le bouton IA répond « non configuré ». |
| `GEMINI_TEXT_MODEL` | Modèle de texte (défaut : `gemini-flash-latest`). |
| `AI_QUOTA_PAR_HEURE` | Générations par heure et par compte (défaut : 30). |

## Développement

Prérequis : Node.js 22+, Java (pour l'émulateur Firestore).

```bash
npm install
npm run emulators      # terminal 1 : émulateurs Firestore + Auth
npm run dev:local      # terminal 2 : application + serveur, branchés sur les émulateurs, IA en réponses fictives
```

En mode local, la connexion Google est remplacée par une commande dans la console du
navigateur : `__devSignIn('awa@example.com')`. Rien ne touche à la production.

`npm run dev` lance l'application et le serveur contre le projet Firebase réel.
`npm run build` puis `npm start` lancent la version de production.

## Vérifications

```bash
npm run lint           # typage TypeScript
npm run test:rules     # 24 tests des règles de sécurité (isolation, rôles, invitations, journal)
npm run build
```

## Mise en production

1. Publier `firestore.rules` sur la base du projet (console Firebase ou `firebase deploy --only firestore:rules`).
   L'application et les règles doivent être publiées ensemble.
2. Vérifier que la connexion Google est activée dans Firebase Authentication.
   Définir `GEMINI_API_KEY` sur le serveur pour activer les textes par IA.
3. Le compte d'origine se connecte, crée son espace et coche « Reprendre mes données existantes » :
   les anciennes collections sont copiées dans l'espace, les originaux restent en place.
