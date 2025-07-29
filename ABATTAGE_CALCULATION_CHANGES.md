# Modifications pour le Calcul Spécial du Pourcentage d'Écart - Point de Vente "Abattage"

## Résumé des Changements

Le point de vente "Abattage" utilise maintenant un calcul spécial pour le pourcentage d'écart appelé **"Pération"** :
- **Formule standard** (autres points de vente) : `(Écart / Ventes Théoriques) × 100`
- **Formule spéciale** (Abattage) : `(Ventes Théoriques / Stock Matin) × 100`
- **Gestion du cas spécial** : Si le stock matin est nul, le calcul retourne `null` (N/A)

## Fichiers Modifiés

### 1. `script.js`
**Fonction :** `calculerReconciliationParPointVente` (lignes 4417-4430)
```javascript
            // Calcul spécial pour le point de vente "Abattage"
            if (pointVente === 'Abattage') {
                // Pour Abattage : (Ventes Théoriques / Stock Matin) * 100
    if (reconciliation[pointVente].stockMatin !== 0) {
        reconciliation[pointVente].pourcentageEcart = 
            (reconciliation[pointVente].ventes / reconciliation[pointVente].stockMatin) * 100;
                    } else {
                    // Cas où le stock matin est nul - pas de calcul possible
                    reconciliation[pointVente].pourcentageEcart = null;
                    reconciliation[pointVente].commentaire = 'Stock matin nul - calcul impossible';
                }
} else {
    // Pour les autres points de vente : (Écart / Ventes Théoriques) * 100
    reconciliation[pointVente].pourcentageEcart = 
        (reconciliation[pointVente].difference / reconciliation[pointVente].ventes) * 100;
}
```

**Fonction :** `exportReconciliationMoisToExcel` (lignes 7177-7185)
```javascript
// Calculate percentage difference
let pourcentageEcart;
                    if (pointVente === 'Abattage') {
                        // Pour Abattage : (Ventes Théoriques / Stock Matin) * 100
                            if (stockMatinValue > 0) {
                            pourcentageEcart = (ventesTheoriques / stockMatinValue) * 100;
                        } else {
                            // Cas où le stock matin est nul - pas de calcul possible
                            pourcentageEcart = null;
                        }
} else {
    // Pour les autres points de vente : (Écart / Ventes Théoriques) * 100
    pourcentageEcart = ventesTheoriques > 0 ? (difference / ventesTheoriques) * 100 : 0;
}
```

### 2. `server.js`
**Fonction :** API `/api/external/reconciliation` (lignes 3778-3785)
```javascript
// Calculate percentages
            if (pdvData.pointVente === 'Abattage') {
                // Pour Abattage : (Ventes Théoriques / Stock Matin) * 100
    const stockMatinAbs = Math.abs(pdvData.stockMatin);
                    if (stockMatinAbs > 0) {
                    pdvData.ecartPct = (pdvData.ventesTheoriques / stockMatinAbs * 100).toFixed(2);
                } else {
                    // Cas où le stock matin est nul - pas de calcul possible
                    pdvData.ecartPct = null;
                }
} else {
    // Pour les autres points de vente : (Écart absolu / Ventes Théoriques absolues) * 100
    const stockVariation = Math.abs(pdvData.ventesTheoriques);
    pdvData.ecartPct = stockVariation > 0 ? (Math.abs(pdvData.ecart) / stockVariation * 100).toFixed(2) : 0;
}
```

## Fichiers de Test Ajoutés

### 1. `tests/abattage-calculation.test.js`
Nouveau fichier de test spécifique pour vérifier le calcul spécial pour abattage.

### 2. `tests/reconciliation.test.js`
Ajout d'un test pour le calcul spécial d'abattage.

### 3. `demo-abattage-calculation.js`
Script de démonstration montrant la différence entre les deux calculs, incluant le cas du stock matin nul.

### 4. `index.html`
Ajout d'une alerte d'information expliquant la "Pération" pour le point de vente abattage.

## Interprétation des Résultats

### Calcul Standard (autres points de vente)
- **Formule :** `(Écart / Ventes Théoriques) × 100`
- **Mesure :** Le pourcentage d'écart par rapport aux ventes théoriques
- **Interprétation :** Plus le pourcentage est élevé, plus il y a d'écart

### Calcul Spécial (abattage) - "Pération"
- **Formule :** `(Ventes Théoriques / Stock Matin) × 100`
- **Mesure :** Le pourcentage du stock matin qui a été vendu (perte de volume entre abattoir et point de vente)
- **Interprétation :** Plus le pourcentage est élevé, plus l'efficacité de vente est bonne
- **Cas spécial :** Si le stock matin est nul, le calcul retourne `null` (N/A)

## Exemple Concret

**Données :**
- Stock Matin : 1 000 000 FCFA
- Stock Soir : 200 000 FCFA
- Transferts : 50 000 FCFA
- Ventes Saisies : 800 000 FCFA

**Calculs :**
- Ventes Théoriques : 1 000 000 - 200 000 + 50 000 = 850 000 FCFA
- Écart : 850 000 - 800 000 = 50 000 FCFA

**Pourcentages :**
- **Standard :** (50 000 / 850 000) × 100 = 5.88%
- **Abattage (Pération) :** (850 000 / 1 000 000) × 100 = 85.00%

**Exemple avec stock matin nul :**
- **Stock Matin :** 0 FCFA
- **Ventes Théoriques :** 50 000 FCFA
- **Abattage (Pération) :** N/A (calcul impossible)

## Avantages du Calcul Spécial pour Abattage

1. **Mesure l'efficacité de vente** par rapport au stock disponible
2. **Plus intuitif** pour évaluer la performance de l'abattage
3. **Permet de voir rapidement** quel pourcentage du stock a été écoulé
4. **Utile pour la planification** et l'optimisation des stocks
5. **Gestion robuste** du cas où le stock matin est nul
6. **Interface utilisateur claire** avec information sur la "Pération"

## Tests

Pour exécuter les tests :
```bash
npm test tests/abattage-calculation.test.js
```

Pour voir la démonstration :
```bash
node demo-abattage-calculation.js
```

## Interface Utilisateur

### Information sur la "Pération"
Une alerte d'information s'affiche automatiquement quand le point de vente "abattage" est présent dans les données de réconciliation, expliquant :
- **Définition :** Perte de volume entre l'abattoir et le point de vente
- **Calcul :** (Ventes Théoriques / Stock Matin) × 100
- **Interprétation :** Plus le pourcentage est élevé, plus l'efficacité de vente est bonne

### Affichage des Valeurs
- **Valeurs normales :** Affichées avec 2 décimales et couleur selon la performance
- **Stock matin nul :** Affiché comme "N/A" avec style italique et grisé
- **Tooltip :** Information contextuelle au survol des cellules

## Impact

Cette modification affecte uniquement le point de vente "abattage" et n'a aucun impact sur les autres points de vente qui continuent d'utiliser le calcul standard. Le changement est rétrocompatible et n'affecte pas les données existantes. 