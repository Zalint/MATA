const axios = require('axios');

const API_KEY = 'b326e72b67a9b508c88270b9954c5ca1';
const DATE = '07-04-2025';

async function testTooltipOFoire() {
    try {
        console.log(`Testing O.Foire Boeuf tooltip data for date: ${DATE}`);
        console.log('===============================================\n');

        const response = await axios.get(`http://localhost:3000/api/external/reconciliation`, {
            params: { date: DATE },
            headers: {
                'X-API-Key': API_KEY
            }
        });

        if (response.status === 200) {
            const data = response.data;
            
            // Test avec O.Foire Boeuf
            const oFoireBoeuf = data.data.details['O.Foire']['Boeuf'];
            
            console.log('O.Foire Boeuf - Données pour tooltip:');
            console.log('=====================================');
            console.log(`Stock Matin: ${oFoireBoeuf.stockMatin} FCFA`);
            console.log(`Stock Matin Nombre: ${oFoireBoeuf.stockMatinNombre}`);
            console.log(`Stock Matin Prix Unitaire: ${oFoireBoeuf.stockMatinPrixUnitaire} FCFA`);
            console.log('');
            console.log(`Stock Soir: ${oFoireBoeuf.stockSoir} FCFA`);
            console.log(`Stock Soir Nombre: ${oFoireBoeuf.stockSoirNombre}`);
            console.log(`Stock Soir Prix Unitaire: ${oFoireBoeuf.stockSoirPrixUnitaire} FCFA`);
            console.log('');
            console.log(`Transferts: ${oFoireBoeuf.transferts} FCFA`);
            console.log(`Transferts Nombre: ${oFoireBoeuf.transfertsNombre}`);
            console.log(`Transferts Prix Unitaire: ${oFoireBoeuf.transfertsPrixUnitaire} FCFA`);
            console.log('');
            console.log(`Ventes Théoriques: ${oFoireBoeuf.ventesTheoriques} FCFA`);
            console.log(`Ventes Théoriques Nombre: ${oFoireBoeuf.ventesTheoriquesNombre}`);
            console.log('');
            console.log(`Ventes Saisies: ${oFoireBoeuf.ventesSaisies} FCFA`);
            console.log(`Ventes Nombre: ${oFoireBoeuf.ventesNombre}`);
            
            console.log('\n=== VÉRIFICATION ===');
            console.log(`Transferts Nombre attendu: 60`);
            console.log(`Transferts Nombre réel: ${oFoireBoeuf.transfertsNombre}`);
            console.log(`Transferts Nombre correct: ${oFoireBoeuf.transfertsNombre === 60 ? '✅ OUI' : '❌ NON'}`);
            
            // Calculer le prix unitaire attendu
            const prixUnitaireAttendu = oFoireBoeuf.transferts / Math.abs(oFoireBoeuf.transfertsNombre);
            console.log(`Prix unitaire attendu: ${prixUnitaireAttendu} FCFA`);
            console.log(`Prix unitaire réel: ${oFoireBoeuf.transfertsPrixUnitaire} FCFA`);
            
        } else {
            console.log('Error:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('Erreur lors du test:', error.message);
    }
}

testTooltipOFoire(); 