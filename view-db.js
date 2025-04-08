const { Vente, Stock, Transfert } = require('./db/models');
const { testConnection } = require('./db');

// Fonction pour afficher le contenu d'une table
async function displayTableContent(model, tableName, limit = 10) {
  try {
    const count = await model.count();
    console.log(`\n=== Table ${tableName} (${count} enregistrements au total) ===`);
    
    if (count === 0) {
      console.log('Aucun enregistrement trouvé dans cette table.');
      return;
    }

    const records = await model.findAll({ limit });
    
    console.log(`Affichage des ${Math.min(limit, count)} premiers enregistrements:`);
    records.forEach((record, index) => {
      console.log(`\n[${index + 1}] ID: ${record.id}`);
      
      // Convertir l'objet Sequelize en objet JavaScript simple
      const plainRecord = record.get({ plain: true });
      
      // Afficher chaque propriété
      Object.entries(plainRecord).forEach(([key, value]) => {
        if (key !== 'id') {
          console.log(`  ${key}: ${value}`);
        }
      });
    });
  } catch (error) {
    console.error(`Erreur lors de l'affichage de la table ${tableName}:`, error);
  }
}

// Fonction principale
async function viewDatabase() {
  try {
    // Vérifier la connexion à la base de données
    const connected = await testConnection();
    if (!connected) {
      console.error('Impossible de se connecter à la base de données');
      return;
    }
    
    console.log('=== CONTENU DE LA BASE DE DONNÉES ===');
    
    // Afficher le contenu de chaque table
    await displayTableContent(Vente, 'ventes');
    await displayTableContent(Stock, 'stocks');
    await displayTableContent(Transfert, 'transferts');
    
    console.log('\n=== FIN DU RAPPORT ===');
  } catch (error) {
    console.error('Erreur lors de l\'affichage de la base de données:', error);
  }
}

// Exécuter la fonction principale
viewDatabase()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Erreur non gérée:', error);
    process.exit(1);
  }); 