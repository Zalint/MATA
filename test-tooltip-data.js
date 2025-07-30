const axios = require('axios');

const API_KEY = 'b326e72b67a9b508c88270b9954c5ca1';
const DATE = '07-04-2025';

async function testTooltipData() {
    try {
        console.log(`Testing tooltip data for date: ${DATE}`);
        console.log('===============================================\n');

        const response = await axios.get(`http://localhost:3000/api/external/reconciliation`, {
            params: { date: DATE },
            headers: {
                'X-API-Key': API_KEY
            }
        });

        if (response.status === 200) {
            const data = response.data;
            
            // Test avec O.Foire Boeuf qui a des données
            const oFoireBoeuf = data.data.details['O.Foire']['Boeuf'];
            
            console.log('O.Foire Boeuf - Données complètes:');
            console.log(JSON.stringify(oFoireBoeuf, null, 2));
            
            console.log('\n=== TOOLTIP SIMULATION ===');
            
            // Simuler le tooltip
            let tooltipText = `Formule: Stock Matin (${formatMonetaire(oFoireBoeuf.stockMatin)}) - Stock Soir (${formatMonetaire(oFoireBoeuf.stockSoir)}) + Transferts (${formatMonetaire(oFoireBoeuf.transferts)}) = ${formatMonetaire(oFoireBoeuf.ventesTheoriques)}`;
            
            const details = [];
            
            if (oFoireBoeuf.stockMatinNombre && oFoireBoeuf.stockMatinNombre > 0) {
                const prixUnitaire = oFoireBoeuf.stockMatinPrixUnitaire || (oFoireBoeuf.stockMatin / oFoireBoeuf.stockMatinNombre);
                details.push(`Stock Matin: ${oFoireBoeuf.stockMatinNombre} × ${formatMonetaire(prixUnitaire)}`);
            }
            
            if (oFoireBoeuf.stockSoirNombre && oFoireBoeuf.stockSoirNombre > 0) {
                const prixUnitaire = oFoireBoeuf.stockSoirPrixUnitaire || (oFoireBoeuf.stockSoir / oFoireBoeuf.stockSoirNombre);
                details.push(`Stock Soir: ${oFoireBoeuf.stockSoirNombre} × ${formatMonetaire(prixUnitaire)}`);
            }
            
            if (oFoireBoeuf.transfertsNombre && oFoireBoeuf.transfertsNombre > 0) {
                const prixUnitaire = oFoireBoeuf.transfertsPrixUnitaire || (oFoireBoeuf.transferts / oFoireBoeuf.transfertsNombre);
                details.push(`Transferts: ${oFoireBoeuf.transfertsNombre} × ${formatMonetaire(prixUnitaire)}`);
            }
            
            if (details.length > 0) {
                tooltipText += '\n\nDétails:\n' + details.join('\n');
            }
            
            console.log('TOOLTIP COMPLET:');
            console.log(tooltipText);
            
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

function formatMonetaire(valeur) {
    const nombreValide = parseFloat(valeur);
    if (isNaN(nombreValide)) {
        return '0 FCFA';
    }
    return nombreValide.toLocaleString('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }) + ' FCFA';
}

testTooltipData(); 