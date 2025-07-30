const axios = require('axios');

const API_KEY = 'b326e72b67a9b508c88270b9954c5ca1';
const DATE = '07-04-2025';

async function testNegativeTransfers() {
    try {
        console.log(`Testing negative transfers for date: ${DATE}`);
        console.log('===============================================\n');

        const response = await axios.get(`http://localhost:3000/api/external/reconciliation`, {
            params: { date: DATE },
            headers: {
                'X-API-Key': API_KEY
            }
        });

        if (response.status === 200) {
            const data = response.data;
            
            // Test avec Abattage Veau qui a des transferts négatifs
            const abattageVeau = data.data.details['Abattage']['Veau'];
            
            console.log('Abattage Veau - Données complètes:');
            console.log(JSON.stringify(abattageVeau, null, 2));
            
            console.log('\n=== ANALYSE DES TRANSFERTS NÉGATIFS ===');
            console.log(`Stock Matin Nombre: ${abattageVeau.stockMatinNombre}`);
            console.log(`Stock Soir Nombre: ${abattageVeau.stockSoirNombre}`);
            console.log(`Transferts Nombre: ${abattageVeau.transfertsNombre}`);
            console.log(`Ventes Théoriques Nombre: ${abattageVeau.ventesTheoriquesNombre}`);
            
            // Vérifier le calcul
            const calculAttendu = abattageVeau.stockMatinNombre + abattageVeau.transfertsNombre - abattageVeau.stockSoirNombre;
            console.log(`\nCalcul attendu: ${abattageVeau.stockMatinNombre} + ${abattageVeau.transfertsNombre} - ${abattageVeau.stockSoirNombre} = ${calculAttendu}`);
            console.log(`Valeur réelle: ${abattageVeau.ventesTheoriquesNombre}`);
            console.log(`Correspondance: ${calculAttendu === abattageVeau.ventesTheoriquesNombre ? '✅ CORRECT' : '❌ INCORRECT'}`);
            
            // Test avec O.Foire Veau qui a des transferts positifs
            console.log('\n=== COMPARAISON AVEC TRANSFERTS POSITIFS ===');
            const oFoireVeau = data.data.details['O.Foire']['Veau'];
            console.log('O.Foire Veau:');
            console.log(`Stock Matin Nombre: ${oFoireVeau.stockMatinNombre}`);
            console.log(`Stock Soir Nombre: ${oFoireVeau.stockSoirNombre}`);
            console.log(`Transferts Nombre: ${oFoireVeau.transfertsNombre}`);
            console.log(`Ventes Théoriques Nombre: ${oFoireVeau.ventesTheoriquesNombre}`);
            
        } else {
            console.log('Error:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testNegativeTransfers(); 