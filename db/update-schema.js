const { sequelize } = require('./index');
const { Reconciliation } = require('./models');

// Fonction pour mettre à jour le schéma de la base de données
async function updateSchema() {
  try {
    console.log('Mise à jour du schéma de la base de données...');
    
    // Créer la table réconciliations si elle n'existe pas déjà
    await Reconciliation.sync();
    
    console.log('Schéma de la base de données mis à jour avec succès');
    return true;
  } catch (error) {
    console.error('Erreur lors de la mise à jour du schéma:', error);
    return false;
  }
}

// Exécuter la mise à jour si ce script est appelé directement
if (require.main === module) {
  updateSchema()
    .then(success => {
      if (success) {
        console.log('Mise à jour terminée avec succès');
        process.exit(0);
      } else {
        console.error('Échec de la mise à jour');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Erreur non gérée:', error);
      process.exit(1);
    });
}

module.exports = { updateSchema }; 