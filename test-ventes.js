const axios = require('axios');

// Configuration
const API_KEY = 'b326e72b67a9b508c88270b9954c5ca1';
const BASE_URL = 'http://localhost:3000';
const TEST_DATE = '07-04-2025';

async function testVentes() {
    try {
        console.log(`Testing ventes endpoint for date: ${TEST_DATE}`);
        console.log('===============================================');
        
        const response = await axios.get(`${BASE_URL}/api/external/ventes-date`, {
            params: { date: TEST_DATE },
            headers: {
                'X-API-Key': API_KEY
            }
        });
        
        console.log('Response Status:', response.status);
        console.log('\n=== VENTES DATA ===');
        console.log(JSON.stringify(response.data, null, 2));
        
        // Analyser les produits disponibles
        if (response.data.success && response.data.ventes) {
            console.log('\n=== PRODUITS DISPONIBLES ===');
            const produits = {};
            response.data.ventes.forEach(vente => {
                const categorie = vente.categorie;
                const produit = vente.produit;
                if (!produits[categorie]) {
                    produits[categorie] = new Set();
                }
                produits[categorie].add(produit);
            });
            
            Object.keys(produits).forEach(categorie => {
                console.log(`\nCatégorie: ${categorie}`);
                produits[categorie].forEach(produit => {
                    console.log(`  - ${produit}`);
                });
            });
        }
        
    } catch (error) {
        console.error('Error testing ventes endpoint:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

// Exécuter le test
testVentes(); 