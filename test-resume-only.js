const axios = require('axios');

const API_KEY = 'b326e72b67a9b508c88270b9954c5ca1';
const DATE = '07-04-2025';

async function testResumeOnly() {
    try {
        console.log(`Testing reconciliation resume for date: ${DATE}`);
        console.log('===============================================\n');

        const response = await axios.get(`http://localhost:3000/api/external/reconciliation`, {
            params: { date: DATE },
            headers: {
                'X-API-Key': API_KEY
            }
        });

        if (response.status === 200) {
            const data = response.data;
            
            if (data.success && data.data && data.data.resume) {
                console.log('=== RESUME SECTION ===');
                data.data.resume.forEach(pdv => {
                    console.log(`${pdv.pointVente}:`);
                    console.log(`  - stockMatin: ${pdv.stockMatin}`);
                    console.log(`  - stockSoir: ${pdv.stockSoir}`);
                    console.log(`  - transferts: ${pdv.transferts}`);
                    console.log(`  - ventesTheoriques: ${pdv.ventesTheoriques}`);
                    console.log(`  - ventesSaisies: ${pdv.ventesSaisies}`);
                    console.log(`  - cashPayments: ${pdv.cashPayments}`);
                    console.log(`  - ecart: ${pdv.ecart}`);
                    console.log(`  - ecartPct: ${pdv.ecartPct}%`);
                    console.log('');
                });
            } else {
                console.log('No resume data found in response');
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

testResumeOnly(); 