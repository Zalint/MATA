const readline = require('readline');
const { Vente, Stock, Transfert } = require('./db/models');
const { testConnection } = require('./db');
const { Op } = require('sequelize');

// Créer l'interface de ligne de commande
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Fonction pour standardiser la date (DD-MM-YYYY)
function standardiserDateFormat(dateStr) {
  if (!dateStr) return '';
  
  let jour, mois, annee;
  
  if (dateStr.includes('/')) {
    [jour, mois, annee] = dateStr.split('/');
  } else if (dateStr.includes('-')) {
    [jour, mois, annee] = dateStr.split('-');
  } else {
    return dateStr;
  }
  
  jour = jour.padStart(2, '0');
  mois = mois.padStart(2, '0');
  
  // Convertir l'année à 4 chiffres si elle est à 2 chiffres
  if (annee.length === 2) {
    annee = '20' + annee;
  }
  
  return `${jour}-${mois}-${annee}`;
}

// Fonction pour poser une question et obtenir une réponse
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Fonction pour afficher les ventes
async function displayVentes(whereConditions = {}) {
  try {
    // Compter le nombre total de ventes correspondant aux critères
    const count = await Vente.count({ where: whereConditions });
    console.log(`\nNombre total de ventes trouvées: ${count}`);
    
    if (count === 0) {
      console.log('Aucune vente trouvée avec ces critères.');
      return;
    }
    
    // Demander combien d'enregistrements afficher
    let limit = 10;
    const limitResponse = await question(`Combien d'enregistrements afficher? (par défaut: ${limit}): `);
    if (limitResponse && !isNaN(parseInt(limitResponse))) {
      limit = parseInt(limitResponse);
    }
    
    // Récupérer les ventes
    const ventes = await Vente.findAll({
      where: whereConditions,
      order: [['date', 'DESC'], ['id', 'ASC']],
      limit
    });
    
    // Afficher les ventes
    console.log(`\nAffichage de ${ventes.length} ventes:`);
    ventes.forEach((vente, index) => {
      console.log(`\n[${index + 1}] ID: ${vente.id}`);
      console.log(`  Date: ${vente.date}`);
      console.log(`  Point de vente: ${vente.pointVente}`);
      console.log(`  Catégorie: ${vente.categorie}`);
      console.log(`  Produit: ${vente.produit}`);
      console.log(`  Prix unitaire: ${vente.prixUnit}`);
      console.log(`  Quantité: ${vente.nombre}`);
      console.log(`  Montant: ${vente.montant}`);
    });
    
    // Calculer les statistiques
    let totalMontant = 0;
    let totalQuantite = 0;
    
    ventes.forEach(vente => {
      totalMontant += parseFloat(vente.montant);
      totalQuantite += parseFloat(vente.nombre);
    });
    
    console.log(`\nStatistiques pour les ${ventes.length} ventes affichées:`);
    console.log(`  Montant total: ${totalMontant.toFixed(2)}`);
    console.log(`  Quantité totale: ${totalQuantite.toFixed(2)}`);
  } catch (error) {
    console.error('Erreur lors de l\'affichage des ventes:', error);
  }
}

// Fonction pour afficher le stock
async function displayStock(whereConditions = {}) {
  try {
    // Compter le nombre total d'entrées de stock correspondant aux critères
    const count = await Stock.count({ where: whereConditions });
    console.log(`\nNombre total d'entrées de stock trouvées: ${count}`);
    
    if (count === 0) {
      console.log('Aucune entrée de stock trouvée avec ces critères.');
      return;
    }
    
    // Demander combien d'enregistrements afficher
    let limit = 10;
    const limitResponse = await question(`Combien d'enregistrements afficher? (par défaut: ${limit}): `);
    if (limitResponse && !isNaN(parseInt(limitResponse))) {
      limit = parseInt(limitResponse);
    }
    
    // Récupérer les entrées de stock
    const stocks = await Stock.findAll({
      where: whereConditions,
      order: [['date', 'DESC'], ['id', 'ASC']],
      limit
    });
    
    // Afficher les entrées de stock
    console.log(`\nAffichage de ${stocks.length} entrées de stock:`);
    stocks.forEach((stock, index) => {
      console.log(`\n[${index + 1}] ID: ${stock.id}`);
      console.log(`  Date: ${stock.date}`);
      console.log(`  Type de stock: ${stock.typeStock}`);
      console.log(`  Point de vente: ${stock.pointVente}`);
      console.log(`  Produit: ${stock.produit}`);
      console.log(`  Quantité: ${stock.quantite}`);
      console.log(`  Prix unitaire: ${stock.prixUnitaire}`);
      console.log(`  Total: ${stock.total}`);
      console.log(`  Commentaire: ${stock.commentaire || ''}`);
    });
    
    // Calculer les statistiques
    let totalMontant = 0;
    let totalQuantite = 0;
    
    stocks.forEach(stock => {
      totalMontant += parseFloat(stock.total);
      totalQuantite += parseFloat(stock.quantite);
    });
    
    console.log(`\nStatistiques pour les ${stocks.length} entrées de stock affichées:`);
    console.log(`  Montant total: ${totalMontant.toFixed(2)}`);
    console.log(`  Quantité totale: ${totalQuantite.toFixed(2)}`);
  } catch (error) {
    console.error('Erreur lors de l\'affichage du stock:', error);
  }
}

// Fonction pour afficher les transferts
async function displayTransferts(whereConditions = {}) {
  try {
    // Compter le nombre total de transferts correspondant aux critères
    const count = await Transfert.count({ where: whereConditions });
    console.log(`\nNombre total de transferts trouvés: ${count}`);
    
    if (count === 0) {
      console.log('Aucun transfert trouvé avec ces critères.');
      return;
    }
    
    // Demander combien d'enregistrements afficher
    let limit = 10;
    const limitResponse = await question(`Combien d'enregistrements afficher? (par défaut: ${limit}): `);
    if (limitResponse && !isNaN(parseInt(limitResponse))) {
      limit = parseInt(limitResponse);
    }
    
    // Récupérer les transferts
    const transferts = await Transfert.findAll({
      where: whereConditions,
      order: [['date', 'DESC'], ['id', 'ASC']],
      limit
    });
    
    // Afficher les transferts
    console.log(`\nAffichage de ${transferts.length} transferts:`);
    transferts.forEach((transfert, index) => {
      console.log(`\n[${index + 1}] ID: ${transfert.id}`);
      console.log(`  Date: ${transfert.date}`);
      console.log(`  Point de vente: ${transfert.pointVente}`);
      console.log(`  Produit: ${transfert.produit}`);
      console.log(`  Quantité: ${transfert.quantite}`);
      console.log(`  Prix unitaire: ${transfert.prixUnitaire}`);
      console.log(`  Total: ${transfert.total}`);
      console.log(`  Impact: ${transfert.impact}`);
      console.log(`  Commentaire: ${transfert.commentaire || ''}`);
    });
    
    // Calculer les statistiques
    let totalMontant = 0;
    let totalQuantite = 0;
    
    transferts.forEach(transfert => {
      totalMontant += parseFloat(transfert.total);
      totalQuantite += parseFloat(transfert.quantite);
    });
    
    console.log(`\nStatistiques pour les ${transferts.length} transferts affichés:`);
    console.log(`  Montant total: ${totalMontant.toFixed(2)}`);
    console.log(`  Quantité totale: ${totalQuantite.toFixed(2)}`);
  } catch (error) {
    console.error('Erreur lors de l\'affichage des transferts:', error);
  }
}

// Fonction pour filtrer les ventes
async function filterVentes() {
  console.log('\n=== FILTRER LES VENTES ===');
  
  const whereConditions = {};
  
  // Filtre par date
  const useDate = await question('Filtrer par date? (o/n): ');
  if (useDate.toLowerCase() === 'o') {
    const date = await question('Date (JJ-MM-AAAA ou JJ/MM/AAAA): ');
    if (date) {
      whereConditions.date = standardiserDateFormat(date);
    }
  }
  
  // Filtre par plage de dates
  const useDateRange = await question('Filtrer par plage de dates? (o/n): ');
  if (useDateRange.toLowerCase() === 'o') {
    const dateDebut = await question('Date de début (JJ-MM-AAAA ou JJ/MM/AAAA): ');
    const dateFin = await question('Date de fin (JJ-MM-AAAA ou JJ/MM/AAAA): ');
    
    if (dateDebut || dateFin) {
      // Si on a déjà une date exacte, utiliser une nouvelle condition
      if (whereConditions.date) {
        console.log('Attention: Le filtre de date exacte sera remplacé par le filtre de plage de dates.');
      }
      
      whereConditions.date = {};
      
      if (dateDebut) {
        const dateDebutFormatted = standardiserDateFormat(dateDebut);
        whereConditions.date[Op.gte] = dateDebutFormatted;
      }
      
      if (dateFin) {
        const dateFinFormatted = standardiserDateFormat(dateFin);
        whereConditions.date[Op.lte] = dateFinFormatted;
      }
    }
  }
  
  // Filtre par point de vente
  const usePointVente = await question('Filtrer par point de vente? (o/n): ');
  if (usePointVente.toLowerCase() === 'o') {
    const pointVente = await question('Point de vente: ');
    if (pointVente) {
      whereConditions.pointVente = pointVente;
    }
  }
  
  // Filtre par catégorie
  const useCategorie = await question('Filtrer par catégorie? (o/n): ');
  if (useCategorie.toLowerCase() === 'o') {
    const categorie = await question('Catégorie: ');
    if (categorie) {
      whereConditions.categorie = categorie;
    }
  }
  
  // Filtre par produit
  const useProduit = await question('Filtrer par produit? (o/n): ');
  if (useProduit.toLowerCase() === 'o') {
    const produit = await question('Produit: ');
    if (produit) {
      whereConditions.produit = produit;
    }
  }
  
  // Afficher les ventes filtrées
  await displayVentes(whereConditions);
}

// Fonction pour filtrer le stock
async function filterStock() {
  console.log('\n=== FILTRER LE STOCK ===');
  
  const whereConditions = {};
  
  // Filtre par date
  const useDate = await question('Filtrer par date? (o/n): ');
  if (useDate.toLowerCase() === 'o') {
    const date = await question('Date (JJ-MM-AAAA ou JJ/MM/AAAA): ');
    if (date) {
      whereConditions.date = standardiserDateFormat(date);
    }
  }
  
  // Filtre par type de stock
  const useTypeStock = await question('Filtrer par type de stock? (o/n): ');
  if (useTypeStock.toLowerCase() === 'o') {
    const typeStock = await question('Type de stock (matin/soir): ');
    if (typeStock) {
      whereConditions.typeStock = typeStock;
    }
  }
  
  // Filtre par point de vente
  const usePointVente = await question('Filtrer par point de vente? (o/n): ');
  if (usePointVente.toLowerCase() === 'o') {
    const pointVente = await question('Point de vente: ');
    if (pointVente) {
      whereConditions.pointVente = pointVente;
    }
  }
  
  // Filtre par produit
  const useProduit = await question('Filtrer par produit? (o/n): ');
  if (useProduit.toLowerCase() === 'o') {
    const produit = await question('Produit: ');
    if (produit) {
      whereConditions.produit = produit;
    }
  }
  
  // Afficher le stock filtré
  await displayStock(whereConditions);
}

// Fonction pour filtrer les transferts
async function filterTransferts() {
  console.log('\n=== FILTRER LES TRANSFERTS ===');
  
  const whereConditions = {};
  
  // Filtre par date
  const useDate = await question('Filtrer par date? (o/n): ');
  if (useDate.toLowerCase() === 'o') {
    const date = await question('Date (JJ-MM-AAAA ou JJ/MM/AAAA): ');
    if (date) {
      whereConditions.date = standardiserDateFormat(date);
    }
  }
  
  // Filtre par point de vente
  const usePointVente = await question('Filtrer par point de vente? (o/n): ');
  if (usePointVente.toLowerCase() === 'o') {
    const pointVente = await question('Point de vente: ');
    if (pointVente) {
      whereConditions.pointVente = pointVente;
    }
  }
  
  // Filtre par produit
  const useProduit = await question('Filtrer par produit? (o/n): ');
  if (useProduit.toLowerCase() === 'o') {
    const produit = await question('Produit: ');
    if (produit) {
      whereConditions.produit = produit;
    }
  }
  
  // Filtre par impact
  const useImpact = await question('Filtrer par impact? (o/n): ');
  if (useImpact.toLowerCase() === 'o') {
    const impact = await question('Impact (1 pour entrée, -1 pour sortie): ');
    if (impact) {
      whereConditions.impact = impact;
    }
  }
  
  // Afficher les transferts filtrés
  await displayTransferts(whereConditions);
}

// Fonction principale
async function main() {
  try {
    // Vérifier la connexion à la base de données
    const connected = await testConnection();
    if (!connected) {
      console.error('Impossible de se connecter à la base de données');
      rl.close();
      return;
    }
    
    console.log('=== EXPLORATEUR DE BASE DE DONNÉES ===');
    
    let continuer = true;
    
    while (continuer) {
      console.log('\nChoisissez une option:');
      console.log('1. Afficher toutes les ventes');
      console.log('2. Filtrer les ventes');
      console.log('3. Afficher tout le stock');
      console.log('4. Filtrer le stock');
      console.log('5. Afficher tous les transferts');
      console.log('6. Filtrer les transferts');
      console.log('7. Quitter');
      
      const choix = await question('\nVotre choix: ');
      
      switch (choix) {
        case '1':
          await displayVentes();
          break;
        case '2':
          await filterVentes();
          break;
        case '3':
          await displayStock();
          break;
        case '4':
          await filterStock();
          break;
        case '5':
          await displayTransferts();
          break;
        case '6':
          await filterTransferts();
          break;
        case '7':
          continuer = false;
          break;
        default:
          console.log('Option invalide.');
      }
    }
    
    console.log('\nAu revoir!');
    rl.close();
  } catch (error) {
    console.error('Erreur lors de l\'exécution du programme:', error);
    rl.close();
  }
}

// Exécuter la fonction principale
main(); 