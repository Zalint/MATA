/**
 * Tests unitaires pour les détails de réconciliation
 * Vérifie l'affichage et les calculs des tableaux détaillés par produit
 */

// Mock du DOM pour les tests
document.body.innerHTML = `
<div id="reconciliation-container">
  <div id="debug-reconciliation">
    <div id="debug-stock-section"></div>
    <div id="debug-ventes-section"></div>
    <div id="debug-unified-table"></div>
    <div id="debug-calculs-section"></div>
  </div>
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

// Importer les fonctions à tester si nécessaire
// Note: Pour les tests unitaires, on pourrait juste tester les algorithmes

// Mock de la fonction d'affichage des tableaux
function creerTableauDetail(titre, donnees, estTransfert = false, estVente = false, total = 0) {
  const container = document.createElement('div');
  container.classList.add('debug-table-container');
  
  // Titre du tableau
  const h5 = document.createElement('h5');
  h5.textContent = titre;
  container.appendChild(h5);
  
  // Message si aucune donnée
  if (!donnees || donnees.length === 0) {
    const message = document.createElement('p');
    message.textContent = 'Aucune donnée disponible';
    container.appendChild(message);
    return container;
  }
  
  // Créer la table
  const table = document.createElement('table');
  table.classList.add('table', 'table-sm', 'table-bordered');
  
  // En-tête du tableau
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  
  // Colonnes différentes selon le type de tableau
  let columns = [];
  
  if (estVente) {
    columns = ['Produit', 'PU', 'Nombre', 'Montant'];
  } else if (estTransfert) {
    columns = ['Produit', 'Impact', 'Quantité', 'Prix', 'Total'];
  } else {
    columns = ['Produit', 'Quantité', 'Prix', 'Total'];
  }
  
  columns.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col;
    headerRow.appendChild(th);
  });
  
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  // Corps du tableau
  const tbody = document.createElement('tbody');
  
  donnees.forEach(item => {
    const row = document.createElement('tr');
    
    if (estVente) {
      // Colonnes pour les ventes
      const tdProduit = document.createElement('td');
      tdProduit.textContent = item.produit;
      row.appendChild(tdProduit);
      
      const tdPU = document.createElement('td');
      tdPU.textContent = item.pu;
      row.appendChild(tdPU);
      
      const tdNombre = document.createElement('td');
      tdNombre.textContent = item.nombre;
      row.appendChild(tdNombre);
      
      const tdMontant = document.createElement('td');
      tdMontant.textContent = item.montant;
      row.appendChild(tdMontant);
    } else if (estTransfert) {
      // Colonnes pour les transferts
      const tdProduit = document.createElement('td');
      tdProduit.textContent = item.produit;
      row.appendChild(tdProduit);
      
      const tdImpact = document.createElement('td');
      tdImpact.textContent = item.impact > 0 ? 'Entrée' : 'Sortie';
      row.appendChild(tdImpact);
      
      const tdQuantite = document.createElement('td');
      tdQuantite.textContent = item.quantite;
      row.appendChild(tdQuantite);
      
      const tdPrix = document.createElement('td');
      tdPrix.textContent = item.prix;
      row.appendChild(tdPrix);
      
      const tdTotal = document.createElement('td');
      tdTotal.textContent = item.total;
      row.appendChild(tdTotal);
    } else {
      // Colonnes pour le stock
      const tdProduit = document.createElement('td');
      tdProduit.textContent = item.produit;
      row.appendChild(tdProduit);
      
      const tdQuantite = document.createElement('td');
      tdQuantite.textContent = item.quantite;
      row.appendChild(tdQuantite);
      
      const tdPrix = document.createElement('td');
      tdPrix.textContent = item.prix;
      row.appendChild(tdPrix);
      
      const tdTotal = document.createElement('td');
      tdTotal.textContent = item.total;
      row.appendChild(tdTotal);
    }
    
    tbody.appendChild(row);
  });
  
  // Ajouter une ligne de total si nécessaire
  if (total > 0) {
    const totalRow = document.createElement('tr');
    totalRow.classList.add('fw-bold');
    
    const tdLabel = document.createElement('td');
    tdLabel.textContent = 'TOTAL';
    tdLabel.setAttribute('colspan', columns.length - 1);
    totalRow.appendChild(tdLabel);
    
    const tdTotal = document.createElement('td');
    tdTotal.textContent = total;
    totalRow.appendChild(tdTotal);
    
    tbody.appendChild(totalRow);
  }
  
  table.appendChild(tbody);
  container.appendChild(table);
  
  return container;
}

// Fonction pour créer le tableau unifié
function creerTableauUnifie(details) {
  const container = document.createElement('div');
  container.classList.add('mb-4');
  
  // Titre
  const titreElement = document.createElement('h5');
  titreElement.textContent = 'Détails des calculs par produit';
  titreElement.classList.add('mt-3', 'mb-2');
  container.appendChild(titreElement);
  
  // Vérifier s'il y a des données
  const hasStockMatin = details.stockMatin && details.stockMatin.length > 0;
  const hasStockSoir = details.stockSoir && details.stockSoir.length > 0;
  const hasTransferts = details.transferts && details.transferts.length > 0;
  
  if (!hasStockMatin && !hasStockSoir && !hasTransferts) {
    const message = document.createElement('p');
    message.textContent = 'Aucune donnée disponible pour ce point de vente';
    container.appendChild(message);
    return container;
  }
  
  // Créer le tableau
  const table = document.createElement('table');
  table.classList.add('table', 'table-sm', 'table-bordered');
  
  // En-tête
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  
  const columns = ['Produit', 'Stock Matin', 'Stock Soir', 'Transferts', 'Vente Théorique'];
  
  columns.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col;
    headerRow.appendChild(th);
  });
  
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  // Corps du tableau
  const tbody = document.createElement('tbody');
  
  // Collecter tous les produits uniques
  const allProducts = new Set();
  
  if (hasStockMatin) {
    details.stockMatin.forEach(item => allProducts.add(item.produit));
  }
  
  if (hasStockSoir) {
    details.stockSoir.forEach(item => allProducts.add(item.produit));
  }
  
  if (hasTransferts) {
    details.transferts.forEach(item => allProducts.add(item.produit));
  }
  
  // Trier les produits
  const produitsTries = Array.from(allProducts).sort();
  
  // Pour chaque produit, créer une ligne
  produitsTries.forEach(produit => {
    const row = document.createElement('tr');
    
    // Colonne produit
    const tdProduit = document.createElement('td');
    tdProduit.textContent = produit;
    row.appendChild(tdProduit);
    
    // Colonne stock matin
    const tdStockMatin = document.createElement('td');
    const stockMatinItem = hasStockMatin ? 
      details.stockMatin.find(item => item.produit === produit) : null;
    tdStockMatin.textContent = stockMatinItem ? stockMatinItem.total : '0';
    row.appendChild(tdStockMatin);
    
    // Colonne stock soir
    const tdStockSoir = document.createElement('td');
    const stockSoirItem = hasStockSoir ? 
      details.stockSoir.find(item => item.produit === produit) : null;
    tdStockSoir.textContent = stockSoirItem ? stockSoirItem.total : '0';
    row.appendChild(tdStockSoir);
    
    // Colonne transferts
    const tdTransferts = document.createElement('td');
    let totalTransferts = 0;
    
    if (hasTransferts) {
      const transfertsItems = details.transferts.filter(item => item.produit === produit);
      totalTransferts = transfertsItems.reduce((sum, item) => sum + (item.impact * item.total), 0);
    }
    
    tdTransferts.textContent = totalTransferts;
    row.appendChild(tdTransferts);
    
    // Colonne vente théorique
    const tdVenteTheorique = document.createElement('td');
    const stockMatinValue = stockMatinItem ? stockMatinItem.total : 0;
    const stockSoirValue = stockSoirItem ? stockSoirItem.total : 0;
    
    // Formule: Vente théorique = Stock Matin - Stock Soir + Transferts
    const venteTheorique = stockMatinValue - stockSoirValue + totalTransferts;
    
    tdVenteTheorique.textContent = venteTheorique;
    row.appendChild(tdVenteTheorique);
    
    tbody.appendChild(row);
  });
  
  // Ligne de total
  const totalRow = document.createElement('tr');
  totalRow.classList.add('fw-bold');
  
  const tdTotal = document.createElement('td');
  tdTotal.textContent = 'TOTAL';
  totalRow.appendChild(tdTotal);
  
  // Total Stock Matin
  const tdTotalStockMatin = document.createElement('td');
  tdTotalStockMatin.textContent = details.totalStockMatin || 0;
  totalRow.appendChild(tdTotalStockMatin);
  
  // Total Stock Soir
  const tdTotalStockSoir = document.createElement('td');
  tdTotalStockSoir.textContent = details.totalStockSoir || 0;
  totalRow.appendChild(tdTotalStockSoir);
  
  // Total Transferts
  const tdTotalTransferts = document.createElement('td');
  tdTotalTransferts.textContent = details.totalTransferts || 0;
  totalRow.appendChild(tdTotalTransferts);
  
  // Total Vente Théorique
  const tdTotalVenteTheorique = document.createElement('td');
  tdTotalVenteTheorique.textContent = details.venteTheoriques || 0;
  totalRow.appendChild(tdTotalVenteTheorique);
  
  tbody.appendChild(totalRow);
  table.appendChild(tbody);
  container.appendChild(table);
  
  return container;
}

// Données de test pour O.Foire
const testDetails = {
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
 * Tests pour l'affichage des détails
 */
describe('Affichage des détails de réconciliation', () => {
  
  beforeEach(() => {
    // Réinitialiser le conteneur de détails avant chaque test
    document.getElementById('debug-stock-section').innerHTML = '';
    document.getElementById('debug-ventes-section').innerHTML = '';
    document.getElementById('debug-unified-table').innerHTML = '';
    document.getElementById('debug-calculs-section').innerHTML = '';
  });
  
  test('Affichage du tableau de stock matin', () => {
    const stockMatinSection = document.getElementById('debug-stock-section');
    
    // Créer le tableau de stock matin
    const tableauStockMatin = creerTableauDetail(
      'Stock Matin', 
      testDetails.stockMatin, 
      false, 
      false, 
      testDetails.totalStockMatin
    );
    
    stockMatinSection.appendChild(tableauStockMatin);
    
    // Vérifier que le tableau a été créé correctement
    expect(stockMatinSection.querySelector('h5').textContent).toBe('Stock Matin');
    expect(stockMatinSection.querySelectorAll('tbody tr').length).toBe(testDetails.stockMatin.length + 1); // +1 pour la ligne de total
    
    // Vérifier le total
    const totalRow = stockMatinSection.querySelector('tbody tr.fw-bold');
    expect(totalRow).not.toBeNull();
    expect(totalRow.cells[1].textContent).toBe(testDetails.totalStockMatin.toString());
  });
  
  test('Affichage du tableau de ventes', () => {
    const ventesSection = document.getElementById('debug-ventes-section');
    
    // Créer le tableau de ventes
    const tableauVentes = creerTableauDetail(
      'Ventes Saisies', 
      testDetails.ventes, 
      false, 
      true, 
      testDetails.venteReelles
    );
    
    ventesSection.appendChild(tableauVentes);
    
    // Vérifier que le tableau a été créé correctement
    expect(ventesSection.querySelector('h5').textContent).toBe('Ventes Saisies');
    expect(ventesSection.querySelectorAll('tbody tr').length).toBe(testDetails.ventes.length + 1); // +1 pour la ligne de total
    
    // Vérifier le total
    const totalRow = ventesSection.querySelector('tbody tr.fw-bold');
    expect(totalRow).not.toBeNull();
    expect(totalRow.cells[1].textContent).toBe(testDetails.venteReelles.toString());
  });
  
  test('Affichage du tableau unifié des calculs par produit', () => {
    const unifiedTableSection = document.getElementById('debug-unified-table');
    
    // Créer le tableau unifié
    const tableauUnifie = creerTableauUnifie(testDetails);
    
    unifiedTableSection.appendChild(tableauUnifie);
    
    // Vérifier que le tableau a été créé correctement
    expect(unifiedTableSection.querySelector('h5').textContent).toBe('Détails des calculs par produit');
    
    // Nombre de produits uniques (Boeuf, Agneau, Foie, Déchet 400, Yell, Tablette) + 1 pour le total
    const expectedRows = 6 + 1;
    expect(unifiedTableSection.querySelectorAll('tbody tr').length).toBe(expectedRows);
    
    // Vérifier le total
    const totalRow = unifiedTableSection.querySelector('tbody tr.fw-bold');
    expect(totalRow).not.toBeNull();
    expect(totalRow.cells[1].textContent).toBe(testDetails.totalStockMatin.toString());
    expect(totalRow.cells[2].textContent).toBe(testDetails.totalStockSoir.toString());
    expect(totalRow.cells[3].textContent).toBe(testDetails.totalTransferts.toString());
    expect(totalRow.cells[4].textContent).toBe(testDetails.venteTheoriques.toString());
  });
});

/**
 * Tests pour les calculs de détails
 */
describe('Calculs des détails de réconciliation', () => {
  
  test('Calcul des ventes théoriques par produit', () => {
    // Prenons un exemple: le Boeuf
    const boeufMatin = testDetails.stockMatin.find(item => item.produit === 'Boeuf');
    const boeufSoir = testDetails.stockSoir.find(item => item.produit === 'Boeuf');
    const boeufTransferts = testDetails.transferts.find(item => item.produit === 'Boeuf');
    
    // Calcul: Stock Matin - Stock Soir + Transferts = Ventes Théoriques
    const ventesTheoriques = boeufMatin.total - boeufSoir.total + (boeufTransferts.impact * boeufTransferts.total);
    
    // Valeur attendue pour le Boeuf: 124200 - 32400 + 961200 = 1053000
    expect(ventesTheoriques).toBe(1053000);
  });
  
  test('Calcul du total des ventes saisies', () => {
    // Calculer le total des ventes saisies
    const totalVentes = testDetails.ventes.reduce((sum, item) => sum + item.montant, 0);
    
    // Vérifier que le total correspond au montant des ventes réelles
    expect(totalVentes).toBe(testDetails.venteReelles);
  });
  
  test('Calcul de l\'écart de réconciliation', () => {
    // Écart = Ventes Théoriques - Ventes Réelles
    const ecart = testDetails.venteTheoriques - testDetails.venteReelles;
    
    // Vérifier que l'écart correspond à la différence stockée
    expect(ecart).toBe(testDetails.difference);
  });
  
  test('Calcul du pourcentage d\'écart', () => {
    // Pourcentage = (Écart / Ventes Théoriques) * 100
    const pourcentage = (testDetails.difference / testDetails.venteTheoriques) * 100;
    
    // Vérifier que le pourcentage calculé est proche du pourcentage stocké (avec une précision de 2 décimales)
    expect(pourcentage).toBeCloseTo(testDetails.pourcentage, 2);
  });
}); 