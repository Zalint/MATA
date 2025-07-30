/**
 * Script de débogage pour vérifier le problème avec Abattage
 */

// Simuler l'environnement du navigateur
const mockReconciliation = {
    'Abattage': {
        stockMatin: 3700000,
        stockSoir: 0,
        transferts: -4222800,
        ventes: -522800,
        ventesSaisies: 0,
        difference: -522800,
        pourcentageEcart: -14.13,
        cashPayment: 0,
        ecartCash: 0,
        commentaire: ''
    }
};

// Simuler différentes listes de points de vente pour tester
const testCases = [
    {
        name: "Test avec Abattage dans POINTS_VENTE_PHYSIQUES",
        POINTS_VENTE_PHYSIQUES: ['Mbao', 'O.Foire', 'Linguere', 'Dahra', 'Touba', 'Keur Massar', 'Abattage']
    },
    {
        name: "Test avec Abattage dans TOUS_POINTS_VENTE seulement",
        POINTS_VENTE_PHYSIQUES: ['Mbao', 'O.Foire', 'Linguere', 'Dahra', 'Touba', 'Keur Massar']
    },
    {
        name: "Test avec abattage en minuscules",
        POINTS_VENTE_PHYSIQUES: ['Mbao', 'O.Foire', 'Linguere', 'Dahra', 'Touba', 'Keur Massar', 'abattage']
    }
];

console.log('🔍 Débogage du problème Abattage\n');

testCases.forEach((testCase, index) => {
    console.log(`=== ${testCase.name} ===`);
    
    // Test 1: Vérifier si Abattage est dans la liste
    const hasAbattageInList = testCase.POINTS_VENTE_PHYSIQUES.includes('Abattage');
    const hasAbattageInReconciliation = mockReconciliation['Abattage'] !== undefined;
    
    console.log(`  Abattage dans POINTS_VENTE_PHYSIQUES: ${hasAbattageInList}`);
    console.log(`  Abattage dans reconciliation: ${hasAbattageInReconciliation}`);
    
    // Test 2: Vérifier la logique d'affichage
    const hasAbattage = hasAbattageInList && hasAbattageInReconciliation;
    console.log(`  hasAbattage = ${hasAbattageInList} && ${hasAbattageInReconciliation} = ${hasAbattage}`);
    
    // Test 3: Simuler l'affichage de l'information
    const perationInfoDisplay = hasAbattage ? 'block' : 'none';
    console.log(`  Affichage peration-info: ${perationInfoDisplay}`);
    
    // Test 4: Vérifier le tooltip
    const pointVente = 'Abattage';
    const data = mockReconciliation[pointVente];
    let tooltip = '';
    
    if (pointVente === 'Abattage') {
        if (data.pourcentageEcart === null) {
            tooltip = "Stock matin nul - calcul impossible";
        } else {
            tooltip = "Pération : Perte de volume entre abattoir et point de vente";
        }
    }
    
    console.log(`  Tooltip pour Abattage: "${tooltip}"`);
    
    console.log('');
});

// Test avec les données réelles de l'image
console.log('=== Test avec les données réelles ===');
const realData = {
    stockMatin: 3700000,
    stockSoir: 0,
    transferts: -4222800,
    ventes: -522800,
    ventesSaisies: 0,
    difference: -522800,
    pourcentageEcart: -14.13
};

console.log('Données Abattage:');
console.log(`  Stock Matin: ${realData.stockMatin.toLocaleString('fr-FR')} FCFA`);
console.log(`  Ventes Théoriques: ${realData.ventes.toLocaleString('fr-FR')} FCFA`);
console.log(`  Pourcentage calculé: ${realData.pourcentageEcart.toFixed(2)}%`);

// Vérifier le calcul
const calculAttendu = (realData.ventes / realData.stockMatin) * 100;
console.log(`  Calcul attendu: (${realData.ventes} / ${realData.stockMatin}) * 100 = ${calculAttendu.toFixed(2)}%`);
console.log(`  Correspondance: ${Math.abs(realData.pourcentageEcart - calculAttendu) < 0.01 ? '✅ OK' : '❌ Erreur'}`);

console.log('\n📋 Recommandations:');
console.log('1. Vérifiez que "Abattage" est bien dans POINTS_VENTE_PHYSIQUES');
console.log('2. Vérifiez que l\'élément #peration-info existe dans le DOM');
console.log('3. Vérifiez que le tooltip est bien défini sur la cellule');
console.log('4. Vérifiez que le serveur a été redémarré après les modifications'); 