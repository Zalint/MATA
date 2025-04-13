/**
 * Module de gestion de la réconciliation
 * Complémente ReconciliationManager.js avec des fonctions supplémentaires
 */

import { formatMonetaire, standardiserDate } from './utils.js';

/**
 * Initialise la section de réconciliation
 */
function initReconciliation() {
    console.log('Initialisation de la section de réconciliation');
    
    // S'assurer que la section est visible
    document.getElementById('reconciliation-section').style.display = 'block';
    
    // Initialiser le sélecteur de date avec flatpickr s'il ne l'est pas déjà
    if (!document.getElementById('date-reconciliation')._flatpickr) {
        flatpickr('#date-reconciliation', {
            dateFormat: 'd/m/Y',
            locale: 'fr',
            defaultDate: new Date(),
            disableMobile: "true",
            onChange: function(selectedDates, dateStr) {
                console.log('Date sélectionnée pour la réconciliation (flatpickr):', dateStr);
                
                // Rendre le bouton de calcul plus visible après changement de date
                const btnCalculer = document.getElementById('calculer-reconciliation');
                btnCalculer.classList.add('btn-pulse');
                setTimeout(() => {
                    btnCalculer.classList.remove('btn-pulse');
                }, 1500);
                
                // Charger automatiquement les données pour la nouvelle date
                if (dateStr) {
                    console.log('Chargement automatique des données depuis le handler flatpickr');
                    
                    // Réinitialiser les données existantes
                    const tbody = document.querySelector('#reconciliation-table tbody');
                    if (tbody) tbody.innerHTML = '';
                    
                    // Désactiver le bouton de sauvegarde
                    const btnSauvegarder = document.getElementById('sauvegarder-reconciliation');
                    if (btnSauvegarder) btnSauvegarder.disabled = true;
                    
                    // Charger les nouvelles données avec le gestionnaire centralisé
                    if (typeof ReconciliationManager !== 'undefined' && 
                        typeof ReconciliationManager.chargerReconciliation === 'function') {
                        ReconciliationManager.chargerReconciliation(dateStr);
                    } else {
                        // Fallback en cas de problème avec ReconciliationManager
                        calculerReconciliation(dateStr);
                    }
                }
            }
        });
    }
    
    // Peupler le filtre de point de vente s'il n'est pas déjà rempli
    const pointVenteSelect = document.getElementById('point-vente-filtre');
    if (pointVenteSelect && pointVenteSelect.options.length <= 1) {
        // On suppose que POINTS_VENTE_PHYSIQUES est défini globalement
        // Si ce n'est pas le cas, il faudrait l'importer ou le définir ici
        if (typeof POINTS_VENTE_PHYSIQUES !== 'undefined') {
            POINTS_VENTE_PHYSIQUES.forEach(pv => {
                const option = document.createElement('option');
                option.value = pv;
                option.textContent = pv;
                pointVenteSelect.appendChild(option);
            });
            
            // Ajouter un écouteur d'événement au filtre pour réactualiser l'affichage
            pointVenteSelect.addEventListener('change', function() {
                if (window.currentReconciliation) {
                    if (typeof ReconciliationManager !== 'undefined' && 
                        typeof ReconciliationManager.afficherReconciliation === 'function') {
                        ReconciliationManager.afficherReconciliation(
                            window.currentReconciliation.data, 
                            window.currentDebugInfo || {}
                        );
                    }
                }
            });
        } else {
            console.warn('POINTS_VENTE_PHYSIQUES n\'est pas défini');
        }
    }
    
    // S'assurer que l'indicateur de chargement est masqué
    const loadingIndicator = document.getElementById('loading-indicator-reconciliation');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
    
    // Vérifier si une date est déjà sélectionnée
    const dateInput = document.getElementById('date-reconciliation');
    if (dateInput && dateInput.value) {
        // Mettre à jour l'affichage de la date
        const dateDisplay = document.getElementById('date-reconciliation-display');
        if (dateDisplay) {
            dateDisplay.textContent = dateInput.value;
        }
    }
}

/**
 * Vide le tableau de réconciliation quand la date change
 */
function viderTableauReconciliation() {
    console.log('Date changée, vidage du tableau de réconciliation');
    
    // Vider le tableau des résultats
    const tbody = document.querySelector('#reconciliation-table tbody');
    if (tbody) tbody.innerHTML = '';
    
    // Vider également les détails de débogage
    const debugTitle = document.getElementById('debug-title');
    const debugFormule = document.getElementById('debug-formule');
    const debugEcart = document.getElementById('debug-ecart');
    const debugStockSection = document.getElementById('debug-stock-section');
    const debugVentesSection = document.getElementById('debug-ventes-section');
    
    if (debugTitle) debugTitle.innerHTML = '';
    if (debugFormule) debugFormule.innerHTML = '';
    if (debugEcart) debugEcart.innerHTML = '';
    if (debugStockSection) debugStockSection.innerHTML = '';
    if (debugVentesSection) debugVentesSection.innerHTML = '';
    
    // Désactiver le bouton de sauvegarde
    const btnSauvegarder = document.getElementById('sauvegarder-reconciliation');
    if (btnSauvegarder) btnSauvegarder.disabled = true;
    
    // Mettre à jour l'affichage de la date sélectionnée
    const dateStr = document.getElementById('date-reconciliation').value;
    const dateDisplay = document.getElementById('date-reconciliation-display');
    if (dateDisplay) dateDisplay.textContent = dateStr || '--/--/----';
    
    // Masquer les sections d'analyse
    const llmContainer = document.getElementById('llm-analyse-container');
    if (llmContainer) llmContainer.style.display = 'none';
    
    const deepseekContainer = document.getElementById('deepseek-analyse-container');
    if (deepseekContainer) deepseekContainer.style.display = 'none';
    
    // Réinitialiser les variables globales
    window.currentReconciliation = null;
    window.currentDebugInfo = null;
}

/**
 * Fonction de navigation qui amène l'utilisateur à la section de réconciliation
 * @param {string} date - Date à afficher (optionnel)
 */
function naviguerVersReconciliation(date = null) {
    // Activer l'onglet de réconciliation
    const reconciliationTab = document.getElementById('reconciliation-tab');
    if (reconciliationTab) {
        // Simuler un clic sur l'onglet
        reconciliationTab.click();
        
        // Si une date est spécifiée, la définir dans le champ de date
        if (date) {
            const dateInput = document.getElementById('date-reconciliation');
            if (dateInput && dateInput._flatpickr) {
                // Utiliser flatpickr pour définir la date
                dateInput._flatpickr.setDate(date);
            } else if (dateInput) {
                // Fallback si flatpickr n'est pas disponible
                dateInput.value = date;
                
                // Déclencher manuellement un événement de changement
                const event = new Event('change');
                dateInput.dispatchEvent(event);
            }
        }
    }
}

/**
 * Calcule la réconciliation pour une date donnée
 * Appelle ReconciliationManager.calculerReconciliation si disponible
 * @param {string} date - Date au format JJ/MM/AAAA
 */
async function calculerReconciliation(date = null) {
    // Utiliser la date du champ si non spécifiée
    if (!date) {
        const dateInput = document.getElementById('date-reconciliation');
        date = dateInput.value;
    }
    
    // Vérifier que la date est valide
    if (!date) {
        alert('Veuillez sélectionner une date');
        return;
    }
    
    // Afficher l'indicateur de chargement
    const loadingIndicator = document.getElementById('loading-indicator-reconciliation');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }
    
    try {
        // Appeler ReconciliationManager si disponible
        if (typeof ReconciliationManager !== 'undefined' && 
            typeof ReconciliationManager.calculerReconciliation === 'function') {
            await ReconciliationManager.calculerReconciliation(date);
        } else {
            console.error('ReconciliationManager.calculerReconciliation n\'est pas disponible');
            // Fallback: implémentation basique
            alert('Le module de réconciliation n\'est pas correctement chargé. Veuillez recharger la page.');
        }
    } catch (error) {
        console.error('Erreur lors du calcul de la réconciliation:', error);
        alert('Une erreur est survenue lors du calcul de la réconciliation');
    } finally {
        // Masquer l'indicateur de chargement
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }
}

/**
 * Sauvegarde la réconciliation actuelle
 * Appelle ReconciliationManager.sauvegarderReconciliation si disponible
 */
async function sauvegarderReconciliation() {
    // Vérifier qu'une réconciliation est calculée
    if (!window.currentReconciliation) {
        alert('Aucune réconciliation à sauvegarder');
        return;
    }
    
    try {
        // Appeler ReconciliationManager si disponible
        if (typeof ReconciliationManager !== 'undefined' && 
            typeof ReconciliationManager.sauvegarderReconciliation === 'function') {
            await ReconciliationManager.sauvegarderReconciliation();
        } else {
            console.error('ReconciliationManager.sauvegarderReconciliation n\'est pas disponible');
            // Fallback: implémentation basique
            alert('Le module de réconciliation n\'est pas correctement chargé. Veuillez recharger la page.');
        }
    } catch (error) {
        console.error('Erreur lors de la sauvegarde de la réconciliation:', error);
        alert('Une erreur est survenue lors de la sauvegarde de la réconciliation');
    }
}

/**
 * Charge une réconciliation existante
 * Appelle ReconciliationManager.chargerReconciliation si disponible
 * @param {string} date - Date au format JJ/MM/AAAA
 */
async function chargerReconciliation(date) {
    if (!date) {
        alert('Date non spécifiée');
        return;
    }
    
    // Afficher l'indicateur de chargement
    const loadingIndicator = document.getElementById('loading-indicator-reconciliation');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }
    
    try {
        // Appeler ReconciliationManager si disponible
        if (typeof ReconciliationManager !== 'undefined' && 
            typeof ReconciliationManager.chargerReconciliation === 'function') {
            await ReconciliationManager.chargerReconciliation(date);
        } else {
            console.error('ReconciliationManager.chargerReconciliation n\'est pas disponible');
            // Fallback: implémentation basique
            alert('Le module de réconciliation n\'est pas correctement chargé. Veuillez recharger la page.');
        }
    } catch (error) {
        console.error('Erreur lors du chargement de la réconciliation:', error);
        alert('Une erreur est survenue lors du chargement de la réconciliation');
    } finally {
        // Masquer l'indicateur de chargement
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }
}

// Exporter les fonctions
export {
    initReconciliation,
    viderTableauReconciliation,
    naviguerVersReconciliation,
    calculerReconciliation,
    sauvegarderReconciliation,
    chargerReconciliation
}; 