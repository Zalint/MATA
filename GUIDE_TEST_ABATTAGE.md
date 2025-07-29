# 🧪 Guide de Test des Modifications Abattage

## Problème Identifié
Le tooltip "Pération" ne s'affiche pas quand vous survolez le pourcentage d'écart d'Abattage (-14.13%).

## Solutions Appliquées

### 1. ✅ Correction de la Logique d'Affichage
**Problème :** Le code vérifiait seulement `POINTS_VENTE_PHYSIQUES.includes('Abattage')` mais "Abattage" est dans `TOUS_POINTS_VENTE`.

**Solution :** Modifié pour vérifier les deux listes :
```javascript
const hasAbattage = (POINTS_VENTE_PHYSIQUES.includes('Abattage') || TOUS_POINTS_VENTE.includes('Abattage')) && reconciliation['Abattage'];
```

### 2. ✅ Correction de la Casse
**Problème :** Incohérence entre "Abattage" (majuscule) et "abattage" (minuscule).

**Solution :** Uniformisé toutes les références à "Abattage" avec un A majuscule.

### 3. ✅ Tooltip Spécial pour Abattage
**Fonctionnalité :** Le tooltip affiche maintenant :
- **Normal :** "Pération : Perte de volume entre abattoir et point de vente"
- **Stock matin nul :** "Stock matin nul - calcul impossible"

## Comment Tester

### Étape 1 : Vérifier que le Serveur Fonctionne
```bash
# Le serveur devrait déjà être en cours d'exécution sur le port 3000
# Si ce n'est pas le cas, démarrez-le :
node server.js
```

### Étape 2 : Tester la Page de Test
1. Ouvrez `test-tooltip.html` dans votre navigateur
2. Survolez les cellules pour tester les tooltips
3. Cliquez sur "🔍 Tester le Debug" pour voir les informations

### Étape 3 : Tester dans l'Application Principale
1. Allez sur `http://localhost:3000`
2. Connectez-vous à l'application
3. Allez dans "Réconciliation Stock / Ventes"
4. Sélectionnez une date avec des données Abattage (ex: 07/04/2025)
5. Cliquez sur "Calculer"
6. Vérifiez que :
   - L'information "Pération" s'affiche au-dessus du tableau
   - Le tooltip s'affiche quand vous survolez -14.13% pour Abattage

## Vérifications à Faire

### ✅ Information Pération Visible
- Une boîte d'information bleue doit apparaître au-dessus du tableau
- Titre : "Information sur la 'Pération' (Point de vente Abattage)"
- Contenu : Explication du calcul et de l'interprétation

### ✅ Tooltip sur le Pourcentage
- Survolez la cellule "-14.13%" dans la ligne Abattage
- Le tooltip doit afficher : "Pération : Perte de volume entre abattoir et point de vente"

### ✅ Calcul Correct
- Le pourcentage doit être calculé avec la formule : `(Ventes Théoriques / Stock Matin) × 100`
- Pour les données de l'image : `(-522800 / 3700000) × 100 = -14.13%`

### ✅ Gestion du Cas Spécial
- Si le stock matin est nul, le pourcentage affiche "N/A"
- Le tooltip affiche : "Stock matin nul - calcul impossible"

## Debug en Cas de Problème

### 1. Ouvrir la Console du Navigateur
- F12 → Console
- Vérifiez s'il y a des erreurs JavaScript

### 2. Vérifier les Variables
Dans la console, tapez :
```javascript
// Vérifier les listes de points de vente
console.log('POINTS_VENTE_PHYSIQUES:', POINTS_VENTE_PHYSIQUES);
console.log('TOUS_POINTS_VENTE:', TOUS_POINTS_VENTE);

// Vérifier les données de réconciliation
console.log('reconciliation[Abattage]:', reconciliation['Abattage']);
```

### 3. Vérifier l'Élément DOM
```javascript
// Vérifier si l'élément peration-info existe
const perationInfo = document.getElementById('peration-info');
console.log('perationInfo:', perationInfo);
console.log('perationInfo.style.display:', perationInfo?.style.display);
```

## Fichiers Modifiés

1. **`script.js`** - Logique principale de réconciliation
2. **`server.js`** - API backend
3. **`index.html`** - Interface utilisateur
4. **`tests/abattage-calculation.test.js`** - Tests unitaires
5. **`ABATTAGE_CALCULATION_CHANGES.md`** - Documentation

## Contact
Si le problème persiste, vérifiez :
1. Que le serveur a été redémarré après les modifications
2. Que le cache du navigateur a été vidé (Ctrl+F5)
3. Que les données Abattage sont bien présentes dans la réconciliation 