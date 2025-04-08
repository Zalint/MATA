# Système de Base de Données pour la Gestion des Ventes

Ce document explique comment utiliser le système de base de données PostgreSQL mis en place pour l'application de gestion des ventes.

## Structure de la Base de Données

La base de données est composée de trois tables principales :

1. **ventes** : Enregistre toutes les transactions de vente
2. **stocks** : Stocke les informations d'inventaire (matin et soir)
3. **transferts** : Gère les mouvements de stock entre points de vente

### Configuration de la Base de Données

L'application utilise PostgreSQL comme système de gestion de base de données. La configuration se fait via des variables d'environnement:

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=ventes_db
DB_SSL=false
```

Vous pouvez modifier ces valeurs dans le fichier `.env` à la racine du projet.

## Commandes Disponibles

Toutes les commandes suivantes sont disponibles via npm :

### Gestion de la Base de Données

- **Migrer les données CSV vers la BDD** : `npm run migrate`
- **Créer/Réinitialiser la BDD** : `npm run db:create` ou `npm run db:reset`
- **Voir le contenu de la BDD** : `npm run db:view`
- **Explorer le schéma de la BDD** : `npm run db:schema`
- **Explorer les données avec filtres** : `npm run db:explore`
- **Exporter toute la BDD en CSV** : `npm run db:export`
- **Migrer les données de SQLite vers PostgreSQL** : `npm run db:migrate:sqlite-to-postgres`

## Utilisation dans le Code

Pour utiliser la base de données dans votre code, importez les modèles depuis le module `db/models` :

```javascript
const { Vente, Stock, Transfert } = require('./db/models');
```

### Exemples d'Utilisation

#### Récupérer toutes les ventes

```javascript
const ventes = await Vente.findAll();
```

#### Récupérer les ventes filtrées

```javascript
const ventes = await Vente.findAll({
  where: {
    date: '01-04-2025',
    pointVente: 'Mbao'
  }
});
```

#### Ajouter une nouvelle vente

```javascript
const nouvelleVente = await Vente.create({
  mois: 'Avril',
  date: '07-04-2025',
  semaine: 'S2',
  pointVente: 'Mbao',
  preparation: 'Mbao',
  categorie: 'Bovin',
  produit: 'Veau',
  prixUnit: 3800,
  nombre: 2.5,
  montant: 9500
});
```

#### Mettre à jour une vente

```javascript
await Vente.update({
  nombre: 3,
  montant: 11400
}, {
  where: { id: 1 }
});
```

#### Supprimer une vente

```javascript
await Vente.destroy({
  where: { id: 1 }
});
```

## Utilitaires de Base de Données

Des utilitaires supplémentaires sont disponibles dans `db/utils.js` pour simplifier les opérations courantes :

```javascript
const dbUtils = require('./db/utils');

// Récupérer les ventes pour une période
const ventes = await dbUtils.getVentesByPeriod(dateDebut, dateFin, pointVente);

// Récupérer les ventes pour une date spécifique
const ventes = await dbUtils.getVentesByDate(date, pointVente);

// Récupérer le stock pour une date
const stock = await dbUtils.getStockByDate(date, 'matin', pointVente);

// Récupérer les transferts pour une date
const transferts = await dbUtils.getTransfertsByDate(date, pointVente);

// Calculer les statistiques par catégorie
const stats = await dbUtils.getStatsByCategoryAndPeriod(dateDebut, dateFin, pointVente);
```

## Migration de SQLite à PostgreSQL

Pour migrer les données d'une base de données SQLite existante vers PostgreSQL :

1. Assurez-vous que PostgreSQL est installé et en cours d'exécution
2. Créez une nouvelle base de données PostgreSQL nommée `ventes_db` (ou modifiez le nom dans .env)
3. Configurez les paramètres de connexion dans le fichier `.env`
4. Exécutez la commande : `npm run db:migrate:sqlite-to-postgres`

Le script lira les données de `db/database.sqlite` et les transférera vers la base de données PostgreSQL configurée.

## Sauvegarde et Restauration

### Export de la Base de Données

Pour exporter toute la base de données en fichiers CSV, utilisez la commande :

```
npm run db:export
```

Cela générera des fichiers CSV dans le répertoire `exports/` avec un horodatage.

### Sauvegarde PostgreSQL

Pour créer une sauvegarde complète de la base de données PostgreSQL :

```bash
# Remplacez les valeurs par vos paramètres de connexion
pg_dump -U postgres -h localhost -p 5432 -d ventes_db -F c -f backup.dump
```

### Restauration PostgreSQL

Pour restaurer une sauvegarde PostgreSQL :

```bash
# Remplacez les valeurs par vos paramètres de connexion
pg_restore -U postgres -h localhost -p 5432 -d ventes_db -c backup.dump
```

## Résolution des Problèmes

### Erreurs de Connexion

Si vous rencontrez des erreurs de connexion à PostgreSQL :

1. Vérifiez que PostgreSQL est en cours d'exécution
2. Vérifiez les paramètres de connexion dans le fichier `.env`
3. Assurez-vous que l'utilisateur a les droits d'accès à la base de données
4. Vérifiez les journaux PostgreSQL pour les erreurs spécifiques

### SSL requis

Si vous vous connectez à une base de données PostgreSQL distante, vous devrez peut-être activer SSL :

1. Définissez `DB_SSL=true` dans le fichier `.env` 