const axios = require('axios');

// Configuration
const API_KEY = 'b326e72b67a9b508c88270b9954c5ca1';
const BASE_URL = 'http://localhost:3000';
const TEST_DATE = '07-04-2025';

async function testDetailsOnly() {
    try {
        console.log(`Testing reconciliation details for date: ${TEST_DATE}`);
        console.log('===============================================');
        
        const response = await axios.get(`${BASE_URL}/api/external/reconciliation`, {
            params: { date: TEST_DATE },
            headers: {
                'X-API-Key': API_KEY
            }
        });
        
        if (response.data.success && response.data.data && response.data.data.details) {
            const details = response.data.data.details;
            
            // Afficher seulement les sections importantes
            Object.keys(details).forEach(pdv => {
                console.log(`\n=== ${pdv} ===`);
                const pdvDetails = details[pdv];
                
                // Afficher seulement Boeuf, Veau, Poulet, Tablette
                ['Boeuf', 'Veau', 'Poulet', 'Tablette'].forEach(category => {
                    if (pdvDetails[category]) {
                        console.log(`${category}:`);
                        console.log(`  - stockMatin: ${pdvDetails[category].stockMatin}`);
                        console.log(`  - stockSoir: ${pdvDetails[category].stockSoir}`);
                        console.log(`  - transferts: ${pdvDetails[category].transferts}`);
                        console.log(`  - ventesTheoriques: ${pdvDetails[category].ventesTheoriques}`);
                        console.log(`  - ventesSaisies: ${pdvDetails[category].ventesSaisies}`);
                    }
                });
            });
        }
        
    } catch (error) {
        console.error('Error testing reconciliation endpoint:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

// Exécuter le test
testDetailsOnly(); 