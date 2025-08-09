/**
 * Script de test manuel pour les restrictions temporelles NADOU/PAPI
 * Usage: node test-time-restrictions.js
 */

const express = require('express');
const session = require('express-session');

// Fonction de test de la logique de validation
function testValidationLogic() {
    console.log('🔍 Test de la logique de validation temporelle\n');

    function testTimeRestriction(username, dateStr, description) {
        console.log(`📅 Test: ${description}`);
        console.log(`   Utilisateur: ${username}`);
        console.log(`   Date: ${dateStr}`);

        if (username === 'NADOU' || username === 'PAPI') {
            const [day, month, year] = dateStr.split('/');
            const dateStock = new Date(year, month - 1, day);
            const maintenant = new Date();
            
            const dateLimite = new Date(dateStock);
            dateLimite.setDate(dateLimite.getDate() + 1);
            dateLimite.setHours(3, 0, 0, 0);
            
            console.log(`   Date limite: ${dateLimite.toLocaleString('fr-FR')}`);
            console.log(`   Maintenant: ${maintenant.toLocaleString('fr-FR')}`);
            
            if (maintenant > dateLimite) {
                console.log(`   ❌ BLOQUÉ - Modification interdite`);
                return false;
            } else {
                console.log(`   ✅ AUTORISÉ - Dans les délais`);
                return true;
            }
        } else {
            console.log(`   ✅ AUTORISÉ - Utilisateur non concerné par les restrictions`);
            return true;
        }
    }

    // Tests avec différentes dates
    const aujourd_hui = new Date();
    const hier = new Date();
    hier.setDate(hier.getDate() - 1);
    const avantHier = new Date();
    avantHier.setDate(avantHier.getDate() - 2);

    const dateAujourd_hui = `${String(aujourd_hui.getDate()).padStart(2, '0')}/${String(aujourd_hui.getMonth() + 1).padStart(2, '0')}/${aujourd_hui.getFullYear()}`;
    const dateHier = `${String(hier.getDate()).padStart(2, '0')}/${String(hier.getMonth() + 1).padStart(2, '0')}/${hier.getFullYear()}`;
    const dateAvantHier = `${String(avantHier.getDate()).padStart(2, '0')}/${String(avantHier.getMonth() + 1).padStart(2, '0')}/${avantHier.getFullYear()}`;

    console.log('='.repeat(70));
    testTimeRestriction('NADOU', dateAujourd_hui, 'NADOU - Modification du jour même');
    console.log('='.repeat(70));
    testTimeRestriction('NADOU', dateHier, 'NADOU - Modification d\'hier');
    console.log('='.repeat(70));
    testTimeRestriction('NADOU', dateAvantHier, 'NADOU - Modification d\'avant-hier (devrait être bloqué)');
    console.log('='.repeat(70));
    testTimeRestriction('PAPI', dateAvantHier, 'PAPI - Modification d\'avant-hier (devrait être bloqué)');
    console.log('='.repeat(70));
    testTimeRestriction('MBA', dateAvantHier, 'MBA - Modification d\'avant-hier (devrait être autorisé)');
    console.log('='.repeat(70));
    testTimeRestriction('ADMIN', dateAvantHier, 'ADMIN - Modification d\'avant-hier (devrait être autorisé)');
    console.log('='.repeat(70));
}

// Fonction pour créer des données de test
function createTestData() {
    console.log('\n📝 Génération de données de test\n');

    const aujourd_hui = new Date();
    const hier = new Date();
    hier.setDate(hier.getDate() - 1);
    const avantHier = new Date();
    avantHier.setDate(avantHier.getDate() - 2);

    const dateAujourd_hui = `${String(aujourd_hui.getDate()).padStart(2, '0')}/${String(aujourd_hui.getMonth() + 1).padStart(2, '0')}/${aujourd_hui.getFullYear()}`;
    const dateHier = `${String(hier.getDate()).padStart(2, '0')}/${String(hier.getMonth() + 1).padStart(2, '0')}/${hier.getFullYear()}`;
    const dateAvantHier = `${String(avantHier.getDate()).padStart(2, '0')}/${String(avantHier.getMonth() + 1).padStart(2, '0')}/${avantHier.getFullYear()}`;

    console.log('📋 Données de test pour stock matin:');
    const stockData = {
        [`test_matin_${Date.now()}`]: {
            date: dateAvantHier,
            pointVente: 'Mbao',
            produit: 'Boeuf',
            quantite: 10,
            prixUnitaire: 3700,
            total: 37000,
            commentaire: 'Test restriction temporelle'
        }
    };
    console.log(JSON.stringify(stockData, null, 2));

    console.log('\n📋 Données de test pour transferts:');
    const transfertData = [{
        date: dateAvantHier,
        pointVente: 'Mbao',
        produit: 'Boeuf',
        impact: 1,
        quantite: 5,
        prixUnitaire: 3700,
        total: 18500,
        commentaire: 'Test restriction transfert'
    }];
    console.log(JSON.stringify(transfertData, null, 2));

    console.log('\n🔗 URLs de test:');
    console.log('POST /api/stock/matin (avec les données ci-dessus)');
    console.log('POST /api/stock/soir (avec les données ci-dessus)');
    console.log('POST /api/transferts (avec les données ci-dessus)');
    
    return { stockData, transfertData };
}

// Fonction pour afficher des instructions de test manuel
function showManualTestInstructions() {
    console.log('\n🧪 Instructions pour test manuel:\n');
    
    console.log('1. Démarrez le serveur: npm start');
    console.log('2. Connectez-vous avec NADOU ou PAPI');
    console.log('3. Essayez de modifier des données d\'avant-hier');
    console.log('4. Vérifiez que vous recevez le message d\'erreur');
    console.log('5. Testez avec un autre utilisateur (MBA, ADMIN) - devrait fonctionner');
    
    console.log('\n🕐 Test basé sur l\'heure actuelle:');
    const maintenant = new Date();
    console.log(`   Heure actuelle: ${maintenant.toLocaleString('fr-FR')}`);
    
    if (maintenant.getHours() < 3) {
        console.log('   ⚠️  Vous êtes avant 3h du matin - les données d\'hier sont encore modifiables par NADOU/PAPI');
    } else {
        console.log('   ✅ Vous êtes après 3h du matin - les données d\'hier sont bloquées pour NADOU/PAPI');
    }
    
    console.log('\n📊 Utilisateurs de test disponibles:');
    console.log('   - NADOU (restrictions actives)');
    console.log('   - PAPI (restrictions actives)');
    console.log('   - MBA (pas de restrictions)');
    console.log('   - ADMIN (pas de restrictions)');
}

// Exécution des tests
console.log('🚀 Test des restrictions temporelles pour NADOU et PAPI\n');
console.log('⏰ Règle: Blocage des modifications après J+1 à 3h00\n');

testValidationLogic();
createTestData();
showManualTestInstructions();

console.log('\n✨ Tests terminés. Vérifiez les résultats ci-dessus.\n');
