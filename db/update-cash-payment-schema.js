const { sequelize } = require('./index');
const { CashPayment } = require('./models');

async function updateSchema() {
  try {
    console.log('Mise à jour du schéma pour la table des paiements en espèces...');
    
    // Synchroniser uniquement le modèle CashPayment
    await CashPayment.sync({ alter: true });
    
    console.log('Schéma mis à jour avec succès!');
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du schéma:', error);
    process.exit(1);
  }
}

// Exécuter la fonction si le script est appelé directement
if (require.main === module) {
  updateSchema()
    .then(() => console.log('Mise à jour terminée'))
    .catch(err => {
      console.error('Échec de la mise à jour:', err);
      process.exit(1);
    });
}

module.exports = updateSchema; 