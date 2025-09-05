/**
 * Utilitaire pour vérifier la synchronisation entre les produits d'inventaire
 * et les listes hardcodées dans le système
 */

const fs = require('fs');
const path = require('path');

// Charger produitsInventaire.js
const produitsInventairePath = path.join(__dirname, '../data/by-date/produitsInventaire.js');

if (!fs.existsSync(produitsInventairePath)) {
    console.error('❌ Fichier produitsInventaire.js non trouvé:', produitsInventairePath);
    process.exit(1);
}

// Lire et évaluer le fichier produitsInventaire.js
const produitsInventaireContent = fs.readFileSync(produitsInventairePath, 'utf8');
const produitsInventaireObj = eval('(' + produitsInventaireContent.match(/const produitsInventaire = ({[\s\S]*?});/)[1] + ')');

// Ajouter les fonctions utilitaires
produitsInventaireObj.getTousLesProduits = function() {
    return Object.keys(this).filter(key => typeof this[key] === 'object' && this[key] !== null && this[key].prixDefault !== undefined);
};

// Obtenir la liste des produits depuis l'inventaire
const produitsInventaire = produitsInventaireObj.getTousLesProduits();

// Vérifier script.js pour les listes hardcodées
const scriptPath = path.join(__dirname, '../script.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

// Extraire la liste hardcodée du fallback
const fallbackMatch = scriptContent.match(/const produitsMinimaux = \[(.*?)\];/);
if (fallbackMatch) {
    const produitsMinimaux = fallbackMatch[1]
        .split(',')
        .map(p => p.trim().replace(/['"]/g, ''));
    
    console.log('🔍 Vérification de synchronisation des produits\n');
    
    console.log('📋 Produits dans produitsInventaire.js (' + produitsInventaire.length + '):');
    produitsInventaire.forEach(produit => console.log('  ✓', produit));
    
    console.log('\n📋 Produits dans le fallback minimal (' + produitsMinimaux.length + '):');
    produitsMinimaux.forEach(produit => console.log('  ✓', produit));
    
    // Vérifier si tous les produits du fallback existent dans l'inventaire
    const produitsManquants = produitsMinimaux.filter(p => !produitsInventaire.includes(p));
    const nouveauxProduits = produitsInventaire.filter(p => !produitsMinimaux.includes(p));
    
    console.log('\n📊 Résultats de la synchronisation:');
    
    if (produitsManquants.length === 0) {
        console.log('  ✅ Tous les produits du fallback existent dans l\'inventaire');
    } else {
        console.log('  ⚠️ Produits du fallback manquants dans l\'inventaire:');
        produitsManquants.forEach(p => console.log('    -', p));
    }
    
    if (nouveauxProduits.length > 0) {
        console.log('  ℹ️ Nouveaux produits dans l\'inventaire (non dans le fallback):');
        nouveauxProduits.forEach(p => console.log('    +', p));
    }
    
    console.log('\n💡 Recommandations:');
    if (produitsManquants.length === 0 && nouveauxProduits.length === 0) {
        console.log('  ✅ La synchronisation est parfaite !');
    } else {
        console.log('  📝 Le fallback minimal est volontairement réduit pour éviter les problèmes de chargement');
        console.log('  📝 Les produits sont maintenant chargés dynamiquement depuis produitsInventaire.js');
        console.log('  📝 Le fallback n\'est utilisé qu\'en cas d\'échec de chargement');
    }
    
} else {
    console.log('❌ Impossible de trouver la liste de fallback dans script.js');
}

console.log('\n🎯 Statut: Estimation utilise maintenant la lecture dynamique des produits depuis l\'inventaire');
