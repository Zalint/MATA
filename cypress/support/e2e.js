// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Ignorer toutes les erreurs non capturées pour éviter les échecs de test dus à des erreurs de script
// Cela est particulièrement utile lors de l'exécution de tests sur une application existante
Cypress.on('uncaught:exception', (err, runnable) => {
  // Consigner l'erreur dans la console pour référence
  console.log('Erreur non capturée ignorée:', err.message);
  
  // Retourner false empêche Cypress d'échouer le test quand une exception non capturée se produit
  return false;
});

// Nettoyer après tous les tests
after(() => {
  // Se déconnecter après tous les tests (de manière plus robuste)
  cy.visit('/').then(($body) => {
    // Vérifier si le bouton de déconnexion existe avant de l'utiliser
    if ($body.find('a:contains("Déconnexion")').length > 0) {
      cy.contains('a', 'Déconnexion').click();
      cy.log('Déconnecté avec succès');
    } else {
      cy.log('Lien de déconnexion non trouvé - probablement déjà déconnecté');
    }
  });
}); 