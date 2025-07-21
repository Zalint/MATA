// Script de test pour vérifier la correction de l'export Excel
async function testExportData() {
    console.log('=== Test de récupération des données pour l\'export ===');
    
    const dateStr = '17/07/2025';
    
    try {
        // Test récupération stock matin
        console.log('1. Test récupération stock matin...');
        const stockMatin = await getStockForDate(dateStr, 'matin');
        console.log('Stock matin reçu:', stockMatin);
        
        // Test récupération stock soir
        console.log('2. Test récupération stock soir...');
        const stockSoir = await getStockForDate(dateStr, 'soir');
        console.log('Stock soir reçu:', stockSoir);
        
        // Test récupération transferts
        console.log('3. Test récupération transferts...');
        const transferts = await getTransfersForDate(dateStr);
        console.log('Transferts reçus:', transferts);
        
        // Test calcul pour un point de vente
        console.log('4. Test calcul pour Sacre Coeur...');
        const pointVente = 'Sacre Coeur';
        
        const stockMatinValue = Object.keys(stockMatin)
            .filter(key => key.startsWith(pointVente + '-'))
            .reduce((sum, key) => {
                const stockData = stockMatin[key];
                if (stockData && stockData.total) {
                    return sum + parseFloat(stockData.total);
                }
                return sum;
            }, 0);
        
        const stockSoirValue = Object.keys(stockSoir)
            .filter(key => key.startsWith(pointVente + '-'))
            .reduce((sum, key) => {
                const stockData = stockSoir[key];
                if (stockData && stockData.total) {
                    return sum + parseFloat(stockData.total);
                }
                return sum;
            }, 0);
        
        const transfertsValue = transferts
            .filter(t => t.pointVente === pointVente)
            .reduce((sum, t) => sum + (parseFloat(t.montant) || 0), 0);
        
        console.log(`Résultats pour ${pointVente}:`);
        console.log(`- Stock Matin: ${stockMatinValue}`);
        console.log(`- Stock Soir: ${stockSoirValue}`);
        console.log(`- Transferts: ${transfertsValue}`);
        console.log(`- Ventes Théoriques: ${stockMatinValue + transfertsValue - stockSoirValue}`);
        
    } catch (error) {
        console.error('Erreur lors du test:', error);
    }
}

// Exécuter le test si le script est appelé directement
if (typeof window !== 'undefined') {
    // Dans le navigateur
    window.testExportData = testExportData;
    console.log('Fonction testExportData disponible. Appelez testExportData() dans la console.');
} else {
    // Dans Node.js
    testExportData();
} 