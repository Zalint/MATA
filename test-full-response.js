const axios = require('axios');

const API_KEY = 'b326e72b67a9b508c88270b9954c5ca1';
const DATE = '07-04-2025';

async function testFullResponse() {
    try {
        console.log(`Testing full reconciliation response for date: ${DATE}`);
        console.log('===============================================\n');

        const response = await axios.get(`http://localhost:3000/api/external/reconciliation`, {
            params: { date: DATE },
            headers: {
                'X-API-Key': API_KEY
            }
        });

        if (response.status === 200) {
            const data = response.data;
            console.log('Response structure:');
            console.log('==================');
            console.log('Keys in response:', Object.keys(data));
            console.log('');
            
            if (data.success) {
                console.log('Success:', data.success);
                console.log('');
                
                if (data.resume) {
                    console.log('Resume keys:', Object.keys(data.resume));
                    console.log('');
                }
                
                if (data.details) {
                    console.log('Details keys:', Object.keys(data.details));
                    console.log('');
                    
                    // Show first PDV details structure
                    const firstPDV = Object.keys(data.details)[0];
                    if (firstPDV) {
                        console.log(`First PDV (${firstPDV}) details keys:`, Object.keys(data.details[firstPDV]));
                        console.log('');
                    }
                }
                
                // Show full response (truncated for readability)
                console.log('Full response (first 2000 chars):');
                console.log('================================');
                console.log(JSON.stringify(data, null, 2).substring(0, 2000));
                console.log('...');
            } else {
                console.log('Response not successful:', data);
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

testFullResponse(); 