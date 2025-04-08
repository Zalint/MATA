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

## Analyse des données avec DeepSeek-Local

Cette application intègre DeepSeek-Local pour l'analyse des données de réconciliation directement dans votre navigateur. DeepSeek-Local utilise des techniques d'analyse statistique et de traitement du langage naturel pour fournir des insights sur vos données sans nécessiter de connexion internet ou d'API externe.

### Configuration de DeepSeek-Local

Pour configurer DeepSeek-Local:

1. Installez les dépendances requises:
   ```
   npm install
   ```

2. Configurez l'environnement DeepSeek-Local:
   ```
   npm run download-deepseek
   ```
   Cette commande installera les packages nécessaires et créera les fichiers de configuration dans le dossier `models/deepseek-local`.

3. Démarrez l'application:
   ```
   npm start
   ```

### Utilisation de DeepSeek-Local dans l'application

1. Accédez à la section "Réconciliation".
2. Sélectionnez un point de vente dans le tableau pour voir les détails.
3. Cliquez sur le bouton "Analyser les résultats avec DeepSeek".
4. L'analyse locale s'exécutera et affichera les résultats sans envoyer de données à des services externes.

### Avantages de l'analyse locale

- **Confidentialité des données**: toutes les analyses sont effectuées localement.
- **Pas de dépendance à une connexion internet**: les analyses fonctionnent même hors ligne.
- **Pas de coûts d'API récurrents**: aucun frais pour l'utilisation de services externes.
- **Analyses rapides**: traitement immédiat sans latence réseau.

### Configuration avancée

Vous pouvez personnaliser l'analyse en modifiant les fichiers suivants:

- `models/deepseek-local/config.json`: paramètres généraux de l'analyse
- `models/deepseek-local/keywords.json`: mots-clés et termes utilisés pour l'analyse des écarts

## Autres fonctionnalités de l'application

[Documentation existante de l'application...] 