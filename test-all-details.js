const axios = require('axios');

const API_KEY = 'b326e72b67a9b508c88270b9954c5ca1';
const DATE = '07-04-2025';

async function testAllDetails() {
    try {
        console.log(`Testing reconciliation ALL details for date: ${DATE}`);
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
                Object.keys(data.data.details).forEach(pdv => {
                    console.log(`=== ${pdv} ===`);
                    const pdvDetails = data.data.details[pdv];
                    
                    Object.keys(pdvDetails).forEach(product => {
                        const productData = pdvDetails[product];
                        console.log(`${product}:`);
                        console.log(`  - stockMatin: ${productData.stockMatin}`);
                        console.log(`  - stockSoir: ${productData.stockSoir}`);
                        console.log(`  - transferts: ${productData.transferts}`);
                        console.log(`  - ventesTheoriques: ${productData.ventesTheoriques}`);
                        console.log(`  - ventesSaisies: ${productData.ventesSaisies}`);
                        console.log(`  - ventesTheoriquesNombre: ${productData.ventesTheoriquesNombre || 0}`);
                        console.log(`  - ventesNombre: ${productData.ventesNombre || 0}`);
                        console.log('');
                    });
                });
            } else {
                console.log('No details data found in response');
            }
        } else {
            console.log(`Error: ${response.status} - ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error testing reconciliation:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testAllDetails(); 