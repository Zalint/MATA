const axios = require('axios');

const API_KEY = 'b326e72b67a9b508c88270b9954c5ca1';
const DATE = '07-04-2025';

async function testNewFields() {
    try {
        console.log(`Testing new fields for date: ${DATE}`);
        console.log('===============================================\n');

        const response = await axios.get(`http://localhost:3000/api/external/reconciliation`, {
            params: { date: DATE },
            headers: {
                'X-API-Key': API_KEY
            }
        });

        if (response.status === 200) {
            const data = response.data;
            
            if (data.success && data.data && data.data.details) {
                // Test with Mbao Boeuf specifically
                const mbaoBoeuf = data.data.details['Mbao']?.['Boeuf'];
                if (mbaoBoeuf) {
                    console.log('=== Mbao Boeuf Details ===');
                    console.log('All fields:', Object.keys(mbaoBoeuf));
                    console.log('stockMatin:', mbaoBoeuf.stockMatin);
                    console.log('stockSoir:', mbaoBoeuf.stockSoir);
                    console.log('transferts:', mbaoBoeuf.transferts);
                    console.log('ventesTheoriques:', mbaoBoeuf.ventesTheoriques);
                    console.log('ventesSaisies:', mbaoBoeuf.ventesSaisies);
                    console.log('ventesTheoriquesNombre:', mbaoBoeuf.ventesTheoriquesNombre);
                    console.log('ventesNombre:', mbaoBoeuf.ventesNombre);
                    console.log('');
                }
                
                // Test with O.Foire Boeuf
                const oFoireBoeuf = data.data.details['O.Foire']?.['Boeuf'];
                if (oFoireBoeuf) {
                    console.log('=== O.Foire Boeuf Details ===');
                    console.log('All fields:', Object.keys(oFoireBoeuf));
                    console.log('stockMatin:', oFoireBoeuf.stockMatin);
                    console.log('stockSoir:', oFoireBoeuf.stockSoir);
                    console.log('transferts:', oFoireBoeuf.transferts);
                    console.log('ventesTheoriques:', oFoireBoeuf.ventesTheoriques);
                    console.log('ventesSaisies:', oFoireBoeuf.ventesSaisies);
                    console.log('ventesTheoriquesNombre:', oFoireBoeuf.ventesTheoriquesNombre);
                    console.log('ventesNombre:', oFoireBoeuf.ventesNombre);
                    console.log('');
                }
            } else {
                console.log('No details data found in response');
            }
        } else {
            console.log(`Error: ${response.status} - ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error testing new fields:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testNewFields(); 