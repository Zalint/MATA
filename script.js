// Démarrage du script
document.addEventListener('DOMContentLoaded', function() {
    // Vérifier si le gestionnaire de réconciliation est disponible
    if (typeof ReconciliationManager === 'undefined') {
        console.error('ReconciliationManager non disponible! Assurez-vous que reconciliationManager.js est chargé avant script.js.');
        alert('Erreur: Module de réconciliation non chargé. Veuillez recharger la page.');
        return;
    }
    
    console.log('Initialisation de l\'application avec ReconciliationManager');
    
    // Surcharger la fonction afficherReconciliation pour utiliser ReconciliationManager
    window.afficherReconciliation = function(reconciliation, debugInfo) {
        console.log('Délégation à ReconciliationManager.afficherReconciliation');
        ReconciliationManager.afficherReconciliation(reconciliation, debugInfo);
    };
});

// Vérification de l'authentification
let currentUser = null;

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

// Fonction pour mettre à jour la visibilité du bouton de vidage
function updateViderBaseButtonVisibility() {
    const viderBaseBtn = document.getElementById('vider-base');
    if (viderBaseBtn) {
        // Toujours cacher le bouton, peu importe l'utilisateur
        viderBaseBtn.style.display = 'none';
        console.log('Bouton de vidage masqué pour tous les utilisateurs');
    }
}

// Fonction pour cacher toutes les sections
function hideAllSections() {
    document.getElementById('saisie-section').style.display = 'none';
    document.getElementById('visualisation-section').style.display = 'none';
    document.getElementById('import-section').style.display = 'none';
    document.getElementById('stock-inventaire-section').style.display = 'none';
    document.getElementById('copier-stock-section').style.display = 'none';
    document.getElementById('reconciliation-section').style.display = 'none';
    document.getElementById('stock-alerte-section').style.display = 'none';
    
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

// Fonction pour initialiser la section de réconciliation
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
        POINTS_VENTE_PHYSIQUES.forEach(pv => {
            const option = document.createElement('option');
            option.value = pv;
            option.textContent = pv;
            pointVenteSelect.appendChild(option);
        });
        
        // Ajouter un écouteur d'événement au filtre pour réactualiser l'affichage
        pointVenteSelect.addEventListener('change', function() {
            if (window.currentReconciliation) {
                afficherReconciliation(window.currentReconciliation.data, window.currentDebugInfo || {});
            }
        });
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

// Fonction pour vider le tableau de réconciliation quand la date change
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

// Gestion des onglets
document.addEventListener('DOMContentLoaded', function() {
    const saisieTab = document.getElementById('saisie-tab');
    const visualisationTab = document.getElementById('visualisation-tab');
    const importTab = document.getElementById('import-tab');
    const stockInventaireTab = document.getElementById('stock-inventaire-tab');
    const copierStockTab = document.getElementById('copier-stock-tab');
    const reconciliationTab = document.getElementById('reconciliation-tab');
    const stockAlerteTab = document.getElementById('stock-alerte-tab');
    const cashPaymentTab = document.getElementById('cash-payment-tab');
    const cashPaymentSection = document.getElementById('cash-payment-section');
    
    const saisieSection = document.getElementById('saisie-section');
    const visualisationSection = document.getElementById('visualisation-section');
    const importSection = document.getElementById('import-section');
    const stockInventaireSection = document.getElementById('stock-inventaire-section');
    const copierStockSection = document.getElementById('copier-stock-section');
    const reconciliationSection = document.getElementById('reconciliation-section');
    const stockAlerteSection = document.getElementById('stock-alerte-section');

    // Fonction pour désactiver tous les onglets
    function deactivateAllTabs() {
        if (saisieTab) saisieTab.classList.remove('active');
        if (visualisationTab) visualisationTab.classList.remove('active');
        if (importTab) importTab.classList.remove('active');
        if (stockInventaireTab) stockInventaireTab.classList.remove('active');
        if (copierStockTab) copierStockTab.classList.remove('active');
        if (reconciliationTab) reconciliationTab.classList.remove('active');
        if (stockAlerteTab) stockAlerteTab.classList.remove('active');
        if (cashPaymentTab) cashPaymentTab.classList.remove('active');
    }

    if (saisieTab) {
        saisieTab.addEventListener('click', function(e) {
            e.preventDefault();
            hideAllSections();
            saisieSection.style.display = 'block';
            deactivateAllTabs();
            this.classList.add('active');
            
            // S'assurer que les éléments de visualisation sont masqués
            document.querySelectorAll('.visualisation-charts, .visualisation-data').forEach(el => {
                el.style.display = 'none';
            });
        });
    }

    if (visualisationTab) {
        visualisationTab.addEventListener('click', function(e) {
            e.preventDefault();
            hideAllSections();
            visualisationSection.style.display = 'block';
            deactivateAllTabs();
            this.classList.add('active');
            
            // S'assurer que les éléments de visualisation sont visibles
            document.querySelectorAll('.visualisation-charts, .visualisation-data').forEach(el => {
                el.style.display = 'block';
            });
            
            // Charger les données et créer les graphiques
            chargerVentes();
        });
    }

    if (importTab) {
        importTab.addEventListener('click', function(e) {
            e.preventDefault();
            hideAllSections();
            importSection.style.display = 'block';
            deactivateAllTabs();
            this.classList.add('active');
        });
    }

    if (stockInventaireTab) {
        stockInventaireTab.addEventListener('click', async function(e) {
            e.preventDefault();
            hideAllSections();
            stockInventaireSection.style.display = 'block';
            deactivateAllTabs();
            this.classList.add('active');
            await initInventaire();
        });
    }

    if (copierStockTab) {
        copierStockTab.addEventListener('click', function(e) {
            e.preventDefault();
            hideAllSections();
            copierStockSection.style.display = 'block';
            deactivateAllTabs();
            this.classList.add('active');
            initCopierStock();
        });
    }

    if (reconciliationTab) {
        reconciliationTab.addEventListener('click', function(e) {
            e.preventDefault();
            hideAllSections();
            reconciliationSection.style.display = 'block';
            deactivateAllTabs();
            this.classList.add('active');
            initReconciliation();
        });
    }

    if (stockAlerteTab) {
        stockAlerteTab.addEventListener('click', function(e) {
            e.preventDefault();
            hideAllSections();
            stockAlerteSection.style.display = 'block';
            deactivateAllTabs();
            this.classList.add('active');
            initStockAlerte();
        });
    }

    if (cashPaymentTab) {
        cashPaymentTab.addEventListener('click', function(e) {
            e.preventDefault();
            hideAllSections();
            cashPaymentSection.style.display = 'block';
            deactivateAllTabs();
            this.classList.add('active');
            
            // Charger les données de paiement
            loadCashPaymentData();
        });
    }

    // Gestionnaire pour le bouton de confirmation d'import
    document.getElementById('confirmImport').addEventListener('click', async function() {
        try {
            // Préparer les données pour l'envoi
            const donneesAEnvoyer = {
                matin: {},
                soir: {},
                transferts: []
            };

            // Traiter les données du matin
            for (const [key, data] of donneesImportees.matin) {
                donneesAEnvoyer.matin[key] = {
                    date: data.date,
                    "Point de Vente": data.pointVente,
                    Produit: data.produit,
                    Nombre: data.quantite.toString(),
                    PU: data.prixUnitaire.toString(),
                    Montant: data.total.toString(),
                    Commentaire: data.commentaire || ''
                };
            }

            // Traiter les données du soir
            for (const [key, data] of donneesImportees.soir) {
                donneesAEnvoyer.soir[key] = {
                    date: data.date,
                    "Point de Vente": data.pointVente,
                    Produit: data.produit,
                    Nombre: data.quantite.toString(),
                    PU: data.prixUnitaire.toString(),
                    Montant: data.total.toString(),
                    Commentaire: data.commentaire || ''
                };
            }

            // Traiter les transferts
            donneesAEnvoyer.transferts = donneesImportees.transferts.map(transfert => ({
                date: transfert.date,
                pointVente: transfert.pointVente,
                produit: transfert.produit,
                impact: transfert.impact,
                quantite: transfert.quantite,
                prixUnitaire: transfert.prixUnitaire,
                total: transfert.total,
                commentaire: transfert.commentaire || ''
            }));

            console.log('Données à envoyer:', donneesAEnvoyer);

            // Envoyer les données du matin
            if (Object.keys(donneesAEnvoyer.matin).length > 0) {
                console.log('Envoi des données du matin:', donneesAEnvoyer.matin);
                const matinResponse = await fetch('http://localhost:3000/api/stock/matin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(donneesAEnvoyer.matin)
                });
                if (!matinResponse.ok) throw new Error('Erreur lors de l\'enregistrement du stock matin');
            }

            // Envoyer les données du soir
            if (Object.keys(donneesAEnvoyer.soir).length > 0) {
                console.log('Envoi des données du soir:', donneesAEnvoyer.soir);
                const soirResponse = await fetch('http://localhost:3000/api/stock/soir', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(donneesAEnvoyer.soir)
                });
                if (!soirResponse.ok) throw new Error('Erreur lors de l\'enregistrement du stock soir');
            }

            // Envoyer les transferts
            if (donneesAEnvoyer.transferts.length > 0) {
                console.log('Envoi des transferts:', donneesAEnvoyer.transferts);
                const transfertsResponse = await fetch('http://localhost:3000/api/transferts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(donneesAEnvoyer.transferts)
                });
                if (!transfertsResponse.ok) throw new Error('Erreur lors de l\'enregistrement des transferts');
            }

            // Réinitialiser l'interface
            document.getElementById('previewSection').style.display = 'none';
            document.getElementById('csv-file').value = '';
            donneesImportees = {
                matin: new Map(),
                soir: new Map(),
                transferts: []
            };

            alert('Import réussi !');
            
            // Recharger les données
            await loadStockData();
            await loadTransferts();
            
        } catch (error) {
            console.error('Erreur lors de l\'importation:', error);
            alert('Erreur lors de l\'importation : ' + error.message);
        }
    });

    // Gestionnaire pour le bouton d'annulation d'import
    document.getElementById('cancelImport').addEventListener('click', function() {
        document.getElementById('previewSection').style.display = 'none';
        document.getElementById('csv-file').value = '';
        donneesImportees = {
            matin: new Map(),
            soir: new Map(),
            transferts: []
        };
    });
});

// Modification de la fonction checkAuth pour gérer l'affichage de l'onglet Stock inventaire
async function checkAuth() {
    try {
        const response = await fetch('http://localhost:3000/api/check-session', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (!data.success) {
            window.location.href = 'login.html';
            return;
        }
        
        // Stocker les informations de l'utilisateur
        currentUser = data.user;
        
        // Afficher les informations de l'utilisateur
        document.getElementById('user-info').textContent = `Connecté en tant que ${currentUser.username}`;
        
        // Liste des utilisateurs ayant accès aux fonctionnalités spéciales
        const usersWithSpecialAccess = ['SALIOU', 'NADOU', 'OUSMANE', 'PAPI'];
        
        // Gérer la visibilité des onglets spéciaux
        const importTabContainer = document.getElementById('import-tab-container');
        const stockInventaireItem = document.getElementById('stock-inventaire-item');
        const copierStockItem = document.getElementById('copier-stock-item');
        
        if (usersWithSpecialAccess.includes(currentUser.username) || currentUser.isSuperAdmin) {
            if (importTabContainer) importTabContainer.style.display = 'block';
            if (stockInventaireItem) stockInventaireItem.style.display = 'block';
            if (copierStockItem) copierStockItem.style.display = 'block';
        } else {
            if (importTabContainer) importTabContainer.style.display = 'none';
            if (stockInventaireItem) stockInventaireItem.style.display = 'none';
            if (copierStockItem) copierStockItem.style.display = 'none';
        }

        // Mettre à jour la visibilité du bouton de vidage
        updateViderBaseButtonVisibility();
        
        // Initialiser le point de vente selon l'utilisateur
        if (currentUser.pointVente !== "tous") {
            const pointVenteSelect = document.getElementById('point-vente');
            if (pointVenteSelect) {
                pointVenteSelect.value = currentUser.pointVente;
                pointVenteSelect.disabled = true;
            }
        }
    } catch (error) {
        console.error('Erreur lors de la vérification de la session:', error);
        window.location.href = 'login.html';
    }
}

// Gestion de la déconnexion
document.getElementById('logout-btn').addEventListener('click', async function(e) {
    e.preventDefault();
    try {
        const response = await fetch('http://localhost:3000/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
        const data = await response.json();
        if (data.success) {
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
    }
});

// Vérifier l'authentification au chargement de la page
checkAuth();

// Configuration des dates
flatpickr("#date", {
    locale: "fr",
    dateFormat: "d/m/Y",
    defaultDate: "today"
});

// Configuration des dates pour la visualisation
const dateDebutPicker = flatpickr("#date-debut", {
    locale: "fr",
    dateFormat: "d/m/Y",
    defaultDate: "today",
    onChange: function(selectedDates, dateStr) {
        console.log('Date de début changée:', dateStr);
        chargerVentes();
    }
});

const dateFinPicker = flatpickr("#date-fin", {
    locale: "fr",
    dateFormat: "d/m/Y",
    defaultDate: "today",
    onChange: function(selectedDates, dateStr) {
        console.log('Date de fin changée:', dateStr);
        chargerVentes();
    }
});

// Fonction pour mettre à jour les dates en fonction de la période sélectionnée
function updateDatesByPeriod(period) {
    const today = new Date();
    let startDate, endDate;
    
    switch(period) {
        case 'jour':
            // Aujourd'hui
            startDate = new Date(today);
            endDate = new Date(today);
            break;
        case 'semaine':
            // Cette semaine (lundi au dimanche)
            const dayOfWeek = today.getDay();
            const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Ajuster quand c'est dimanche
            startDate = new Date(today.setDate(diff));
            endDate = new Date(today);
            endDate.setDate(startDate.getDate() + 6);
            break;
        case 'mois':
            // Ce mois
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            break;
        case 'personnalise':
            // Ne rien faire, laisser les dates telles quelles
            return;
        default:
            return;
    }
    
    dateDebutPicker.setDate(startDate);
    dateFinPicker.setDate(endDate);
    chargerVentes();
}

// Ajouter un écouteur d'événements pour le sélecteur de période
document.addEventListener('DOMContentLoaded', function() {
    const periodeSelect = document.getElementById('periode-select');
    if (periodeSelect) {
        periodeSelect.addEventListener('change', function() {
            updateDatesByPeriod(this.value);
        });
        
        // Initialiser avec la période par défaut (aujourd'hui)
        updateDatesByPeriod(periodeSelect.value);
    }
});

// Importer la base de données des produits
// Note: produits est défini dans produits.js et disponible globalement
console.log('Vérification de la disponibilité de l\'objet produits:', typeof produits, produits ? 'disponible' : 'non disponible');

// S'assurer que l'objet produits est disponible
if (typeof produits === 'undefined') {
    console.error('Erreur: L\'objet produits n\'est pas disponible. Vérifiez que produits.js est chargé correctement.');
    alert('Erreur: Base de données des produits non chargée. Veuillez recharger la page.');
}

// Gestion des catégories et produits
document.querySelectorAll('.categorie-select').forEach(select => {
    select.addEventListener('change', function() {
        const produitSelect = this.closest('.row').querySelector('.produit-select');
        const categorie = this.value;
        
        produitSelect.innerHTML = '<option value="">Sélectionner un produit</option>';
        
        if (categorie && produits[categorie]) {
            Object.keys(produits[categorie]).forEach(produit => {
                const option = document.createElement('option');
                option.value = produit;
                option.textContent = produit;
                produitSelect.appendChild(option);
            });
        }
    });
});

// Gestion des prix unitaires
document.querySelectorAll('.produit-select').forEach(select => {
    select.addEventListener('change', function() {
        const row = this.closest('.row');
        const categorie = row.querySelector('.categorie-select').value;
        const produit = this.value;
        const prixUnitInput = row.querySelector('.prix-unit');
        
        if (categorie && produit && produits[categorie] && produits[categorie][produit]) {
            const prix = produits.getPrixPreferePour(categorie, produit);
            prixUnitInput.value = prix;
            calculerTotal(row);
        } else {
            prixUnitInput.value = '';
        }
    });
});

// Calcul des totaux
function calculerTotal(row) {
    const quantite = parseFloat(row.querySelector('.quantite').value) || 0;
    const prixUnit = parseFloat(row.querySelector('.prix-unit').value) || 0;
    const total = quantite * prixUnit;
    row.querySelector('.total').value = total.toFixed(2);
    calculerTotalGeneral();
}

document.querySelectorAll('.quantite, .prix-unit').forEach(input => {
    input.addEventListener('input', function() {
        calculerTotal(this.closest('.row'));
    });
});

function calculerTotalGeneral() {
    // Récupérer la date sélectionnée
    const dateSelectionnee = document.getElementById('date').value;
    
    // Récupérer le point de vente sélectionné
    const pointVenteSelectionnee = document.getElementById('point-vente').value;
    
    // Fonction pour extraire uniquement les composants jour/mois/année d'une date
    // sans tenir compte du fuseau horaire
    function normaliserDate(dateStr) {
        if (!dateStr) return '';
        
        let jour, mois, annee;
        
        // Format DD/MM/YYYY
        if (dateStr.includes('/')) {
            [jour, mois, annee] = dateStr.split('/');
            // Si l'année est à 4 chiffres, ne garder que les 2 derniers
            if (annee.length === 4) {
                annee = annee.slice(-2);
            }
        } 
        // Format DD-MM-YY
        else if (dateStr.includes('-')) {
            [jour, mois, annee] = dateStr.split('-');
        }
        // Format non reconnu
        else {
            return dateStr;
        }
        
        // Normaliser au format JJ-MM-AA avec padding de zéros si nécessaire
        return `${jour.padStart(2, '0')}-${mois.padStart(2, '0')}-${annee.padStart(2, '0')}`;
    }
    
    // Convertir à un format de date comparable pour les deux formats de date
    function getComparableDate(dateStr) {
        let jour, mois, annee;
        
        // Format DD/MM/YYYY ou DD/MM/YY
        if (dateStr.includes('/')) {
            [jour, mois, annee] = dateStr.split('/');
            if (annee.length === 2) {
                annee = '20' + annee;
            }
        } 
        // Format DD-MM-YYYY ou DD-MM-YY
        else if (dateStr.includes('-')) {
            [jour, mois, annee] = dateStr.split('-');
            if (annee.length === 2) {
                annee = '20' + annee;
            }
        } else {
            return null; // Format non reconnu
        }
        
        return `${jour.padStart(2, '0')}/${mois.padStart(2, '0')}/${annee}`;
    }
    
    // Conversion de la date sélectionnée au format comparable
    const dateSelectionneeComparable = getComparableDate(dateSelectionnee);
    
    // 1. Calculer le total des lignes en cours de saisie plus efficacement
    const totalSaisie = Array.from(document.querySelectorAll('.total'))
        .reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0);
    
    // 2. Calculer le total des dernières ventes affichées pour la date sélectionnée et le point de vente sélectionné
    // On utilise une approche plus directe pour améliorer les performances
    let totalDernieresVentes = 0;
    const rows = document.querySelectorAll('#dernieres-ventes tbody tr');
    
    // Avant de parcourir les lignes, mettre à jour l'interface pour indiquer le calcul en cours
    document.getElementById('total-general').textContent = 'Calcul en cours...';
    
    // Utiliser un tableau pour stocker les montants à additionner
    const montantsCorrespondants = [];
    
    // Traiter les lignes par lots pour éviter de bloquer l'interface utilisateur
    setTimeout(() => {
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const dateCell = row.querySelector('td:nth-child(2)').textContent.trim();
            const dateVenteComparable = getComparableDate(dateCell);
            
            // Récupérer le point de vente de la ligne
            const pointVenteCell = row.querySelector('td:nth-child(4)').textContent.trim();
            
            // Comparer les dates au format comparable ET vérifier le point de vente
            if (dateVenteComparable === dateSelectionneeComparable && pointVenteCell === pointVenteSelectionnee) {
                const montantText = row.querySelector('td:nth-child(10)').textContent.trim();
                const montant = parseFloat(montantText.replace(/\s/g, '').replace(/,/g, '.').replace(/FCFA/g, '')) || 0;
                montantsCorrespondants.push(montant);
            }
        }
        
        // Calculer la somme des montants correspondants
        totalDernieresVentes = montantsCorrespondants.reduce((sum, montant) => sum + montant, 0);
        
        // 3. Calculer le total général
        const totalGeneral = totalSaisie + totalDernieresVentes;
        
        // 4. Afficher le total avec le format français
        document.getElementById('total-general').textContent = `${totalGeneral.toLocaleString('fr-FR')} FCFA`;
    }, 0);
    
    // En attendant le calcul asynchrone, retourner le total de saisie uniquement
    return totalSaisie;
}

// Ajouter un événement pour recalculer le total général quand la date change
document.addEventListener('DOMContentLoaded', function() {
    const dateInput = document.getElementById('date');
    const pointVenteInput = document.getElementById('point-vente');
    
    if (dateInput) {
        dateInput.addEventListener('change', function() {
            // Recalculer le total général quand la date change
            setTimeout(calculerTotalGeneral, 0);
            // Recharger les ventes filtrées par date et point de vente
            chargerDernieresVentes();
        });
    }
    
    if (pointVenteInput) {
        pointVenteInput.addEventListener('change', function() {
            // Recalculer le total général quand le point de vente change
            setTimeout(calculerTotalGeneral, 0);
            // Recharger les ventes filtrées par date et point de vente
            chargerDernieresVentes();
        });
    }
    
    // Calculer le total général au chargement de la page
    setTimeout(calculerTotalGeneral, 100);
});

// Fonction pour créer une nouvelle entrée de produit
function creerNouvelleEntree() {
    const div = document.createElement('div');
    div.className = 'produit-entry mb-3';
    div.innerHTML = `
        <div class="row align-items-end">
            <div class="col-md-2">
                <label class="form-label">Catégorie</label>
                <select class="form-select categorie-select" required>
                    <option value="">Sélectionner...</option>
                    <option value="Bovin">Bovin</option>
                    <option value="Ovin">Ovin</option>
                    <option value="Volaille">Volaille</option>
                    <option value="Pack">Pack</option>
                </select>
            </div>
            <div class="col-md-3">
                <label class="form-label">Produit</label>
                <select class="form-select produit-select" required>
                    <option value="">Sélectionner...</option>
                </select>
            </div>
            <div class="col-md-2">
                <label class="form-label">Prix Unit.</label>
                <input type="number" class="form-control prix-unit" required>
            </div>
            <div class="col-md-2">
                <label class="form-label">Quantité</label>
                <input type="number" class="form-control quantite" step="0.1" required>
            </div>
            <div class="col-md-2">
                <label class="form-label">Total</label>
                <input type="number" class="form-control total" readonly>
            </div>
            <div class="col-md-1">
                <button type="button" class="btn btn-danger btn-sm supprimer-produit">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;

    // Gestion dynamique des produits
    const categorieSelect = div.querySelector('.categorie-select');
    const produitSelect = div.querySelector('.produit-select');
    categorieSelect.addEventListener('change', function() {
        const categorie = this.value;
        produitSelect.innerHTML = '<option value="">Sélectionner...</option>'; // Vider les options précédentes
        
        // Utiliser produitsDB au lieu de produitsParCategorie
        if (categorie && typeof produits !== 'undefined' && produits[categorie]) {
            Object.keys(produits[categorie]).forEach(produit => {
                const option = document.createElement('option');
                option.value = produit;
                option.textContent = produit;
                produitSelect.appendChild(option);
            });
        } else if (categorie) {
            console.error(`Données produits non trouvées ou catégorie vide: ${categorie}`);
            // Vous pourriez vouloir afficher un message à l'utilisateur ici
        }
        
        // Déclencher manuellement l'événement change sur produitSelect pour mettre à jour le prix
        produitSelect.dispatchEvent(new Event('change')); 
    });

    // Mise à jour auto du prix unitaire
    const prixUnitInput = div.querySelector('.prix-unit');
    produitSelect.addEventListener('change', function() {
        const selectedProduit = this.value;
        const categorie = categorieSelect.value;
        
        // Utiliser le prix depuis produitsDB
        if (categorie && selectedProduit && produits[categorie] && produits[categorie][selectedProduit]) {
            // Prendre le premier prix disponible pour ce produit
            prixUnitInput.value = produits.getPrixPreferePour(categorie, selectedProduit) || '';
        } else {
            console.warn(`Prix non trouvé pour ${categorie} > ${selectedProduit}`);
            prixUnitInput.value = '';
        }
        
        calculerTotal(div); // Recalculer le total ligne quand produit change
    });

    // Calcul auto du total
    const quantiteInput = div.querySelector('.quantite');
    prixUnitInput.addEventListener('input', () => calculerTotal(div));
    quantiteInput.addEventListener('input', () => calculerTotal(div));

    // Logique de suppression
    const deleteButton = div.querySelector('.supprimer-produit');
    deleteButton.addEventListener('click', function() {
        div.remove();
        calculerTotalGeneral(); // Recalculer le total général après suppression
    });

    return div;
}

// Modifier la gestion du formulaire
document.getElementById('vente-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const date = document.getElementById('date').value;
    const pointVente = document.getElementById('point-vente').value;
    
    // Vérifier si l'utilisateur a accès au point de vente
    if (currentUser.pointVente !== "tous" && currentUser.pointVente !== pointVente) {
        alert('Vous n\'avez pas accès à ce point de vente');
        return;
    }
    
    // Récupérer l'ID de la vente en cours de modification s'il existe
    const venteEnCoursDeModification = document.querySelector('.produit-entry[data-vente-id]');
    const venteId = venteEnCoursDeModification ? venteEnCoursDeModification.dataset.venteId : null;
    const isUpdate = !!venteId;
    
    console.log('Vente en cours de modification:', { venteId, isUpdate });
    
    // Si c'est une mise à jour, on ne traite que la première entrée avec l'ID de vente
    // Si c'est un nouvel enregistrement, on traite toutes les entrées
    const entriesToProcess = isUpdate ? 
        [document.querySelector('.produit-entry[data-vente-id]')] : 
        document.querySelectorAll('.produit-entry');
    
    const entries = [];
    
    entriesToProcess.forEach(entry => {
        const categorie = entry.querySelector('.categorie-select').value;
        const produit = entry.querySelector('.produit-select').value;
        const quantite = entry.querySelector('.quantite').value;
        const prixUnit = entry.querySelector('.prix-unit').value;
        const total = entry.querySelector('.total').value;
        
        if (categorie && produit && quantite && prixUnit) {
            const mois = new Date(date.split('/').reverse().join('-')).toLocaleString('fr-FR', { month: 'long' });
            const semaine = `S${Math.ceil(new Date(date.split('/').reverse().join('-')).getDate() / 7)}`;
            
            entries.push({
                id: venteId,
                mois,
                date,
                semaine,
                pointVente,
                categorie,
                produit,
                prixUnit,
                quantite,
                total
            });
        }
    });
    
    if (entries.length === 0) {
        alert('Veuillez ajouter au moins un produit');
        return;
    }
    
    try {
        const url = isUpdate ? `http://localhost:3000/api/ventes/${venteId}` : 'http://localhost:3000/api/ventes';
        const method = isUpdate ? 'PUT' : 'POST';
        
        console.log('Envoi de la requête:', { url, method, isUpdate, venteId });
        console.log('Données envoyées:', isUpdate ? entries[0] : entries);
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(isUpdate ? entries[0] : entries)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(isUpdate ? 'Vente mise à jour avec succès' : 'Ventes enregistrées avec succès');
            
            // Sauvegarder le point de vente actuel
            const pointVenteSelect = document.getElementById('point-vente');
            const currentPointVente = pointVenteSelect.value;
            
            // Réinitialiser le formulaire
            this.reset();
            
            // Réinitialiser la date à aujourd'hui
            document.getElementById('date')._flatpickr.setDate(new Date());
            
            // Réappliquer le point de vente selon les droits de l'utilisateur
            if (currentUser.pointVente !== "tous") {
                pointVenteSelect.value = currentUser.pointVente;
                pointVenteSelect.disabled = true;
            } else if (currentPointVente) {
                pointVenteSelect.value = currentPointVente;
            }
            
            // Réinitialiser les produits
            document.getElementById('produits-container').innerHTML = '';
            
            // Ajouter une nouvelle entrée vide pour permettre de nouvelles saisies
            document.getElementById('produits-container').appendChild(creerNouvelleEntree());
            
            // Actualiser les dernières ventes
            // La fonction chargerDernieresVentes() va maintenant aussi recalculer le total général
            await chargerDernieresVentes();
            
            // Note: nous ne calculons plus le total ici car chargerDernieresVentes le fait déjà
        } else {
            throw new Error(data.message || (isUpdate ? 'Erreur lors de la mise à jour de la vente' : 'Erreur lors de l\'enregistrement des ventes'));
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert(error.message || (isUpdate ? 'Erreur lors de la mise à jour de la vente' : 'Erreur lors de l\'enregistrement des ventes'));
    }
});

// Modifier l'ajout de nouveaux produits
document.getElementById('ajouter-produit').addEventListener('click', function() {
    const container = document.getElementById('produits-container');
    container.appendChild(creerNouvelleEntree());
});

// Fonction pour vérifier si une date est aujourd'hui
function isToday(dateStr) {
    const today = new Date();
    // Gérer le format DD-MM-YY
    const [jour, mois, annee] = dateStr.split('-');
    // Convertir l'année à 4 chiffres (20YY)
    const fullYear = '20' + annee;
    const date = new Date(fullYear, mois - 1, jour);
    
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
}

function afficherDernieresVentes(ventes) {
    const tbody = document.querySelector('#dernieres-ventes tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!Array.isArray(ventes) || ventes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="text-center">Aucune vente disponible</td></tr>';
        return;
    }
    
    // Fonction pour standardiser les dates au format DD-MM-YY
    const standardiserDate = (dateStr) => {
        if (!dateStr) return '';
        
        let jour, mois, annee;
        if (dateStr.includes('/')) {
            [jour, mois, annee] = dateStr.split('/');
            // Convertir l'année à 2 chiffres si elle est à 4 chiffres
            if (annee.length === 4) {
                annee = annee.substring(2);
            }
            return `${jour}-${mois}-${annee}`;
        } else if (dateStr.includes('-')) {
            return dateStr; // Déjà au format DD-MM-YY
        }
        return dateStr;
    };
    
    ventes.forEach(vente => {
        const tr = document.createElement('tr');
        
        // Vérifier si la vente est d'aujourd'hui
        const estAujourdhui = isToday(vente.Date);
        
        // Créer le style pour marquer les ventes d'aujourd'hui
        const rowClass = estAujourdhui ? 'bg-info text-white' : '';
        tr.className = rowClass;
        
        // Ajouter les données dans les cellules - SANS l'ID
        tr.innerHTML = `
            <td>${vente.Mois || ''}</td>
            <td>${vente.Date || ''}</td>
            <td>${vente.Semaine || ''}</td>
            <td>${vente['Point de Vente'] || ''}</td>
            <td>${vente.Preparation || ''}</td>
            <td>${vente.Catégorie || ''}</td>
            <td>${vente.Produit || ''}</td>
            <td>${parseFloat(vente.PU || 0).toLocaleString('fr-FR')}</td>
            <td>${parseFloat(vente.Nombre || 0)}</td>
            <td>${parseFloat(vente.Montant || 0).toLocaleString('fr-FR')}</td>
            <td>
                <button class="btn btn-danger btn-sm delete-vente" data-id="${vente.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        // Ajouter la ligne au tableau
        tbody.appendChild(tr);
        
        // Ajouter l'écouteur d'événement pour le bouton de suppression
        const deleteBtn = tr.querySelector('.delete-vente');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function() {
                const venteId = this.getAttribute('data-id');
                if (confirm(`Êtes-vous sûr de vouloir supprimer la vente #${venteId} ?`)) {
                    supprimerVente(venteId);
                }
            });
        }
    });
}

// Fonction pour charger les dernières ventes
async function chargerDernieresVentes() {
    try {
        console.log('Début du chargement des dernières ventes');
        
        // Récupérer le point de vente et la date sélectionnés dans le formulaire
        const pointVenteSelectionne = document.getElementById('point-vente').value;
        const dateSelectionnee = document.getElementById('date').value;
        
        // Convertir la date sélectionnée dans un format comparable
        function getComparableDate(dateStr) {
            if (!dateStr) return null;
            
            let jour, mois, annee;
            
            // Format DD/MM/YYYY ou DD/MM/YY
            if (dateStr.includes('/')) {
                [jour, mois, annee] = dateStr.split('/');
                if (annee.length === 2) {
                    annee = '20' + annee;
                }
            } 
            // Format DD-MM-YYYY ou DD-MM-YY
            else if (dateStr.includes('-')) {
                [jour, mois, annee] = dateStr.split('-');
                if (annee.length === 2) {
                    annee = '20' + annee;
                }
            } else {
                return null; // Format non reconnu
            }
            
            return `${jour.padStart(2, '0')}/${mois.padStart(2, '0')}/${annee}`;
        }
        
        const dateSelectionneeFmt = getComparableDate(dateSelectionnee);
        
        console.log('Point de vente sélectionné:', pointVenteSelectionne);
        console.log('Date sélectionnée:', dateSelectionnee, '(Format comparable:', dateSelectionneeFmt, ')');
        
        const response = await fetch('http://localhost:3000/api/dernieres-ventes', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Structure complète des données reçues:', data);
        
        if (data.success && Array.isArray(data.dernieresVentes)) {
            console.log('Premier élément des ventes:', data.dernieresVentes[0]);
            
            // Filtrer les ventes selon:
            // 1. Droits de l'utilisateur
            // 2. Point de vente sélectionné
            // 3. Date sélectionnée
            let ventesAffichees = data.dernieresVentes;
            
            // 1. Filtrer selon les droits de l'utilisateur
            if (currentUser && currentUser.pointVente !== "tous") {
                ventesAffichees = ventesAffichees.filter(vente => 
                    vente['Point de Vente'] === currentUser.pointVente
                );
            }
            
            // 2. Filtrer selon le point de vente sélectionné (si présent)
            if (pointVenteSelectionne) {
                ventesAffichees = ventesAffichees.filter(vente => 
                    vente['Point de Vente'] === pointVenteSelectionne
                );
            }
            
            // 3. Filtrer selon la date sélectionnée (si présente)
            if (dateSelectionneeFmt) {
                ventesAffichees = ventesAffichees.filter(vente => {
                    const venteDate = getComparableDate(vente.Date);
                    return venteDate === dateSelectionneeFmt;
                });
            }
            
            // Trier les ventes par date en ordre décroissant (pour celles qui partagent la même date)
            ventesAffichees.sort((a, b) => {
                // Fonction pour parser les dates au format DD/MM/YYYY ou DD-MM-YY
                const parseDate = (dateStr) => {
                    if (!dateStr) return new Date(0); // Date minimum si pas de date
                    
                    let jour, mois, annee;
                    if (dateStr.includes('/')) {
                        [jour, mois, annee] = dateStr.split('/');
                    } else if (dateStr.includes('-')) {
                        [jour, mois, annee] = dateStr.split('-');
                    } else {
                        return new Date(0);
                    }
                    
                    // Convertir l'année à 2 chiffres en 4 chiffres
                    if (annee && annee.length === 2) {
                        annee = '20' + annee;
                    }
                    
                    return new Date(parseInt(annee), parseInt(mois) - 1, parseInt(jour));
                };
                
                const dateA = parseDate(a.Date);
                const dateB = parseDate(b.Date);
                
                // Trier par date décroissante (du plus récent au plus ancien)
                return dateB - dateA;
            });
            
            console.log('Données filtrées et triées, affichage des ventes:', ventesAffichees.length, 'entrées');
            afficherDernieresVentes(ventesAffichees);
            
            // Recalculer le total général après avoir chargé les ventes
            calculerTotalGeneral();
        } else {
            console.error('Format de données invalide pour les dernières ventes:', data);
            const tbody = document.querySelector('#dernieres-ventes tbody');
            if (tbody) tbody.innerHTML = '<tr><td colspan="11" class="text-center">Aucune donnée disponible</td></tr>';
        }
    } catch (error) {
        console.error('Erreur lors du chargement des dernières ventes:', error);
        const tbody = document.querySelector('#dernieres-ventes tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="11" class="text-center text-danger">Erreur: ' + error.message + '</td></tr>';
    }
}

// Charger les dernières ventes au démarrage
chargerDernieresVentes();

// Variables pour les graphiques
let ventesParMoisChart = null;
let ventesParProduitChart = null;
let ventesParCategorieChart = null;

// Fonction pour créer le graphique des ventes par mois
function creerGraphiqueVentesParMois(donnees) {
    console.log('Création du graphique par mois avec les données:', donnees);
    const ctx = document.getElementById('ventesParMoisChart');
    if (!ctx) {
        console.error('Canvas ventesParMoisChart non trouvé');
        return;
    }
    console.log('Canvas ventesParMoisChart trouvé');

    // Détruire le graphique existant s'il existe
    if (ventesParMoisChart) {
        console.log('Destruction du graphique existant');
        ventesParMoisChart.destroy();
    }

    // Fonction pour standardiser les dates au format DD-MM-YY
    const standardiserDate = (dateStr) => {
        if (!dateStr) return '';
        
        let jour, mois, annee;
        if (dateStr.includes('/')) {
            [jour, mois, annee] = dateStr.split('/');
            // Convertir l'année à 2 chiffres si elle est à 4 chiffres
            if (annee.length === 4) {
                annee = annee.substring(2);
            }
            return `${jour}/${mois}/${annee}`;
        } else if (dateStr.includes('-')) {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                return `${parts[0]}/${parts[1]}/${parts[2].length === 4 ? parts[2].substring(2) : parts[2]}`;
            }
        }
        return dateStr;
    };

    // Regrouper les ventes par date
    const ventesParJour = {};
    donnees.forEach(vente => {
        const dateStandard = standardiserDate(vente.Date || '');
        if (!dateStandard) return;
        
        if (!ventesParJour[dateStandard]) {
            ventesParJour[dateStandard] = 0;
        }
        ventesParJour[dateStandard] += parseFloat(vente.Montant || 0);
    });

    console.log('Ventes regroupées par jour:', ventesParJour);

    // Convertir en tableaux et trier par date
    const dates = Object.keys(ventesParJour).sort((a, b) => {
        if (!a.includes('/') || !b.includes('/')) return 0;
        
        const [jourA, moisA, anneeA] = a.split('/');
        const [jourB, moisB, anneeB] = b.split('/');
        
        const dateA = new Date(20 + anneeA, parseInt(moisA) - 1, parseInt(jourA));
        const dateB = new Date(20 + anneeB, parseInt(moisB) - 1, parseInt(jourB));
        
        return dateA - dateB;
    });

    const montants = dates.map(date => ventesParJour[date]);

    // Créer le nouveau graphique
    ventesParMoisChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Ventes par jour',
                data: montants,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderWidth: 2,
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString('fr-FR') + ' FCFA';
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toLocaleString('fr-FR') + ' FCFA';
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

// Fonction pour créer le graphique des ventes par produit
function creerGraphiqueVentesParProduit(donnees) {
    console.log('Création du graphique par produit avec les données:', donnees);
    const ctx = document.getElementById('ventesParProduitChart');
    if (!ctx) {
        console.error('Canvas ventesParProduitChart non trouvé');
        return;
    }
    console.log('Canvas ventesParProduitChart trouvé');

    // Détruire le graphique existant s'il existe
    if (ventesParProduitChart) {
        console.log('Destruction du graphique existant');
        ventesParProduitChart.destroy();
    }

    // Regrouper les ventes par produit
    const ventesParProduit = {};
    donnees.forEach(vente => {
        const produit = vente.Produit || '';
        if (!ventesParProduit[produit]) {
            ventesParProduit[produit] = 0;
        }
        ventesParProduit[produit] += parseFloat(vente.Montant || 0);
    });

    // Trier les produits par montant décroissant
    const sortedProduits = Object.entries(ventesParProduit)
        .sort(([, a], [, b]) => b - a);

    // Préparer les données pour le graphique
    const labels = sortedProduits.map(([produit]) => produit);
    const montants = sortedProduits.map(([, montant]) => montant);

    // Créer le nouveau graphique
    ventesParProduitChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ventes par produit',
                data: montants,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgb(54, 162, 235)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString('fr-FR') + ' FCFA';
                        }
                    }
                }
            }
        }
    });
}

// Fonction pour créer le graphique des ventes par catégorie
function creerGraphiqueVentesParCategorie(donnees) {
    console.log('Création du graphique par catégorie avec les données:', donnees);
    const ctx = document.getElementById('ventesParCategorieChart');
    if (!ctx) {
        console.error('Canvas ventesParCategorieChart non trouvé');
        return;
    }
    console.log('Canvas ventesParCategorieChart trouvé');

    // Détruire le graphique existant s'il existe
    if (ventesParCategorieChart) {
        console.log('Destruction du graphique existant');
        ventesParCategorieChart.destroy();
    }

    // Regrouper les ventes par catégorie
    const ventesParCategorie = {};
    donnees.forEach(vente => {
        const categorie = vente.Catégorie || 'Non catégorisé';
        if (!ventesParCategorie[categorie]) {
            ventesParCategorie[categorie] = 0;
        }
        ventesParCategorie[categorie] += parseFloat(vente.Montant || 0);
    });

    // Trier les catégories par montant décroissant
    const sortedCategories = Object.entries(ventesParCategorie)
        .sort(([, a], [, b]) => b - a);

    // Préparer les données pour le graphique
    const labels = sortedCategories.map(([categorie]) => categorie);
    const montants = sortedCategories.map(([, montant]) => montant);

    // Générer des couleurs
    const backgroundColors = labels.map((_, i) => {
        const hue = (i * 137) % 360; // Assure une bonne dispersion des couleurs
        return `hsla(${hue}, 70%, 60%, 0.7)`;
    });

    // Créer le nouveau graphique
    ventesParCategorieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: montants,
                backgroundColor: backgroundColors,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${context.label}: ${value.toLocaleString('fr-FR')} FCFA (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Variables pour la pagination
let currentPage = 1;
const itemsPerPage = 30;
let allVentes = [];

// Fonction pour charger les ventes avec pagination
async function chargerVentes() {
    try {
        // S'assurer que la section de visualisation est visible
        // La visibilité est maintenant gérée par les gestionnaires d'onglets
        // const visualisationSection = document.getElementById('visualisation-section');
        // if (visualisationSection) {
        //     visualisationSection.style.display = 'block'; 
        // }

        const dateDebut = document.getElementById('date-debut').value;
        const dateFin = document.getElementById('date-fin').value;
        const pointVente = document.getElementById('point-vente-select').value;

        console.log('Dates sélectionnées:', { dateDebut, dateFin });

        // Convertir les dates au format YYYY-MM-DD pour l'API
        const formatDateForApi = (dateStr) => {
            if (!dateStr) return '';
            const [jour, mois, annee] = dateStr.split('/');
            // Ajuster le mois pour qu'il soit correct (les mois commencent à 0 en JavaScript)
            const date = new Date(annee, parseInt(mois) - 1, parseInt(jour));
            return date.toISOString().split('T')[0];
        };

        const debut = formatDateForApi(dateDebut);
        const fin = formatDateForApi(dateFin);

        console.log('Chargement des ventes avec les paramètres:', { 
            dateDebut, 
            dateFin, 
            debut, 
            fin, 
            pointVente 
        });

        // Fonction pour comparer les dates en ignorant l'heure
        const compareDates = (date1, date2) => {
            const d1 = new Date(date1);
            const d2 = new Date(date2);
            return d1.getFullYear() === d2.getFullYear() &&
                   d1.getMonth() === d2.getMonth() &&
                   d1.getDate() === d2.getDate();
        };

        const response = await fetch(`http://localhost:3000/api/ventes?dateDebut=${debut}&dateFin=${fin}&pointVente=${pointVente}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();

        if (data.success) {
            console.log('Nombre de ventes reçues:', data.ventes.length);
            
            // Formater les données
            const ventesFormatees = formaterDonneesVentes(data.ventes);
            
            // Stocker toutes les ventes
            allVentes = ventesFormatees;
            
            // Calculer le montant total des ventes
            const montantTotal = ventesFormatees.reduce((total, vente) => {
                return total + (parseFloat(vente.Montant) || 0);
            }, 0);
            
            // Afficher le montant total
            const montantTotalElement = document.getElementById('montant-total');
            if (montantTotalElement) {
                montantTotalElement.textContent = `${montantTotal.toLocaleString('fr-FR')} FCFA`;
            }
            
            // Afficher la première page
            afficherPageVentes(1);
            
            // Mettre à jour les informations de pagination
            updatePaginationInfo();

            // Attendre un court instant pour s'assurer que les canvas sont rendus
            setTimeout(() => {
                // Mettre à jour les graphiques
                creerGraphiqueVentesParMois(ventesFormatees);
                creerGraphiqueVentesParProduit(ventesFormatees);
                creerGraphiqueVentesParCategorie(ventesFormatees);
            }, 100);
        } else {
            throw new Error(data.message || 'Erreur lors du chargement des ventes');
        }
    } catch (error) {
        console.error('Erreur lors du chargement des ventes:', error);
        const tbody = document.querySelector('#tableau-ventes tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="10" class="text-center text-danger">Erreur lors du chargement des ventes: ${error.message}</td></tr>`;
        }
        // Réinitialiser le montant total en cas d'erreur si l'élément existe
        const montantTotalElement = document.getElementById('montant-total');
        if (montantTotalElement) {
            montantTotalElement.textContent = '0 FCFA';
        }
    }
}

// Fonction pour afficher une page spécifique des ventes
function afficherPageVentes(page) {
    const tbody = document.querySelector('#tableau-ventes tbody');
    if (!tbody) return;

    // Calculer les indices de début et de fin pour la page courante
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    // Obtenir les ventes pour la page courante
    const ventesPage = allVentes.slice(startIndex, endIndex);
    
    tbody.innerHTML = '';
    
    ventesPage.forEach(vente => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${vente.Mois || vente.mois || ''}</td>
            <td>${vente.Date || vente.date || ''}</td>
            <td>${vente.Semaine || vente.semaine || ''}</td>
            <td>${vente['Point de Vente'] || vente.pointVente || ''}</td>
            <td>${vente.Preparation || vente.preparation || vente['Point de Vente'] || vente.pointVente || ''}</td>
            <td>${vente.Catégorie || vente.categorie || ''}</td>
            <td>${vente.Produit || vente.produit || ''}</td>
            <td>${(parseFloat(vente.PU || vente.prixUnit || 0)).toLocaleString('fr-FR')} FCFA</td>
            <td>${vente.Nombre || vente.quantite || 0}</td>
            <td>${(parseFloat(vente.Montant || vente.total || 0)).toLocaleString('fr-FR')} FCFA</td>
        `;
        tbody.appendChild(tr);
    });
}

// Fonction pour mettre à jour les informations de pagination
function updatePaginationInfo() {
    const totalPages = Math.ceil(allVentes.length / itemsPerPage);
    const paginationInfo = document.getElementById('pagination-info');
    const paginationButtons = document.getElementById('pagination-buttons');
    
    if (paginationInfo) {
        paginationInfo.textContent = `Page ${currentPage} sur ${totalPages} (${allVentes.length} ventes au total)`;
    }
    
    if (paginationButtons) {
        paginationButtons.innerHTML = '';
        
        // Bouton précédent
        const prevButton = document.createElement('button');
        prevButton.className = 'btn btn-outline-primary me-2';
        prevButton.textContent = 'Précédent';
        prevButton.disabled = currentPage === 1;
        prevButton.onclick = () => {
            if (currentPage > 1) {
                currentPage--;
                afficherPageVentes(currentPage);
                updatePaginationInfo();
            }
        };
        paginationButtons.appendChild(prevButton);
        
        // Bouton suivant
        const nextButton = document.createElement('button');
        nextButton.className = 'btn btn-outline-primary';
        nextButton.textContent = 'Suivant';
        nextButton.disabled = currentPage === totalPages;
        nextButton.onclick = () => {
            if (currentPage < totalPages) {
                currentPage++;
                afficherPageVentes(currentPage);
                updatePaginationInfo();
            }
        };
        paginationButtons.appendChild(nextButton);
    }
}

// Fonction pour lire un fichier Excel ou CSV
function lireFichier(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                
                // Configuration spécifique pour la lecture
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
                    header: 1,
                    raw: false,
                    defval: ''
                });
                
                // Vérifier et nettoyer les en-têtes
                const headers = jsonData[0].map(h => h.trim());
                const expectedHeaders = [
                    'Mois',
                    'Date',
                    'Semaine',
                    'Point de Vente',
                    'Preparation',
                    'Catégorie',
                    'Produit',
                    'PU',
                    'Nombre',
                    'Montant'
                ];
                
                // Vérifier que tous les en-têtes attendus sont présents
                const missingHeaders = expectedHeaders.filter(header => 
                    !headers.some(h => h.toLowerCase() === header.toLowerCase())
                );
                
                if (missingHeaders.length > 0) {
                    reject(new Error(`En-têtes manquants : ${missingHeaders.join(', ')}`));
                    return;
                }
                
                // Nettoyer les données
                const cleanedData = jsonData.slice(1).map(row => {
                    // Supprimer les espaces superflus et convertir les valeurs vides en 0
                    return row.map((cell, index) => {
                        if (typeof cell === 'string') {
                            cell = cell.trim();
                        }
                        // Pour les colonnes numériques (PU, Nombre, Montant)
                        if (index >= 7 && cell === '') {
                            return '0';
                        }
                        return cell;
                    });
                });
                
                resolve(cleanedData);
            } catch (error) {
                reject(new Error('Erreur lors de la lecture du fichier : ' + error.message));
            }
        };
        
        reader.onerror = function() {
            reject(new Error('Erreur lors de la lecture du fichier'));
        };
        
        reader.readAsArrayBuffer(file);
    });
}

// Fonction pour afficher l'aperçu des données
function afficherApercu(donnees) {
    const tbody = document.querySelector('#preview-table tbody');
    tbody.innerHTML = '';
    
    donnees.forEach((row, index) => {
        if (row.length >= 10) { // Vérifier que la ligne a toutes les colonnes nécessaires
            const tr = document.createElement('tr');
            tr.dataset.index = index;
            tr.innerHTML = `
                <td>${row[0]}</td>
                <td>${row[1]}</td>
                <td>${row[2]}</td>
                <td>${row[3]}</td>
                <td>${row[4]}</td>
                <td>${row[5]}</td>
                <td>${row[6]}</td>
                <td>${row[7]}</td>
                <td>${row[8]}</td>
                <td>${row[9]}</td>
                <td>
                    <button type="button" class="btn btn-danger btn-sm delete-row">
                        <i class="fas fa-trash"></i> ×
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        }
    });

    // Activer le bouton de sauvegarde si des données sont présentes
    const saveButton = document.getElementById('save-import');
    saveButton.disabled = donnees.length === 0;

    // Ajouter les écouteurs d'événements pour la suppression
    document.querySelectorAll('.delete-row').forEach(button => {
        button.addEventListener('click', function() {
            const row = this.closest('tr');
            const index = parseInt(row.dataset.index);
            donnees.splice(index, 1); // Supprimer la ligne des données
            afficherApercu(donnees); // Réafficher le tableau
        });
    });
}

// Gestion de la sauvegarde
document.getElementById('save-import').addEventListener('click', async function() {
    if (donneesImportees.length === 0) {
        alert('Aucune donnée à sauvegarder');
        return;
    }

    try {
        // Préparer les données pour l'envoi au serveur
        const entries = donneesImportees.map(row => ({
            mois: row[0],
            date: row[1],
            semaine: row[2],
            pointVente: row[3],
            preparation: row[4],
            categorie: row[5],
            produit: row[6],
            prixUnit: row[7],
            quantite: row[8],
            total: row[9]
        }));
        
        // Envoyer les données au serveur
        const typeStock = document.getElementById('type-stock').value;
        const response = await fetch(`http://localhost:3000/api/stock/${typeStock}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(entries)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Données sauvegardées avec succès');
            // Réinitialiser le formulaire
            document.getElementById('file-import').value = '';
            donneesImportees = [];
            document.querySelector('#preview-table tbody').innerHTML = '';
            document.getElementById('save-import').disabled = true;
            // Recharger les dernières ventes
            chargerDernieresVentes();
        } else {
            throw new Error(result.message || 'Erreur lors de la sauvegarde');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert(error.message || 'Erreur lors de la sauvegarde des données');
    }
});

// Fonction pour charger les transferts
async function chargerTransferts(date) {
    try {
        console.log('Chargement des transferts...');
        
        // Utiliser la date passée en paramètre ou celle de l'interface si disponible
        const dateSelectionnee = date || (document.getElementById('date-inventaire') ? document.getElementById('date-inventaire').value : null);
        if (!dateSelectionnee) {
            console.warn('Aucune date sélectionnée pour charger les transferts');
            return [];
        }
        
        // Charger le fichier transferts.json
        let transferts = [];
        try {
            const response = await fetch('data/transferts.json');
            if (!response.ok) {
                console.warn('Fichier transferts.json non trouvé ou accès impossible');
                transferts = [];
            } else {
                transferts = await response.json();
                console.log('Transferts chargés depuis le fichier:', transferts);
            }
        } catch (fetchError) {
            console.warn('Erreur lors du chargement du fichier transferts.json:', fetchError);
            transferts = [];
        }
        
        // Filtrer les transferts par date
        const transfertsFiltres = Array.isArray(transferts) ? transferts.filter(t => t.date === dateSelectionnee) : [];
        console.log('Transferts filtrés par date:', transfertsFiltres);

        // Si la fonction est appelée depuis la page d'inventaire, mettre à jour l'interface
        const tbody = document.querySelector('#transfertTable tbody');
        if (tbody) {
            // Vider le tableau des transferts
            tbody.innerHTML = '';
            
            // Afficher les transferts existants
            if (Array.isArray(transfertsFiltres) && transfertsFiltres.length > 0) {
                transfertsFiltres.forEach((transfert, index) => {
                    const row = document.createElement('tr');
                    row.dataset.index = index; // Ajouter l'index pour la suppression
                    
                    // Point de vente
                    const tdPointVente = document.createElement('td');
                    const selectPointVente = document.createElement('select');
                    selectPointVente.className = 'form-select form-select-sm point-vente-select';
                    TOUS_POINTS_VENTE.forEach(pv => {
                        const option = document.createElement('option');
                        option.value = pv;
                        option.textContent = pv;
                        if (pv === transfert.pointVente) {
                            option.selected = true;
                        }
                        selectPointVente.appendChild(option);
                    });
                    tdPointVente.appendChild(selectPointVente);
                    
                    // Produit
                    const tdProduit = document.createElement('td');
                    const selectProduit = document.createElement('select');
                    selectProduit.className = 'form-select form-select-sm produit-select';
                    PRODUITS.forEach(prod => {
                        const option = document.createElement('option');
                        option.value = prod;
                        option.textContent = prod;
                        if (prod === transfert.produit) {
                            option.selected = true;
                        }
                        selectProduit.appendChild(option);
                    });
                    tdProduit.appendChild(selectProduit);
                    
                    // Impact
                    const tdImpact = document.createElement('td');
                    const selectImpact = document.createElement('select');
                    selectImpact.className = 'form-select form-select-sm impact-select';
                    [
                        { value: '1', text: '+' },
                        { value: '-1', text: '-' }
                    ].forEach(({ value, text }) => {
                        const option = document.createElement('option');
                        option.value = value;
                        option.textContent = text;
                        if (value === transfert.impact.toString()) {
                            option.selected = true;
                        }
                        selectImpact.appendChild(option);
                    });
                    tdImpact.appendChild(selectImpact);
                    
                    // Quantité
                    const tdQuantite = document.createElement('td');
                    const inputQuantite = document.createElement('input');
                    inputQuantite.type = 'number';
                    inputQuantite.className = 'form-control form-control-sm quantite-input';
                    inputQuantite.value = transfert.quantite;
                    tdQuantite.appendChild(inputQuantite);
                    
                    // Prix unitaire
                    const tdPrixUnitaire = document.createElement('td');
                    const inputPrixUnitaire = document.createElement('input');
                    inputPrixUnitaire.type = 'number';
                    inputPrixUnitaire.className = 'form-control form-control-sm prix-unitaire-input';
                    inputPrixUnitaire.value = transfert.prixUnitaire;
                    tdPrixUnitaire.appendChild(inputPrixUnitaire);
                    
                    // Total
                    const tdTotal = document.createElement('td');
                    tdTotal.className = 'total-cell';
                    tdTotal.textContent = transfert.total.toLocaleString('fr-FR');
                    
                    // Commentaire
                    const tdCommentaire = document.createElement('td');
                    const inputCommentaire = document.createElement('input');
                    inputCommentaire.type = 'text';
                    inputCommentaire.className = 'form-control form-control-sm commentaire-input';
                    inputCommentaire.value = transfert.commentaire || '';
                    tdCommentaire.appendChild(inputCommentaire);
                    
                    // Actions
                    const tdActions = document.createElement('td');
                    const btnSupprimer = document.createElement('button');
                    btnSupprimer.className = 'btn btn-danger btn-sm';
                    btnSupprimer.innerHTML = '<i class="fas fa-trash"></i>';
                    btnSupprimer.addEventListener('click', async (e) => {
                        e.preventDefault();
                        if (confirm('Voulez-vous vraiment supprimer ce transfert ?')) {
                            try {
                                // Supprimer le transfert via l'API
                                const response = await fetch(`http://localhost:3000/api/transferts`, {
                                    method: 'DELETE',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    credentials: 'include',
                                    body: JSON.stringify({
                                        date: transfert.date,
                                        pointVente: transfert.pointVente,
                                        produit: transfert.produit,
                                        impact: transfert.impact,
                                        quantite: transfert.quantite,
                                        prixUnitaire: transfert.prixUnitaire
                                    })
                                });
                                
                                if (response.ok) {
                                    row.remove();
                                    console.log('Transfert supprimé avec succès');
                                } else {
                                    throw new Error('Erreur lors de la suppression du transfert');
                                }
                            } catch (error) {
                                console.error('Erreur lors de la suppression:', error);
                                alert('Erreur lors de la suppression : ' + error.message);
                            }
                        }
                    });
                    tdActions.appendChild(btnSupprimer);
                    
                    // Ajouter les cellules à la ligne
                    row.append(tdPointVente, tdProduit, tdImpact, tdQuantite, tdPrixUnitaire, tdTotal, tdCommentaire, tdActions);
                    
                    // Ajouter les écouteurs d'événements pour le calcul automatique du total
                    const calculateTotal = () => {
                        const quantite = parseFloat(inputQuantite.value) || 0;
                        const prixUnitaire = parseFloat(inputPrixUnitaire.value) || 0;
                        const impact = parseInt(selectImpact.value) || 1;
                        const total = quantite * prixUnitaire * impact;
                        tdTotal.textContent = total.toLocaleString('fr-FR');
                    };
                    
                    inputQuantite.addEventListener('input', calculateTotal);
                    inputPrixUnitaire.addEventListener('input', calculateTotal);
                    selectImpact.addEventListener('change', calculateTotal);
                    
                    tbody.appendChild(row);
                });
            } else {
                console.log('Aucun transfert trouvé pour cette date, ajout d\'une ligne vide');
                ajouterLigneTransfert();
            }
              
            console.log('Transferts chargés avec succès');
        }
        
        // Toujours retourner un tableau (vide ou filtré)
        return transfertsFiltres;
        
    } catch (error) {
        console.error('Erreur lors du chargement des transferts:', error);
        // En cas d'erreur, retourner un tableau vide
        return [];
    }
}

// Fonction pour ajouter une ligne au tableau de transfert
function ajouterLigneTransfert() {
    console.log('Ajout d\'une ligne au tableau de transfert');
    const tbody = document.querySelector('#transfertTable tbody');
    const rowIndex = tbody.rows.length;
    
    const row = document.createElement('tr');
    row.dataset.index = rowIndex;
    
    // Point de vente
    const tdPointVente = document.createElement('td');
    const selectPointVente = document.createElement('select');
    selectPointVente.className = 'form-select form-select-sm point-vente-select';
    TOUS_POINTS_VENTE.forEach(pv => {
        const option = document.createElement('option');
        option.value = pv;
        option.textContent = pv;
        selectPointVente.appendChild(option);
    });
    tdPointVente.appendChild(selectPointVente);
    
    // Produit
    const tdProduit = document.createElement('td');
    const selectProduit = document.createElement('select');
    selectProduit.className = 'form-select form-select-sm produit-select';
    PRODUITS.forEach(prod => {
        const option = document.createElement('option');
        option.value = prod;
        option.textContent = prod;
        selectProduit.appendChild(option);
    });
    tdProduit.appendChild(selectProduit);
    
    // Impact
    const tdImpact = document.createElement('td');
    const selectImpact = document.createElement('select');
    selectImpact.className = 'form-select form-select-sm impact-select';
    [
        { value: '1', text: '+' },
        { value: '-1', text: '-' }
    ].forEach(({ value, text }) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        selectImpact.appendChild(option);
    });
    tdImpact.appendChild(selectImpact);
    
    // Quantité
    const tdQuantite = document.createElement('td');
    const inputQuantite = document.createElement('input');
    inputQuantite.type = 'number';
    inputQuantite.className = 'form-control form-control-sm quantite-input';
    inputQuantite.min = '0';
    inputQuantite.step = '0.1';
    inputQuantite.value = '0';
    tdQuantite.appendChild(inputQuantite);
    
    // Prix unitaire
    const tdPrixUnitaire = document.createElement('td');
    const inputPrixUnitaire = document.createElement('input');
    inputPrixUnitaire.type = 'number';
    inputPrixUnitaire.className = 'form-control form-control-sm prix-unitaire-input';
    inputPrixUnitaire.min = '0';
    inputPrixUnitaire.step = '100';
    inputPrixUnitaire.value = '0';
    tdPrixUnitaire.appendChild(inputPrixUnitaire);
    
    // Total
    const tdTotal = document.createElement('td');
    tdTotal.className = 'total-cell';
    tdTotal.textContent = '0';
    
    // Commentaire
    const tdCommentaire = document.createElement('td');
    const inputCommentaire = document.createElement('input');
    inputCommentaire.type = 'text';
    inputCommentaire.className = 'form-control form-control-sm commentaire-input';
    tdCommentaire.appendChild(inputCommentaire);
    
    // Actions
    const tdActions = document.createElement('td');
    const btnSupprimer = document.createElement('button');
    btnSupprimer.className = 'btn btn-danger btn-sm';
    btnSupprimer.innerHTML = '<i class="fas fa-trash"></i>';
    btnSupprimer.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Voulez-vous vraiment supprimer cette ligne ?')) {
            row.remove();
        }
    });
    tdActions.appendChild(btnSupprimer);
    
    // Ajouter les cellules à la ligne
    row.append(tdPointVente, tdProduit, tdImpact, tdQuantite, tdPrixUnitaire, tdTotal, tdCommentaire, tdActions);
    
    // Ajouter les écouteurs d'événements pour le calcul automatique du total
    const calculateTotal = () => {
        const quantite = parseFloat(inputQuantite.value) || 0;
        const prixUnitaire = parseFloat(inputPrixUnitaire.value) || 0;
        const impact = parseInt(selectImpact.value) || 1;
        const total = quantite * prixUnitaire * impact;
        tdTotal.textContent = total.toLocaleString('fr-FR');
    };
    
    inputQuantite.addEventListener('input', calculateTotal);
    inputPrixUnitaire.addEventListener('input', calculateTotal);
    selectImpact.addEventListener('change', calculateTotal);
    
    // Gestionnaire pour la mise à jour du prix unitaire par défaut
    selectProduit.addEventListener('change', function() {
        const nouveauProduit = this.value;
        inputPrixUnitaire.value = PRIX_DEFAUT[nouveauProduit] || '0';
        calculateTotal();
    });
    
    tbody.appendChild(row);
}

// Fonction pour sauvegarder les transferts
async function sauvegarderTransfert() {
    try {
        console.log('Sauvegarde des transferts...');
        const date = document.getElementById('date-inventaire').value;
        
        if (!date) {
            alert('Veuillez sélectionner une date');
            return;
        }
        
        // Récupérer les données du tableau
        const rows = document.querySelectorAll('#transfertTable tbody tr');
        const transferts = [];
        
        rows.forEach(row => {
            const pointVente = row.querySelector('.point-vente-select').value;
            const produit = row.querySelector('.produit-select').value;
            const impact = parseInt(row.querySelector('.impact-select').value);
            const quantite = parseFloat(row.querySelector('.quantite-input').value);
            const prixUnitaire = parseFloat(row.querySelector('.prix-unitaire-input').value);
            const commentaire = row.querySelector('.commentaire-input').value;
            
            // Calcul du total
            const total = quantite * prixUnitaire * impact;
            
            // Vérifier que les données sont valides
            if (pointVente && produit && !isNaN(quantite) && !isNaN(prixUnitaire) && quantite > 0) {
                transferts.push({
                    date,
                    pointVente,
                    produit,
                    impact,
                    quantite,
                    prixUnitaire,
                    total,
                    commentaire
                });
            }
        });
        
        if (transferts.length === 0) {
            alert('Aucun transfert valide à sauvegarder');
            return;
        }
        
        // Envoyer les données au serveur
        console.log('Envoi des transferts au serveur:', transferts);
        const response = await fetch('http://localhost:3000/api/transferts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(transferts)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Transferts sauvegardés avec succès');
            // Recharger les transferts pour mettre à jour l'affichage
            await chargerTransferts();
        } else {
            throw new Error(result.message || 'Erreur lors de la sauvegarde des transferts');
        }
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des transferts:', error);
        alert('Erreur lors de la sauvegarde des transferts: ' + error.message);
    }
}

// Attacher les gestionnaires d'événements pour les boutons de transfert
document.addEventListener('DOMContentLoaded', function() {
    // Gestionnaire pour le bouton d'ajout de ligne de transfert
    const btnAjouterLigne = document.getElementById('ajouterLigne');
    if (btnAjouterLigne) {
        btnAjouterLigne.addEventListener('click', ajouterLigneTransfert);
    }
    
    // Gestionnaire pour le bouton de sauvegarde de transfert
    const btnSauvegarderTransfert = document.getElementById('sauvegarderTransfert');
    if (btnSauvegarderTransfert) {
        btnSauvegarderTransfert.addEventListener('click', sauvegarderTransfert);
    }
});

document.addEventListener('DOMContentLoaded', async function() {
    // Vérifier si l'onglet Stock inventaire est actif
    const stockInventaireTab = document.getElementById('stock-inventaire-tab');
    const stockInventaireSection = document.getElementById('stock-inventaire-section');
    const copierStockTab = document.getElementById('copier-stock-tab');
    const copierStockSection = document.getElementById('copier-stock-section');
    const copierStockItem = document.getElementById('copier-stock-item');
    const stockAlerteTab = document.getElementById('stock-alerte-tab');
    const stockAlerteSection = document.getElementById('stock-alerte-section');
    
    // Forcer l'affichage de l'onglet Copier Stock pour tous les utilisateurs
    if (copierStockItem) {
        copierStockItem.style.display = 'none'; // Par défaut, masquer l'onglet
    }
    
    // Vérifier si l'utilisateur a les droits pour voir l'onglet 'Copier Stock'
    try {
        const response = await fetch('http://localhost:3000/api/user-info', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const userData = await response.json();
            if (userData.success && userData.user) {
                // Liste des utilisateurs autorisés à voir l'onglet Copier Stock
                const usersAutorisesCopiage = ['SALIOU', 'PAPI', 'NADOU', 'OUSMANE'];
                if (usersAutorisesCopiage.includes(userData.user.username.toUpperCase())) {
                    if (copierStockItem) {
                        copierStockItem.style.display = 'block';
                    }
                }
            }
        }
    } catch (error) {
        console.error('Erreur lors de la vérification des droits utilisateur:', error);
    }
    
    if (stockInventaireTab && stockInventaireTab.classList.contains('active')) {
        console.log('Onglet Stock inventaire actif au chargement, initialisation...');
        hideAllSections();
        stockInventaireSection.style.display = 'block';
        await initInventaire();
    } else if (copierStockTab && copierStockTab.classList.contains('active')) {
        console.log('Onglet Copier Stock actif au chargement, initialisation...');
        hideAllSections();
        copierStockSection.style.display = 'block';
        initCopierStock();
    } else if (stockAlerteTab && stockAlerteTab.classList.contains('active')) {
        console.log('Onglet Alertes de stock actif au chargement, initialisation...');
        hideAllSections();
        stockAlerteSection.style.display = 'block';
        initStockAlerte();
    }
});

// Fonction pour formater les données des ventes
function formaterDonneesVentes(ventes) {
    // Fonction utilitaire pour parser les dates
    const parseDate = (dateStr) => {
        if (!dateStr) return new Date(0);
        
        let jour, mois, annee;
        if (dateStr.includes('/')) {
            [jour, mois, annee] = dateStr.split('/');
        } else if (dateStr.includes('-')) {
            [jour, mois, annee] = dateStr.split('-');
        } else {
            return new Date(0);
        }
        
        // Convertir l'année à 2 chiffres en 4 chiffres
        if (annee && annee.length === 2) {
            annee = '20' + annee;
        }
        
        return new Date(parseInt(annee), parseInt(mois) - 1, parseInt(jour));
    };
    
    // Fonction pour standardiser les dates au format DD-MM-YY
    const standardiserDate = (dateStr) => {
        if (!dateStr) return '';
        
        let jour, mois, annee;
        if (dateStr.includes('/')) {
            [jour, mois, annee] = dateStr.split('/');
            // Convertir l'année à 2 chiffres si elle est à 4 chiffres
            if (annee.length === 4) {
                annee = annee.substring(2);
            }
            return `${jour}-${mois}-${annee}`;
        } else if (dateStr.includes('-')) {
            return dateStr; // Déjà au format DD-MM-YY
        }
        return dateStr;
    };

    // Fonction pour obtenir le nom du mois en français à partir d'une date
    const getNomMois = (dateStr) => {
        if (!dateStr) return '';
        
        const date = parseDate(dateStr);
        const moisFrancais = [
            'janvier', 'février', 'mars', 'avril', 'mai', 'juin', 
            'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
        ];
        
        return moisFrancais[date.getMonth()];
    };
    
    // Normaliser les données
    const ventesNormalisees = ventes.map(v => {
        // Standardiser la date
        const dateStr = v.Date || v.date || '';
        const dateStandardisee = standardiserDate(dateStr);
        
        // Déterminer le nom du mois en français à partir de la date
        const nomMois = getNomMois(dateStr);
        
        return {
            id: v.id || '',
            Mois: nomMois, // Utiliser le mois extrait de la date
            Date: dateStandardisee,
            Semaine: v.Semaine || v.semaine || '',
            'Point de Vente': v['Point de Vente'] || v.pointVente || '',
            Preparation: v.Preparation || v.preparation || v['Point de Vente'] || v.pointVente || '',
            Catégorie: v.Catégorie || v.categorie || '',
            Produit: v.Produit || v.produit || '',
            PU: v.PU || v.prixUnit || '0',
            Nombre: v.Nombre || v.quantite || '0',
            Montant: v.Montant || v.total || '0'
        };
    });
    
    // Trier par date en ordre décroissant
    ventesNormalisees.sort((a, b) => {
        const dateA = parseDate(a.Date);
        const dateB = parseDate(b.Date);
        return dateB - dateA; // Ordre décroissant
    });
    
    return ventesNormalisees;
}

// Fonction pour charger les données de stock d'une date spécifique
async function chargerStock(date, type) {
    console.log('%c=== Chargement des données de stock pour la date ' + date + ' ===', 'background: #222; color: #bada55; font-size: 16px; padding: 5px;');
    
    // Vérifier le type passé en paramètre ou utiliser celui sélectionné dans l'interface
    const typeStock = type || document.getElementById('type-stock').value;
    
    try {
        console.log('%cRécupération des données depuis le serveur pour le type:', 'color: #00aaff;', typeStock);
        const response = await fetch(`http://localhost:3000/api/stock/${typeStock}?date=${date}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        // Même si le serveur renvoie une erreur, on ne la traite pas comme une exception
        // mais on initialise simplement un tableau vide
        let donnees = {};
        if (response.ok) {
            donnees = await response.json();
        } else {
            console.log(`%cAucune donnée disponible pour ${date}, initialisation avec des valeurs à zéro`, 'color: #ff9900;');
        }
        
        console.log('%cDonnées récupérées:', 'color: #00ff00;', donnees);

        // Mise à jour de stockData
        if (typeStock === 'matin') {
            stockData.matin = new Map(Object.entries(donnees));
        } else {
            stockData.soir = new Map(Object.entries(donnees));
        }

        // Si on est dans le contexte d'inventaire (tableau présent)
        const tbody = document.querySelector('#stock-table tbody');
        if (tbody) {
            // Vider le tableau AVANT de procéder à l'initialisation
            tbody.innerHTML = '';
            console.log('%cTableau vidé avant initialisation des nouvelles lignes', 'color: #ff0000;');

            // Déterminer si aucune donnée n'est disponible
            const matinEmpty = !donnees || Object.keys(donnees).length === 0;
            console.log('%cStock vide?', 'color: #ff9900;', matinEmpty);

            if (matinEmpty) {
                console.log('%cAucune donnée de stock disponible pour cette date, initialisation des valeurs par défaut', 'color: #ff9900;');
                initTableauStock();
            } else {
                console.log('%cDonnées de stock disponibles, peuplement du tableau avec les valeurs existantes', 'color: #00ff00;');
                onTypeStockChange();
            }
        }
        
        // Retourner un objet structuré pour la réconciliation
        return donnees || {};
        
    } catch (error) {
        console.error('%cErreur lors du chargement des données:', 'color: #ff0000; font-weight: bold;', error);
        // Au lieu d'afficher une alerte d'erreur, on initialise le tableau avec des valeurs par défaut
        console.log('%cInitialisation du tableau avec des valeurs par défaut suite à une erreur', 'color: #ff9900;');
        
        // Si on est dans le contexte d'inventaire
        if (document.querySelector('#stock-table tbody')) {
            initTableauStock();
        }
        
        // Retourner un objet vide en cas d'erreur
        return {};
    }
}

// Fonction pour copier les données de stock d'une autre date
async function copierStock() {
    const sourceTypeStock = document.getElementById('source-type-stock').value;
    const sourceDate = document.getElementById('source-date').value;
    const targetTypeStock = document.getElementById('destination-type-stock').value;
    const targetDate = document.getElementById('destination-date').value;

    if (!sourceDate) {
        alert('Veuillez sélectionner une date source.');
        return;
    }

    if (!targetDate) {
        alert('Veuillez sélectionner une date de destination.');
        return;
    }

    if (sourceDate === targetDate && sourceTypeStock === targetTypeStock) {
        alert('La source et la destination sont identiques. Veuillez sélectionner une date ou un type de stock différent.');
        return;
    }

    console.log('%cCopie de stock demandée:', 'color: #00aaff; font-weight: bold;', {
        sourceTypeStock,
        sourceDate,
        targetTypeStock,
        targetDate
    });

    try {
        // Charger les données sources
        const response = await fetch(`http://localhost:3000/api/stock/${sourceTypeStock}?date=${sourceDate}`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Erreur lors de la récupération des données (${response.status}): ${response.statusText}`);
        }

        const sourceData = await response.json();
        console.log('%cDonnées sources chargées:', 'color: #00ff00;', sourceData);

        if (!sourceData || (Array.isArray(sourceData) && sourceData.length === 0) || Object.keys(sourceData).length === 0) {
            alert(`Aucune donnée de stock ${sourceTypeStock} n'a été trouvée pour la date ${sourceDate}`);
            return;
        }

        // Demander confirmation
        if (!confirm(`Voulez-vous copier les données du stock ${sourceTypeStock} du ${sourceDate} vers le stock ${targetTypeStock} du ${targetDate}? Cette action remplacera les données existantes.`)) {
            return;
        }

        // Créer une structure pour stocker les données à envoyer
        let dataToSave = {};
        
        if (Array.isArray(sourceData)) {
            sourceData.forEach(item => {
                const key = `${item["Point de Vente"] || item.pointVente}-${item.Produit || item.produit}`;
                dataToSave[key] = {
                    ...item,
                    date: targetDate,
                    typeStock: targetTypeStock
                };
            });
        } else {
            Object.entries(sourceData).forEach(([key, value]) => {
                dataToSave[key] = {
                    ...value,
                    date: targetDate,
                    typeStock: targetTypeStock
                };
            });
        }

        // Sauvegarder directement les données
        const saveResponse = await fetch(`http://localhost:3000/api/stock/${targetTypeStock}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(dataToSave)
        });

        if (!saveResponse.ok) {
            throw new Error(`Erreur lors de la sauvegarde des données (${saveResponse.status}): ${saveResponse.statusText}`);
        }

        const result = await saveResponse.json();
        
        if (result.success) {
            console.log('%cDonnées copiées et sauvegardées avec succès', 'color: #00ff00; font-weight: bold;');
            alert(`Les données du stock ${sourceTypeStock} du ${sourceDate} ont été copiées avec succès vers le stock ${targetTypeStock} du ${targetDate}.`);
        } else {
            throw new Error(result.error || 'Erreur lors de la sauvegarde');
        }
        
    } catch (error) {
        console.error('%cErreur lors de la copie des données:', 'color: #ff0000; font-weight: bold;', error);
        alert(`Erreur lors de la copie des données: ${error.message}`);
    }
}

// ... existing code ...

// Dans l'événement DOMContentLoaded, après les autres initialisations
document.addEventListener('DOMContentLoaded', function() {
    // ... existing code ...
    
    // Initialiser le bouton de copie de stock
    document.getElementById('copy-stock').addEventListener('click', copierStock);
    
    // Initialiser le datepicker pour la date source
    if (document.getElementById('source-date')) {
        flatpickr('#source-date', {
            dateFormat: 'd/m/Y',
            locale: 'fr',
            defaultDate: new Date()
        });
    }
    
    // ... existing code ...
});

// ... existing code ...

// Fonction pour initialiser la page de copie de stock
function initCopierStock() {
    console.log('%c=== Initialisation de la page copier stock ===', 'background: #222; color: #bada55; font-size: 16px; padding: 5px;');
    
    // Initialiser les datepickers
    flatpickr('#source-date', {
        dateFormat: "d/m/Y",
        defaultDate: "today",
        locale: 'fr'
    });
    
    flatpickr('#destination-date', {
        dateFormat: "d/m/Y",
        defaultDate: "today",
        locale: 'fr'
    });
    
    // Initialiser le bouton de copie
    const copyStockBtn = document.getElementById('copy-stock');
    if (copyStockBtn) {
        console.log('Bouton copy-stock trouvé, ajout de l\'écouteur click');
        copyStockBtn.addEventListener('click', copierStock);
    } else {
        console.error('Bouton copy-stock non trouvé');
    }
    
    console.log('%c=== Initialisation de la page copier stock terminée ===', 'background: #222; color: #bada55; font-size: 16px; padding: 5px;');
}

// Fonction pour afficher les onglets en fonction des droits utilisateur
function afficherOngletsSuivantDroits(userData) {
    document.getElementById('user-info').textContent = `Connecté en tant que ${userData.username}`;
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
    
    // Afficher l'onglet Stock inventaire uniquement pour les utilisateurs avec accès à tous les points de vente
    const stockInventaireItem = document.getElementById('stock-inventaire-item');
    const copierStockItem = document.getElementById('copier-stock-item');
    
    if (userData.pointVente === 'tous') {
        stockInventaireItem.style.display = 'block';
    } else {
        stockInventaireItem.style.display = 'none';
    }
    
    // Afficher l'onglet Copier Stock uniquement pour les utilisateurs autorisés
    const usersAutorisesCopiage = ['SALIOU', 'PAPI', 'NADOU', 'OUSMANE'];
    if (usersAutorisesCopiage.includes(userData.username.toUpperCase())) {
        copierStockItem.style.display = 'block';
    } else {
        copierStockItem.style.display = 'none';
    }
}

// Fonction pour initialiser la page d'inventaire
async function initInventaire() {
    console.log('%c=== Initialisation de la page inventaire ===', 'background: #222; color: #bada55; font-size: 16px; padding: 5px;');
    
    // Initialiser le datepicker
    const dateInput = document.getElementById('date-inventaire');
    flatpickr(dateInput, {
        dateFormat: "d/m/Y",
        defaultDate: "today",
        onChange: function(selectedDates, dateStr) {
            // Recharger les transferts quand la date change
            chargerTransferts();
            // Recharger les données de stock quand la date change
            chargerStock(dateStr);
        }
    });
    
    // Initialiser le type de stock
    const typeStockSelect = document.getElementById('type-stock');
    if (typeStockSelect) {
        typeStockSelect.addEventListener('change', onTypeStockChange);
    }
    
    // Initialiser les boutons
    const btnAjouterLigneStock = document.getElementById('add-stock-row');
    if (btnAjouterLigneStock) {
        btnAjouterLigneStock.addEventListener('click', ajouterLigneStock);
    }
    
    const btnSaveStock = document.getElementById('save-stock');
    if (btnSaveStock) {
        btnSaveStock.addEventListener('click', sauvegarderDonneesStock);
    }
    
    // Charger les données initiales
    try {
        const dateInitiale = dateInput.value;
        console.log('%cChargement initial des données pour la date:', 'color: #00aaff;', dateInitiale);
        
        await chargerStock(dateInitiale);
        await chargerTransferts();
        
    } catch (error) {
        console.error('%cErreur lors du chargement initial des données:', 'color: #ff0000;', error);
        // En cas d'erreur, initialiser quand même le tableau
        ajouterLigneStock();
    }
    
    console.log('%c=== Initialisation terminée ===', 'background: #222; color: #bada55; font-size: 16px; padding: 5px;');
}

// Fonction pour ajouter une ligne au tableau de stock
function ajouterLigneStock() {
    console.log('Ajout d\'une nouvelle ligne de stock');
    const tbody = document.querySelector('#stock-table tbody');
    if (!tbody) {
        console.error('Table de stock non trouvée');
        return;
    }

    const row = document.createElement('tr');
    const typeStock = document.getElementById('type-stock').value;
    row.dataset.typeStock = typeStock;
    
    // Point de vente
    const tdPointVente = document.createElement('td');
    const selectPointVente = document.createElement('select');
    selectPointVente.className = 'form-select form-select-sm point-vente-select';
    POINTS_VENTE_PHYSIQUES.forEach(pv => {
        const option = document.createElement('option');
        option.value = pv;
        option.textContent = pv;
        selectPointVente.appendChild(option);
    });
    tdPointVente.appendChild(selectPointVente);
    
    // Produit
    const tdProduit = document.createElement('td');
    const selectProduit = document.createElement('select');
    selectProduit.className = 'form-select form-select-sm produit-select';
    PRODUITS.forEach(prod => {
        const option = document.createElement('option');
        option.value = prod;
        option.textContent = prod;
        selectProduit.appendChild(option);
    });
    tdProduit.appendChild(selectProduit);
    
    // Quantité
    const tdQuantite = document.createElement('td');
    const inputQuantite = document.createElement('input');
    inputQuantite.type = 'number';
    inputQuantite.className = 'form-control form-control-sm quantite-input';
    inputQuantite.step = '0.1';
    inputQuantite.value = '0';
    tdQuantite.appendChild(inputQuantite);
    
    // Prix unitaire
    const tdPrixUnitaire = document.createElement('td');
    const inputPrixUnitaire = document.createElement('input');
    inputPrixUnitaire.type = 'number';
    inputPrixUnitaire.className = 'form-control form-control-sm prix-unitaire-input';
    inputPrixUnitaire.value = PRIX_DEFAUT[selectProduit.value] || '0';
    tdPrixUnitaire.appendChild(inputPrixUnitaire);
    
    // Total
    const tdTotal = document.createElement('td');
    tdTotal.className = 'total-cell';
    tdTotal.textContent = '0';
    
    // Commentaire
    const tdCommentaire = document.createElement('td');
    const inputCommentaire = document.createElement('input');
    inputCommentaire.type = 'text';
    inputCommentaire.className = 'form-control form-control-sm commentaire-input';
    tdCommentaire.appendChild(inputCommentaire);
    
    // Actions
    const tdActions = document.createElement('td');
    const btnSupprimer = document.createElement('button');
    btnSupprimer.className = 'btn btn-danger btn-sm';
    btnSupprimer.innerHTML = '<i class="fas fa-trash"></i>';
    btnSupprimer.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Êtes-vous sûr de vouloir supprimer cette ligne ?')) {
            row.remove();
        }
    });
    tdActions.appendChild(btnSupprimer);
    
    // Ajouter les cellules à la ligne
    row.append(tdPointVente, tdProduit, tdQuantite, tdPrixUnitaire, tdTotal, tdCommentaire, tdActions);
    
    // Gestionnaire pour le calcul automatique du total
    const calculateTotal = () => {
        const quantite = parseFloat(inputQuantite.value) || 0;
        const prixUnitaire = parseFloat(inputPrixUnitaire.value) || 0;
        tdTotal.textContent = (quantite * prixUnitaire).toLocaleString('fr-FR');
    };
    
    // Gestionnaire pour la mise à jour du prix unitaire par défaut
    selectProduit.addEventListener('change', function() {
        const nouveauProduit = this.value;
        inputPrixUnitaire.value = PRIX_DEFAUT[nouveauProduit] || '0';
        calculateTotal();
    });
    
    // Ajouter les écouteurs d'événements
    inputQuantite.addEventListener('input', calculateTotal);
    inputPrixUnitaire.addEventListener('input', calculateTotal);
    
    tbody.appendChild(row);
    console.log('Nouvelle ligne de stock ajoutée');
}

// Fonction pour sauvegarder les données de stock
async function sauvegarderDonneesStock() {
    console.log('%c=== Sauvegarde des données de stock ===', 'background: #222; color: #bada55; font-size: 16px; padding: 5px;');
    const typeStock = document.getElementById('type-stock').value;
    const date = document.getElementById('date-inventaire').value;
    console.log('%cType de stock:', 'color: #ff9900; font-weight: bold;', typeStock);
    console.log('%cDate:', 'color: #ff9900;', date);

    // Collecter les données du tableau
    const donnees = {};
    const resume = [];
    let totalGeneral = 0;

    document.querySelectorAll('#stock-table tbody tr').forEach(row => {
        const pointVente = row.querySelector('.point-vente-select').value;
        const produit = row.querySelector('.produit-select').value;
        const quantite = parseFloat(row.querySelector('.quantite-input').value) || 0;
        const prixUnitaire = parseFloat(row.querySelector('.prix-unitaire-input').value) || PRIX_DEFAUT[produit] || 0;
        const commentaire = row.querySelector('.commentaire-input').value || '';
        const total = quantite * prixUnitaire;

        if (quantite > 0) {  // Ne sauvegarder que les lignes avec une quantité > 0
            const key = `${pointVente}-${produit}`;
            donnees[key] = {
                date: date,
                typeStock: typeStock,
                "Point de Vente": pointVente,
                Produit: produit,
                Nombre: quantite.toString(),
                PU: prixUnitaire.toString(),
                Montant: total.toString(),
                Commentaire: commentaire
            };
            
            resume.push(`${pointVente} - ${produit}: ${quantite} unités à ${prixUnitaire.toLocaleString('fr-FR')} FCFA = ${total.toLocaleString('fr-FR')} FCFA`);
            totalGeneral += total;
        }
    });

    if (Object.keys(donnees).length === 0) {
        alert('Aucune donnée à sauvegarder. Veuillez saisir au moins une quantité.');
        return;
    }

    // Demander confirmation avec résumé
    const message = `Voulez-vous sauvegarder les données suivantes pour le stock ${typeStock} du ${date} ?\n\n` +
                   `${resume.join('\n')}\n\n` +
                   `Total général: ${totalGeneral.toLocaleString('fr-FR')} FCFA\n\n` +
                   `Cette action écrasera les données existantes pour ce type de stock.`;

    if (!confirm(message)) {
        return;
    }

    try {
        console.log('%cEnvoi des données au serveur...', 'color: #ff9900;');
        const response = await fetch(`http://localhost:3000/api/stock/${typeStock}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(donnees)
        });

        const result = await response.json();
        if (result.success) {
            console.log('%cDonnées sauvegardées avec succès', 'color: #00ff00; font-weight: bold;');
            alert('Données sauvegardées avec succès');
            
            // Mettre à jour stockData après la sauvegarde
            if (typeStock === 'matin') {
                stockData.matin = new Map(Object.entries(donnees));
            } else {
                stockData.soir = new Map(Object.entries(donnees));
            }
        } else {
            throw new Error(result.error || 'Erreur lors de la sauvegarde');
        }
    } catch (error) {
        console.error('%cErreur lors de la sauvegarde:', 'color: #ff0000; font-weight: bold;', error);
        alert('Erreur lors de la sauvegarde des données: ' + error.message);
    }
}

// Fonction pour initialiser le tableau de stock
function initTableauStock() {
    console.log('%c=== Début initTableauStock ===', 'background: #222; color: #bada55; font-size: 16px; padding: 5px;');
    
    const tbody = document.querySelector('#stock-table tbody');
    const typeStock = document.getElementById('type-stock').value;
    console.log('%cType de stock actuel:', 'color: #ff9900; font-weight: bold;', typeStock);
    console.log('%cÉtat des données stockData:', 'color: #00ff00; font-weight: bold;', {
        matin: stockData.matin ? stockData.matin.size + ' entrées' : '0 entrées',
        soir: stockData.soir ? stockData.soir.size + ' entrées' : '0 entrées'
    });

    tbody.innerHTML = '';
    console.log('%cTableau vidé', 'color: #ff0000;');

    // Récupérer les données sauvegardées pour le type de stock actuel
    const donneesSauvegardees = stockData[typeStock];
    console.log('%cDonnées récupérées pour', 'color: #00ff00;', typeStock, ':', {
        nombreEntrees: donneesSauvegardees ? donneesSauvegardees.size : 0
    });

    // Pour chaque point de vente physique
    POINTS_VENTE_PHYSIQUES.forEach(pointVente => {
        console.log('%c=== Traitement du point de vente: ' + pointVente + ' ===', 'background: #4a4a4a; color: #fff; padding: 3px;');
        
        // Pour chaque produit
        PRODUITS.forEach(produit => {
            const key = `${pointVente}-${produit}`;
            console.log('%cCréation de la ligne pour:', 'color: #00aaff;', key);
            
            const row = document.createElement('tr');
            row.dataset.typeStock = typeStock;
            
            // Point de vente (éditable)
            const tdPointVente = document.createElement('td');
            const selectPointVente = document.createElement('select');
            selectPointVente.className = 'form-select form-select-sm point-vente-select';
            POINTS_VENTE_PHYSIQUES.forEach(pv => {
                const option = document.createElement('option');
                option.value = pv;
                option.textContent = pv;
                if (pv === pointVente) {
                    option.selected = true;
                }
                selectPointVente.appendChild(option);
            });
            tdPointVente.appendChild(selectPointVente);
            row.appendChild(tdPointVente);

            // Produit (éditable)
            const tdProduit = document.createElement('td');
            const selectProduit = document.createElement('select');
            selectProduit.className = 'form-select form-select-sm produit-select';
            PRODUITS.forEach(prod => {
                const option = document.createElement('option');
                option.value = prod;
                option.textContent = prod;
                if (prod === produit) {
                    option.selected = true;
                }
                selectProduit.appendChild(option);
            });
            tdProduit.appendChild(selectProduit);
            row.appendChild(tdProduit);

            // Quantité (éditable)
            const tdQuantite = document.createElement('td');
            const inputQuantite = document.createElement('input');
            inputQuantite.type = 'number';
            inputQuantite.className = 'form-control form-control-sm quantite-input';
            inputQuantite.step = '0.1';
            
            // Prix unitaire (éditable)
            const tdPrixUnitaire = document.createElement('td');
            const inputPrixUnitaire = document.createElement('input');
            inputPrixUnitaire.type = 'number';
            inputPrixUnitaire.className = 'form-control form-control-sm prix-unitaire-input';
            inputPrixUnitaire.step = '100';
            tdPrixUnitaire.appendChild(inputPrixUnitaire);
            
            // Total (calculé automatiquement)
            const tdTotal = document.createElement('td');
            tdTotal.className = 'total-cell';
            
            // Commentaire (éditable)
            const tdCommentaire = document.createElement('td');
            const inputCommentaire = document.createElement('input');
            inputCommentaire.type = 'text';
            inputCommentaire.className = 'form-control form-control-sm commentaire-input';
            tdCommentaire.appendChild(inputCommentaire);
            
            // Restaurer les valeurs sauvegardées si elles existent
            if (donneesSauvegardees && donneesSauvegardees.has(key)) {
                const donnees = donneesSauvegardees.get(key);
                console.log('%cRestauration des données pour ' + key + ':', 'color: #00ff00;', {
                    quantite: donnees.Nombre || donnees.quantite,
                    prixUnitaire: donnees.PU || donnees.prixUnitaire,
                    commentaire: donnees.Commentaire || donnees.commentaire,
                    total: (parseFloat(donnees.Nombre || donnees.quantite) * parseFloat(donnees.PU || donnees.prixUnitaire)).toString()
                });
                inputQuantite.value = donnees.Nombre || donnees.quantite || '0';
                inputPrixUnitaire.value = donnees.PU || donnees.prixUnitaire || PRIX_DEFAUT[produit] || '0';
                inputCommentaire.value = donnees.Commentaire || donnees.commentaire || '';
                tdTotal.textContent = (parseFloat(inputQuantite.value) * parseFloat(inputPrixUnitaire.value)).toLocaleString('fr-FR');
            } else {
                console.log('%cPas de données sauvegardées pour ' + key + ', utilisation des valeurs par défaut:', 'color: #ff9900;', {
                    quantite: '0',
                    prixUnitaire: PRIX_DEFAUT[produit],
                    commentaire: '',
                    total: '0'
                });
                inputQuantite.value = '0';
                inputPrixUnitaire.value = PRIX_DEFAUT[produit] || '0';
                inputCommentaire.value = '';
                tdTotal.textContent = '0';
            }
            
            tdQuantite.appendChild(inputQuantite);
            
            // Actions
            const tdActions = document.createElement('td');
            const btnSupprimer = document.createElement('button');
            btnSupprimer.className = 'btn btn-danger btn-sm';
            btnSupprimer.innerHTML = '<i class="fas fa-trash"></i>';
            btnSupprimer.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('Êtes-vous sûr de vouloir supprimer cette ligne ?')) {
                    row.remove();
                }
            });
            tdActions.appendChild(btnSupprimer);
            
            // Ajouter les cellules à la ligne
            row.append(tdPointVente, tdProduit, tdQuantite, tdPrixUnitaire, tdTotal, tdCommentaire, tdActions);
            
            // Gestionnaire pour le calcul automatique du total
            const calculateTotal = () => {
                const quantite = parseFloat(inputQuantite.value) || 0;
                const prixUnitaire = parseFloat(inputPrixUnitaire.value) || 0;
                tdTotal.textContent = (quantite * prixUnitaire).toLocaleString('fr-FR');
            };
            
            // Gestionnaire pour la mise à jour du prix unitaire par défaut
            selectProduit.addEventListener('change', function() {
                const nouveauProduit = this.value;
                inputPrixUnitaire.value = PRIX_DEFAUT[nouveauProduit] || '0';
                calculateTotal();
            });
            
            inputQuantite.addEventListener('input', calculateTotal);
            inputPrixUnitaire.addEventListener('input', calculateTotal);
            
            tbody.appendChild(row);
        });
    });
    
    console.log('%c=== Fin initTableauStock ===', 'background: #222; color: #bada55; font-size: 16px; padding: 5px;');
}

// Configuration pour l'inventaire
const POINTS_VENTE_PHYSIQUES = [
    'Mbao', 'O.Foire', 'Linguere', 'Dahra', 'Touba', 'Keur Massar'
];

const PRODUITS = [
    'Boeuf', 'Veau', 'Poulet', 'Tete De Mouton', 'Tablette',
    'Foie', 'Yell', 'Agneau', 'Déchet 400', 'Autres', 'Mergez', 'Déchet 2000'
];

// Configuration des prix par défaut
const PRIX_DEFAUT = {
    'Boeuf': 3600,
    'Veau': 3800,
    'Poulet': 3500,
    'Tete De Mouton': 1000,
    'Tablette': 2800,
    'Foie': 4000,
    'Yell': 2500,
    'Agneau': 4500,
    'Déchet 400': 400,
    'Autres': 1,
    'Mergez': 5000,
    'Déchet 2000': 2000
};

// Tous les points de vente (physiques et virtuels)
const TOUS_POINTS_VENTE = [
    ...POINTS_VENTE_PHYSIQUES,
    'Abattage', 'Depot', 'Gros Client'
];

// Variables globales pour stocker les données de stock
let stockData = {
    matin: new Map(),
    soir: new Map()
};

// Fonction séparée pour gérer le changement de type de stock
async function onTypeStockChange() {
    console.log('%c=== Changement de type de stock ===', 'background: #222; color: #bada55; font-size: 16px; padding: 5px;');
    const typeStock = document.getElementById('type-stock').value;
    const dateSelectionnee = document.getElementById('date-inventaire').value;
    console.log('%cNouveau type de stock:', 'color: #ff9900; font-weight: bold;', typeStock);
    console.log('%cDate sélectionnée:', 'color: #ff9900; font-weight: bold;', dateSelectionnee);

    try {
        console.log('%cRécupération des données depuis le serveur pour le type:', 'color: #00aaff;', typeStock);
        const response = await fetch(`http://localhost:3000/api/stock/${typeStock}?date=${dateSelectionnee}`, {
            method: 'GET',
            credentials: 'include'
        });
        let donneesRecues = await response.json();
        console.log('%cDonnées brutes reçues du serveur:', 'color: #00ff00;', donneesRecues);

        // Transformer le tableau en objet avec les clés au format "pointVente-produit"
        const donnees = {};
        if (Array.isArray(donneesRecues)) {
            donneesRecues.forEach(item => {
                const pointVente = item["Point de Vente"] || item.pointVente;
                const produit = item.Produit || item.produit;
                const key = `${pointVente}-${produit}`;
                donnees[key] = item;
            });
        } else {
            donneesRecues = donneesRecues || {};
            Object.entries(donneesRecues).forEach(([key, value]) => {
                donnees[key] = value;
            });
        }

        console.log('%cDonnées transformées:', 'color: #00ff00;', donnees);

        // Vider le tableau
        const tbody = document.querySelector('#stock-table tbody');
        tbody.innerHTML = '';

        // Recréer les lignes pour chaque point de vente et produit
        POINTS_VENTE_PHYSIQUES.forEach(pointVente => {
            PRODUITS.forEach(produit => {
                const tr = document.createElement('tr');
                
                // Point de vente (modifiable)
                const tdPointVente = document.createElement('td');
                const selectPointVente = document.createElement('select');
                selectPointVente.className = 'form-select form-select-sm point-vente-select';
                POINTS_VENTE_PHYSIQUES.forEach(pv => {
                    const option = document.createElement('option');
                    option.value = pv;
                    option.textContent = pv;
                    if (pv === pointVente) {
                        option.selected = true;
                    }
                    selectPointVente.appendChild(option);
                });
                tdPointVente.appendChild(selectPointVente);
                tr.appendChild(tdPointVente);

                // Produit (modifiable)
                const tdProduit = document.createElement('td');
                const selectProduit = document.createElement('select');
                selectProduit.className = 'form-select form-select-sm produit-select';
                PRODUITS.forEach(prod => {
                    const option = document.createElement('option');
                    option.value = prod;
                    option.textContent = prod;
                    if (prod === produit) {
                        option.selected = true;
                    }
                    selectProduit.appendChild(option);
                });
                tdProduit.appendChild(selectProduit);
                tr.appendChild(tdProduit);

                // Quantité
                const tdQuantite = document.createElement('td');
                const inputQuantite = document.createElement('input');
                inputQuantite.type = 'number';
                inputQuantite.className = 'form-control form-control-sm quantite-input';
                inputQuantite.min = '0';
                inputQuantite.step = '0.1';
                tdQuantite.appendChild(inputQuantite);
                tr.appendChild(tdQuantite);

                // Prix unitaire
                const tdPrixUnitaire = document.createElement('td');
                const inputPrixUnitaire = document.createElement('input');
                inputPrixUnitaire.type = 'number';
                inputPrixUnitaire.className = 'form-control form-control-sm prix-unitaire-input';
                inputPrixUnitaire.min = '0';
                inputPrixUnitaire.step = '100';
                tdPrixUnitaire.appendChild(inputPrixUnitaire);
                tr.appendChild(tdPrixUnitaire);

                // Total
                const tdTotal = document.createElement('td');
                tdTotal.className = 'total-cell';
                tdTotal.textContent = '0';
                tr.appendChild(tdTotal);

                // Commentaire
                const tdCommentaire = document.createElement('td');
                const inputCommentaire = document.createElement('input');
                inputCommentaire.type = 'text';
                inputCommentaire.className = 'form-control form-control-sm commentaire-input';
                tdCommentaire.appendChild(inputCommentaire);
                tr.appendChild(tdCommentaire);

                // Actions
                const tdActions = document.createElement('td');
                tdActions.className = 'text-center';
                const btnSupprimer = document.createElement('button');
                btnSupprimer.className = 'btn btn-danger btn-sm';
                btnSupprimer.innerHTML = '<i class="fas fa-trash"></i>';
                btnSupprimer.onclick = () => {
                    if (confirm('Êtes-vous sûr de vouloir supprimer cette ligne ?')) {
                        tr.remove();
                    }
                };
                tdActions.appendChild(btnSupprimer);
                tr.appendChild(tdActions);

                // Restaurer les données sauvegardées si elles existent
                const key = `${pointVente}-${produit}`;
                if (donnees[key]) {
                    console.log(`%cRestauration des données pour ${key}:`, 'color: #00ff00;', donnees[key]);
                    inputQuantite.value = donnees[key].Nombre || donnees[key].quantite || '0';
                    inputPrixUnitaire.value = donnees[key].PU || donnees[key].prixUnitaire || PRIX_DEFAUT[produit] || '0';
                    inputCommentaire.value = donnees[key].Commentaire || donnees[key].commentaire || '';
                    // Recalculer le total
                    const total = (parseFloat(inputQuantite.value) * parseFloat(inputPrixUnitaire.value));
                    tdTotal.textContent = total.toLocaleString('fr-FR');
                } else {
                    console.log(`%cPas de données pour ${key}, utilisation des valeurs par défaut`, 'color: #ff9900;');
                    inputQuantite.value = '0';
                    inputPrixUnitaire.value = PRIX_DEFAUT[produit] || '0';
                    inputCommentaire.value = '';
                    tdTotal.textContent = '0';
                }

                // Ajouter les écouteurs d'événements pour le calcul automatique du total
                const calculateTotal = () => {
                    const quantite = parseFloat(inputQuantite.value) || 0;
                    const prixUnitaire = parseFloat(inputPrixUnitaire.value) || 0;
                    const total = quantite * prixUnitaire;
                    tdTotal.textContent = total.toLocaleString('fr-FR');
                };

                inputQuantite.addEventListener('input', calculateTotal);
                inputPrixUnitaire.addEventListener('input', calculateTotal);

                // Gestionnaire pour la mise à jour du prix unitaire par défaut
                selectProduit.addEventListener('change', function() {
                    const nouveauProduit = this.value;
                    inputPrixUnitaire.value = PRIX_DEFAUT[nouveauProduit] || '0';
                    calculateTotal();
                });

                tbody.appendChild(tr);
            });
        });

        console.log('%cTableau mis à jour avec succès', 'color: #00ff00; font-weight: bold;');
    } catch (error) {
        console.error('%cErreur lors du chargement des données:', 'color: #ff0000; font-weight: bold;', error);
        alert('Erreur lors du chargement des données du stock');
    }
}

// Fonction pour supprimer une vente
async function supprimerVente(venteId) {
    try {
        const response = await fetch(`http://localhost:3000/api/ventes/${venteId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Recharger les ventes après la suppression
            alert('Vente supprimée avec succès');
            chargerDernieresVentes();
        } else {
            alert(data.message || 'Erreur lors de la suppression de la vente');
        }
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression de la vente');
    }
}

// Gestionnaire d'événements pour l'onglet Réconciliation
document.getElementById('reconciliation-tab').addEventListener('click', function() {
    hideAllSections();
    document.getElementById('reconciliation-section').style.display = 'block';
    
    // Initialiser le sélecteur de date avec flatpickr s'il ne l'est pas déjà
    if (!document.getElementById('date-reconciliation')._flatpickr) {
        flatpickr('#date-reconciliation', {
            dateFormat: 'd/m/Y',
            locale: 'fr',
            defaultDate: new Date(),
            disableMobile: "true",
            onChange: function(selectedDates, dateStr) {
                console.log('Date sélectionnée pour la réconciliation:', dateStr);
                // Rendre le bouton de calcul plus visible après changement de date
                const btnCalculer = document.getElementById('calculer-reconciliation');
                btnCalculer.classList.add('btn-pulse');
                setTimeout(() => {
                    btnCalculer.classList.remove('btn-pulse');
                }, 1500);
            }
        });
    }
    
    // Ajouter l'effet CSS pour l'animation du bouton si le style n'existe pas déjà
    if (!document.getElementById('btn-pulse-style')) {
        const style = document.createElement('style');
        style.id = 'btn-pulse-style';
        style.textContent = `
            @keyframes btnPulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
            .btn-pulse {
                animation: btnPulse 0.5s ease-in-out 3;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Ajouter un écouteur d'événement direct sur le changement de date
    // Ceci est nécessaire car le onChange de flatpickr ne déclenche pas toujours le chargement
    const dateReconciliation = document.getElementById('date-reconciliation');
    if (dateReconciliation) {
        // S'assurer que nous n'ajoutons pas l'écouteur multiple fois
        if (!dateReconciliation._hasChangeListener) {
            dateReconciliation.addEventListener('change', function(e) {
                console.log('Changement de date détecté via event listener direct:', this.value);
                if (this.value) {
                    if (typeof ReconciliationManager !== 'undefined' && 
                        typeof ReconciliationManager.chargerReconciliation === 'function') {
                        ReconciliationManager.chargerReconciliation(this.value);
                    } else {
                        calculerReconciliation(this.value);
                    }
                }
            });
            dateReconciliation._hasChangeListener = true;
            console.log('Écouteur d\'événement direct ajouté au champ de date');
        }
    }
    
    // Charger les données initiales si une date est déjà sélectionnée
    const date = document.getElementById('date-reconciliation').value;
    if (date) {
        calculerReconciliation(date);
    }
});

// Gestionnaire pour le bouton de calcul de réconciliation
document.getElementById('calculer-reconciliation').addEventListener('click', function() {
    const date = document.getElementById('date-reconciliation').value;
    if (!date) {
        alert('Veuillez sélectionner une date');
        return;
    }
    
    calculerReconciliation(date);
});

// Fonction principale pour calculer la réconciliation
async function calculerReconciliation(date) {
    try {
        console.log('Calcul de réconciliation pour la date:', date);
        
        // Effacer le tableau des résultats précédents
        const tbody = document.querySelector('#reconciliation-table tbody');
        tbody.innerHTML = '';
                
        // Effacer aussi les détails de débogage
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
                
        // Afficher un indicateur de chargement
        const loadingRow = document.createElement('tr');
        const loadingCell = document.createElement('td');
        loadingCell.colSpan = 7; // Mettre à jour pour 7 colonnes au lieu de 6
        loadingCell.textContent = 'Chargement des données...';
        loadingCell.className = 'text-center';
        loadingRow.appendChild(loadingCell);
        tbody.appendChild(loadingRow);
        
        // Charger les données de stock matin
        const stockMatin = await chargerDonneesStock('matin', date);
        console.log('Stock matin:', stockMatin);
        
        // Charger les données de stock soir
        const stockSoir = await chargerDonneesStock('soir', date);
        console.log('Stock soir:', stockSoir);
        
        // Charger les transferts
        const transferts = await chargerDonneesTransferts(date);
        console.log('Transferts:', transferts);
        
        // Charger les ventes saisies
        const response = await fetch(`http://localhost:3000/api/ventes-date?date=${date}`, {
            method: 'GET',
            credentials: 'include'
        });
        const ventesSaisiesData = await response.json();
        console.log('Ventes saisies récupérées:', ventesSaisiesData);
        
        // Créer un objet pour collecter les détails de débogage
        let debugInfo = {
            date: date,
            stockMatin: stockMatin,
            stockSoir: stockSoir,
            transferts: transferts,
            ventesSaisies: ventesSaisiesData.success ? ventesSaisiesData.ventes : [],
            detailsParPointVente: {}
        };
        
        // Calcul de la réconciliation par point de vente
        const reconciliation = await calculerReconciliationParPointVente(stockMatin, stockSoir, transferts, debugInfo);
        console.log('Réconciliation calculée:', reconciliation);

        // NOUVEAU: Fusionner les commentaires chargés (si existants et pour la même date)
        if (window.currentReconciliation && window.currentReconciliation.date === date && window.currentReconciliation.data) {
            console.log('Fusion des commentaires chargés dans les données calculées...');
            Object.keys(reconciliation).forEach(pointVente => {
                // Vérifier si le point de vente existe dans les données chargées et a un commentaire
                if (window.currentReconciliation.data[pointVente] && window.currentReconciliation.data[pointVente].commentaire) {
                    // Copier le commentaire chargé dans l'objet calculé
                    reconciliation[pointVente].commentaire = window.currentReconciliation.data[pointVente].commentaire;
                    console.log(`Commentaire pour ${pointVente} fusionné:`, reconciliation[pointVente].commentaire);
                } else if (reconciliation[pointVente] && reconciliation[pointVente].commentaire === undefined) {
                    // Si le calcul frais n'a pas initialisé de commentaire
                    reconciliation[pointVente].commentaire = '';
                }
            });
        } else {
            // Si pas de données chargées ou date différente, s'assurer que commentaire est initialisé
            Object.keys(reconciliation).forEach(pointVente => {
                if (reconciliation[pointVente] && reconciliation[pointVente].commentaire === undefined) {
                    reconciliation[pointVente].commentaire = '';
                }
            });
        }
        
        // Mettre à jour l'affichage
        console.log('Mise à jour de l\'affichage...');
        afficherReconciliation(reconciliation, debugInfo);
        
        // Définir la réconciliation actuelle pour la sauvegarde
        window.currentReconciliation = {
            date: date,
            data: reconciliation
        };
        
        // Intégrer les données de paiement en espèces
        if (typeof addCashPaymentToReconciliation === 'function') {
            try {
                console.log('Début de l\'appel à addCashPaymentToReconciliation...');
                await addCashPaymentToReconciliation();
                console.log('Données de paiement en espèces intégrées avec succès');
            } catch (error) {
                console.error('Erreur lors de l\'intégration des paiements en espèces:', error);
            }
        } else {
            console.warn('La fonction addCashPaymentToReconciliation n\'est pas disponible, assurez-vous que cash-payment-function.js est correctement chargé');
        }
        
        // Activer le bouton de sauvegarde
        const btnSauvegarder = document.getElementById('sauvegarder-reconciliation');
        if (btnSauvegarder) {
            btnSauvegarder.disabled = false;
        }
        
        // Masquer l'indicateur de chargement
        document.getElementById('loading-indicator-reconciliation').style.display = 'none';
        
        // Activer le mode débogage si nécessaire
        if (isDebugMode) {
            document.getElementById('debug-container').style.display = 'block';
        }
        
    } catch (error) {
        console.error('Erreur lors du calcul de réconciliation:', error);
        
        // Effacer l'indicateur de chargement
        const tbody = document.querySelector('#reconciliation-table tbody');
        tbody.innerHTML = '';
        
        // Afficher un message d'erreur dans le tableau
        const errorRow = document.createElement('tr');
        const errorCell = document.createElement('td');
        errorCell.colSpan = 7; // Mettre à jour pour 7 colonnes au lieu de 6
        errorCell.textContent = 'Erreur lors du calcul: ' + error.message;
        errorCell.className = 'text-center text-danger';
        errorRow.appendChild(errorCell);
        tbody.appendChild(errorRow);
        
        // Masquer l'indicateur de chargement
        document.getElementById('loading-indicator-reconciliation').style.display = 'none';
        
        alert('Erreur lors du calcul de réconciliation: ' + error.message);
    }
}

// Fonction pour charger les données de stock
async function chargerDonneesStock(type, date) {
    try {
        const response = await fetch(`http://localhost:3000/api/stock/${type}?date=${date}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        // Si la réponse n'est pas OK, on retourne simplement un objet vide
        // au lieu de lancer une exception
        if (!response.ok) {
            console.log(`Aucune donnée de stock ${type} disponible pour ${date}, utilisation d'un objet vide`);
            return {};
        }
        
        return await response.json();
    } catch (error) {
        console.error(`Erreur lors du chargement du stock ${type}:`, error);
        // Retourner un objet vide en cas d'erreur
        return {};
    }
}

// Fonction pour charger les données de transferts
async function chargerDonneesTransferts(date) {
    try {
        const response = await fetch(`http://localhost:3000/api/transferts?date=${date}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        // Si la réponse n'est pas OK, on retourne simplement un tableau vide
        // au lieu de lancer une exception
        if (!response.ok) {
            console.log(`Aucun transfert disponible pour ${date}, utilisation d'un tableau vide`);
            return [];
        }
        
        const result = await response.json();
        // L'API renvoie { success: true, transferts: [] }
        return result.success && result.transferts ? result.transferts : [];
    } catch (error) {
        console.error('Erreur lors du chargement des transferts:', error);
        // Retourner un tableau vide en cas d'erreur
        return [];
    }
}

// Fonction pour calculer la réconciliation par point de vente
async function calculerReconciliationParPointVente(stockMatin, stockSoir, transferts, debugInfo) {
    const reconciliation = {};
    
    // Récupérer la date sélectionnée pour charger les ventes saisies
    const dateSelectionnee = document.getElementById('date-reconciliation').value;
    
    // Vérifier si les données de stock sont vides pour cette date
    console.log("Données de stock pour la date", dateSelectionnee, ":");
    console.log("Stock matin:", Object.keys(stockMatin).length, "entrées");
    console.log("Stock soir:", Object.keys(stockSoir).length, "entrées");
    console.log("Transferts:", transferts.length, "entrées");
    
    const dateEstVide = Object.keys(stockMatin).length === 0 && 
                        Object.keys(stockSoir).length === 0 && 
                        transferts.length === 0;
    
    if (dateEstVide) {
        console.log(`Aucune donnée trouvée pour la date ${dateSelectionnee}, initialisation avec des valeurs à zéro`);
    }
    
    // Récupérer les ventes saisies pour la date sélectionnée
    let ventesSaisies = {};
    try {
        const response = await fetch(`http://localhost:3000/api/ventes-date?date=${dateSelectionnee}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        const data = await response.json();
        console.log('Ventes saisies récupérées:', data);
        
        if (data.success && data.totaux) {
            ventesSaisies = data.totaux;
            
            // Organiser les ventes par point de vente pour les détails de débogage
            if (data.ventes && Array.isArray(data.ventes)) {
                // Grouper les ventes par point de vente
                const ventesParPointVente = {};
                data.ventes.forEach(vente => {
                    const pointVente = vente['Point de Vente'];
                    if (!ventesParPointVente[pointVente]) {
                        ventesParPointVente[pointVente] = [];
                    }
                    ventesParPointVente[pointVente].push({
                        produit: vente.Produit,
                        pu: vente.PU,
                        nombre: vente.Nombre,
                        montant: vente.Montant
                    });
                });
                
                // Stocker les ventes regroupées dans debugInfo
                debugInfo.ventesParPointVente = ventesParPointVente;
            }
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des ventes saisies:', error);
    }
    
    // Initialiser les totaux pour chaque point de vente
    POINTS_VENTE_PHYSIQUES.forEach(pointVente => {
        reconciliation[pointVente] = {
            stockMatin: 0,
            stockSoir: 0,
            transferts: 0,
            ventes: 0,
            ventesSaisies: ventesSaisies[pointVente] || 0,
            difference: 0,
            pourcentageEcart: 0,
            cashPayment: 0,
            ecartCash: 0,
            commentaire: ''
        };
        
        // Initialiser les détails de débogage pour ce point de vente
        debugInfo.detailsParPointVente[pointVente] = {
            stockMatin: [],
            stockSoir: [],
            transferts: [],
            ventes: [],
            ventesSaisies: debugInfo.ventesParPointVente ? debugInfo.ventesParPointVente[pointVente] || [] : [],
            totalStockMatin: 0,
            totalStockSoir: 0,
            totalTransferts: 0,
            totalVentesSaisies: ventesSaisies[pointVente] || 0,
            venteTheoriques: 0,
            difference: 0,
            pourcentageEcart: 0
        };
    });
    
    // Si la date est vide, retourner directement les données initialisées à zéro
    if (dateEstVide) {
        console.log("Retour des données initialisées à zéro pour tous les points de vente");
        return reconciliation;
    }
    
    // Calculer les totaux du stock matin
    Object.entries(stockMatin).forEach(([key, item]) => {
        const [pointVente, produit] = key.split('-');
        if (POINTS_VENTE_PHYSIQUES.includes(pointVente)) {
            const montant = parseFloat(item.Montant || item.total || 0);
            reconciliation[pointVente].stockMatin += montant;
            
            // Extraire les valeurs de quantité et prix unitaire
            const quantite = parseFloat(item.Quantite || item.Nombre || item.quantite || 0);
            const prixUnitaire = parseFloat(item.PU || item.prixUnitaire || 0);
            
            // Vérifier les données extraites
            console.log(`Stock Matin - ${pointVente} - ${produit}:`, { 
                montant, 
                quantite, 
                prixUnitaire, 
                rawData: item 
            });
            
            // Ajouter aux détails de débogage
            if (debugInfo.detailsParPointVente[pointVente]) {
                debugInfo.detailsParPointVente[pointVente].stockMatin.push({
                    produit: produit,
                    montant: montant,
                    quantite: quantite,
                    prixUnitaire: prixUnitaire
                });
                debugInfo.detailsParPointVente[pointVente].totalStockMatin += montant;
            }
        }
    });
    
    // Calculer les totaux du stock soir
    Object.entries(stockSoir).forEach(([key, item]) => {
        const [pointVente, produit] = key.split('-');
        if (POINTS_VENTE_PHYSIQUES.includes(pointVente)) {
            const montant = parseFloat(item.Montant || item.total || 0);
            reconciliation[pointVente].stockSoir += montant;
            
            // Extraire les valeurs de quantité et prix unitaire
            const quantite = parseFloat(item.Quantite || item.Nombre || item.quantite || 0);
            const prixUnitaire = parseFloat(item.PU || item.prixUnitaire || 0);
            
            // Vérifier les données extraites
            console.log(`Stock Soir - ${pointVente} - ${produit}:`, { 
                montant, 
                quantite, 
                prixUnitaire, 
                rawData: item 
            });
            
            // Ajouter aux détails de débogage
            if (debugInfo.detailsParPointVente[pointVente]) {
                debugInfo.detailsParPointVente[pointVente].stockSoir.push({
                    produit: produit,
                    montant: montant,
                    quantite: quantite,
                    prixUnitaire: prixUnitaire
                });
                debugInfo.detailsParPointVente[pointVente].totalStockSoir += montant;
            }
        }
    });
    
    // Calculer les totaux des transferts avec plus de détails pour le debugging
    console.log('Détail du calcul des transferts par point de vente:');
    POINTS_VENTE_PHYSIQUES.forEach(pointVente => {
        console.log(`Calcul pour ${pointVente}:`);
        let totalTransfert = 0;
        
        // Filtrer les transferts pour ce point de vente
        const transfertsDuPoint = transferts.filter(t => 
            (t.pointVente || t["Point de Vente"]) === pointVente
        );
        
        // Calculer le total des transferts pour ce point de vente
        transfertsDuPoint.forEach(transfert => {
            const impact = parseInt(transfert.impact) || 1;
            const montant = parseFloat(transfert.total || 0);
            
            // Appliquer systématiquement la formule montant pour tous les transferts. Ne pas modifier*
            const valeurTransfert = montant;
            //console.log(`  - ${transfert.produit || ''}: ${montant} * ${impact} = ${valeurTransfert}`);
            
            totalTransfert += valeurTransfert;
            
            // Ajouter aux détails de débogage
            if (debugInfo.detailsParPointVente[pointVente]) {
                debugInfo.detailsParPointVente[pointVente].transferts.push({
                    produit: transfert.produit || '',
                    impact: impact,
                    montant: montant,
                    valeur: valeurTransfert,
                    quantite: parseFloat(transfert.quantite || 0),
                    prixUnitaire: parseFloat(transfert.prixUnitaire || 0)
                });
            }
        });
        
        reconciliation[pointVente].transferts = totalTransfert;
        console.log(`  Total transferts pour ${pointVente}: ${totalTransfert}`);
        
        // Ajouter le total aux détails de débogage
        if (debugInfo.detailsParPointVente[pointVente]) {
            debugInfo.detailsParPointVente[pointVente].totalTransferts = totalTransfert;
        }
    });
    
  
    // Calculer les ventes théoriques et différences
    POINTS_VENTE_PHYSIQUES.forEach(pointVente => {
        // Formule mise à jour: Ventes théoriques = Stock Matin - Stock Soir + Transferts
        reconciliation[pointVente].ventes = 
            reconciliation[pointVente].stockMatin - 
            reconciliation[pointVente].stockSoir + 
            reconciliation[pointVente].transferts;
        
        // Calculer la différence entre les ventes théoriques et saisies
        reconciliation[pointVente].difference = 
            reconciliation[pointVente].ventes - 
            reconciliation[pointVente].ventesSaisies;
            
        // Calculer le pourcentage d'écart par rapport aux ventes théoriques
        if (reconciliation[pointVente].ventes !== 0) {
            reconciliation[pointVente].pourcentageEcart = 
                (reconciliation[pointVente].difference / reconciliation[pointVente].ventes) * 100;
        } else {
            reconciliation[pointVente].pourcentageEcart = 0;
        }
        
        // Vérifier si l'écart absolu est significatif (éviter les divisions par des petits nombres)
        if (Math.abs(reconciliation[pointVente].ventes) < 1000) {
            reconciliation[pointVente].pourcentageEcart = 0;
        }
            
        // Stocker les valeurs dans les détails de débogage
        if (debugInfo.detailsParPointVente[pointVente]) {
            debugInfo.detailsParPointVente[pointVente].venteTheoriques = reconciliation[pointVente].ventes;
            debugInfo.detailsParPointVente[pointVente].difference = reconciliation[pointVente].difference;
            debugInfo.detailsParPointVente[pointVente].pourcentageEcart = reconciliation[pointVente].pourcentageEcart;
        }
    });
    
    return reconciliation;
}

// Fonction pour afficher la réconciliation dans le tableau
function afficherReconciliation(reconciliation, debugInfo) {
    console.log('Affichage des données de réconciliation:', reconciliation);
    
    const table = document.getElementById('reconciliation-table');
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';

    let totalStockMatin = 0;
    let totalStockSoir = 0;
    let totalTransferts = 0;
    let totalVentesTheoriques = 0;
    let totalVentesSaisies = 0;
    let totalDifference = 0;
    
    POINTS_VENTE_PHYSIQUES.forEach((pointVente, index) => {
        const data = reconciliation[pointVente];
        if (data) {
            // Assurer que la propriété commentaire existe
            if (data.commentaire === undefined) {
                data.commentaire = '';
            }

            // Créer une ligne pour chaque point de vente
            const row = document.createElement('tr');
            row.setAttribute('data-point-vente', pointVente);
            
            // Appliquer une couleur de fond basée sur le pourcentage d'écart
            if (Math.abs(data.pourcentageEcart) > 10.5) {
                row.classList.add('table-danger'); // Rouge pour > 10.5%
            } else if (Math.abs(data.pourcentageEcart) > 8) {
                row.classList.add('table-warning'); // Jaune pour 8% à 10.5%
            } else if (Math.abs(data.pourcentageEcart) > 0) {
                row.classList.add('table-success'); // Vert pour <= 8%
            }
            
            // Point de vente
            const tdPointVente = document.createElement('td');
            tdPointVente.textContent = pointVente;
            tdPointVente.setAttribute('data-point-vente', pointVente);
            tdPointVente.classList.add('debug-toggle');
            row.appendChild(tdPointVente);
            
            // Ajouter un écouteur d'événement pour afficher les détails de débogage
            tdPointVente.addEventListener('click', () => {
                afficherDetailsDebugging(pointVente, debugInfo);
            });
            
            // Stock matin
            const tdStockMatin = document.createElement('td');
            tdStockMatin.textContent = formatMonetaire(data.stockMatin);
            tdStockMatin.classList.add('currency');
            row.appendChild(tdStockMatin);
            totalStockMatin += data.stockMatin;
            
            // Stock soir
            const tdStockSoir = document.createElement('td');
            tdStockSoir.textContent = formatMonetaire(data.stockSoir);
            tdStockSoir.classList.add('currency');
            row.appendChild(tdStockSoir);
            totalStockSoir += data.stockSoir;
            
            // Transferts
            const tdTransferts = document.createElement('td');
            tdTransferts.textContent = formatMonetaire(data.transferts);
            tdTransferts.classList.add('currency');
            row.appendChild(tdTransferts);
            totalTransferts += data.transferts;
            
            // Ventes théoriques
            const tdVentes = document.createElement('td');
            tdVentes.textContent = formatMonetaire(data.ventes);
            tdVentes.classList.add('currency');
            row.appendChild(tdVentes);
            totalVentesTheoriques += data.ventes;
            
            // Ventes saisies
            const tdVentesSaisies = document.createElement('td');
            tdVentesSaisies.textContent = formatMonetaire(data.ventesSaisies);
            tdVentesSaisies.classList.add('currency');
            row.appendChild(tdVentesSaisies);
            totalVentesSaisies += data.ventesSaisies;
            
            // Différence (écart)
            const tdDifference = document.createElement('td');
            tdDifference.textContent = formatMonetaire(data.difference);
            tdDifference.classList.add('currency');
            // Ajouter une classe basée sur la différence (positive ou négative)
            if (data.difference < 0) {
                tdDifference.classList.add('negative');
            } else if (data.difference > 0) {
                tdDifference.classList.add('positive');
            }
            row.appendChild(tdDifference);
            totalDifference += data.difference;
            
            // Pourcentage d'écart
            const tdPourcentage = document.createElement('td');
            // Formater le pourcentage avec 2 décimales
            tdPourcentage.textContent = data.pourcentageEcart ? `${data.pourcentageEcart.toFixed(2)}%` : "0.00%";
            tdPourcentage.classList.add('currency');
            // Ajouter une classe basée sur la valeur du pourcentage
            if (Math.abs(data.pourcentageEcart) > 10.5) {
                tdPourcentage.classList.add('text-danger', 'fw-bold');
            } else if (Math.abs(data.pourcentageEcart) > 8) {
                tdPourcentage.classList.add('text-warning', 'fw-bold');
            } else if (Math.abs(data.pourcentageEcart) > 0) {
                tdPourcentage.classList.add('text-success', 'fw-bold');
            }
            row.appendChild(tdPourcentage);
            
            // Commentaire - Nouveau
            const tdCommentaire = document.createElement('td');
            const inputCommentaire = document.createElement('input');
            inputCommentaire.type = 'text';
            inputCommentaire.className = 'form-control commentaire-input';
            inputCommentaire.placeholder = 'Ajouter un commentaire...';
            inputCommentaire.setAttribute('data-point-vente', pointVente);
            
            // Utiliser data.commentaire ou une chaîne vide
            inputCommentaire.value = data.commentaire || ''; 
            console.log(`Définition du commentaire pour ${pointVente}:`, inputCommentaire.value); // Log pour vérifier
            
            tdCommentaire.appendChild(inputCommentaire);
            row.appendChild(tdCommentaire);
            
            tbody.appendChild(row);
        }
    });
}

// Fonction pour sauvegarder les données de réconciliation
async function sauvegarderReconciliation() {
    try {
        // Définir un flag global pour éviter les sauvegardes en double
        if (window.reconciliationBeingSaved) {
            console.log('Sauvegarde déjà en cours, abandon de cette requête');
            return;
        }
        
        window.reconciliationBeingSaved = true;
        
        // Vérifier si les données de réconciliation existent
        if (!window.currentReconciliation) {
            alert('Aucune réconciliation à sauvegarder');
            window.reconciliationBeingSaved = false;
            return;
        }
        
        // Récupérer la date
        const date = window.currentReconciliation.date;
        if (!date) {
            alert('Date de réconciliation non définie');
            window.reconciliationBeingSaved = false;
            return;
        }
        
        // Récupérer les données de réconciliation
        const reconciliationData = window.currentReconciliation.data;
        
        // Récupérer les commentaires saisis par l'utilisateur
        const commentaires = {};
        document.querySelectorAll('.commentaire-input').forEach(input => {
            const pointVente = input.getAttribute('data-point-vente');
            const commentaire = input.value.trim();
            if (commentaire) {
                commentaires[pointVente] = commentaire;
            }
        });
        
        // Récupérer les données des paiements en espèces (depuis le tableau)
        const cashPaymentData = {};
        const table = document.getElementById('reconciliation-table');
        if (table) {
            // Trouver l'index de la colonne "Montant Total Cash"
            const headerRow = table.querySelector('thead tr');
            if (headerRow) {
                const headerCells = Array.from(headerRow.cells).map(cell => cell.textContent.trim());
                const cashColumnIndex = headerCells.indexOf("Montant Total Cash");
                
                if (cashColumnIndex !== -1) {
                    // Parcourir chaque ligne du tableau pour extraire les valeurs de cash
                    table.querySelectorAll('tbody tr').forEach(row => {
                        const pointVente = row.getAttribute('data-point-vente');
                        if (pointVente && row.cells.length > cashColumnIndex) {
                            const cashCellText = row.cells[cashColumnIndex].textContent.trim();
                            const cashValue = extractNumericValue(cashCellText);
                            if (cashValue) {
                                cashPaymentData[pointVente] = cashValue;
                            }
                        }
                    });
                }
            }
        }
        
        // Ajouter les commentaires aux données de réconciliation
        Object.keys(reconciliationData).forEach(pointVente => {
            if (commentaires[pointVente]) {
                reconciliationData[pointVente].commentaire = commentaires[pointVente];
            }
        });
        
        // Préparer les données à envoyer
        const dataToSave = {
            date: date,
            reconciliation: reconciliationData,
            cashPaymentData: cashPaymentData
        };
        
        console.log('Données de réconciliation à sauvegarder:', dataToSave);
        
        // Envoyer les données au serveur
        const response = await fetch('http://localhost:3000/api/reconciliation/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(dataToSave)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Réconciliation sauvegardée avec succès');
            
            // Sauvegarder également via ReconciliationManager pour assurer la compatibilité
            if (typeof ReconciliationManager !== 'undefined' && 
                typeof ReconciliationManager.sauvegarderReconciliation === 'function') {
                try {
                    // Passer les données cashPayment au ReconciliationManager
                    if (ReconciliationManager.currentReconciliation && cashPaymentData) {
                        ReconciliationManager.currentReconciliation.cashPaymentData = cashPaymentData;
                    }
                } catch (error) {
                    console.error('Erreur lors de la mise à jour des données dans ReconciliationManager:', error);
                }
            }
            
            // Réinitialiser le flag
            window.reconciliationBeingSaved = false;
        } else {
            window.reconciliationBeingSaved = false;
            throw new Error(result.message || 'Erreur lors de la sauvegarde');
        }
    } catch (error) {
        window.reconciliationBeingSaved = false;
        console.error('Erreur lors de la sauvegarde de la réconciliation:', error);
        alert('Erreur lors de la sauvegarde: ' + error.message);
    }
}

// Ajouter un gestionnaire d'événements pour le bouton de sauvegarde
document.addEventListener('DOMContentLoaded', function() {
    const btnSauvegarder = document.getElementById('sauvegarder-reconciliation');
    if (btnSauvegarder) {
        btnSauvegarder.addEventListener('click', sauvegarderReconciliation);
        
        // Désactiver le bouton par défaut
        btnSauvegarder.disabled = true;
    }
});

// Fonction pour charger une réconciliation sauvegardée
async function chargerReconciliation(date) {
    try {
        // Afficher l'indicateur de chargement
        document.getElementById('loading-indicator-reconciliation').style.display = 'block';
        
        // Tenter de récupérer une réconciliation sauvegardée
        const response = await fetch(`http://localhost:3000/api/reconciliation/load?date=${date}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success && result.data) {
            console.log('Données de réconciliation récupérées:', result);
            
            // Extraire les données de réconciliation
            let reconciliationData = null;
            if (result.data.reconciliation) {
                reconciliationData = result.data.reconciliation;
            } else if (result.data.data) {
                // Compatibilité avec l'ancien format
                try {
                    reconciliationData = JSON.parse(result.data.data);
                } catch (e) {
                    console.error('Erreur lors du parsing des données:', e);
                    reconciliationData = result.data.data;
                }
            }
            
            // Si nous avons des données valides
            if (reconciliationData && typeof reconciliationData === 'object') {
                // Afficher les données
                ReconciliationManager.afficherReconciliation(reconciliationData);
                
                // Stocker les données dans la variable globale pour la sauvegarde
                window.currentReconciliation = {
                    date: date,
                    data: reconciliationData
                };
                
                // Activer le bouton de sauvegarde
                document.getElementById('sauvegarder-reconciliation').disabled = false;
            }
            
            // Masquer l'indicateur de chargement
            document.getElementById('loading-indicator-reconciliation').style.display = 'none';
            return;
        }
        
        // Si nous n'avons pas pu charger de données sauvegardées, calculer
        calculerReconciliation(date);
        
    } catch (error) {
        console.error('Erreur lors du chargement de la réconciliation:', error);
        
        // En cas d'erreur, essayer de calculer
        calculerReconciliation(date);
    }
}

// Fonction pour calculer les données de réconciliation
async function calculerReconciliation(date = null) {
    try {
        // Afficher l'indicateur de chargement
        document.getElementById('loading-indicator-reconciliation').style.display = 'block';
        
        console.log('Calcul de la réconciliation pour la date:', date);
        
        // Récupérer les données de stock pour la date sélectionnée
        const [stockMatin, stockSoir, transferts] = await Promise.all([
            chargerStock(date, 'matin'),
            chargerStock(date, 'soir'),
            chargerTransferts(date)
        ]);
        
        // Préparer les informations de débogage
        const debugInfo = {
            detailsParPointVente: {}
        };
        
        // Calculer la réconciliation
        const reconciliation = await calculerReconciliationParPointVente(stockMatin, stockSoir, transferts, debugInfo);
        
        // Afficher les résultats
        ReconciliationManager.afficherReconciliation(reconciliation, debugInfo);
        
        // Stocker les données dans la variable globale pour la sauvegarde
        window.currentReconciliation = {
            date: date,
            data: reconciliation
        };
        window.currentDebugInfo = debugInfo;
        
        // Activer le bouton de sauvegarde
        document.getElementById('sauvegarder-reconciliation').disabled = false;
        
        // Masquer l'indicateur de chargement
        document.getElementById('loading-indicator-reconciliation').style.display = 'none';
    } catch (error) {
        console.error('Erreur lors du calcul de la réconciliation:', error);
        document.getElementById('loading-indicator-reconciliation').style.display = 'none';
        alert('Erreur lors du calcul: ' + error.message);
    }
}

// Bouton pour calculer la réconciliation
document.addEventListener('DOMContentLoaded', function() {
    // Gestionnaire pour le bouton de réconciliation
    const btnCalculer = document.getElementById('calculer-reconciliation');
    if (btnCalculer) {
        btnCalculer.addEventListener('click', function() {
            const date = document.getElementById('date-reconciliation').value;
            if (!date) {
                alert('Veuillez sélectionner une date');
                return;
            }
            
            // Désactiver le bouton pendant le calcul
            btnCalculer.disabled = true;
            
            // Charger la réconciliation (d'abord essayer de charger une existante)
            ReconciliationManager.chargerReconciliation(date).finally(() => {
                btnCalculer.disabled = false;
            });
        });
    }
    
    // Gestionnaire pour le bouton de sauvegarde
    const btnSauvegarder = document.getElementById('sauvegarder-reconciliation');
    if (btnSauvegarder) {
        // Remplacer tous les écouteurs d'événements
        const newBtn = btnSauvegarder.cloneNode(true);
        btnSauvegarder.parentNode.replaceChild(newBtn, btnSauvegarder);
        
        // Ajouter notre nouvel écouteur qui appelle les deux implémentations
        newBtn.addEventListener('click', async function() {
            try {
                // Utiliser d'abord notre implémentation personnalisée
                await sauvegarderReconciliation();
            } catch (error) {
                console.error('Erreur lors de la sauvegarde:', error);
                
                // En cas d'échec de notre méthode, tenter d'utiliser ReconciliationManager comme fallback
                try {
                    await ReconciliationManager.sauvegarderReconciliation();
                } catch (fallbackError) {
                    console.error('Erreur avec ReconciliationManager:', fallbackError);
                    alert('Erreur lors de la sauvegarde. Vérifiez la console pour plus de détails.');
                }
            }
        });
    }
    
    // Initialisation du datepicker pour la date de réconciliation
    const dateReconciliation = document.getElementById('date-reconciliation');
    if (dateReconciliation) {
        flatpickr(dateReconciliation, {
            dateFormat: "d/m/Y",
            locale: "fr",
            defaultDate: new Date()
        });
    }
});

// Si une réconciliation est active, l'afficher
if (window.currentReconciliation && window.currentReconciliation.data) {
    // Utiliser le gestionnaire centralisé pour afficher les données
    ReconciliationManager.afficherReconciliation(window.currentReconciliation.data, window.currentDebugInfo || {});
}

// Fonction pour formatter les valeurs monétaires
function formatMonetaire(valeur) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XOF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(valeur);
}

// Fonction pour extraire une valeur numérique d'un texte formaté
function extractNumericValue(formattedText) {
    if (!formattedText) return 0;
    
    // Supprimer tous les caractères non numériques sauf le point et la virgule
    const numericString = formattedText.replace(/[^\d.,]/g, '')
        // Remplacer la virgule par un point pour la conversion
        .replace(',', '.');
    
    return parseFloat(numericString) || 0;
}

// Vérifier que la fonction d'intégration des paiements en espèces est disponible
console.log('Vérification de la disponibilité de addCashPaymentToReconciliation:', 
    typeof addCashPaymentToReconciliation === 'function' ? 'Disponible' : 'Non disponible');

// Exposer la fonction calculerReconciliation au niveau global pour permettre
// à reconciliationManager.js de l'utiliser comme méthode de fallback
window.calculerReconciliation = calculerReconciliation;

// ... existing code ...

// Fonction pour initialiser la page des alertes d'accumulation de stock
function initStockAlerte() {
    console.log('%c=== Initialisation de la page des alertes d\'accumulation de stock ===', 'background: #222; color: #bada55; font-size: 16px; padding: 5px;');
    
    // Initialiser les datepickers
    flatpickr('#date-debut-alerte', {
        dateFormat: "d/m/Y",
        defaultDate: new Date(new Date().setDate(new Date().getDate() - 7)), // 7 jours avant aujourd'hui
        locale: 'fr'
    });
    
    flatpickr('#date-fin-alerte', {
        dateFormat: "d/m/Y",
        defaultDate: "today",
        locale: 'fr'
    });
    
    // Initialiser le pourcentage par défaut
    document.getElementById('pourcentage-alerte').value = 10;
    
    // Ajouter l'écouteur d'événement pour le bouton de recherche
    const btnRechercherAlertes = document.getElementById('btn-rechercher-alertes');
    
    if (btnRechercherAlertes) {
        console.log('Bouton de recherche d\'alertes trouvé, ajout de l\'écouteur d\'événement');
        btnRechercherAlertes.addEventListener('click', function() {
            console.log('Clic sur le bouton de recherche d\'alertes');
            rechercherAlertesAccumulation();
        });
    } else {
        console.error('Erreur : le bouton de recherche d\'alertes (ID: btn-rechercher-alertes) n\'a pas été trouvé!');
    }
    
    // Nettoyer le tableau des alertes précédentes
    const tableBody = document.querySelector('#alertes-table tbody');
    if (tableBody) {
        tableBody.innerHTML = '';
    } else {
        console.error('Erreur : le tableau des alertes (ID: alertes-table) n\'a pas été trouvé!');
    }
    
    const noAlertesMessage = document.getElementById('no-alertes-message');
    if (noAlertesMessage) {
        noAlertesMessage.style.display = 'none';
    } else {
        console.error('Erreur : le message "aucune alerte" (ID: no-alertes-message) n\'a pas été trouvé!');
    }
}

// ... existing code ...

// Fonction pour rechercher les alertes d'accumulation de stock
async function rechercherAlertesAccumulation() {
    console.log('%c=== Recherche des alertes d\'accumulation de stock ===', 'background: #222; color: #bada55; font-size: 16px; padding: 5px;');
    
    // Récupérer les paramètres
    const dateDebut = document.getElementById('date-debut-alerte').value;
    const dateFin = document.getElementById('date-fin-alerte').value;
    const pourcentageSeuil = parseFloat(document.getElementById('pourcentage-alerte').value) || 10;
    
    console.log(`Paramètres de recherche - Début: ${dateDebut}, Fin: ${dateFin}, Seuil: ${pourcentageSeuil}%`);
    
    if (!dateDebut || !dateFin) {
        alert('Veuillez sélectionner une période valide');
        return;
    }
    
    // Afficher l'indicateur de chargement
    document.getElementById('loading-indicator-alertes').style.display = 'block';
    document.getElementById('no-alertes-message').style.display = 'none';
    
    try {
        // Générer la liste des dates à traiter
        const datesRange = generateDateRange(dateDebut, dateFin);
        console.log('Dates à traiter:', datesRange);
        
        // Tableau pour stocker toutes les alertes
        const alertes = [];
        
        // Fonction pour normaliser le nom du produit (enlever espaces/minuscules)
        const normaliserProduit = (produit) => {
            if (!produit) return '';
            return produit.toLowerCase().trim();
        };
        
        // Traiter chaque date
        for (const date of datesRange) {
            console.log(`Traitement de la date: ${date}`);
            
            // Récupérer les données de stock matin, stock soir et transferts pour cette date
            const stockMatin = await getStockForDate(date, 'matin');
            const stockSoir = await getStockForDate(date, 'soir');
            const transferts = await getTransfersForDate(date);
            
            console.log(`[DEBUG] Données pour ${date}:`);
            console.log(`[DEBUG] - Stock Matin: ${Object.keys(stockMatin).length} entrées`);
            console.log(`[DEBUG] - Stock Soir: ${Object.keys(stockSoir).length} entrées`);
            console.log(`[DEBUG] - Transferts: ${transferts.length} entrées`);
            
            // Vérifier si nous avons des données pour cette date
            if (Object.keys(stockMatin).length === 0 && Object.keys(stockSoir).length === 0) {
                console.log(`Aucune donnée de stock pour ${date}, ignorer cette date`);
                continue;
            }
            
            // Organiser les transferts par point de vente et produit normalisé
            const transfertsMap = new Map();
            transferts.forEach(transfert => {
                // Extraire le point de vente et le produit avec plus de robustesse
                const pointVente = transfert.pointVente || transfert["Point de Vente"];
                const produitBrut = transfert.produit || transfert.Produit;
                
                // Vérifier que les valeurs sont bien extraites
                if (!pointVente || !produitBrut) {
                    console.warn('Transfert ignoré car point de vente ou produit manquant:', transfert);
                    return; // Passer au transfert suivant
                }
                
                // Normaliser le nom du produit et créer la clé
                const produit = produitBrut.trim();
                const key = `${pointVente}-${produit}`;
                console.log(`Traitement du transfert: ${key} (produit brut: ${produitBrut})`, transfert);
                
                if (!transfertsMap.has(key)) {
                    transfertsMap.set(key, 0);
                }
                
                // Récupérer la valeur de transfert
                const impact = parseInt(transfert.impact) || 1;
                
                // Essayer de récupérer le montant à partir de plusieurs propriétés possibles
                let montant = 0;
                if (transfert.total !== undefined && transfert.total !== null) {
                    montant = parseFloat(transfert.total);
                } else if (transfert.montant !== undefined && transfert.montant !== null) {
                    montant = parseFloat(transfert.montant);
                } else if (transfert.Montant !== undefined && transfert.Montant !== null) {
                    montant = parseFloat(transfert.Montant);
                } else {
                    // Essayer de calculer à partir de la quantité et du prix unitaire
                    const quantite = parseFloat(transfert.quantite || transfert.Quantite || transfert.Nombre || transfert.nombre || 0);
                    const pu = parseFloat(transfert.prixUnitaire || transfert.PU || transfert.pu || 0);
                    if (quantite > 0 && pu > 0) {
                        montant = quantite * pu;
                    }
                }
                
                // Vérifier que le montant est valide
                if (isNaN(montant) || montant === 0) {
                    console.warn(`Montant invalide pour le transfert ${key}:`, transfert);
                }
                
                const valeurTransfert = montant;
                console.log(`Valeur calculée pour le transfert ${key}: ${valeurTransfert}`);
                
                // Ajouter à la somme des transferts pour ce produit
                transfertsMap.set(key, transfertsMap.get(key) + valeurTransfert);
                console.log(`Valeur totale des transferts pour ${key}: ${transfertsMap.get(key)}`);
            });
            
            // Déboguer toutes les clés stockées dans transfertsMap
            console.log("Clés de transferts après traitement:");
            for (const [key, value] of transfertsMap.entries()) {
                console.log(`  ${key}: ${value}`);
            }
            
            // Parcourir tous les produits dans le stock matin
            const keysTraitees = new Set(); // Pour éviter les doublons
            let candidatsExamines = 0;
            let candidatsIgnores = 0;
            
            console.log(`[DEBUG] ===== Analyse du stock matin pour ${date} =====`);
            for (const key in stockMatin) {
                candidatsExamines++;
                const [pointVente, produitBrut] = key.split('-');
                
                // Vérifier si c'est un point de vente physique
                if (!POINTS_VENTE_PHYSIQUES.includes(pointVente)) {
                    console.log(`[DEBUG] Point de vente "${pointVente}" non physique pour ${produitBrut}, ignoré`);
                    candidatsIgnores++;
                    continue;
                }
                
                // Normaliser le nom du produit et recréer la clé
                const produit = produitBrut.trim();
                const keyNorm = `${pointVente}-${produit}`;
                
                keysTraitees.add(keyNorm);
                
                const stockMatinItem = stockMatin[key];
                const stockMatinMontant = parseFloat(stockMatinItem.Montant || stockMatinItem.total || 0);
                
                // Récupérer la valeur des transferts pour ce produit
                const transfertMontant = transfertsMap.has(keyNorm) ? transfertsMap.get(keyNorm) : 0;
                console.log(`[DEBUG] Produit: ${produit} à ${pointVente} - Stock Matin: ${stockMatinMontant}, Transfert: ${transfertMontant}`);
                
                // Calculer le stock attendu (stock matin + transferts)
                const stockAttendu = stockMatinMontant + transfertMontant;
                
                // Ignorer les stocks nuls ou négatifs
                if (stockAttendu <= 0) {
                    console.log(`[DEBUG] Stock attendu <= 0 (${stockAttendu}) pour ${keyNorm}, ignoré`);
                    candidatsIgnores++;
                    continue;
                }
                
                // Vérifier s'il y a un stock soir correspondant
                if (stockSoir[key]) {
                    const stockSoirItem = stockSoir[key];
                    const stockSoirMontant = parseFloat(stockSoirItem.Montant || stockSoirItem.total || 0);
                    
                    // Calculer l'écart entre le stock soir et le stock attendu
                    const difference = stockSoirMontant - stockAttendu;
                    
                    // Calculer le pourcentage d'accumulation par rapport au stock attendu
                    // Si seuil = 10%, on cherche si stockSoir > 90% * stockAttendu (ce qui indique une accumulation)
                    const pourcentageAccumulation = (difference / stockAttendu) * 100;
                    
                    console.log(`[DEBUG] Produit ${produit} à ${pointVente} - Stock Soir: ${stockSoirMontant}, Différence: ${difference}, % Accumulation: ${pourcentageAccumulation.toFixed(2)}%, Seuil: -${pourcentageSeuil}%`);
                    
                    // Si le stock soir dépasse le stock attendu moins le seuil, c'est une accumulation
                    // NOUVEAU: On ajoute la condition difference > 0 pour ne montrer que les accumulations positives
                    const conditionSeuil = pourcentageAccumulation > -pourcentageSeuil;
                    const conditionDifference = difference > 0;
                    
                    console.log(`[DEBUG] Conditions: % > -seuil: ${conditionSeuil}, différence > 0: ${conditionDifference}`);
                    
                    if (conditionSeuil && conditionDifference) {
                        console.log(`[DEBUG] *** ALERTE DÉTECTÉE: Accumulation pour ${produit} à ${pointVente} (${pourcentageAccumulation.toFixed(2)}%) ***`);
                        // Extraire les détails du stock matin
                        const stockMatinQuantite = parseFloat(stockMatinItem.Quantite || stockMatinItem.Nombre || 0);
                        const stockMatinPU = parseFloat(stockSoirItem.PU || stockSoirItem.prixUnitaire || 0);
                        
                        // Extraire les détails du stock soir
                        const stockSoirQuantite = parseFloat(stockSoirItem.Quantite || stockSoirItem.Nombre || 0);
                        const stockSoirPU = parseFloat(stockSoirItem.PU || stockSoirItem.prixUnitaire || 0);
                        
                        // Rechercher les transferts pour ce produit
                        const transfertDetails = {
                            quantite: 0,
                            prixUnitaire: 0
                        };
                        
                        // Chercher dans les transferts pour trouver les détails
                        transferts.forEach(transfert => {
                            const transfertPV = transfert.pointVente || transfert["Point de Vente"];
                            const transfertProduit = transfert.produit || transfert.Produit;
                            
                            if (transfertPV === pointVente && transfertProduit === produit) {
                                transfertDetails.quantite += parseFloat(transfert.quantite || transfert.Quantite || transfert.Nombre || transfert.nombre || 0);
                                if (transfertDetails.prixUnitaire === 0) {
                                    transfertDetails.prixUnitaire = parseFloat(transfert.prixUnitaire || transfert.PU || transfert.pu || 0);
                                }
                            }
                        });
                        
                        alertes.push({
                            pointVente,
                            produit,
                            date,
                            stockMatin: stockMatinMontant,
                            stockSoir: stockSoirMontant,
                            transfert: transfertMontant,
                            difference,
                            pourcentage: pourcentageAccumulation,
                            type: 'accumulation',
                            // Ajouter les détails pour les tooltips
                            stockMatinDetails: {
                                quantite: stockMatinQuantite,
                                prixUnitaire: stockMatinPU
                            },
                            stockSoirDetails: {
                                quantite: stockSoirQuantite,
                                prixUnitaire: stockSoirPU
                            },
                            transfertDetails: transfertDetails
                        });
                    } else {
                        console.log(`[DEBUG] Aucune alerte pour ${produit} à ${pointVente} - conditions non satisfaites`);
                        candidatsIgnores++;
                    }
                } else {
                    console.log(`[DEBUG] Pas de stock soir correspondant pour ${produit} à ${pointVente}`);
                    candidatsIgnores++;
                }
            }
            
            console.log(`[DEBUG] Candidats examinés: ${candidatsExamines}, ignorés: ${candidatsIgnores}`);
            
            // Parcourir tous les produits du stock soir pour détecter les apparitions
            console.log(`[DEBUG] ===== Analyse du stock soir (apparitions) pour ${date} =====`);
            let apparitionsExaminees = 0;
            let apparitionsDetectees = 0;
            
            for (const key in stockSoir) {
                apparitionsExaminees++;
                const [pointVente, produitBrut] = key.split('-');
                
                // Vérifier si c'est un point de vente physique
                if (!POINTS_VENTE_PHYSIQUES.includes(pointVente)) {
                    console.log(`[DEBUG] Point de vente "${pointVente}" non physique pour ${produitBrut}, ignoré`);
                    continue;
                }
                
                // Normaliser le nom du produit et recréer la clé
                const produit = produitBrut.trim();
                const keyNorm = `${pointVente}-${produit}`;
                
                // Vérifier si ce produit a déjà été traité
                if (keysTraitees.has(keyNorm)) {
                    console.log(`[DEBUG] Produit ${produit} à ${pointVente} déjà traité, ignoré`);
                    continue;
                }
                
                // Récupérer les montants
                const stockSoirItem = stockSoir[key];
                const stockSoirMontant = parseFloat(stockSoirItem.Montant || stockSoirItem.total || 0);
                
                console.log(`[DEBUG] Apparition potentielle: ${produit} à ${pointVente}, Stock Soir: ${stockSoirMontant}`);
                
                // Si stock attendu est 0, mais stock soir > 0, c'est une apparition
                if (stockSoirMontant > 0) {
                    console.log(`[DEBUG] *** ALERTE DÉTECTÉE: Apparition pour ${produit} à ${pointVente} ***`);
                    apparitionsDetectees++;
                    
                    // Extraire les détails du stock soir
                    const stockSoirQuantite = parseFloat(stockSoirItem.Quantite || stockSoirItem.Nombre || 0);
                    const stockSoirPU = parseFloat(stockSoirItem.PU || stockSoirItem.prixUnitaire || 0);
                    
                    alertes.push({
                        pointVente,
                        produit,
                        date,
                        stockMatin: 0,
                        stockSoir: stockSoirMontant,
                        transfert: 0,
                        difference: stockSoirMontant,
                        pourcentage: 100, // 100% d'augmentation (par rapport à zéro)
                        type: 'apparition',
                        // Ajouter les détails pour les tooltips
                        stockMatinDetails: {
                            quantite: 0,
                            prixUnitaire: 0
                        },
                        stockSoirDetails: {
                            quantite: stockSoirQuantite,
                            prixUnitaire: stockSoirPU
                        },
                        transfertDetails: null
                    });
                }
            }
            
            console.log(`[DEBUG] Apparitions examinées: ${apparitionsExaminees}, détectées: ${apparitionsDetectees}`);
        }
        
        console.log(`[DEBUG] ===== Résumé final =====`);
        console.log(`[DEBUG] Nombre total d'alertes détectées: ${alertes.length}`);
        
        if (alertes.length > 0) {
            console.log(`[DEBUG] Premières alertes détectées:`, alertes.slice(0, 3));
        }
        
        // Trier les alertes
        alertes.sort((a, b) => {
            // Ordre prioritaire des points de vente
            const ordrePointsVente = ["O.Foire", "Mbao"];
            
            // D'abord, trier par point de vente selon la priorité
            const indexA = ordrePointsVente.indexOf(a.pointVente);
            const indexB = ordrePointsVente.indexOf(b.pointVente);
            
            // Si les deux points de vente sont dans la liste de priorité
            if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB; // Trier selon l'ordre dans le tableau
            }
            // Si seulement a est dans la liste de priorité
            else if (indexA !== -1) {
                return -1; // a vient avant b
            }
            // Si seulement b est dans la liste de priorité
            else if (indexB !== -1) {
                return 1; // b vient avant a
            }
            // Si aucun des deux n'est prioritaire, comparer alphabétiquement
            else if (a.pointVente !== b.pointVente) {
                return a.pointVente.localeCompare(b.pointVente);
            }
            
            // Ensuite, trier par pourcentage (décroissant)
            return b.pourcentage - a.pourcentage;
        });
        
        // Afficher les résultats
        console.log(`[DEBUG] Appel à afficherAlertesAccumulation avec ${alertes.length} alertes`);
        afficherAlertesAccumulation(alertes);
        
    } catch (error) {
        console.error('Erreur lors de la recherche des alertes:', error);
        alert('Une erreur est survenue lors de la recherche des alertes. Veuillez réessayer.');
    } finally {
        // Masquer l'indicateur de chargement
        document.getElementById('loading-indicator-alertes').style.display = 'none';
    }
}

// ... existing code ...

// Fonction pour générer une séquence de dates au format dd/mm/yyyy
function generateDateRange(startDate, endDate) {
    const dateRange = [];
    
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    
    let current = new Date(start);
    while (current <= end) {
        dateRange.push(formatDate(current));
        current.setDate(current.getDate() + 1);
    }
    
    return dateRange;
}

// Fonction pour parser une date au format dd/mm/yyyy
function parseDate(dateStr) {
    const parts = dateStr.split('/');
    // Format dd/mm/yyyy -> new Date(yyyy, mm-1, dd)
    return new Date(parts[2], parts[1] - 1, parts[0]);
}

// Fonction pour formater une date au format dd/mm/yyyy
function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
}

// Fonction pour récupérer les données de stock pour une date donnée
async function getStockForDate(date, type) {
    try {
        const response = await fetch(`http://localhost:3000/api/stock/${type}?date=${date}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.items) {
            // On reçoit un objet d'objets
            const normalizedData = {};
            
            for (const key in data.items) {
                const item = data.items[key];
                const pointVente = item["Point de Vente"] || "";
                const produit = item.Produit || "";
                
                if (pointVente && produit) {
                    const newKey = `${pointVente}-${produit}`;
                    normalizedData[newKey] = item;
                }
            }
            
            return normalizedData;
        }
        
        return {};
    } catch (error) {
        console.error(`Erreur lors de la récupération du stock ${type} pour ${date}:`, error);
        return {};
    }
}

// Fonction pour récupérer les transferts pour une date donnée
async function getTransfersForDate(date) {
    try {
        const response = await fetch(`http://localhost:3000/api/transferts?date=${date}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && Array.isArray(data.items)) {
            return data.items;
        }
        
        return [];
    } catch (error) {
        console.error(`Erreur lors de la récupération des transferts pour ${date}:`, error);
        return [];
    }
}

// Fonction pour afficher les alertes d'accumulation dans le tableau
function afficherAlertesAccumulation(alertes) {
    console.log('Alertes trouvées:', alertes);
    
    const tbody = document.querySelector('#alertes-table tbody');
    tbody.innerHTML = ''; // Vider le tableau
    
    if (alertes.length === 0) {
        // Aucune alerte trouvée
        document.getElementById('no-alertes-message').style.display = 'block';
        return;
    }
    
    // Remplir le tableau avec les alertes
    alertes.forEach(alerte => {
        const tr = document.createElement('tr');
        
        // Appliquer une classe en fonction du type d'alerte
        if (alerte.type === 'accumulation') {
            tr.classList.add('table-warning');
        } else if (alerte.type === 'apparition') {
            tr.classList.add('table-info');
        }
        
        // Point de vente
        const tdPointVente = document.createElement('td');
        tdPointVente.textContent = alerte.pointVente;
        tr.appendChild(tdPointVente);
        
        // Produit
        const tdProduit = document.createElement('td');
        tdProduit.textContent = alerte.produit;
        tr.appendChild(tdProduit);
        
        // Date
        const tdDate = document.createElement('td');
        tdDate.textContent = alerte.date;
        tr.appendChild(tdDate);
        
        // Stock Matin
        const tdStockMatin = document.createElement('td');
        tdStockMatin.textContent = formatMonetaire(alerte.stockMatin);
        tdStockMatin.classList.add('text-end');
        
        // Ajouter le détail du calcul en tooltip
        if (alerte.stockMatinDetails) {
            const quantite = alerte.stockMatinDetails.quantite || 0;
            const pu = alerte.stockMatinDetails.prixUnitaire || 0;
            tdStockMatin.title = `Quantité: ${quantite} × Prix unitaire: ${formatMonetaire(pu)} = ${formatMonetaire(alerte.stockMatin)}`;
            tdStockMatin.style.cursor = 'help';
        }
        
        tr.appendChild(tdStockMatin);
        
        // Stock Soir
        const tdStockSoir = document.createElement('td');
        tdStockSoir.textContent = formatMonetaire(alerte.stockSoir);
        tdStockSoir.classList.add('text-end');
        
        // Ajouter le détail du calcul en tooltip
        if (alerte.stockSoirDetails) {
            const quantite = alerte.stockSoirDetails.quantite || 0;
            const pu = alerte.stockSoirDetails.prixUnitaire || 0;
            tdStockSoir.title = `Quantité: ${quantite} × Prix unitaire: ${formatMonetaire(pu)} = ${formatMonetaire(alerte.stockSoir)}`;
            tdStockSoir.style.cursor = 'help';
        }
        
        tr.appendChild(tdStockSoir);
        
        // Transferts
        const tdTransfert = document.createElement('td');
        tdTransfert.textContent = formatMonetaire(alerte.transfert);
        tdTransfert.classList.add('text-end');
        
        // Ajouter le détail du calcul en tooltip
        if (alerte.transfertDetails) {
            const quantite = alerte.transfertDetails.quantite || 0;
            const pu = alerte.transfertDetails.prixUnitaire || 0;
            tdTransfert.title = `Quantité: ${quantite} × Prix unitaire: ${formatMonetaire(pu)} = ${formatMonetaire(alerte.transfert)}`;
            tdTransfert.style.cursor = 'help';
        }
        
        tr.appendChild(tdTransfert);
        
        // Différence
        const tdDifference = document.createElement('td');
        tdDifference.textContent = formatMonetaire(alerte.difference);
        tdDifference.classList.add('text-end');
        
        // Colorer selon la différence
        if (alerte.difference > 0) {
            tdDifference.classList.add('text-danger');
        } else if (alerte.difference < 0) {
            tdDifference.classList.add('text-success');
        }
        
        tr.appendChild(tdDifference);
        
        // Pourcentage
        const tdPourcentage = document.createElement('td');
        tdPourcentage.textContent = `${alerte.pourcentage.toFixed(2)}%`;
        tdPourcentage.classList.add('text-end');
        
        // Colorer selon le pourcentage
        if (alerte.pourcentage > 50) {
            tdPourcentage.classList.add('text-danger', 'fw-bold');
        } else if (alerte.pourcentage > 20) {
            tdPourcentage.classList.add('text-warning', 'fw-bold');
        } else {
            tdPourcentage.classList.add('text-primary');
        }
        
        tr.appendChild(tdPourcentage);
        
        tbody.appendChild(tr);
    });
}

// ... existing code ...
