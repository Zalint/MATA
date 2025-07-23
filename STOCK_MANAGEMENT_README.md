# Gestion des Stocks et Transferts - Interface Admin

## Description

Cette nouvelle fonctionnalité permet à l'utilisateur ADMIN de consulter et exporter les données de stock matin, stock soir et transferts dans un tableau consolidé avec calcul automatique des ventes théoriques.

## Accès

1. Se connecter en tant qu'utilisateur ADMIN
2. Aller sur `/admin.html`
3. Cliquer sur l'onglet "Gestion des Stocks" dans la navigation

## Fonctionnalités

### Tableau consolidé
Le tableau affiche les données sous le format :
- **Date** : Date au format JJ/MM/AAAA
- **Point de Vente** : Nom du point de vente
- **Produit** : Type de produit (Boeuf, Veau, Poulet, Volaille)
- **Stock Matin** : Montant du stock matin en FCFA
- **Stock Soir** : Montant du stock soir en FCFA
- **Transferts** : Montant des transferts en FCFA
- **Ventes Théoriques** : Calcul automatique = Stock Soir - (Stock Matin + Transferts)

### Filtres disponibles
- **Période** : Sélection de dates de début et fin
- **Point de vente** : Filtrer par point de vente spécifique
- **Produit** : Filtrer par type de produit

### Export Excel
- Bouton "Exporter en Excel" pour télécharger les données
- Fichier avec un seul onglet "Stocks et Ventes"
- Nom de fichier incluant la période et les filtres appliqués

## Calcul des Ventes Théoriques

La formule utilisée est :
```
Ventes Théoriques = Stock Soir - (Stock Matin + Transferts)
```

- **Ventes Théoriques positives** (vert) : Indiquent des ventes réalisées
- **Ventes Théoriques négatives** (rouge) : Indiquent des anomalies ou des erreurs de saisie

## Structure des données

Les données sont récupérées depuis les fichiers JSON dans le dossier `data/by-date/` :
- `stock-matin.json` : Données de stock matin
- `stock-soir.json` : Données de stock soir  
- `transferts.json` : Données des transferts

## Utilisation

1. **Sélectionner une période** : Choisir les dates de début et fin
2. **Appliquer des filtres** (optionnel) : Sélectionner un point de vente et/ou produit
3. **Rechercher** : Cliquer sur "Rechercher" pour afficher les données
4. **Analyser** : Consulter le tableau avec les ventes théoriques
5. **Exporter** : Cliquer sur "Exporter en Excel" pour télécharger le rapport

## Exemple de données

```
Date        | Point de Vente | Produit | Stock Matin | Stock Soir | Transferts | Ventes Théoriques
17/07/2025  | Mbao          | Boeuf   | 37,000 FCFA | 18,500 FCFA| 7,400 FCFA | -25,900 FCFA
```

## Notes techniques

- Les données sont automatiquement chargées pour les 7 derniers jours au démarrage
- Les transferts multiples pour la même date/point de vente/produit sont additionnés
- Le tri est effectué par date, puis par point de vente, puis par produit
- L'export Excel inclut toutes les colonnes du tableau consolidé 