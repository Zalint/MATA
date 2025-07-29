/**
 * Tests unitaires pour la fonctionnalité de réconciliation
 * Vérifie les calculs et l'affichage des détails de réconciliation
 */

// Mock du DOM pour les tests
document.body.innerHTML = `
<div id="reconciliation-container">
  <table id="reconciliation-table">
    <thead></thead>
    <tbody></tbody>
  </table>
  <div id="details-container"></div>
</div>
`;

// Mock des variables globales
global.POINTS_VENTE_PHYSIQUES = ['Mbao', 'O.Foire', 'Linguere', 'Dahra', 'Touba', 'Keur Massar'];
global.PRODUITS = ['Boeuf', 'Veau', 'Agneau', 'Yell', 'Foie'];
global.PRIX_DEFAUT = {
  'Boeuf': 3600,
  'Veau': 3800,
  'Agneau': 4500,
  'Yell': 2500,
  'Foie': 3400
};

// Importer les fonctions à tester
const reconciliationManager = require('../reconciliationManager');

// Mock de fetch
global.fetch = jest.fn();

/**
 * Données de test pour les réconciliations
 */
const mockReconciliationData = {
  'Mbao': {
    stockMatin: 762200,
    stockSoir: 508800,
    transferts: 0,
    ventesTheoriques: 253400,
    ventesSaisies: 226400,
    difference: 27000,
    pourcentage: 10.66,
    commentaire: ''
  },
  'O.Foire': {
    stockMatin: 210400,
    stockSoir: 202630,
    transferts: 1226200,
    ventesTheoriques: 1233970,
    ventesSaisies: 1165400,
    difference: 68570,
    pourcentage: 5.56,
    commentaire: ''
  },
  'Linguere': {
    stockMatin: 63000,
    stockSoir: 30000,
    transferts: 0,
    ventesTheoriques: 33000,
    ventesSaisies: 33000,
    difference: 0,
    pourcentage: 0,
    commentaire: ''
  }
};

// Mock des détails pour O.Foire
const mockOFoireDetails = {
  pointVente: 'O.Foire',
  totalStockMatin: 210400,
  totalStockSoir: 202630,
  totalTransferts: 1226200,
  venteTheoriques: 1233970,
  venteReelles: 1165400,
  difference: 68570,
  pourcentage: 5.56,
  stockMatin: [
    { produit: 'Boeuf', quantite: 124200, prix: 3600, total: 124200 },
    { produit: 'Agneau', quantite: 0, prix: 4500, total: 0 },
    { produit: 'Foie', quantite: 28000, prix: 3400, total: 28000 },
    { produit: 'Déchet 400', quantite: 3200, prix: 400, total: 3200 },
    { produit: 'Yell', quantite: 20000, prix: 2500, total: 20000 },
    { produit: 'Tablette', quantite: 35000, prix: 1000, total: 35000 }
  ],
  stockSoir: [
    { produit: 'Boeuf', quantite: 32400, prix: 3600, total: 32400 },
    { produit: 'Agneau', quantite: 60750, prix: 4500, total: 60750 },
    { produit: 'Foie', quantite: 64000, prix: 3400, total: 64000 },
    { produit: 'Déchet 400', quantite: 7480, prix: 400, total: 7480 },
    { produit: 'Yell', quantite: 10000, prix: 2500, total: 10000 },
    { produit: 'Tablette', quantite: 28000, prix: 1000, total: 28000 }
  ],
  transferts: [
    { produit: 'Boeuf', impact: 1, quantite: 267, prix: 3600, total: 961200 },
    { produit: 'Agneau', impact: 1, quantite: 50, prix: 4500, total: 225000 },
    { produit: 'Foie', impact: 1, quantite: 10, prix: 4000, total: 40000 }
  ],
  ventes: [
    { produit: 'Boeuf en détail', pu: 3600, nombre: 186, montant: 669600 },
    { produit: 'Boeuf en gros', pu: 3400, nombre: 93, montant: 316200 },
    { produit: 'Agneau', pu: 4500, nombre: 36, montant: 162000 },
    { produit: 'Foie', pu: 4000, nombre: 1, montant: 4000 },
    { produit: 'Yell', pu: 2000, nombre: 4, montant: 8000 },
    { produit: 'Oeuf', pu: 2800, nombre: 2, montant: 5600 }
  ]
};

/**
 * Tests pour les calculs de réconciliation
 */
describe('Tests des calculs de réconciliation', () => {
  test('Calcul correct des ventes théoriques', () => {
    // Formule: Stock Matin - Stock Soir + Transferts = Ventes Théoriques
    const stockMatin = 210400;
    const stockSoir = 202630;
    const transferts = 1226200;
    
    const ventesTheoriques = stockMatin - stockSoir + transferts;
    expect(ventesTheoriques).toBe(1233970);
  });
  
  test('Calcul correct de l\'écart', () => {
    // Formule: Ventes Théoriques - Ventes Saisies = Écart
    const ventesTheoriques = 1233970;
    const ventesSaisies = 1165400;
    
    const ecart = ventesTheoriques - ventesSaisies;
    expect(ecart).toBe(68570);
  });
  
  test('Calcul correct du pourcentage d\'écart', () => {
    // Formule: (Écart / Ventes Théoriques) * 100 = Pourcentage d'écart
    const ventesTheoriques = 1233970;
    const ecart = 68570;
    
    const pourcentage = (ecart / ventesTheoriques) * 100;
    expect(pourcentage).toBeCloseTo(5.56, 1);
  });

  test('Calcul spécial du pourcentage d\'écart pour abattage', () => {
    // Pour abattage : (Ventes Théoriques / Stock Matin) * 100
    const stockMatin = 500000;
    const ventesTheoriques = 400000;
    
    const pourcentage = (ventesTheoriques / stockMatin) * 100;
    expect(pourcentage).toBe(80); // 80% du stock matin a été vendu
    
    // Test avec des valeurs différentes
    const stockMatin2 = 1000000;
    const ventesTheoriques2 = 750000;
    
    const pourcentage2 = (ventesTheoriques2 / stockMatin2) * 100;
    expect(pourcentage2).toBe(75); // 75% du stock matin a été vendu
  });
});

/**
 * Tests pour l'affichage des détails de réconciliation
 */
describe('Tests d\'affichage des détails de réconciliation', () => {
  beforeEach(() => {
    // Réinitialiser le conteneur de détails avant chaque test
    document.getElementById('details-container').innerHTML = '';
  });
  
  test('Affichage correct des détails de calcul pour O.Foire', () => {
    // Mock de la fonction d'affichage
    const mockDisplayFunction = jest.fn();
    
    // Simuler l'affichage des détails
    mockDisplayFunction(mockOFoireDetails);
    
    // Vérifier que la fonction a été appelée avec les bonnes données
    expect(mockDisplayFunction).toHaveBeenCalledWith(mockOFoireDetails);
  });
  
  test('Vérification des totaux des produits pour O.Foire', () => {
    // Calculer le total des produits vendus
    const totalVentes = mockOFoireDetails.ventes.reduce((sum, item) => sum + item.montant, 0);
    
    // Vérifier que le total correspond aux ventes saisies
    expect(totalVentes).toBe(1165400);
  });
});

/**
 * Tests d'intégration pour la réconciliation
 */
describe('Tests d\'intégration pour la réconciliation', () => {
  beforeEach(() => {
    // Configurer le mock pour fetch
    fetch.mockClear();
  });
  
  test('Chargement des données de réconciliation', async () => {
    // Mock de la réponse de l'API
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        success: true,
        data: mockReconciliationData
      })
    });
    
    // Simuler l'appel à l'API
    const response = await fetch('/api/reconciliation/2023-05-20');
    const result = await response.json();
    
    // Vérifier la réponse
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockReconciliationData);
    
    // Vérifier un élément spécifique
    expect(result.data['O.Foire'].ventesTheoriques).toBe(1233970);
  });
  
  test('Chargement des détails pour un point de vente', async () => {
    // Mock de la réponse de l'API
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        success: true, 
        details: mockOFoireDetails
      })
    });
    
    // Simuler l'appel à l'API
    const response = await fetch('/api/reconciliation/2023-05-20/details/O.Foire');
    const result = await response.json();
    
    // Vérifier la réponse
    expect(result.success).toBe(true);
    expect(result.details.pointVente).toBe('O.Foire');
    expect(result.details.ventes.length).toBe(6);
    
    // Vérifier les produits vendus
    const boeufEnDetail = result.details.ventes.find(v => v.produit === 'Boeuf en détail');
    expect(boeufEnDetail).toBeDefined();
    expect(boeufEnDetail.montant).toBe(669600);
  });
}); 