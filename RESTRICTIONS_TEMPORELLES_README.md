# Restrictions Temporelles - NADOU et PAPI

## Vue d'ensemble

Cette fonctionnalité implémente des restrictions temporelles spécifiques pour les utilisateurs **NADOU** et **PAPI** concernant la modification des données de stock et transferts.

## Règle de restriction

### 📅 Règle générale
Les utilisateurs **NADOU** et **PAPI** ne peuvent **plus modifier** les données de stock (matin, soir) et transferts d'une date donnée après **3h00 du matin du jour suivant**.

### 🕐 Exemple concret
- Pour les données du **09/08/2025** :
  - ✅ Modification autorisée : jusqu'au **10/08/2025 à 2h59**
  - ❌ Modification bloquée : à partir du **10/08/2025 à 3h00**

## Utilisateurs concernés

### 🚫 Soumis aux restrictions
- **NADOU** (`username: "NADOU"`)
- **PAPI** (`username: "PAPI"`)

### ✅ Non concernés par les restrictions
- **ADMIN** - Accès illimité
- **MBA**, **OSF**, **KMS**, **LNG**, **DHR**, **TBM**, **SCR**, **OUSMANE**, **SALIOU**, **SEB** - Accès normal
- **MDN**, **LECTEUR** - Lecture seule (déjà restreints)

## Fonctionnalités impactées

### 📊 Modifications de stock
- **Stock matin** (`/api/stock/matin`)
- **Stock soir** (`/api/stock/soir`)

### 🔄 Transferts
- **Création/modification de transferts** (`/api/transferts`)

## Implémentation technique

### 🔧 Côté serveur (server.js)
```javascript
// Middleware checkTimeRestrictions
function checkTimeRestrictions(req, res, next) {
    // Vérifie si l'utilisateur est NADOU ou PAPI
    // Calcule la date limite (date + 1 jour + 3h)
    // Bloque si la limite est dépassée
}
```

### 🖥️ Côté frontend (script.js)
```javascript
// Validation préventive avant envoi
function verifierRestrictionsTemporelles(date, username) {
    // Même logique que le serveur
    // Affiche un message d'alerte immédiat
}
```

## Messages d'erreur

### 🚨 Message de blocage
```
Modification interdite. Les données du 09/08/2025 ne peuvent plus être modifiées après le 10/08/2025 à 3h00.
```

### 📍 Structure de la réponse d'erreur
```json
{
    "success": false,
    "error": "Modification interdite. Les données du 09/08/2025 ne peuvent plus être modifiées après le 10/08/2025 à 3h00.",
    "timeRestriction": true
}
```

## Tests

### 🧪 Tests automatisés
- **Fichier** : `tests/time-restrictions.test.js`
- **Couverture** : Tests pour NADOU, PAPI, et autres utilisateurs
- **Scénarios** : Même jour, jour suivant avant 3h, après délai

### 🔍 Tests manuels
- **Script** : `test-time-restrictions.js`
- **Usage** : `node test-time-restrictions.js`
- **Fonctionnalités** : Validation logique, génération de données test

## Exemples d'utilisation

### ✅ Cas autorisés

#### Modification le jour même
```javascript
// NADOU modifie les données du 10/08/2025 le 10/08/2025
// ➜ AUTORISÉ
```

#### Modification le lendemain avant 3h
```javascript
// PAPI modifie les données du 09/08/2025 le 10/08/2025 à 2h30
// ➜ AUTORISÉ
```

### ❌ Cas bloqués

#### Modification après la limite
```javascript
// NADOU modifie les données du 09/08/2025 le 10/08/2025 à 3h15
// ➜ BLOQUÉ
```

#### Modification de données anciennes
```javascript
// PAPI modifie les données du 08/08/2025 le 10/08/2025
// ➜ BLOQUÉ
```

## Configuration

### 🔧 Paramètres modifiables
```javascript
// Dans server.js et script.js
const HEURE_LIMITE = 3; // 3h00 du matin
const JOURS_DELAI = 1; // 1 jour après la date des données
```

### 👥 Utilisateurs concernés
```javascript
// Ajout/suppression d'utilisateurs
if (user.username === 'NADOU' || user.username === 'PAPI' || user.username === 'NOUVEAU_USER') {
    // Appliquer restrictions
}
```

## Maintenance

### 🔍 Logs de débogage
- Les tentatives bloquées sont loggées côté serveur
- Messages d'erreur détaillés pour le débogage

### 📊 Monitoring
- Surveillez les erreurs 403 avec `timeRestriction: true`
- Analysez les patterns d'utilisation hors délais

## Sécurité

### 🔒 Double validation
1. **Frontend** : Alerte immédiate pour l'utilisateur
2. **Backend** : Validation finale et sécurisée

### 🛡️ Contournement impossible
- Validation côté serveur obligatoire
- Impossible de bypasser via modification du frontend

## Support

### 🆘 En cas de problème
1. Vérifiez les logs serveur
2. Testez avec le script `test-time-restrictions.js`
3. Vérifiez la session utilisateur
4. Contrôlez le format de date (JJ/MM/AAAA)

### 📞 Contact technique
- Vérifiez d'abord la documentation
- Analysez les logs d'erreur
- Testez avec différents utilisateurs
