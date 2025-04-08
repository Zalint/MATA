const fs = require('fs');
const path = require('path');
const { stringify } = require('csv-stringify');
const { Vente, Stock, Transfert } = require('./db/models');
const { testConnection } = require('./db');

// Fonction pour exporter une table vers un fichier CSV
async function exportTableToCSV(model, tableName, fileName) {
  try {
    console.log(`Exportation de la table ${tableName}...`);
    
    // Créer le répertoire d'exportation s'il n'existe pas
    const exportDir = path.join(__dirname, 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir);
    }
    
    // Récupérer toutes les données du modèle
    const records = await model.findAll({
      order: [['id', 'ASC']]
    });
    
    // Si aucun enregistrement trouvé
    if (records.length === 0) {
      console.log(`Aucun enregistrement trouvé dans la table ${tableName}`);
      return 0;
    }
    
    // Convertir les objets Sequelize en objets JavaScript simples
    const data = records.map(record => record.get({ plain: true }));
    
    // Créer un tableau avec les en-têtes (noms des colonnes)
    const headers = Object.keys(data[0]);
    
    // Créer le flux d'écriture
    const writableStream = fs.createWriteStream(path.join(exportDir, fileName));
    
    // Configurer le formateur CSV
    const stringifier = stringify({ 
      header: true,
      columns: headers,
      delimiter: ';'
    });
    
    // Rediriger la sortie vers le fichier
    stringifier.pipe(writableStream);
    
    // Écrire les données
    data.forEach(record => {
      stringifier.write(record);
    });
    
    // Finaliser l'écriture
    stringifier.end();
    
    // Attendre que l'écriture soit terminée
    await new Promise((resolve, reject) => {
      writableStream.on('finish', resolve);
      writableStream.on('error', reject);
    });
    
    console.log(`Table ${tableName} exportée avec succès vers ${fileName}`);
    return data.length;
  } catch (error) {
    console.error(`Erreur lors de l'exportation de la table ${tableName}:`, error);
    throw error;
  }
}

// Fonction principale
async function exportDatabase() {
  try {
    console.log('=== EXPORTATION DE LA BASE DE DONNÉES ===\n');
    
    // Vérifier la connexion à la base de données
    const connected = await testConnection();
    if (!connected) {
      console.error('Impossible de se connecter à la base de données');
      return;
    }
    
    // Créer un horodatage pour les noms de fichiers
    const timestamp = new Date().toISOString().replace(/[:-]/g, '').split('.')[0];
    
    // Exporter chaque table
    const ventesCount = await exportTableToCSV(Vente, 'ventes', `ventes_${timestamp}.csv`);
    const stocksCount = await exportTableToCSV(Stock, 'stocks', `stocks_${timestamp}.csv`);
    const transfertsCount = await exportTableToCSV(Transfert, 'transferts', `transferts_${timestamp}.csv`);
    
    // Afficher un résumé
    console.log('\n=== RÉSUMÉ DE L\'EXPORTATION ===');
    console.log(`Ventes exportées: ${ventesCount} enregistrements`);
    console.log(`Stocks exportés: ${stocksCount} enregistrements`);
    console.log(`Transferts exportés: ${transfertsCount} enregistrements`);
    console.log(`Total: ${ventesCount + stocksCount + transfertsCount} enregistrements`);
    console.log(`Répertoire d'exportation: ${path.join(__dirname, 'exports')}`);
    
    console.log('\n=== EXPORTATION TERMINÉE ===');
  } catch (error) {
    console.error('Erreur lors de l\'exportation de la base de données:', error);
  }
}

// Exécuter la fonction principale
exportDatabase()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Erreur non gérée:', error);
    process.exit(1);
  }); 