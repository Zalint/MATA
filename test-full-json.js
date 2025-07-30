const axios = require('axios');

const API_KEY = 'b326e72b67a9b508c88270b9954c5ca1';
const DATE = '07-04-2025';

async function testFullJSON() {
    try {
        console.log(`Testing full JSON output for date: ${DATE}`);
        console.log('===============================================\n');

        const response = await axios.get(`http://localhost:3000/api/external/reconciliation`, {
            params: { date: DATE },
            headers: {
                'X-API-Key': API_KEY
            }
        });

        if (response.status === 200) {
            const data = response.data;
            console.log('FULL JSON OUTPUT:');
            console.log('==================');
            console.log(JSON.stringify(data, null, 2));
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

testFullJSON(); 