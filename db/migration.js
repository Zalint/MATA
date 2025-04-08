const fs = require('fs');
const { parse } = require('csv-parse');
const path = require('path');
const { Vente, Stock, Transfert, syncDatabase } = require('./models');
const { testConnection } = require('./index');

// Fonction pour standardiser le format de date
function standardiserDateFormat(dateStr) {
  if (!dateStr) return '';
  
  let jour, mois, annee;
  
  if (dateStr.includes('/')) {
    // Format DD/MM/YYYY ou DD/MM/YY
    [jour, mois, annee] = dateStr.split('/');
  } else if (dateStr.includes('-')) {
    // Format DD-MM-YYYY ou DD-MM-YY
    [jour, mois, annee] = dateStr.split('-');
  } else {
    return dateStr; // Format non reconnu, retourner tel quel
  }
  
  // S'assurer que jour et mois ont 2 chiffres
  jour = jour.padStart(2, '0');
  mois = mois.padStart(2, '0');
  
  // Convertir l'année à 4 chiffres si elle est à 2 chiffres
  if (annee.length === 2) {
    annee = '20' + annee;
  }
  
  // Retourner la date au format standardisé DD-MM-YYYY
  return `${jour}-${mois}-${annee}`;
}

// Fonction pour migrer les ventes
async function migrerVentes() {
  const csvFilePath = path.join(__dirname, '..', 'ventes.csv');
  
  if (!fs.existsSync(csvFilePath)) {
    console.error('Fichier ventes.csv non trouvé');
    return false;
  }
  
  return new Promise((resolve, reject) => {
    const ventes = [];
    
    fs.createReadStream(csvFilePath)
      .pipe(parse({ 
        delimiter: ';', 
        columns: true, 
        skip_empty_lines: true,
        relaxColumnCount: true
      }))
      .on('data', (row) => {
        // Standardiser la date
        const dateStandardisee = standardiserDateFormat(row.Date);
        
        ventes.push({
          mois: row.Mois,
          date: dateStandardisee,
          semaine: row.Semaine,
          pointVente: row['Point de Vente'],
          preparation: row.Preparation || row['Point de Vente'],
          categorie: row.Catégorie,
          produit: row.Produit,
          prixUnit: parseFloat(row.PU) || 0,
          nombre: parseFloat(row.Nombre) || 0,
          montant: parseFloat(row.Montant || row.Total) || 0
        });
      })
      .on('end', async () => {
        try {
          // Utiliser bulkCreate pour insérer toutes les ventes en une seule opération
          await Vente.bulkCreate(ventes);
          console.log(`Migration réussie: ${ventes.length} ventes importées`);
          resolve(true);
        } catch (error) {
          console.error('Erreur lors de la migration des ventes:', error);
          reject(error);
        }
      })
      .on('error', (error) => {
        console.error('Erreur lors de la lecture du CSV:', error);
        reject(error);
      });
  });
}

// Fonction pour migrer le stock
async function migrerStock() {
  const csvFilePath = path.join(__dirname, '..', 'stock.csv');
  
  if (!fs.existsSync(csvFilePath)) {
    console.error('Fichier stock.csv non trouvé');
    return false;
  }
  
  return new Promise((resolve, reject) => {
    const stocks = [];
    
    fs.createReadStream(csvFilePath)
      .pipe(parse({ 
        delimiter: ';', 
        columns: true, 
        skip_empty_lines: true
      }))
      .on('data', (row) => {
        // Standardiser la date
        const dateStandardisee = standardiserDateFormat(row.Date);
        
        stocks.push({
          date: dateStandardisee,
          typeStock: row['Type Stock'],
          pointVente: row['Point de Vente'],
          produit: row.Produit,
          quantite: parseFloat(row.Quantité) || 0,
          prixUnitaire: parseFloat(row['Prix Unitaire']) || 0,
          total: parseFloat(row.Total) || 0,
          commentaire: row.Commentaire
        });
      })
      .on('end', async () => {
        try {
          await Stock.bulkCreate(stocks);
          console.log(`Migration réussie: ${stocks.length} entrées de stock importées`);
          resolve(true);
        } catch (error) {
          console.error('Erreur lors de la migration du stock:', error);
          reject(error);
        }
      })
      .on('error', (error) => {
        console.error('Erreur lors de la lecture du CSV:', error);
        reject(error);
      });
  });
}

// Fonction pour migrer les transferts
async function migrerTransferts() {
  // Lire les transferts depuis le fichier JSON
  const transfertsPath = path.join(__dirname, '..', 'data', 'transferts.json');
  
  if (!fs.existsSync(transfertsPath)) {
    console.log('Fichier transferts.json non trouvé, aucun transfert à migrer');
    return true;
  }
  
  try {
    const content = await fs.promises.readFile(transfertsPath, 'utf8');
    const transferts = JSON.parse(content || '[]');
    
    if (transferts.length === 0) {
      console.log('Aucun transfert à migrer');
      return true;
    }
    
    // Mapper les transferts pour la base de données
    const transfertsForDB = transferts.map(t => ({
      date: standardiserDateFormat(t.date),
      pointVente: t.pointVente,
      produit: t.produit,
      quantite: parseFloat(t.quantite) || 0,
      prixUnitaire: parseFloat(t.prixUnitaire) || 0,
      total: parseFloat(t.total) || 0,
      impact: t.impact || '',
      commentaire: t.commentaire
    }));
    
    await Transfert.bulkCreate(transfertsForDB);
    console.log(`Migration réussie: ${transfertsForDB.length} transferts importés`);
    return true;
  } catch (error) {
    console.error('Erreur lors de la migration des transferts:', error);
    return false;
  }
}

// Fonction principale de migration
async function migrerDonnees() {
  try {
    // Vérifier la connexion à la base de données
    const connected = await testConnection();
    if (!connected) {
      console.error('Impossible de se connecter à la base de données');
      return false;
    }
    
    // Synchroniser les modèles avec la base de données (force = true pour recréer les tables)
    await syncDatabase(true);
    
    // Migrer les données
    await migrerVentes();
    await migrerStock();
    await migrerTransferts();
    
    console.log('Migration des données terminée avec succès');
    return true;
  } catch (error) {
    console.error('Erreur lors de la migration des données:', error);
    return false;
  }
}

// Exécuter la migration si ce script est appelé directement
if (require.main === module) {
  migrerDonnees()
    .then(success => {
      if (success) {
        console.log('Migration terminée avec succès');
        process.exit(0);
      } else {
        console.error('Échec de la migration');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Erreur non gérée:', error);
      process.exit(1);
    });
}

module.exports = { migrerDonnees }; 