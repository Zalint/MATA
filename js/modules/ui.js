/**
 * Module de gestion de l'interface utilisateur
 */

// Graphiques (à définir comme null pour pouvoir les détruire)
let ventesParMoisChart = null;
let ventesParProduitChart = null;
let ventesParCategorieChart = null;

// Import flatpickr locales
import { French } from "flatpickr/dist/l10n/fr.js";

/**
 * Initialise les écouteurs d'événements pour les onglets
 */
function initTabListeners() {
    const tabs = {
        'saisie-tab': 'saisie-section',
        'visualisation-tab': 'visualisation-section',
        'import-tab': 'import-section', 
        'stock-inventaire-tab': 'stock-inventaire-section',
        'copier-stock-tab': 'copier-stock-section',
        'reconciliation-tab': 'reconciliation-section',
        'stock-alerte-tab': 'stock-alerte-section',
        'cash-payment-tab': 'cash-payment-section',
        'suivi-achat-boeuf-tab': 'suivi-achat-boeuf-section',
        'estimation-tab': 'estimation-section'
    };
    
    // Ajouter des écouteurs pour chaque onglet
    for (const [tabId, sectionId] of Object.entries(tabs)) {
        const tab = document.getElementById(tabId);
        if (tab) {
            tab.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Désactiver tous les onglets et cacher toutes les sections
                deactivateAllTabs();
                hideAllSections();
                
                // Activer cet onglet
                tab.classList.add('active');
                
                // Afficher la section correspondante
                const section = document.getElementById(sectionId);
                if (section) {
                    section.style.display = 'block';
                }
                
                // Initialiser la section correspondante si nécessaire
                if (tabId === 'visualisation-tab') {
                    if (typeof chargerVentes === 'function') {
                        chargerVentes().then(ventes => {
                            if (ventes && ventes.length > 0) {
                                creerGraphiqueVentesParMois(ventes);
                                creerGraphiqueVentesParProduit(ventes);
                                creerGraphiqueVentesParCategorie(ventes);
                            }
                        });
                    }
                } else if (tabId === 'stock-inventaire-tab') {
                    if (typeof initInventaire === 'function') {
                        initInventaire();
                    }
                } else if (tabId === 'copier-stock-tab') {
                    if (typeof initCopierStock === 'function') {
                        initCopierStock();
                    }
                } else if (tabId === 'reconciliation-tab') {
                    if (typeof initReconciliation === 'function') {
                        initReconciliation();
                    } else if (typeof ReconciliationManager !== 'undefined' && 
                              typeof ReconciliationManager.init === 'function') {
                        ReconciliationManager.init();
                    }
                } else if (tabId === 'stock-alerte-tab') {
                    if (typeof initStockAlerte === 'function') {
                        initStockAlerte();
                    }
                } else if (tabId === 'cash-payment-tab') {
                    if (typeof initCashPayment === 'function') {
                        initCashPayment();
                    }
                } else if (tabId === 'suivi-achat-boeuf-tab') {
                    if (typeof initSuiviAchatBoeuf === 'function') {
                        initSuiviAchatBoeuf();
                    }
                } else if (tabId === 'estimation-tab') {
                    if (typeof initEstimation === 'function') {
                        initEstimation();
                    }
                }
            });
        }
    }
}

/**
 * Désactive tous les onglets
 */
function deactivateAllTabs() {
    const tabs = [
        'saisie-tab',
        'visualisation-tab',
        'import-tab',
        'stock-inventaire-tab',
        'copier-stock-tab',
        'reconciliation-tab',
        'stock-alerte-tab',
        'cash-payment-tab',
        'suivi-achat-boeuf-tab',
        'estimation-tab'
    ];
    
    tabs.forEach(tabId => {
        const tab = document.getElementById(tabId);
        if (tab) tab.classList.remove('active');
    });
}

/**
 * Cache toutes les sections
 */
function hideAllSections() {
    const sections = [
        'saisie-section',
        'visualisation-section',
        'import-section',
        'stock-inventaire-section',
        'copier-stock-section',
        'reconciliation-section',
        'stock-alerte-section',
        'cash-payment-section',
        'suivi-achat-boeuf-section',
        'estimation-section'
    ];
    
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'none';
        }
    });
    
    // Nettoyer les graphiques lorsqu'on n'est pas dans la section visualisation
    if (ventesParMoisChart) {
        ventesParMoisChart.destroy();
        ventesParMoisChart = null;
    }
    if (ventesParProduitChart) {
        ventesParProduitChart.destroy();
        ventesParProduitChart = null;
    }
    if (ventesParCategorieChart) {
        ventesParCategorieChart.destroy();
        ventesParCategorieChart = null;
    }
}

/**
 * Met à jour les dates en fonction de la période sélectionnée
 * @param {string} period - Période (aujourd'hui, hier, semaine, mois)
 */
function updateDatesByPeriod(period) {
    const today = new Date();
    const dateDebut = document.getElementById('date-debut');
    const dateFin = document.getElementById('date-fin');
    
    // Fonction pour formater la date au format JJ/MM/AAAA
    const formatDate = (date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };
    
    // Configurer les dates en fonction de la période
    switch (period) {
        case 'aujourd\'hui':
            dateDebut.value = formatDate(today);
            dateFin.value = formatDate(today);
            break;
            
        case 'hier':
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            dateDebut.value = formatDate(yesterday);
            dateFin.value = formatDate(yesterday);
            break;
            
        case 'semaine':
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Lundi de la semaine
            dateDebut.value = formatDate(startOfWeek);
            dateFin.value = formatDate(today);
            break;
            
        case 'mois':
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            dateDebut.value = formatDate(startOfMonth);
            dateFin.value = formatDate(today);
            break;
            
        case 'tout':
            // Laisser vide pour tout afficher
            dateDebut.value = '';
            dateFin.value = '';
            break;
    }
    
    // Déclencher un événement de changement pour charger les données
    if (typeof chargerVentes === 'function') {
        chargerVentes();
    }
}

/**
 * Met à jour la visibilité du bouton de vidage de la base de données
 */
function updateViderBaseButtonVisibility() {
    const viderBaseBtn = document.getElementById('vider-base');
    if (viderBaseBtn) {
        // Toujours cacher le bouton, peu importe l'utilisateur
        viderBaseBtn.style.display = 'none';
        console.log('Bouton de vidage masqué pour tous les utilisateurs');
    }
}

/**
 * Initialise le filtrage du stock
 */
function initFilterStock() {
    const filterBtn = document.getElementById('filter-stock-btn');
    const resetBtn = document.getElementById('reset-stock-filter-btn');
    
    if (filterBtn) {
        filterBtn.addEventListener('click', function() {
            if (typeof filtrerStock === 'function') {
                filtrerStock();
            }
        });
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            // Réinitialiser les filtres
            const dateStockFilter = document.getElementById('date-stock-filter');
            const stockTypeFilter = document.getElementById('stock-type-filter');
            const pointVenteStockFilter = document.getElementById('point-vente-stock-filter');
            const produitStockFilter = document.getElementById('produit-stock-filter');
            
            if (dateStockFilter) dateStockFilter.value = '';
            if (stockTypeFilter) stockTypeFilter.value = '';
            if (pointVenteStockFilter) pointVenteStockFilter.value = '';
            if (produitStockFilter) produitStockFilter.value = '';
            
            // Recharger le stock sans filtres
            if (typeof filtrerStock === 'function') {
                filtrerStock();
            }
        });
    }
}

// Initialize flatpickr with French locale
function initializeDatePickers() {
    const dateInputs = document.querySelectorAll('.date-picker');
    dateInputs.forEach(input => {
        flatpickr(input, {
            locale: French,
            dateFormat: "Y-m-d",
            allowInput: true
        });
    });
}

// Call initialization when document is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeDatePickers();
});

// Exporter les fonctions
export {
    initTabListeners,
    deactivateAllTabs,
    hideAllSections,
    updateDatesByPeriod,
    updateViderBaseButtonVisibility,
    initFilterStock
}; 