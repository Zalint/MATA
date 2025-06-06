/**
 * Script principal modularisé pour l'application
 * Cette version utilise des modules pour organiser le code
 */

// Importer les modules
import { checkAuth, logout, afficherOngletsSuivantDroits } from './modules/auth.js';
import { formatMonetaire, standardiserDate, isToday } from './modules/utils.js';
import { 
    afficherDernieresVentes, 
    chargerDernieresVentes, 
    creerNouvelleEntree, 
    supprimerVente,
    afficherPageVentes,
    updatePaginationInfo,
    chargerVentes
} from './modules/ventes.js';
import {
    initReconciliation,
    viderTableauReconciliation,
    naviguerVersReconciliation,
    calculerReconciliation,
    sauvegarderReconciliation,
    chargerReconciliation
} from './modules/reconciliation.js';
import { initEstimation } from './modules/estimation.js';
import {
    initTabListeners,
    deactivateAllTabs,
    hideAllSections,
    updateDatesByPeriod,
    updateViderBaseButtonVisibility,
    initFilterStock
} from './modules/ui.js';

// Variables globales
let donneesImportees = {
    matin: new Map(),
    soir: new Map(),
    transferts: []
};

// Variable pour activer/désactiver le mode débogage
const isDebugMode = true;

// Mapping pour standardiser les noms des points de vente
const MAPPING_POINTS_VENTE = {
    'KEUR MASS': 'Keur Massar',
    'KEUR MASSAR': 'Keur Massar',
    'O.FOIRE': 'O.Foire',
    'OUEST FOIRE': 'O.Foire',
    'MBAO': 'Mbao',
    'LINGUERE': 'Linguere',
    'DAHRA': 'Dahra',
    'TOUBA': 'Touba'
};

// Mapping pour standardiser les noms des produits
const MAPPING_PRODUITS = {
    'BOEUF': 'Boeuf',
    'VEAU': 'Veau',
    'POULET': 'Poulet',
    'TETE DE MOUTON': 'Tete De Mouton',
    'TABLETTE': 'Tablette',
    'FOIE': 'Foie',
    'YELL': 'Yell',
    'AGNEAU': 'Agneau'
};

// Points de vente physiques
const POINTS_VENTE_PHYSIQUES = [
    'O.Foire', 
    'Mbao', 
    'Keur Massar', 
    'Linguere', 
    'Dahra', 
    'Touba'
];

// Initialiser l'application au chargement du document
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Vérifier l'authentification
        const isAuthenticated = await checkAuth();
        
        if (!isAuthenticated) {
            window.location.href = '/login.html';
            return;
        }
        
        // Afficher les onglets selon les droits
        afficherOngletsSuivantDroits();
        
        // Initialiser les écouteurs d'onglets
        initTabListeners();
        
        // Initialiser le module de réconciliation
        initReconciliation();
        
        // Initialiser le module d'estimation
        initEstimation();
        
        // Initialiser les filtres de stock
        initFilterStock();
        
        // Charger les données initiales
        await chargerDernieresVentes();
        
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        alert('Une erreur est survenue lors de l\'initialisation de l\'application');
    }
});

/**
 * Initialise les écouteurs d'événements pour les actions spécifiques
 */
function initEventListeners() {
    // Bouton de déconnexion
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
    
    // Bouton d'ajout de vente
    const createButton = document.getElementById('create-button');
    if (createButton) {
        createButton.addEventListener('click', creerNouvelleEntree);
    }
    
    // Boutons de filtrage par période
    const periodButtons = {
        'period-today': 'aujourd\'hui',
        'period-yesterday': 'hier',
        'period-week': 'semaine',
        'period-month': 'mois',
        'period-all': 'tout'
    };
    
    for (const [buttonId, period] of Object.entries(periodButtons)) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', function() {
                updateDatesByPeriod(period);
            });
        }
    }
    
    // Boutons de pagination
    const prevBtn = document.getElementById('pagination-prev');
    const nextBtn = document.getElementById('pagination-next');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            afficherPageVentes(currentPage - 1);
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            afficherPageVentes(currentPage + 1);
        });
    }
    
    // Boutons de réconciliation
    const calculerBtn = document.getElementById('calculer-reconciliation');
    const sauvegarderBtn = document.getElementById('sauvegarder-reconciliation');
    
    if (calculerBtn) {
        calculerBtn.addEventListener('click', function() {
            calculerReconciliation();
        });
    }
    
    if (sauvegarderBtn) {
        sauvegarderBtn.addEventListener('click', function() {
            sauvegarderReconciliation();
        });
    }
    
    // Écouteur pour le changement de date de réconciliation
    const dateReconciliationInput = document.getElementById('date-reconciliation');
    if (dateReconciliationInput) {
        dateReconciliationInput.addEventListener('change', function() {
            viderTableauReconciliation();
        });
    }
    
    // Initialiser le filtrage du stock
    initFilterStock();
}

// Exposer les fonctions nécessaires dans le contexte global pour l'utilisation dans le HTML
window.supprimerVente = supprimerVente;
window.formatMonetaire = formatMonetaire;
window.standardiserDate = standardiserDate;
window.isToday = isToday;
window.naviguerVersReconciliation = naviguerVersReconciliation;
window.chargerVentes = chargerVentes;
window.updatePaginationInfo = updatePaginationInfo;
window.afficherPageVentes = afficherPageVentes;
window.creerNouvelleEntree = creerNouvelleEntree;
window.chargerReconciliation = chargerReconciliation;
window.calculerReconciliation = calculerReconciliation;
window.sauvegarderReconciliation = sauvegarderReconciliation; 