const axios = require('axios');

// Configuration
const API_KEY = 'b326e72b67a9b508c88270b9954c5ca1';
const BASE_URL = 'http://localhost:3000';
const TEST_DATE = '07-04-2025';

async function testReconciliation() {
    try {
        console.log(`Testing reconciliation endpoint for date: ${TEST_DATE}`);
        console.log('===============================================');
        
        const response = await axios.get(`${BASE_URL}/api/external/reconciliation`, {
            params: { date: TEST_DATE },
            headers: {
                'X-API-Key': API_KEY
            }
        });
        
        console.log('Response Status:', response.status);
        console.log('Response Headers:', response.headers);
        console.log('\n=== FULL JSON RESPONSE ===');
        console.log(JSON.stringify(response.data, null, 2));
        
        // Afficher spécifiquement la section details
        if (response.data.success && response.data.data && response.data.data.details) {
            console.log('\n=== DETAILS SECTION ===');
            console.log(JSON.stringify(response.data.data.details, null, 2));
        }
        
        // Afficher spécifiquement la section resume
        if (response.data.success && response.data.data && response.data.data.resume) {
            console.log('\n=== RESUME SECTION ===');
            console.log(JSON.stringify(response.data.data.resume, null, 2));
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
testReconciliation(); 