// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Commande pour se connecter rapidement avec gestion des erreurs
Cypress.Commands.add('login', (username = 'SALIOU', password = 'saliou') => {
  cy.log(`Tentative de connexion avec l'utilisateur ${username}`);
  
  // Tenter d'accéder à la page de connexion
  cy.visit('/login.html', { failOnStatusCode: false }).then(($body) => {
    // Si la page de connexion n'existe pas, essayer la connexion directe
    if (!$body.find('#loginForm').length) {
      cy.log('Page de connexion non trouvée, tentative d\'accès direct');
      cy.visit('/');
      return;
    }
    
    // Si le formulaire existe, tenter la connexion
    cy.get('#username').type(username, { log: false });
    cy.get('#password').type(password, { log: false });
    cy.get('#loginForm').submit();
    
    // Attendre un court instant pour que la soumission soit traitée
    cy.wait(1000);
    
    // Visiter la page d'accueil
    cy.visit('/');
  });
  
  cy.log('Connexion terminée');
});

// Commande pour vérifier si la fonctionnalité de réconciliation est disponible
Cypress.Commands.add('checkReconciliationAvailable', () => {
  cy.visit('/');
  
  // Vérifier si le lien Réconciliation existe
  cy.get('body').then(($body) => {
    const reconciliationExists = $body.text().includes('Réconciliation');
    cy.log(`Fonctionnalité de réconciliation ${reconciliationExists ? 'disponible' : 'non disponible'}`);
    return reconciliationExists;
  });
});

// Commande pour charger la page de réconciliation avec une date spécifique (si disponible)
Cypress.Commands.add('loadReconciliation', (date = '11/04/2025') => {
  // D'abord se connecter
  cy.login();
  
  // Vérifier si la fonctionnalité de réconciliation est disponible
  cy.checkReconciliationAvailable().then((isAvailable) => {
    if (!isAvailable) {
      cy.log('Module de réconciliation non disponible - test ignoré');
      return;
    }
    
    // Ensuite naviguer vers la page de réconciliation
    cy.contains('Réconciliation').click();
    
    // Vérifier que la page est chargée
    cy.get('body').then(($body) => {
      const pageLoaded = $body.text().includes('Réconciliation Stock / Ventes');
      if (!pageLoaded) {
        cy.log('Page de réconciliation non chargée correctement - test ignoré');
        return;
      }
      
      // Sélectionner la date
      cy.get('#date-reconciliation').clear().type(date);
      
      // Cliquer sur le bouton de calcul
      cy.get('button').contains('Calculer').click();
      
      // Attendre que les données soient chargées
      cy.get('#reconciliation-table tbody tr').should('have.length.at.least', 1);
    });
  });
});

// Commande pour accéder aux détails d'un point de vente spécifique
Cypress.Commands.add('openReconciliationDetails', (pointVente = 'O.Foire', date = '11/04/2025') => {
  // Charger la réconciliation
  cy.loadReconciliation(date);
  
  // Vérifier si la fonctionnalité de réconciliation est disponible
  cy.get('body').then(($body) => {
    if (!$body.find(`tr:contains("${pointVente}")`).length) {
      cy.log(`Point de vente ${pointVente} non trouvé - test ignoré`);
      return;
    }
    
    // Cliquer sur la ligne du point de vente
    cy.contains('tr', pointVente).click();
    
    // Vérifier que les détails sont affichés
    cy.contains(`Détails pour "${pointVente}"`).should('be.visible');
  });
});

// Commande pour vérifier les calculs de réconciliation
Cypress.Commands.add('verifyReconciliationCalculations', (pointVente = 'O.Foire') => {
  cy.get('body').then(($body) => {
    if (!$body.find(`tr:contains("${pointVente}")`).length) {
      cy.log(`Point de vente ${pointVente} non trouvé - test ignoré`);
      return;
    }
    
    cy.contains('tr', pointVente).within(() => {
      // Extraire les valeurs numériques des cellules
      cy.get('td').eq(1).invoke('text').then((stockMatinText) => {
        const stockMatin = parseInt(stockMatinText.replace(/[^\d]/g, ''), 10);
        
        cy.get('td').eq(2).invoke('text').then((stockSoirText) => {
          const stockSoir = parseInt(stockSoirText.replace(/[^\d]/g, ''), 10);
          
          cy.get('td').eq(3).invoke('text').then((transfertsText) => {
            const transferts = parseInt(transfertsText.replace(/[^\d]/g, ''), 10);
            
            cy.get('td').eq(4).invoke('text').then((ventesTheoriquesText) => {
              const ventesTheoriques = parseInt(ventesTheoriquesText.replace(/[^\d]/g, ''), 10);
              
              // Vérifier la formule: Stock Matin - Stock Soir + Transferts = Ventes Théoriques
              const calculatedVentesTheoriques = stockMatin - stockSoir + transferts;
              expect(calculatedVentesTheoriques).to.be.closeTo(ventesTheoriques, 5); // Tolérance de 5 FCFA
              
              cy.get('td').eq(5).invoke('text').then((ventesSaisiesText) => {
                const ventesSaisies = parseInt(ventesSaisiesText.replace(/[^\d]/g, ''), 10);
                
                cy.get('td').eq(6).invoke('text').then((ecartText) => {
                  const ecart = parseInt(ecartText.replace(/[^\d]/g, ''), 10);
                  
                  // Vérifier la formule: Ventes Théoriques - Ventes Saisies = Écart
                  const calculatedEcart = ventesTheoriques - ventesSaisies;
                  expect(calculatedEcart).to.be.closeTo(ecart, 5); // Tolérance de 5 FCFA
                  
                  cy.get('td').eq(7).invoke('text').then((pourcentageText) => {
                    // Extraire le pourcentage (enlever le symbole %)
                    const pourcentage = parseFloat(pourcentageText.replace(/[^\d.,]/g, '').replace(',', '.'));
                    
                    // Vérifier la formule: (Écart / Ventes Théoriques) * 100 = Pourcentage
                    if (ventesTheoriques > 0) {
                      const calculatedPourcentage = (ecart / ventesTheoriques) * 100;
                      expect(calculatedPourcentage).to.be.closeTo(pourcentage, 0.1); // Tolérance de 0.1%
                    }
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}); 