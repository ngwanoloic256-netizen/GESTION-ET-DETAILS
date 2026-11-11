# Plateforme SaaS — Commerce & marketing digital pour l'Afrique

Application web multi-organisations : chaque commerçant ou agence crée son espace,
invite son équipe et gère ses données de façon isolée.

Le cadrage produit complet (modules, modèle économique, feuille de route) est dans le
cahier conceptuel. Ce dépôt en est l'implémentation, phase par phase.

## État d'avancement

| Phase du cahier | État |
|---|---|
| 1. Fondations — comptes, organisations, rôles, onboarding, journal | **Fait** (stockage de fichiers reporté à la phase 2, où il sert pour la première fois) |
| 2. Creative Studio | À faire |
| 3. Meta Ads MVP | À faire |
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
organisations/{orgId}/<collection>/{id}  données métier de l'espace
invitations/{orgId}_{email}              invitation en attente
```

Rôles :

- **Propriétaire** : tout, et ne peut être ni rétrogradé ni retiré.
- **Administrateur** : paramètres, équipe, suppressions, outils de masse, lecture du journal.
- **Collaborateur** : saisie et consultation des données de l'espace.

Ces droits sont imposés par `firestore.rules`, pas seulement par l'interface.

## Développement

Prérequis : Node.js 22+, Java (pour l'émulateur Firestore).

```bash
npm install
npm run emulators      # terminal 1 : émulateurs Firestore + Auth
npm run dev:local      # terminal 2 : application branchée sur les émulateurs
```

En mode local, la connexion Google est remplacée par une commande dans la console du
navigateur : `__devSignIn('awa@example.com')`. Rien ne touche à la production.

`npm run dev` lance l'application contre le projet Firebase réel.

## Vérifications

```bash
npm run lint           # typage TypeScript
npm run test:rules     # 23 tests des règles de sécurité (isolation, rôles, invitations, journal)
npm run build
```

## Mise en production

1. Publier `firestore.rules` sur la base du projet (console Firebase ou `firebase deploy --only firestore:rules`).
   L'application et les règles doivent être publiées ensemble.
2. Vérifier que la connexion Google est activée dans Firebase Authentication.
3. Le compte d'origine se connecte, crée son espace et coche « Reprendre mes données existantes » :
   les anciennes collections sont copiées dans l'espace, les originaux restent en place.
