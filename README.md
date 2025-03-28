# Système de Gestion des Ventes

Une application web pour la gestion des ventes de produits alimentaires, développée avec Node.js et JavaScript.

## Fonctionnalités

- Saisie des ventes avec catégorisation des produits
- Visualisation des ventes avec graphiques
- Import de données depuis Excel/CSV
- Gestion des utilisateurs et des points de vente
- Calcul automatique des totaux
- Pagination des données

## Prérequis

- Node.js (v14 ou supérieur)
- npm (v6 ou supérieur)

## Installation

1. Cloner le dépôt :
```bash
git clone [URL_DU_REPO]
cd [NOM_DU_DOSSIER]
```

2. Installer les dépendances :
```bash
npm install
```

3. Configurer les variables d'environnement :
Créer un fichier `.env` à la racine du projet avec les variables suivantes :
```
PORT=3000
SESSION_SECRET=votre_secret_ici
```

4. Lancer l'application :
```bash
npm start
```

## Structure du Projet

```
├── public/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── script.js
│   └── index.html
├── server.js
├── package.json
└── README.md
```

## Utilisation

1. Accéder à l'application via `http://localhost:3000`
2. Se connecter avec les identifiants fournis
3. Utiliser les différents onglets pour :
   - Saisir des ventes
   - Visualiser les données
   - Importer des données

## Sécurité

- Authentification requise pour toutes les opérations
- Gestion des sessions avec cookies sécurisés
- Validation des données côté serveur
- Protection contre les injections SQL

## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
1. Fork le projet
2. Créer une branche pour votre fonctionnalité
3. Commiter vos changements
4. Pousser vers la branche
5. Ouvrir une Pull Request

## Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails. 