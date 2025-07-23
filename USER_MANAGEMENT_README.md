# Gestion des Utilisateurs - Documentation

## Vue d'ensemble

Cette fonctionnalité permet à l'utilisateur ADMIN de gérer tous les utilisateurs de l'application. Seul l'utilisateur ADMIN a accès à cette interface.

## Fonctionnalités

### 1. Création d'utilisateurs
- Créer de nouveaux utilisateurs avec un nom d'utilisateur unique
- Assigner un rôle (utilisateur ou administrateur)
- Assigner un point de vente spécifique ou "tous les points de vente"
- Définir le statut actif/inactif lors de la création

### 2. Gestion des utilisateurs existants
- Voir la liste de tous les utilisateurs avec leurs informations
- Activer/désactiver des utilisateurs
- Supprimer des utilisateurs (sauf l'utilisateur ADMIN)

### 3. Sécurité
- Seul l'utilisateur ADMIN peut accéder à cette interface
- Les utilisateurs inactifs ne peuvent plus se connecter à l'application
- L'utilisateur ADMIN ne peut pas être supprimé ou désactivé

### 4. Persistance des données
- Les utilisateurs sont sauvegardés dans `src/data/by-date/users.json`
- Les modifications persistent entre les redémarrages du serveur
- Sauvegarde automatique après chaque modification

## Accès à l'interface

1. Connectez-vous avec l'utilisateur ADMIN
2. Vous serez automatiquement redirigé vers `user-management.html`
3. Ou accédez directement à `http://localhost:3000/user-management.html`

## Points de vente disponibles

- **tous** : Accès à tous les points de vente
- **Mbao** : Point de vente Mbao uniquement
- **O.Foire** : Point de vente O.Foire uniquement
- **Keur Massar** : Point de vente Keur Massar uniquement
- **Linguere** : Point de vente Linguere uniquement
- **Dahra** : Point de vente Dahra uniquement
- **Touba** : Point de vente Touba uniquement
- **Sacre Coeur** : Point de vente Sacre Coeur uniquement

## Rôles disponibles

- **lecteur** : Utilisateur en lecture seule, peut consulter toutes les données de tous les points de vente (sauf estimation, copier stock et cash payment)
- **user** : Utilisateur standard avec accès limité
- **admin** : Administrateur avec accès complet

## API Endpoints

### GET /api/admin/users
Récupère la liste de tous les utilisateurs (sans les mots de passe)

### POST /api/admin/users
Crée un nouvel utilisateur
```json
{
  "username": "NOM_UTILISATEUR",
  "password": "mot_de_passe",
  "role": "lecteur|user|admin",
  "pointVente": "nom_du_point_vente",
  "active": true|false
}
```

### POST /api/admin/users/:username/toggle-status
Active/désactive un utilisateur

### DELETE /api/admin/users/:username
Supprime un utilisateur

## Test de la fonctionnalité

Pour tester la fonctionnalité, exécutez le script de test :

```bash
node test-user-management.js
```

Ce script teste toutes les fonctionnalités de gestion des utilisateurs.

## Fichiers modifiés/créés

### Fichiers créés
- `user-management.html` : Interface utilisateur pour la gestion des utilisateurs
- `js/user-management.js` : Logique JavaScript pour l'interface
- `test-user-management.js` : Script de test
- `USER_MANAGEMENT_README.md` : Cette documentation
- `src/data/by-date/users.json` : Fichier de persistance des utilisateurs

### Fichiers modifiés
- `users.js` : Ajout du champ `active`, nouvelles fonctions et persistance
- `server.js` : Ajout des routes API pour la gestion des utilisateurs
- `admin.html` : Ajout du lien vers la gestion des utilisateurs
- `admin.js` : Logique pour afficher le lien seulement pour ADMIN

## Notes importantes

1. **Sécurité** : Seul l'utilisateur ADMIN peut accéder à cette fonctionnalité
2. **Protection** : L'utilisateur ADMIN ne peut pas être supprimé ou désactivé
3. **Persistance** : Les modifications sont sauvegardées dans `src/data/by-date/users.json`
4. **Validation** : Les noms d'utilisateur doivent être uniques
5. **Mots de passe** : Les mots de passe sont hachés avec bcrypt avant stockage

## Authentification ADMIN

- **Nom d'utilisateur** : `ADMIN`
- **Mot de passe** : `Mata2024A!`

## Utilisateur de test LECTEUR

- **Nom d'utilisateur** : `LECTEUR`
- **Mot de passe** : `lecteur123`
- **Rôle** : `lecteur`
- **Point de vente** : `tous`

## Utilisation recommandée

1. Créez d'abord les utilisateurs avec le statut "actif"
2. Assignez les points de vente appropriés selon les besoins
3. Utilisez la désactivation plutôt que la suppression pour les utilisateurs temporairement indisponibles
4. Supprimez uniquement les utilisateurs qui ne doivent plus avoir accès à l'application
5. Les modifications sont automatiquement sauvegardées et persistent entre les redémarrages 