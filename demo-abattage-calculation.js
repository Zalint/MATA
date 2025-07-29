/**
 * Script de démonstration pour le calcul spécial du pourcentage d'écart pour abattage
 * Montre la différence entre le calcul standard et le calcul spécial
 */

// Fonction de formatage monétaire
function formatMonetaire(valeur) {
    return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(valeur) + ' FCFA';
}

// Fonction de calcul standard (pour les autres points de vente)
function calculerPourcentageStandard(ventesTheoriques, difference) {
    return ventesTheoriques > 0 ? (difference / ventesTheoriques) * 100 : 0;
}

// Fonction de calcul spécial pour abattage
function calculerPourcentageAbattage(ventesTheoriques, stockMatin) {
    return stockMatin > 0 ? (ventesTheoriques / stockMatin) * 100 : null;
}

// Exemples de données
const exemples = [
    {
        nom: "Exemple 1 - Ventes normales",
        stockMatin: 1000000,
        stockSoir: 200000,
        transferts: 50000,
        ventesSaisies: 800000
    },
    {
        nom: "Exemple 2 - Ventes élevées",
        stockMatin: 1500000,
        stockSoir: 100000,
        transferts: 100000,
        ventesSaisies: 1400000
    },
    {
        nom: "Exemple 3 - Ventes faibles",
        stockMatin: 800000,
        stockSoir: 600000,
        transferts: 0,
        ventesSaisies: 150000
    },
    {
        nom: "Exemple 4 - Stock matin nul",
        stockMatin: 0,
        stockSoir: 0,
        transferts: 50000,
        ventesSaisies: 50000
    }
];

console.log("=== DÉMONSTRATION DU CALCUL SPÉCIAL POUR ABATTAGE ===\n");

exemples.forEach((exemple, index) => {
    console.log(`${exemple.nom}:`);
    console.log(`  Stock Matin: ${formatMonetaire(exemple.stockMatin)}`);
    console.log(`  Stock Soir: ${formatMonetaire(exemple.stockSoir)}`);
    console.log(`  Transferts: ${formatMonetaire(exemple.transferts)}`);
    console.log(`  Ventes Saisies: ${formatMonetaire(exemple.ventesSaisies)}`);
    
    // Calculs
    const ventesTheoriques = exemple.stockMatin - exemple.stockSoir + exemple.transferts;
    const difference = ventesTheoriques - exemple.ventesSaisies;
    
    console.log(`  Ventes Théoriques: ${formatMonetaire(ventesTheoriques)}`);
    console.log(`  Écart: ${formatMonetaire(difference)}`);
    
    // Calculs de pourcentage
    const pourcentageStandard = calculerPourcentageStandard(ventesTheoriques, difference);
    const pourcentageAbattage = calculerPourcentageAbattage(ventesTheoriques, exemple.stockMatin);
    
    console.log(`  Pourcentage Standard (Écart/Ventes Théoriques): ${pourcentageStandard.toFixed(2)}%`);
    
    if (pourcentageAbattage === null) {
        console.log(`  Pourcentage Abattage (Ventes Théoriques/Stock Matin): N/A (Stock matin nul)`);
        console.log(`  Interprétation:`);
        console.log(`    - Standard: ${Math.abs(pourcentageStandard).toFixed(2)}% d'écart par rapport aux ventes théoriques`);
        console.log(`    - Abattage: Calcul impossible (stock matin nul)`);
    } else {
        console.log(`  Pourcentage Abattage (Ventes Théoriques/Stock Matin): ${pourcentageAbattage.toFixed(2)}%`);
        console.log(`  Interprétation:`);
        console.log(`    - Standard: ${Math.abs(pourcentageStandard).toFixed(2)}% d'écart par rapport aux ventes théoriques`);
        console.log(`    - Abattage: ${pourcentageAbattage.toFixed(2)}% du stock matin a été vendu (Pération)`);
    }
    
    console.log("");
});

// Résumé des différences
console.log("=== RÉSUMÉ DES DIFFÉRENCES ===");
console.log("Calcul Standard (autres points de vente):");
console.log("  Formule: (Écart / Ventes Théoriques) × 100");
console.log("  Mesure: Le pourcentage d'écart par rapport aux ventes théoriques");
console.log("  Interprétation: Plus le pourcentage est élevé, plus il y a d'écart");
console.log("");

console.log("Calcul Spécial (abattage):");
console.log("  Formule: (Ventes Théoriques / Stock Matin) × 100");
console.log("  Mesure: Le pourcentage du stock matin qui a été vendu (Pération)");
console.log("  Interprétation: Plus le pourcentage est élevé, plus l'efficacité de vente est bonne");
console.log("  Cas spécial: Si stock matin = 0, le calcul retourne N/A");
console.log("");

console.log("=== AVANTAGES DU CALCUL SPÉCIAL POUR ABATTAGE ===");
console.log("1. Mesure l'efficacité de vente par rapport au stock disponible");
console.log("2. Plus intuitif pour évaluer la performance de l'abattage");
console.log("3. Permet de voir rapidement quel pourcentage du stock a été écoulé");
console.log("4. Utile pour la planification et l'optimisation des stocks"); 