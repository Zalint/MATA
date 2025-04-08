const { migrerDonnees } = require('./db/migration');

console.log('Démarrage de la migration des données...');

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
    console.error('Erreur non gérée pendant la migration:', error);
    process.exit(1);
  }); 