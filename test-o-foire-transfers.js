const axios = require('axios');

const API_KEY = 'b326e72b67a9b508c88270b9954c5ca1';
const DATE = '07-04-2025';

async function testOFoireTransfers() {
    try {
        console.log(`Testing O.Foire transfers for date: ${DATE}`);
        console.log('===============================================\n');

        const response = await axios.get(`http://localhost:3000/api/external/reconciliation`, {
            params: { date: DATE },
            headers: {
                'X-API-Key': API_KEY
            }
        });

        if (response.status === 200) {
            const data = response.data;
            
            // Test avec O.Foire Boeuf qui a des transferts positifs ET négatifs
            const oFoireBoeuf = data.data.details['O.Foire']['Boeuf'];
            
            console.log('O.Foire Boeuf - Données complètes:');
            console.log('==================================');
            console.log(`Stock Matin: ${oFoireBoeuf.stockMatin} FCFA (${oFoireBoeuf.stockMatinNombre} unités)`);
            console.log(`Stock Soir: ${oFoireBoeuf.stockSoir} FCFA (${oFoireBoeuf.stockSoirNombre} unités)`);
            console.log(`Transferts: ${oFoireBoeuf.transferts} FCFA (${oFoireBoeuf.transfertsNombre} unités)`);
            console.log(`Ventes Théoriques: ${oFoireBoeuf.ventesTheoriques} FCFA`);
            console.log(`Ventes Théoriques Nombre: ${oFoireBoeuf.ventesTheoriquesNombre} unités`);
            console.log(`Ventes Saisies: ${oFoireBoeuf.ventesSaisies} FCFA`);
            console.log(`Ventes Nombre: ${oFoireBoeuf.ventesNombre} unités`);
            
            console.log('\nCalculs:');
            console.log('========');
            console.log(`Ventes Théoriques Nombre = ${oFoireBoeuf.stockMatinNombre} + ${oFoireBoeuf.transfertsNombre} - ${oFoireBoeuf.stockSoirNombre} = ${oFoireBoeuf.stockMatinNombre + oFoireBoeuf.transfertsNombre - oFoireBoeuf.stockSoirNombre}`);
            
            // Test avec O.Foire Veau
            const oFoireVeau = data.data.details['O.Foire']['Veau'];
            
            console.log('\nO.Foire Veau - Données complètes:');
            console.log('==================================');
            console.log(`Stock Matin: ${oFoireVeau.stockMatin} FCFA (${oFoireVeau.stockMatinNombre} unités)`);
            console.log(`Stock Soir: ${oFoireVeau.stockSoir} FCFA (${oFoireVeau.stockSoirNombre} unités)`);
            console.log(`Transferts: ${oFoireVeau.transferts} FCFA (${oFoireVeau.transfertsNombre} unités)`);
            console.log(`Ventes Théoriques: ${oFoireVeau.ventesTheoriques} FCFA`);
            console.log(`Ventes Théoriques Nombre: ${oFoireVeau.ventesTheoriquesNombre} unités`);
            console.log(`Ventes Saisies: ${oFoireVeau.ventesSaisies} FCFA`);
            console.log(`Ventes Nombre: ${oFoireVeau.ventesNombre} unités`);
            
            console.log('\nCalculs:');
            console.log('========');
            console.log(`Ventes Théoriques Nombre = ${oFoireVeau.stockMatinNombre} + ${oFoireVeau.transfertsNombre} - ${oFoireVeau.stockSoirNombre} = ${oFoireVeau.stockMatinNombre + oFoireVeau.transfertsNombre - oFoireVeau.stockSoirNombre}`);
            
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

testOFoireTransfers(); 