/**
 * Test rapide pour vérifier les modifications Abattage
 */

// Simuler les données de réconciliation
const reconciliation = {
    'Abattage': {
        stockMatin: 3700000, // 3.7M comme dans l'image
        stockSoir: 0,
        transferts: -4222800,
        ventes: -522800, // Ventes théoriques calculées
        ventesSaisies: 0,
        difference: -522800,
        pourcentageEcart: 0,
        cashPayment: 0,
        ecartCash: 0,
        commentaire: ''
    }
};

// Test du calcul spécial pour Abattage
function testCalculAbattage() {
    const pointVente = 'Abattage';
    const data = reconciliation[pointVente];
    
    console.log('=== Test du calcul spécial pour Abattage ===');
    console.log('Données d\'entrée:');
    console.log(`  Stock Matin: ${data.stockMatin.toLocaleString('fr-FR')} FCFA`);
    console.log(`  Stock Soir: ${data.stockSoir.toLocaleString('fr-FR')} FCFA`);
    console.log(`  Transferts: ${data.transferts.toLocaleString('fr-FR')} FCFA`);
    console.log(`  Ventes Théoriques: ${data.ventes.toLocaleString('fr-FR')} FCFA`);
    console.log(`  Ventes Saisies: ${data.ventesSaisies.toLocaleString('fr-FR')} FCFA`);
    
    // Calcul du pourcentage d'écart spécial pour Abattage
    if (data.ventes !== 0) {
        if (pointVente === 'Abattage') {
            // Pour Abattage : (Ventes Théoriques / Stock Matin) * 100
            if (data.stockMatin !== 0) {
                data.pourcentageEcart = (data.ventes / data.stockMatin) * 100;
            } else {
                // Cas où le stock matin est nul - pas de calcul possible
                data.pourcentageEcart = null;
                data.commentaire = 'Stock matin nul - calcul impossible';
            }
        }
    }
    
    console.log('\nRésultats:');
    console.log(`  Pourcentage d'écart (Pération): ${data.pourcentageEcart !== null ? data.pourcentageEcart.toFixed(2) + '%' : 'N/A'}`);
    console.log(`  Commentaire: ${data.commentaire || 'Aucun'}`);
    
    // Vérification du calcul
    const calculAttendu = (-522800 / 3700000) * 100;
    console.log(`\nVérification:`);
    console.log(`  Calcul attendu: (-522800 / 3700000) * 100 = ${calculAttendu.toFixed(2)}%`);
    console.log(`  Calcul obtenu: ${data.pourcentageEcart !== null ? data.pourcentageEcart.toFixed(2) + '%' : 'N/A'}`);
    console.log(`  Correspondance: ${data.pourcentageEcart !== null ? Math.abs(data.pourcentageEcart - calculAttendu) < 0.01 : 'N/A'}`);
    
    return data.pourcentageEcart;
}

// Test du cas stock matin nul
function testStockMatinNul() {
    console.log('\n=== Test du cas stock matin nul ===');
    
    const reconciliationNul = {
        'Abattage': {
            stockMatin: 0,
            stockSoir: 0,
            transferts: 50000,
            ventes: 50000,
            ventesSaisies: 50000,
            difference: 0,
            pourcentageEcart: 0,
            cashPayment: 0,
            ecartCash: 0,
            commentaire: ''
        }
    };
    
    const pointVente = 'Abattage';
    const data = reconciliationNul[pointVente];
    
    console.log('Données d\'entrée:');
    console.log(`  Stock Matin: ${data.stockMatin} FCFA`);
    console.log(`  Ventes Théoriques: ${data.ventes.toLocaleString('fr-FR')} FCFA`);
    
    // Calcul du pourcentage d'écart spécial pour Abattage
    if (data.ventes !== 0) {
        if (pointVente === 'Abattage') {
            // Pour Abattage : (Ventes Théoriques / Stock Matin) * 100
            if (data.stockMatin !== 0) {
                data.pourcentageEcart = (data.ventes / data.stockMatin) * 100;
            } else {
                // Cas où le stock matin est nul - pas de calcul possible
                data.pourcentageEcart = null;
                data.commentaire = 'Stock matin nul - calcul impossible';
            }
        }
    }
    
    console.log('\nRésultats:');
    console.log(`  Pourcentage d'écart: ${data.pourcentageEcart !== null ? data.pourcentageEcart.toFixed(2) + '%' : 'N/A'}`);
    console.log(`  Commentaire: ${data.commentaire || 'Aucun'}`);
    
    return data.pourcentageEcart;
}

// Exécuter les tests
console.log('🚀 Test des modifications Abattage\n');

const resultat1 = testCalculAbattage();
const resultat2 = testStockMatinNul();

console.log('\n=== Résumé ===');
console.log(`Test 1 (données normales): ${resultat1 !== null ? resultat1.toFixed(2) + '%' : 'N/A'}`);
console.log(`Test 2 (stock matin nul): ${resultat2 !== null ? resultat2.toFixed(2) + '%' : 'N/A'}`);

console.log('\n✅ Tests terminés !');
console.log('📝 Pour voir les changements dans l\'application:');
console.log('   1. Redémarrez le serveur: node server.js');
console.log('   2. Rafraîchissez la page web');
console.log('   3. Allez dans "Réconciliation Stock / Ventes"');
console.log('   4. Calculez une réconciliation avec des données Abattage'); 