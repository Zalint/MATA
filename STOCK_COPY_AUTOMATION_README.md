# Copie Automatique du Stock - Documentation

## Vue d'ensemble

Système automatisé de copie du stock soir du jour J vers le stock matin du jour J+1, programmé pour s'exécuter quotidiennement à **5h00 UTC** via un cron scheduler sur Render.

## 🎯 Objectif

Automatiser la transition du stock soir vers le stock matin du lendemain, éliminant la saisie manuelle et garantissant la continuité des données d'inventaire.

## 📋 Fonctionnement

### Processus automatique
```
Stock Soir (J) → Transformation → Stock Matin (J+1)
     ↓                ↓                  ↓
19h30 (exemple)   5h00 UTC        Prêt pour J+1
```

### Exemple concret
- **Stock soir du 09/08/2025** → **Stock matin du 10/08/2025**
- Exécution le 10/08/2025 à 5h00 UTC
- Données immédiatement disponibles pour la journée

## 🗂️ Structure des fichiers

### Fichiers principaux
```
scripts/
├── copy-stock-cron.js      # Script principal de copie
├── test-copy-stock.js      # Tests et validation
└── [autres scripts]

render.yaml                 # Configuration Render
package.json               # Scripts NPM ajoutés
```

### Données traitées
```
Source:  data/by-date/2025-08-09/stock-soir.json
         ↓
Cible:   data/by-date/2025-08-10/stock-matin.json
```

## ⚙️ Configuration

### Variables d'environnement
```javascript
CONFIG = {
    DRY_RUN: false,           // Mode test (défaut: false)
    OVERRIDE_EXISTING: true,  // Écraser stock existant (défaut: true)
    TIMEZONE_OFFSET: 0,       // UTC (défaut: 0)
    LOG_LEVEL: 'info',        // Niveau de logs
    BACKUP_BEFORE_COPY: true  // Backup avant écrasement
}
```

### Horaire d'exécution
- **Production** : 5h00 UTC tous les jours
- **Tests** : 6h00 UTC tous les dimanches

## 🚀 Utilisation

### Scripts NPM disponibles
```bash
# Copie normale
npm run stock:copy

# Mode test (sans écriture)
npm run stock:copy:dry-run

# Tests complets
npm run stock:copy:test

# Créer données de test
npm run stock:copy:create-test

# Nettoyer données de test
npm run stock:copy:clean-test
```

### Exécution manuelle
```bash
# Copie normale
node scripts/copy-stock-cron.js

# Mode dry-run
node scripts/copy-stock-cron.js --dry-run

# Date spécifique (copie 2025-08-09 → 2025-08-10)
node scripts/copy-stock-cron.js --date=2025-08-09

# Tests
node scripts/test-copy-stock.js
```

## 📊 Transformation des données

### Format source (Stock Soir)
```json
{
  "Mbao-Boeuf": {
    "date": "09/08/2025",
    "typeStock": "soir",
    "Point de Vente": "Mbao",
    "Produit": "Boeuf",
    "Nombre": "25.5",
    "PU": "3700",
    "Montant": "94350",
    "Commentaire": "Stock de fin de journée"
  }
}
```

### Format cible (Stock Matin)
```json
{
  "Mbao-Boeuf": {
    "date": "10/08/2025",
    "typeStock": "matin",
    "Point de Vente": "Mbao",
    "Produit": "Boeuf",
    "Nombre": "25.5",
    "PU": "3700",
    "Montant": "94350",
    "Commentaire": "Copié automatiquement du stock soir du 09/08/2025"
  }
}
```

### Règles de transformation
1. **Date** : J → J+1
2. **Type** : "soir" → "matin"
3. **Commentaire** : Ajout automatique de la traçabilité
4. **Autres champs** : Conservation à l'identique

## 🛡️ Gestion d'erreurs

### Cas gérés automatiquement
- **Stock soir inexistant** : Log warning, pas d'erreur
- **Stock matin existant** : Écrasement (OVERRIDE_EXISTING=true)
- **Répertoire manquant** : Création automatique
- **Erreurs de lecture/écriture** : Logs détaillés et codes d'erreur

### Codes de sortie
- **0** : Succès
- **1** : Échec (voir logs pour détails)

## 📝 Logging

### Niveaux de logs
```javascript
DEBUG : Informations détaillées de débogage
INFO  : Informations générales d'exécution
WARN  : Avertissements (stock soir manquant, etc.)
ERROR : Erreurs critiques
```

### Format des logs
```
[2025-08-10T05:00:00.000Z] [INFO] 🚀 Début de la copie automatique du stock
[2025-08-10T05:00:00.100Z] [INFO] 📅 Copie: Stock soir du 09/08/2025 → Stock matin du 10/08/2025
[2025-08-10T05:00:00.200Z] [INFO] 📊 Stock soir chargé: 3 éléments
[2025-08-10T05:00:00.250Z] [INFO] ✅ 3 éléments à copier
[2025-08-10T05:00:00.300Z] [INFO] 💾 Stock matin sauvegardé: /path/to/stock-matin.json
[2025-08-10T05:00:00.350Z] [INFO] 🎉 Copie terminée avec succès en 350ms
```

## 🧪 Tests

### Tests automatisés
```bash
# Suite complète de tests
npm run stock:copy:test

# Tests individuels
node scripts/test-copy-stock.js --create-test-data
node scripts/test-copy-stock.js --test-copy
node scripts/test-copy-stock.js --clean-test-data
```

### Scénarios testés
1. **Création de données** : Génération de stock soir test
2. **Copie dry-run** : Validation sans écriture
3. **Copie réelle** : Test avec écriture effective
4. **Validation** : Vérification structure et contenu
5. **Nettoyage** : Suppression données de test

### Exemple de sortie de test
```
🧪 Test: Création de données de test
✅ Création de données de test - Succès (45ms)

🧪 Test: Test copie (dry-run)
✅ Test copie (dry-run) - Succès (12ms)

🧪 Test: Test copie réelle
✅ Test copie réelle - Succès (28ms)

📊 Résumé des tests:
══════════════════════════════════════════════════
✅ Création de données de test (45ms)
✅ Test copie (dry-run) (12ms)
✅ Test copie réelle (28ms)
✅ Validation des données copiées (8ms)
✅ Nettoyage des données de test (15ms)
══════════════════════════════════════════════════
Total: 5/5 tests réussis
🎉 Tous les tests sont passés !
```

## 🚀 Déploiement sur Render

### Configuration automatique
Le fichier `render.yaml` configure :
1. **Service web** : Serveur principal
2. **Service cron** : Copie automatique quotidienne
3. **Service test** : Validation hebdomadaire

### Variables d'environnement Render
```yaml
envVars:
  - key: NODE_ENV
    value: production
  - key: LOG_LEVEL
    value: info
```

### Horaires cron
```yaml
# Copie quotidienne à 5h00 UTC
schedule: "0 5 * * *"

# Tests hebdomadaires dimanche 6h00 UTC
schedule: "0 6 * * 0"
```

## 🔧 Maintenance

### Surveillance recommandée
1. **Logs quotidiens** : Vérifier succès/échec via Render
2. **Données manquantes** : Alertes si stock soir absent
3. **Performance** : Temps d'exécution normal < 1 seconde
4. **Espace disque** : Croissance fichiers de données

### Dépannage
```bash
# Vérifier logs récents
node scripts/copy-stock-cron.js --dry-run

# Tester avec données réelles
npm run stock:copy:test

# Exécution manuelle d'urgence
npm run stock:copy

# Diagnostic complet
npm run stock:copy:test && npm run stock:copy:dry-run
```

### Actions correctives communes
1. **Stock soir manquant** : Exécution manuelle avec données précédentes
2. **Erreur d'écriture** : Vérification permissions/espace disque
3. **Format incorrect** : Validation données source
4. **Cron non exécuté** : Vérification configuration Render

## 🎛️ Personnalisation

### Modifier l'horaire
```yaml
# Dans render.yaml
schedule: "0 6 * * *"  # 6h00 au lieu de 5h00
```

### Changer la configuration
```javascript
// Dans copy-stock-cron.js
const CONFIG = {
    OVERRIDE_EXISTING: false,  // Ne pas écraser
    BACKUP_BEFORE_COPY: true,  // Toujours sauvegarder
    LOG_LEVEL: 'debug'         // Logs détaillés
};
```

### Ajouter notifications
```javascript
// Exemple d'extension pour webhook
async function notifySuccess(result) {
    await fetch('YOUR_WEBHOOK_URL', {
        method: 'POST',
        body: JSON.stringify({
            message: `Stock copié: ${result.itemsCopied} éléments`,
            timestamp: new Date().toISOString()
        })
    });
}
```

## 📞 Support

### En cas de problème
1. **Consulter les logs** Render dashboard
2. **Exécuter tests** : `npm run stock:copy:test`
3. **Vérifier format données** : Fichiers source corrects
4. **Tester manuellement** : `npm run stock:copy:dry-run`

### Contacts et ressources
- **Documentation technique** : Ce fichier
- **Scripts** : `scripts/` répertoire
- **Tests** : `npm run stock:copy:test`
- **Logs** : Render dashboard ou console locale
