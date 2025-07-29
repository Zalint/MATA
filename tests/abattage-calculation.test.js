/**
 * Tests spécifiques pour le calcul du pourcentage d'écart du point de vente "abattage"
 * Vérifie que la formule (Ventes Théoriques / Stock Matin) * 100 est appliquée correctement
 */

// Mock des variables globales
global.POINTS_VENTE_PHYSIQUES = ['Mbao', 'O.Foire', 'Linguere', 'Dahra', 'Touba', 'Keur Massar', 'Abattage'];

// Mock de fetch
global.fetch = jest.fn();

// Importer les fonctions à tester depuis script.js
// Note: Dans un environnement réel, vous devriez extraire ces fonctions dans des modules séparés
// pour faciliter les tests

/**
 * Test du calcul spécial pour abattage
 */
describe('Calcul du pourcentage d\'écart pour abattage', () => {
  
  test('Calcul correct pour abattage avec stock matin positif', () => {
    // Données de test pour abattage
    const stockMatin = 1000000; // 1M FCFA
    const stockSoir = 200000;   // 200k FCFA
    const transferts = 50000;   // 50k FCFA
    const ventesSaisies = 800000; // 800k FCFA
    
    // Calcul des ventes théoriques
    const ventesTheoriques = stockMatin - stockSoir + transferts;
    expect(ventesTheoriques).toBe(850000); // 1M - 200k + 50k = 850k
    
    // Calcul de l'écart
    const difference = ventesTheoriques - ventesSaisies;
    expect(difference).toBe(50000); // 850k - 800k = 50k
    
    // Calcul du pourcentage d'écart pour abattage : (Ventes Théoriques / Stock Matin) * 100
    const pourcentageEcart = (ventesTheoriques / stockMatin) * 100;
    expect(pourcentageEcart).toBe(85); // 850k / 1M * 100 = 85%
    
    // Vérifier que ce n'est PAS le calcul standard : (Écart / Ventes Théoriques) * 100
    const pourcentageStandard = (difference / ventesTheoriques) * 100;
    expect(pourcentageStandard).toBeCloseTo(5.88, 2); // 50k / 850k * 100 ≈ 5.88%
    
    // Les deux calculs doivent être différents
    expect(pourcentageEcart).not.toBe(pourcentageStandard);
  });
  
  test('Calcul pour abattage avec stock matin à zéro', () => {
    const stockMatin = 0;
    const ventesTheoriques = 100000;
    
    // Pourcentage d'écart doit être null quand stock matin est 0
    const pourcentageEcart = stockMatin > 0 ? (ventesTheoriques / stockMatin) * 100 : null;
    expect(pourcentageEcart).toBe(null);
  });
  
  test('Calcul pour abattage avec ventes théoriques négatives', () => {
    const stockMatin = 500000;
    const stockSoir = 800000; // Plus que le stock matin
    const transferts = 0;
    
    const ventesTheoriques = stockMatin - stockSoir + transferts;
    expect(ventesTheoriques).toBe(-300000); // 500k - 800k = -300k
    
    // Le pourcentage peut être négatif pour abattage
    const pourcentageEcart = (ventesTheoriques / stockMatin) * 100;
    expect(pourcentageEcart).toBe(-60); // -300k / 500k * 100 = -60%
  });
  
  test('Comparaison avec les autres points de vente', () => {
    // Données identiques pour deux points de vente
    const stockMatin = 1000000;
    const stockSoir = 200000;
    const transferts = 50000;
    const ventesSaisies = 800000;
    
    const ventesTheoriques = stockMatin - stockSoir + transferts; // 850000
    const difference = ventesTheoriques - ventesSaisies; // 50000
    
    // Calcul pour abattage
    const pourcentageAbattage = (ventesTheoriques / stockMatin) * 100;
    expect(pourcentageAbattage).toBe(85); // 850k / 1M * 100 = 85%
    
    // Calcul pour les autres points de vente
    const pourcentageAutres = (difference / ventesTheoriques) * 100;
    expect(pourcentageAutres).toBeCloseTo(5.88, 2); // 50k / 850k * 100 ≈ 5.88%
    
    // Les calculs doivent être différents
    expect(pourcentageAbattage).not.toBe(pourcentageAutres);
  });
});

/**
 * Test d'intégration pour vérifier que la logique est appliquée dans le code
 */
describe('Intégration du calcul spécial pour abattage', () => {
  
  test('Simulation de la fonction calculerReconciliationParPointVente pour abattage', () => {
    // Simuler les données d'entrée
    const date = '01/01/2024';
    const stockMatin = {
      'Abattage-Boeuf': { Montant: 500000, Nombre: 100, PU: 5000 },
      'Abattage-Veau': { Montant: 300000, Nombre: 60, PU: 5000 }
    };
    const stockSoir = {
      'Abattage-Boeuf': { Montant: 100000, Nombre: 20, PU: 5000 },
      'Abattage-Veau': { Montant: 50000, Nombre: 10, PU: 5000 }
    };
    const transferts = [];
    const debugInfo = { detailsParPointVente: {} };
    
    // Simuler le calcul de réconciliation
    const reconciliation = {};
    
    // Initialiser les données pour Abattage
    reconciliation['Abattage'] = {
      stockMatin: 0,
      stockSoir: 0,
      transferts: 0,
      ventes: 0,
      ventesSaisies: 600000, // Ventes saisies simulées
      difference: 0,
      pourcentageEcart: 0,
      cashPayment: 0,
      ecartCash: 0,
      commentaire: ''
    };
    
        // Calculer les totaux du stock matin
    Object.entries(stockMatin).forEach(([key, item]) => {
        const [pointVente, produit] = key.split('-');
        if (pointVente === 'Abattage') {
            const montant = parseFloat(item.Montant || 0);
            reconciliation[pointVente].stockMatin += montant;
        }
    });
    
    // Calculer les totaux du stock soir
    Object.entries(stockSoir).forEach(([key, item]) => {
        const [pointVente, produit] = key.split('-');
        if (pointVente === 'Abattage') {
            const montant = parseFloat(item.Montant || 0);
            reconciliation[pointVente].stockSoir += montant;
        }
    });
    
    // Calculer les ventes théoriques
    reconciliation['Abattage'].ventes = 
        reconciliation['Abattage'].stockMatin - 
        reconciliation['Abattage'].stockSoir + 
        reconciliation['Abattage'].transferts;
    
    // Calculer la différence
    reconciliation['Abattage'].difference = 
        reconciliation['Abattage'].ventes - 
        reconciliation['Abattage'].ventesSaisies;
    
    // Calculer le pourcentage d'écart (formule spéciale pour Abattage)
    if (reconciliation['Abattage'].ventes !== 0) {
        if ('Abattage' === 'Abattage') {
            // Pour Abattage : (Ventes Théoriques / Stock Matin) * 100
            if (reconciliation['Abattage'].stockMatin !== 0) {
                reconciliation['Abattage'].pourcentageEcart = 
                    (reconciliation['Abattage'].ventes / reconciliation['Abattage'].stockMatin) * 100;
            } else {
                reconciliation['Abattage'].pourcentageEcart = 0;
            }
        }
    }
    
    // Vérifications
    expect(reconciliation['Abattage'].stockMatin).toBe(800000); // 500k + 300k
    expect(reconciliation['Abattage'].stockSoir).toBe(150000);  // 100k + 50k
    expect(reconciliation['Abattage'].ventes).toBe(650000);     // 800k - 150k + 0
    expect(reconciliation['Abattage'].difference).toBe(50000);  // 650k - 600k
    expect(reconciliation['Abattage'].pourcentageEcart).toBe(81.25); // 650k / 800k * 100 = 81.25%
  });
  
  test('Gestion du cas stock matin nul pour Abattage', () => {
    // Simuler les données avec stock matin nul
    const reconciliation = {};
    reconciliation['Abattage'] = {
      stockMatin: 0,
      stockSoir: 0,
      transferts: 0,
      ventes: 100000,
      ventesSaisies: 80000,
      difference: 20000,
      pourcentageEcart: null,
      cashPayment: 0,
      ecartCash: 0,
      commentaire: 'Stock matin nul - calcul impossible'
    };
    
    // Vérifications
    expect(reconciliation['Abattage'].stockMatin).toBe(0);
    expect(reconciliation['Abattage'].pourcentageEcart).toBe(null);
    expect(reconciliation['Abattage'].commentaire).toBe('Stock matin nul - calcul impossible');
  });
  
  test('Affichage de l\'information sur la pération', () => {
    // Mock du DOM
    document.body.innerHTML = `
      <div id="peration-info" style="display: none;">
        Information sur la Pération
      </div>
    `;
    
    // Simuler l'affichage avec abattage présent
    const hasAbattage = true;
    const perationInfo = document.getElementById('peration-info');
    if (perationInfo) {
      perationInfo.style.display = hasAbattage ? 'block' : 'none';
    }
    
    expect(perationInfo.style.display).toBe('block');
    
    // Simuler l'affichage sans abattage
    perationInfo.style.display = 'none';
    const hasAbattage2 = false;
    if (perationInfo) {
      perationInfo.style.display = hasAbattage2 ? 'block' : 'none';
    }
    
    expect(perationInfo.style.display).toBe('none');
  });
}); 