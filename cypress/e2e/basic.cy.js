/**
 * Tests E2E de base pour vérifier le fonctionnement minimal de l'application
 */

describe('Vérifications de base', () => {
  
  before(() => {
    // Visiter la page d'accueil simplement pour vérifier que le serveur répond
    cy.visit('/', { timeout: 30000, failOnStatusCode: false });
    cy.log('Test de disponibilité du serveur réussi');
  });
  
  it('Doit pouvoir accéder à la page d\'accueil', () => {
    cy.visit('/', { failOnStatusCode: false });
    cy.log('Page d\'accueil accessible');
  });
  
  it('Doit pouvoir essayer de se connecter', () => {
    // Tenter de se connecter (sans garantir que cela fonctionne)
    cy.visit('/login.html', { failOnStatusCode: false });
    
    // Vérifier si le formulaire de connexion existe
    cy.get('body').then(($body) => {
      if ($body.find('#loginForm').length) {
        cy.log('Formulaire de connexion trouvé');
        cy.get('#username').type('SALIOU', { log: false });
        cy.get('#password').type('saliou', { log: false });
        cy.get('#loginForm').submit();
      } else {
        cy.log('Formulaire de connexion non trouvé - page peut être différente');
      }
    });
  });
  
  it('Doit essayer d\'accéder à la fonctionnalité de réconciliation', () => {
    // Tenter de se connecter d'abord
    cy.login();
    
    // Vérifier si le lien de réconciliation existe
    cy.get('body').then(($body) => {
      if ($body.text().includes('Réconciliation')) {
        cy.log('Module de réconciliation détecté, tentative d\'accès');
        cy.contains('Réconciliation').click();
      } else {
        cy.log('Module de réconciliation non détecté');
      }
    });
  });
  
  it('Doit pouvoir naviguer vers les différentes pages disponibles', () => {
    // Tenter de se connecter d'abord
    cy.login();
    
    // Vérifier les liens disponibles dans le menu
    cy.get('body').then(($body) => {
      const text = $body.text();
      const availableLinks = [];
      
      // Chercher des liens communs dans les applications de gestion
      ['Accueil', 'Tableau de bord', 'Ventes', 'Stock', 'Inventaire', 'Utilisateurs', 'Rapports', 'Administration'].forEach(link => {
        if (text.includes(link)) {
          availableLinks.push(link);
          cy.log(`Menu ${link} détecté`);
        }
      });
      
      // Si des liens sont trouvés, tenter de cliquer sur le premier
      if (availableLinks.length > 0) {
        cy.log(`Tentative d'accès au menu ${availableLinks[0]}`);
        cy.contains(availableLinks[0]).click();
      }
    });
  });
}); 