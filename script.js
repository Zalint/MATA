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

    // Ensure proper initial state - hide all sections and show saisie section
    console.log('Initial page load - hiding all sections');
    hideAllSections();
    document.getElementById('saisie-section').style.display = 'block';
    console.log('Initial page load - showing saisie section');

    // Initialize all sections
    initTabListeners();
    initEstimation();
    initReconciliation();
    initStockAlerte();
    initReconciliationMensuelle();
    initCopierStock();
    initInventaire();
    initFilterStock();
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

// Fonction globale pour standardiser les dates
function standardiserDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') {
        // console.warn(`[standardiserDate] Invalid input: '${dateStr}'`);
        return null;
    }

    let jour, mois, annee;

    // Regex pour YYYY-MM-DD
    const ymdRegex = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
    const ymdMatch = dateStr.match(ymdRegex);

    if (ymdMatch) {
        annee = parseInt(ymdMatch[1], 10);
        mois = parseInt(ymdMatch[2], 10) - 1; // Mois est 0-indexé en JS
        jour = parseInt(ymdMatch[3], 10);
    } else if (dateStr.includes('/')) { // Format DD/MM/YYYY ou DD/MM/YY
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            jour = parseInt(parts[0], 10);
            mois = parseInt(parts[1], 10) - 1; // Mois est 0-indexé
            annee = parseInt(parts[2], 10);
            if (parts[2].length === 2) {
                annee += 2000; // Convertir YY en YYYY (ex: 24 -> 2024)
            }
        } else {
            // console.warn(`[standardiserDate] Invalid D/M/Y format: '${dateStr}'`);
            return null;
        }
    } else if (dateStr.includes('-')) { // Format DD-MM-YYYY ou DD-MM-YY (après YYYY-MM-DD)
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            jour = parseInt(parts[0], 10);
            mois = parseInt(parts[1], 10) - 1; // Mois est 0-indexé
            annee = parseInt(parts[2], 10);
            if (parts[2].length === 2) {
                annee += 2000; // Convertir YY en YYYY
            }
        } else {
            // console.warn(`[standardiserDate] Invalid D-M-Y format: '${dateStr}'`);
            return null;
        }
    } else {
        // console.warn(`[standardiserDate] Unrecognized date format: '${dateStr}'`);
        return null; // Format non reconnu
    }

    if (isNaN(jour) || isNaN(mois) || isNaN(annee) || annee < 1900 || annee > 2100 || mois < 0 || mois > 11 || jour < 1 || jour > 31) {
        // console.warn(`[standardiserDate] Invalid date components for input: '${dateStr}' -> j:${jour}, m:${mois + 1}, a:${annee}`);
        return null;
    }
    
    const dateObj = new Date(annee, mois, jour);
    // Vérifier si la date construite est valide et correspond aux entrées (évite les dépassements comme 31/02)
    if (dateObj.getFullYear() === annee && dateObj.getMonth() === mois && dateObj.getDate() === jour) {
        return dateObj;
    }
    // console.warn(`[standardiserDate] Constructed date mismatch for input: '${dateStr}' -> j:${jour}, m:${mois + 1}, a:${annee}`);
    return null;
}

function isToday(dateStr) {
    const date = standardiserDate(dateStr);
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
}

function isYesterday(dateStr) {
    const date = standardiserDate(dateStr);
    if (!date) return false;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.getDate() === yesterday.getDate() &&
           date.getMonth() === yesterday.getMonth() &&
           date.getFullYear() === yesterday.getFullYear();
}

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
    document.getElementById('suivi-achat-boeuf-section').style.display = 'none';
    document.getElementById('reconciliation-section').style.display = 'none';
    document.getElementById('reconciliation-mois-section').style.display = 'none';
    document.getElementById('stock-alerte-section').style.display = 'none';
    document.getElementById('cash-payment-section').style.display = 'none';
    document.getElementById('estimation-section').style.display = 'none';

    // Ensure content-section elements are also hidden
    const contentSections = document.querySelectorAll('.content-section');
    console.log(`hideAllSections: Found ${contentSections.length} content-section elements to hide`);
    contentSections.forEach(el => {
        console.log(`hideAllSections: Hiding element: ${el.id}`);
        el.style.display = 'none';
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
                console.log('Date sélectionnée pour la réconciliation:', dateStr);
                // Rendre le bouton de calcul plus visible après changement de date
                const btnCalculer = document.getElementById('calculer-reconciliation');
                if (btnCalculer) {
                    btnCalculer.classList.add('btn-pulse');
                    setTimeout(() => {
                        btnCalculer.classList.remove('btn-pulse');
                    }, 1500);
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
    const reconciliationMoisTab = document.getElementById('reconciliation-mois-tab');
    const stockAlerteTab = document.getElementById('stock-alerte-tab');
    const cashPaymentTab = document.getElementById('cash-payment-tab');
    const cashPaymentSection = document.getElementById('cash-payment-section');
    // Get new elements
    const suiviAchatBoeufTab = document.getElementById('suivi-achat-boeuf-tab');
    const suiviAchatBoeufSection = document.getElementById('suivi-achat-boeuf-section');
    
    const saisieSection = document.getElementById('saisie-section');
    const visualisationSection = document.getElementById('visualisation-section');
    const importSection = document.getElementById('import-section');
    const stockInventaireSection = document.getElementById('stock-inventaire-section');
    const copierStockSection = document.getElementById('copier-stock-section');
    const reconciliationSection = document.getElementById('reconciliation-section');
    const reconciliationMoisSection = document.getElementById('reconciliation-mois-section');
    const stockAlerteSection = document.getElementById('stock-alerte-section');

    // Fonction pour désactiver tous les onglets
    function deactivateAllTabs() {
        if (saisieTab) saisieTab.classList.remove('active');
        if (visualisationTab) visualisationTab.classList.remove('active');
        if (importTab) importTab.classList.remove('active');
        if (stockInventaireTab) stockInventaireTab.classList.remove('active');
        if (copierStockTab) copierStockTab.classList.remove('active');
        if (reconciliationTab) reconciliationTab.classList.remove('active');
        if (reconciliationMoisTab) reconciliationMoisTab.classList.remove('active');
        if (stockAlerteTab) stockAlerteTab.classList.remove('active');
        if (cashPaymentTab) cashPaymentTab.classList.remove('active');
        // Deactivate new tab
        if (suiviAchatBoeufTab) suiviAchatBoeufTab.classList.remove('active');
    }

    if (saisieTab) {
        saisieTab.addEventListener('click', function(e) {
            e.preventDefault();
            hideAllSections();
            saisieSection.style.display = 'block';
            deactivateAllTabs();
            this.classList.add('active');
            
            // S'assurer que les éléments de visualisation sont masqués
            document.querySelectorAll('.visualisation-charts, .visualisation-data, .content-section').forEach(el => {
                el.style.display = 'none';
            });
            
            // Explicitly hide reconciliation sections
            console.log('Explicitly hiding reconciliation sections');
            const reconciliationSection = document.getElementById('reconciliation-section');
            const reconciliationMoisSection = document.getElementById('reconciliation-mois-section');
            if (reconciliationSection) {
                console.log('Hiding reconciliation-section');
                reconciliationSection.style.display = 'none';
            }
            if (reconciliationMoisSection) {
                console.log('Hiding reconciliation-mois-section');
                reconciliationMoisSection.style.display = 'none';
            }
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

    // Add the event listener for the monthly reconciliation tab
    if (reconciliationMoisTab) {
        reconciliationMoisTab.addEventListener('click', function(e) {
            e.preventDefault();
            hideAllSections();
            // Assuming reconciliationMoisSection is the correct ID for the section
            if (reconciliationMoisSection) {
                reconciliationMoisSection.style.display = 'block';
            }
            deactivateAllTabs();
            this.classList.add('active');
            // Assuming initReconciliationMensuelle is the function to call
            initReconciliationMensuelle();
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
                const matinResponse = await fetch('/api/stock/matin', {
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
                const soirResponse = await fetch('/api/stock/soir', {
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
                const transfertsResponse = await fetch('/api/transferts', {
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

    // Add listener for the new tab
    if (suiviAchatBoeufTab) {
        suiviAchatBoeufTab.addEventListener('click', function(e) {
            e.preventDefault();
            hideAllSections();
            if (suiviAchatBoeufSection) {
                 suiviAchatBoeufSection.style.display = 'block';
            }
            deactivateAllTabs();
            this.classList.add('active');
            // Call the correct initialization/load function from suiviAchatBoeuf.js
            if (typeof loadAchatsBoeuf === 'function') {
                 loadAchatsBoeuf(); // Load data when tab is clicked
            } else {
                console.error('loadAchatsBoeuf function not found! Ensure public/js/suiviAchatBoeuf.js is loaded.');
            }
        });
    }

    // Add event listener for stock export Excel button
    const exportStockExcelBtn = document.getElementById('export-stock-excel');
    if (exportStockExcelBtn) {
        exportStockExcelBtn.addEventListener('click', exportStockInventaireToExcel);
    }

    // Add event listener for visualization export Excel button
    const exportVisualisationExcelBtn = document.getElementById('export-visualisation-excel');
    if (exportVisualisationExcelBtn) {
        exportVisualisationExcelBtn.addEventListener('click', exportVisualisationToExcel);
    }
});

// Modification de la fonction checkAuth pour gérer l'affichage de l'onglet Stock inventaire
async function checkAuth() {
    try {
        const response = await fetch('/api/check-session', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (!data.success) {
            window.location.href = 'login.html';
            return;
        }
        
        // Stocker les informations de l'utilisateur
        currentUser = data.user;
        
        // Stocker l'utilisateur dans la variable window pour l'accès global
        window.currentUser = currentUser;
        
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
          
        }
        
        // Vérifier l'accès au chat Relevance AI
        const usersWithChatAccess = ['SALIOU', 'OUSMANE'];
        if (!usersWithChatAccess.includes(currentUser.username)) {
            // Désactiver le chat pour les utilisateurs non autorisés
            // Cette logique est complémentaire à celle dans index.html
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1 && (
                            node.id && node.id.includes('relevance') || 
                            node.className && node.className.includes('relevance')
                        )) {
                            node.style.display = 'none';
                        }
                    });
                });
            });
            
            // Démarrer l'observation du document
            observer.observe(document.body, { childList: true, subtree: true });
            console.log('Chat Relevance AI désactivé pour l\'utilisateur:', currentUser.username);
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
        const response = await fetch('/api/logout', {
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

    // Ajouter un écouteur pour le sélecteur de point de vente dans la section Visualisation
    const pointVenteSelectVisualisation = document.getElementById('point-vente-select');
    if (pointVenteSelectVisualisation) {
        pointVenteSelectVisualisation.addEventListener('change', chargerVentes);
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

// Fonction pour peupler les catégories
function populateCategories() {
    // Vérifier la disponibilité de l'objet produits
    if (typeof produits === 'undefined' || !produits) {
        console.error('Erreur: L\'objet produits n\'est pas disponible pour populateCategories');
        return;
    }
    
    // Peupler tous les sélecteurs de catégories (existants et futurs)
    document.querySelectorAll('.categorie-select').forEach(select => {
        // Vérifier si les options sont déjà peuplées
        if (select.children.length <= 1) { // Seulement l'option par défaut
            Object.keys(produits).forEach(categorie => {
                if (typeof produits[categorie] === 'object' && produits[categorie] !== null) {
                    const option = document.createElement('option');
                    option.value = categorie;
                    option.textContent = categorie;
                    select.appendChild(option);
                }
            });
        }
    });
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

// Ajouter un événement pour recalculer le total général quand la date change
document.addEventListener('DOMContentLoaded', function() {
    // Peupler les catégories au chargement de la page
    populateCategories();
    
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
            // Get the current value
            const pointVenteValue = this.value;
            console.log("[Point Vente Change] Value:", pointVenteValue);
            
            // Always calculate total, regardless of selection
            setTimeout(function() {
                console.log("[Point Vente Change] Calling calculerTotalGeneral");
                calculerTotalGeneral();
            }, 100);
            
            // Recharger les ventes filtrées par date et point de vente
            chargerDernieresVentes();
        });
    }
    
    // Calculer le total général au chargement de la page
    setTimeout(calculerTotalGeneral, 100);
});

function calculerTotalGeneral() {
    // Récupérer la date sélectionnée
    const dateSelectionnee = document.getElementById('date').value;
    
    // Récupérer le point de vente sélectionné
    const pointVenteSelectionnee = document.getElementById('point-vente').value;
    
    // Fonction pour extraire uniquement les composants jour/mois/année d'une date
    function getComparableDate(dateStr) {
        if (!dateStr) return null;
        let jour, mois, annee;

        // Regex pour détecter YYYY-MM-DD
        const ymdRegex = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
        const ymdMatch = dateStr.match(ymdRegex);

        if (ymdMatch) {
            annee = ymdMatch[1];
            mois = ymdMatch[2];
            jour = ymdMatch[3];
        } else if (dateStr.includes('/')) { // Format DD/MM/YYYY ou DD/MM/YY
            [jour, mois, annee] = dateStr.split('/');
            if (annee.length === 2) {
                annee = '20' + annee;
            }
        } else if (dateStr.includes('-')) { // Format DD-MM-YYYY ou DD-MM-YY
            [jour, mois, annee] = dateStr.split('-');
            if (jour.length === 4) { // Probablement YYYY-MM-DD
                annee = jour;
                jour = dateStr.split('-')[2]; // Réassigner correctement
            } else if (annee.length === 2) {
                annee = '20' + annee;
            }
        } else {
            return null; // Format non reconnu
        }

        return `${String(jour).padStart(2, '0')}/${String(mois).padStart(2, '0')}/${annee}`;
    }
    
    // Conversion de la date sélectionnée au format comparable
    const dateSelectionneeComparable = getComparableDate(dateSelectionnee);
    
    // 1. Calculer le total des lignes en cours de saisie plus efficacement
    const totalSaisie = Array.from(document.querySelectorAll('.total'))
        .reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0);
    
    // Indiquer le calcul en cours
    document.getElementById('total-general').textContent = 'Calcul en cours...';
    
    // 2. Calculer le total asynchrone pour ne pas bloquer l'UI
    setTimeout(() => {
        try {
            // Obtenir toutes les lignes de vente
            const tbody = document.querySelector('#dernieres-ventes tbody');
            if (!tbody) {
                throw new Error('Table body not found');
            }
            
            const rows = tbody.querySelectorAll('tr');
            let totalDernieresVentes = 0;
            
            // Parcourir les lignes
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                
                // Obtenir les cellules de date et point de vente
                const dateCellElement = row.querySelector('td:nth-child(2)');
                const pointVenteCellElement = row.querySelector('td:nth-child(4)');
                const montantCellElement = row.querySelector('td:nth-child(10)');
                
                if (!dateCellElement || !pointVenteCellElement || !montantCellElement) {
                    continue; // Ignorer les lignes incomplètes
                }
                
                // Extraire les valeurs
                const dateCell = dateCellElement.textContent.trim();
                const dateVenteComparable = getComparableDate(dateCell);
                const pointVenteCell = pointVenteCellElement.textContent.trim();
                
                // Comparer dates et point de vente
                // Si le point de vente est vide, inclure toutes les ventes de la date
                if (dateVenteComparable === dateSelectionneeComparable && 
                    (pointVenteSelectionnee === "" || pointVenteCell === pointVenteSelectionnee)) {
                    
                    // Extraire le montant
                    const montantText = montantCellElement.textContent.trim();
                    const montant = parseFloat(montantText.replace(/\s/g, '').replace(/,/g, '.').replace(/FCFA/g, '')) || 0;
                    totalDernieresVentes += montant;
                }
            }
            
            // 3. Calculer et afficher le total général
            const totalGeneral = totalSaisie + totalDernieresVentes;
            document.getElementById('total-general').textContent = `${totalGeneral.toLocaleString('fr-FR')} FCFA`;
            
        } catch (error) {
            console.error('Erreur lors du calcul du total:', error);
            document.getElementById('total-general').textContent = 'Erreur de calcul';
        }
    }, 50);
    
    return totalSaisie;
}
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
                </select>
            </div>
            <div class="col-md-4">
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
        <div class="row mt-2">
            <div class="col-md-3">
                <label class="form-label">Nom Client</label>
                <input type="text" class="form-control nom-client">
            </div>
            <div class="col-md-3">
                <label class="form-label">Numéro Client</label>
                <input type="text" class="form-control numero-client">
            </div>
            <div class="col-md-3">
                <label class="form-label">Adresse Client</label>
                <input type="text" class="form-control adresse-client">
            </div>
            <div class="col-md-3">
                <label class="form-label">Créance</label>
                <select class="form-select creance-select">
                    <option value="false">Non</option>
                    <option value="true">Oui</option>
                </select>
            </div>
        </div>
    `;

    // Peupler dynamiquement les catégories depuis produits.js
    const categorieSelect = div.querySelector('.categorie-select');
    const produitSelect = div.querySelector('.produit-select');
    
    // Peupler les catégories directement pour ce nouvel élément
    if (typeof produits !== 'undefined' && produits) {
        Object.keys(produits).forEach(categorie => {
            if (typeof produits[categorie] === 'object' && produits[categorie] !== null) {
                // Ignorer les fonctions
                if (typeof produits[categorie] === 'function') return;
                
                const option = document.createElement('option');
                option.value = categorie;
                option.textContent = categorie;
                categorieSelect.appendChild(option);
            }
        });
    } else {
        console.error('Objet produits non disponible lors de la création de la nouvelle entrée');
    }
    categorieSelect.addEventListener('change', function() {
        const categorie = this.value;
        
        produitSelect.innerHTML = '<option value="">Sélectionner...</option>'; // Vider les options précédentes
        
        // Utiliser produits depuis produits.js
        if (categorie && typeof produits !== 'undefined' && produits[categorie]) {
            Object.keys(produits[categorie]).forEach(produit => {
                const option = document.createElement('option');
                option.value = produit;
                option.textContent = produit;
                produitSelect.appendChild(option);
            });
        } else if (categorie) {
            console.error(`Données produits non trouvées pour la catégorie: ${categorie}`);
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
        const nomClient = entry.querySelector('.nom-client').value;
        const numeroClient = entry.querySelector('.numero-client').value;
        const adresseClient = entry.querySelector('.adresse-client').value;
        const creance = entry.querySelector('.creance-select').value === 'true';
        
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
                total,
                nomClient,
                numeroClient,
                adresseClient,
                creance
            });
        }
    });
    
    if (entries.length === 0) {
        alert('Veuillez ajouter au moins un produit');
        return;
    }
    
    try {
        const url = isUpdate ? `/api/ventes/${venteId}` : '/api/ventes';
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
    const nouvelleEntree = creerNouvelleEntree();
    container.appendChild(nouvelleEntree);
});

// Fonction pour vérifier si une date est aujourd'hui
function isToday(dateStr) {
    // StandardiserDate s'attend à un format avec tirets, ex: "09-05-2025"
    // Assurez-vous que dateStr est dans ce format ou ajustez la logique ici.
    const date = standardiserDate(dateStr); // Ensure standardiserDate is accessible or defined before this block
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
}

function isYesterday(dateStr) {
    const date = standardiserDate(dateStr); // Ensure standardiserDate is accessible or defined before this block
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.getDate() === yesterday.getDate() &&
           date.getMonth() === yesterday.getMonth() &&
           date.getFullYear() === yesterday.getFullYear();
}

// Ensure standardiserDate is defined before afficherDernieresVentes if it's not globally available
// For example, by moving its definition here or ensuring it's defined earlier in the script.
// Assuming standardiserDate is defined globally or earlier:

function afficherDernieresVentes(ventes) {
    const tbody = document.querySelector("#dernieres-ventes tbody");
    if (!tbody) {
        console.error("Element tbody introuvable pour #dernieres-ventes");
        return;
    }
    tbody.innerHTML = ""; // Vider le tableau avant d'ajouter de nouvelles lignes

    // Standardiser la date pour la comparaison (definition moved up or assumed global)
    // const standardiserDate = (dateStr) => { ... } // Definition might be here or earlier

    ventes.forEach(vente => {
        const row = tbody.insertRow();
        // Formater la date pour l'affichage en DD-MM-YYYY
        let displayDate = vente.Date;
        const dateObj = standardiserDate(vente.Date); // Uses standardiserDate
        if (dateObj) {
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = dateObj.getFullYear();
            displayDate = `${day}-${month}-${year}`;
        }

        row.insertCell().textContent = vente.Mois || "";
        row.insertCell().textContent = displayDate;
        row.insertCell().textContent = vente.Semaine || "";
        row.insertCell().textContent = vente.PointDeVente || vente['Point de Vente'] || vente.pointVente|| "";
        row.insertCell().textContent = vente.Preparation || "";
        row.insertCell().textContent = vente.Categorie || vente.Catégorie || vente.categorie || "";
        row.insertCell().textContent = vente.Produit || "";
        row.insertCell().textContent = vente.PU !== undefined && vente.PU !== null ? parseFloat(vente.PU).toLocaleString('fr-FR') : "";
        row.insertCell().textContent = vente.Nombre !== undefined && vente.Nombre !== null ? parseFloat(vente.Nombre).toLocaleString('fr-FR') : "";
        row.insertCell().textContent = vente.Montant !== undefined && vente.Montant !== null ? parseFloat(vente.Montant).toLocaleString('fr-FR') : "";
        row.insertCell().textContent = vente.nomClient || "";
        row.insertCell().textContent = vente.numeroClient || "";
        row.insertCell().textContent = vente.adresseClient || "";
        row.insertCell().textContent = (vente.Creance === true || vente.Creance === 'true' || vente.Creance === 'Oui') ? 'Oui' : 'Non';

        const actionsCell = row.insertCell();
        actionsCell.style.textAlign = 'center';

        let showDeleteButton = false;
        const currentUser = window.currentUser; 
        const userRole = currentUser ? currentUser.username.toUpperCase() : null;
        const privilegedUsers = ['SALIOU', 'OUSMANE'];
        const limitedAccessUsers = ['NADOU', 'PAPI', 'MBA', 'OSF', 'KMS', 'LNG', 'DHR', 'TBM'];

        if (userRole && privilegedUsers.includes(userRole)) {
            showDeleteButton = true;
        } else if (userRole && limitedAccessUsers.includes(userRole)) {
            if (isToday(vente.Date) || isYesterday(vente.Date)) { // Uses isToday and isYesterday
                showDeleteButton = true;
            }
        }

        if (showDeleteButton) {
            const deleteButton = document.createElement('button');
            deleteButton.className = 'btn btn-danger btn-sm delete-vente';
            deleteButton.setAttribute('data-id', vente.id); // Assurez-vous que vente.id existe et est correct
            deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
            deleteButton.addEventListener('click', async () => {
                if (confirm('Êtes-vous sûr de vouloir supprimer cette vente ?')) {
                    // Assurez-vous que supprimerVente est défini et accessible
                    await supprimerVente(vente.id); 
                }
            });
            actionsCell.appendChild(deleteButton);
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
    
            // Regex pour détecter YYYY-MM-DD
            const ymdRegex = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
            const ymdMatch = dateStr.match(ymdRegex);
    
            if (ymdMatch) {
                annee = ymdMatch[1];
                mois = ymdMatch[2];
                jour = ymdMatch[3];
            } else if (dateStr.includes('/')) { // Format DD/MM/YYYY ou DD/MM/YY
                [jour, mois, annee] = dateStr.split('/');
                if (annee.length === 2) {
                    annee = '20' + annee;
                }
            } else if (dateStr.includes('-')) { // Format DD-MM-YYYY ou DD-MM-YY
                 [jour, mois, annee] = dateStr.split('-');
                 // Vérifier si le premier segment est l'année (YYYY-MM-DD incorrectement capturé)
                 if (jour.length === 4) { // Probablement YYYY-MM-DD
                     annee = jour;
                     jour = dateStr.split('-')[2]; // Réassigner correctement
                 } else if (annee.length === 2) {
                    annee = '20' + annee;
                }
            } else {
                return null; // Format non reconnu
            }

            // Vérifier que toutes les parties sont valides après parsing
            if (!jour || !mois || !annee || isNaN(parseInt(jour)) || isNaN(parseInt(mois)) || isNaN(parseInt(annee))) { 
                 console.warn(`[getComparableDate chargerDernieresVentes] Invalid date parts for input: '${dateStr}' -> j:${jour}, m:${mois}, a:${annee}`);
                 return null;
            }
    
            return `${String(jour).padStart(2, '0')}/${String(mois).padStart(2, '0')}/${annee}`;
        }
        
        const dateSelectionneeFmt = getComparableDate(dateSelectionnee);
        
        console.log('Point de vente sélectionné:', pointVenteSelectionne);
        console.log('Date sélectionnée:', dateSelectionnee, '(Format comparable:', dateSelectionneeFmt, ')');
        
        const response = await fetch('/api/dernieres-ventes', {
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
                console.log(`[Filter Debug] Filtering for date: ${dateSelectionneeFmt}`); // Log the target date
                const originalCount = ventesAffichees.length;
                ventesAffichees = ventesAffichees.filter((vente, index) => {
                    const venteDateStr = vente.Date;
                    const venteDateComparable = getComparableDate(venteDateStr);
                    const match = venteDateComparable === dateSelectionneeFmt;

                    // Log details for the first 5 entries or specifically for Mbao
                    if (index < 5 || vente['Point de Vente'] === pointVenteSelectionne) { // Log relevant PV
                         console.log(`[Filter Debug] Entry ${index + 1} (PV: ${vente['Point de Vente']}): DB Date='${venteDateStr}', Comparable='${venteDateComparable}', Target='${dateSelectionneeFmt}', Match=${match}`);
                    }

                    return match;
                });
                 console.log(`[Filter Debug] Date filter removed ${originalCount - ventesAffichees.length} entries.`); // Log how many were removed
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
            if (tbody) tbody.innerHTML = '<tr><td colspan="16" class="text-center">Aucune donnée disponible</td></tr>';
        }
    } catch (error) {
        console.error('Erreur lors du chargement des dernières ventes:', error);
        const tbody = document.querySelector('#dernieres-ventes tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="16" class="text-center text-danger">Erreur: ' + error.message + '</td></tr>';
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
    console.log('Création du graphique des ventes par catégorie avec les données:', donnees);

    // Check if the ChartDataLabels plugin is loaded
    if (typeof ChartDataLabels === 'undefined') {
        console.error('ChartDataLabels plugin is not loaded!');
        return;
    }

    const categories = {};
    donnees.forEach(vente => {
        const categorie = vente.Catégorie || 'Inconnue';
        const montant = parseFloat(vente.Montant) || 0;
        if (!categories[categorie]) {
            categories[categorie] = 0;
        }
        categories[categorie] += montant;
    });

    const labels = Object.keys(categories);
    const data = Object.values(categories);
    const totalVentes = data.reduce((sum, value) => sum + value, 0);

    // Define a color palette (use more colors if needed)
    const defaultColors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#E7E9ED', '#8D8741', '#659DBD', '#DAAD86'
    ];
    const backgroundColors = labels.map((_, i) => defaultColors[i % defaultColors.length]);
    const borderColors = backgroundColors.map(color => color); // Use same color for border or make it darker

    const ctx = document.getElementById('ventesParCategorieChart').getContext('2d');

    if (ventesParCategorieChart) {
        ventesParCategorieChart.destroy();
        console.log('Ancien graphique des ventes par catégorie détruit.');
    }

    console.log('Configuration du nouveau graphique Pie avec datalabels');
    ventesParCategorieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderColor: borderColors, // Or a slightly darker shade
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top', // Or 'right', 'bottom', 'left'
                },
                title: {
                    display: false, // Title is already outside the canvas in HTML
                    // text: 'Ventes par Catégorie'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'FCFA' }).format(context.parsed);
                                if (totalVentes > 0) {
                                    const percentage = ((context.parsed / totalVentes) * 100).toFixed(1);
                                    label += ` (${percentage}%)`;
                                }
                            }
                            return label;
                        }
                    }
                },
                datalabels: { // Configuration for chartjs-plugin-datalabels
                    display: true,
                    formatter: (value, ctx) => {
                        if (totalVentes === 0) return '0%';
                        let percentage = ((value / totalVentes) * 100).toFixed(1);
                        // Only display label if percentage is significant (e.g., > 1%)
                        return parseFloat(percentage) > 1 ? percentage + '%' : '';
                    },
                    color: '#fff', // Color of the labels
                    font: {
                        weight: 'bold',
                        size: 12 // Adjust size as needed
                    },
                    // Optional: Add background or padding
                    // backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    // borderRadius: 4,
                    // padding: 6
                }
            }
        },
        plugins: [ChartDataLabels] // Register the plugin instance with the chart
    });
    console.log('Graphique Pie créé:', ventesParCategorieChart);
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
        const formatDateForApi = (dateStr, isEndDate = false) => {
            if (!dateStr) return '';
            const [jour, mois, annee] = dateStr.split('/');
            // Ajuster le mois pour qu'il soit correct (les mois commencent à 0 en JavaScript)
            const date = new Date(annee, parseInt(mois) - 1, parseInt(jour));
            
            // Si c'est une date de fin, ajouter un jour pour inclure la date
            if (isEndDate) {
                date.setDate(date.getDate() + 1);
            }
            
            return date.toISOString().split('T')[0];
        };

        const debut = formatDateForApi(dateDebut);
        const fin = formatDateForApi(dateFin, true); // Ajouter un jour à la date de fin pour l'inclure

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

        const response = await fetch(`/api/ventes?dateDebut=${debut}&dateFin=${fin}&pointVente=${pointVente}`, {
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
            tbody.innerHTML = `<tr><td colspan="15" class="text-center text-danger">Erreur lors du chargement des ventes: ${error.message}</td></tr>`;
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
                <td>${vente.nomClient || ''}</td>
                <td>${vente.numeroClient || ''}</td>
          
                <td>${vente.adresseClient || ''}</td>
                <td>${vente.creance ? 'Oui' : 'Non'}</td>
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
                    'Montant',
                    'Nom Client',
                    'Numéro Client',
                   
                    'Adresse Client',
                    'Créance'
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
        if (row.length >= 14) { // Vérifier que la ligne a toutes les colonnes nécessaires
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
                <td>${row[10]}</td>
                <td>${row[11]}</td>
                <td>${row[12]}</td>
                <td>${row[13]}</td>
                
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
            total: row[9],
            nomClient: row[10],
            numeroClient: row[11],
            adresseClient: row[12],
            creance: row[13] === 'Oui' // Assuming 'Oui'/'Non' in import file, convert to boolean
        }));
        
        // Envoyer les données au serveur
        const typeStock = document.getElementById('type-stock').value;
        const response = await fetch(`/api/stock/${typeStock}`, {
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
        
        // Utiliser l'API endpoint au lieu du fichier JSON direct
        let transferts = [];
        try {
            const response = await fetch(`/api/transferts?date=${dateSelectionnee}`, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (!response.ok) {
                console.warn(`Aucun transfert disponible pour ${dateSelectionnee}, utilisation d'un tableau vide`);
                transferts = [];
            } else {
                const result = await response.json();
                transferts = result.success && result.transferts ? result.transferts : [];
                console.log('Transferts chargés depuis l\'API:', transferts);
            }
        } catch (fetchError) {
            console.warn('Erreur lors du chargement des transferts:', fetchError);
            transferts = [];
        }
        
        // Si la fonction est appelée depuis la page d'inventaire, mettre à jour l'interface
        const tbody = document.querySelector('#transfertTable tbody');
        if (tbody) {
            // Vider le tableau des transferts
            tbody.innerHTML = '';
            
            // Afficher les transferts existants
            if (Array.isArray(transferts) && transferts.length > 0) {
                transferts.forEach((transfert, index) => {
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
                    PRODUITS_INVENTAIRE.forEach(prod => {
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
                                const response = await fetch(`/api/transferts`, {
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
        return transferts;
        
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
    PRODUITS_INVENTAIRE.forEach(prod => {
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
    inputQuantite.step = '0.001';
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
        inputPrixUnitaire.value = PRIX_DEFAUT_INVENTAIRE[nouveauProduit] || '0';
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
        const response = await fetch('/api/transferts', {
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
  
    
    // Vérifier si l'utilisateur a les droits pour voir l'onglet 'Copier Stock'
    try {
        const response = await fetch('/api/user-info', {
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
        const response = await fetch(`/api/stock/${typeStock}?date=${date}`, {
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
        const response = await fetch(`/api/stock/${sourceTypeStock}?date=${sourceDate}`, {
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
        const saveResponse = await fetch(`/api/stock/${targetTypeStock}`, {
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
        copierStockItem.style.display = 'block';
   
}

// Fonction pour initialiser la page d'inventaire
async function initInventaire() {
    console.log('%c=== Initialisation de la page inventaire ===', 'background: #222; color: #bada55; font-size: 16px; padding: 5px;');
    
    // Initialiser les filtres de stock
    initFilterStock();
    
    // Initialiser le datepicker
    const dateInput = document.getElementById('date-inventaire');
    flatpickr(dateInput, {
        dateFormat: "d/m/Y",
        defaultDate: "today",
        disableMobile: "true",
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
    
    // Appliquer le filtre initial
    const masquerQuantiteZero = document.getElementById('masquer-quantite-zero');
    if (masquerQuantiteZero) {
        // Par défaut, ne pas masquer les quantités à zéro
        masquerQuantiteZero.checked = false;
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
    // Ajouter l'écouteur d'événement pour appliquer le filtre quand la quantité change
    inputQuantite.addEventListener('change', function() {
        // Appliquer le filtre si le masquage des quantités à zéro est activé
        if (document.getElementById('masquer-quantite-zero').checked) {
            filtrerStock();
        }
    });
    tdQuantite.appendChild(inputQuantite);
    
    // Prix unitaire
    const tdPrixUnitaire = document.createElement('td');
    const inputPrixUnitaire = document.createElement('input');
    inputPrixUnitaire.type = 'number';
    inputPrixUnitaire.className = 'form-control form-control-sm prix-unitaire-input';
    inputPrixUnitaire.value = PRIX_DEFAUT_INVENTAIRE[selectProduit.value] || '0';
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
        inputPrixUnitaire.value = PRIX_DEFAUT_INVENTAIRE[nouveauProduit] || '0';
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

    // Helper to fetch prix moyen
    async function fetchPrixMoyen(produit, date, pointVente, isTransfert) {
        let url = '';
        if (isTransfert) {
            url = `/api/prix-moyen?type=${encodeURIComponent(produit.toLowerCase())}&date=${encodeURIComponent(date)}`;
        } else {
            url = `/api/prix-moyen?type=${encodeURIComponent(produit.toLowerCase())}&date=${encodeURIComponent(date)}&pointVente=${encodeURIComponent(pointVente)}`;
        }
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('API error');
            const data = await response.json();
            // Extract prix_moyen_pondere from the first item in data array
            if (data.success && Array.isArray(data.data) && data.data.length > 0) {
                return parseFloat(data.data[0].prix_moyen_pondere) || null;
            }
            return null;
        } catch (err) {
            console.error('Erreur lors de la récupération du prix moyen:', err);
            return null;
        }
    }

    // Use for...of for async/await
    const rows = Array.from(document.querySelectorAll('#stock-table tbody tr'));
    for (const row of rows) {
        const pointVente = row.querySelector('.point-vente-select').value;
        const produit = row.querySelector('.produit-select').value;
        const quantite = parseFloat(row.querySelector('.quantite-input').value) || 0;
        const prixUnitaireInput = row.querySelector('.prix-unitaire-input').value;
        let prixUnitaire = parseFloat(prixUnitaireInput);
        const commentaire = row.querySelector('.commentaire-input').value || '';

        // Determine if we need to fetch prix moyen
        let needApi = false;
        let isTransfert = false;
        if ((produit === 'Boeuf' || produit === 'Veau')) {
            if (typeStock === 'Stock Matin' || typeStock === 'Stock Soir') {
                needApi = true;
            } else if (typeStock === 'Transfert') {
                needApi = true;
                isTransfert = true;
            }
        }

        if (needApi) {
            let fetchedPrix = null;
            if (isNaN(prixUnitaire) || prixUnitaireInput === '') {
                fetchedPrix = await fetchPrixMoyen(produit, date, pointVente, isTransfert);
                prixUnitaire = fetchedPrix !== null ? fetchedPrix : (PRIX_DEFAUT_INVENTAIRE[produit] || 0);
            }
            // If user entered a value, keep it (manual override)
        } else {
            if (isNaN(prixUnitaire) || prixUnitaireInput === '') {
                prixUnitaire = PRIX_DEFAUT_INVENTAIRE[produit] || 0;
            }
        }

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
    }

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
        const response = await fetch(`/api/stock/${typeStock}`, {
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
        PRODUITS_INVENTAIRE.forEach(produit => {
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
            PRODUITS_INVENTAIRE.forEach(prod => {
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
            inputQuantite.step = '0.001';
            
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
                inputPrixUnitaire.value = donnees.PU || donnees.prixUnitaire || PRIX_DEFAUT_INVENTAIRE[produit] || '0';
                inputCommentaire.value = donnees.Commentaire || donnees.commentaire || '';
                tdTotal.textContent = (parseFloat(inputQuantite.value) * parseFloat(inputPrixUnitaire.value)).toLocaleString('fr-FR');
        } else {
                console.log('%cPas de données sauvegardées pour ' + key + ', utilisation des valeurs par défaut:', 'color: #ff9900;', {
                    quantite: '0',
                    prixUnitaire: PRIX_DEFAUT_INVENTAIRE[produit],
                    commentaire: '',
                    total: '0'
                });
                inputQuantite.value = '0';
                inputPrixUnitaire.value = PRIX_DEFAUT_INVENTAIRE[produit] || '0';
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
                inputPrixUnitaire.value = PRIX_DEFAUT_INVENTAIRE[nouveauProduit] || '0';
                calculateTotal();
            });
            
            inputQuantite.addEventListener('input', calculateTotal);
            inputPrixUnitaire.addEventListener('input', calculateTotal);
            
            tbody.appendChild(row);
        });
    });
    
    console.log('%c=== Fin initTableauStock ===', 'background: #222; color: #bada55; font-size: 16px; padding: 5px;');
}

// Configuration pour l'inventaire to refac point de vente
const POINTS_VENTE_PHYSIQUES = [
    'Mbao', 'O.Foire', 'Linguere', 'Dahra', 'Touba', 'Keur Massar','Abattage'
];
// Configuration pour l'inventaire - lecture depuis produitsInventaire.js (pour Stock inventaire seulement)
const PRODUITS_INVENTAIRE = [];
const PRIX_DEFAUT_INVENTAIRE = {};

// Extraire tous les produits depuis produitsInventaire.js pour la section Stock inventaire
if (typeof produitsInventaire !== 'undefined' && typeof produitsInventaire.getTousLesProduits === 'function') {
    const produitsList = produitsInventaire.getTousLesProduits();
    produitsList.forEach(produit => {
        PRODUITS_INVENTAIRE.push(produit);
        PRIX_DEFAUT_INVENTAIRE[produit] = produitsInventaire.getPrixDefaut(produit);
    });
} else {
    // Fallback: liste hardcodée des produits principaux
    const produitsBasiques = ['Boeuf', 'Veau', 'Poulet', 'Tete De Mouton', 'Tablette', 'Foie', 'Yell', 'Agneau', 'Déchet 400', 'Autres', 'Mergez', 'Déchet 2000', 'Abats', 'Boeuf sur pieds', 'Veau sur pieds', 'Mouton sur pieds', 'Chevre sur pieds'];
    produitsBasiques.forEach(produit => {
        PRODUITS_INVENTAIRE.push(produit);
        PRIX_DEFAUT_INVENTAIRE[produit] = 0; // Prix par défaut de 0
    });
}

// Configuration pour les autres sections - lecture depuis produits.js
const PRODUITS = [];
const PRIX_DEFAUT = {};

// Extraire tous les produits de toutes les catégories de produits.js (pour les autres sections)
Object.keys(produits).forEach(categorie => {
    if (typeof produits[categorie] === 'object' && produits[categorie] !== null) {
        Object.keys(produits[categorie]).forEach(produit => {
            if (typeof produits[categorie][produit] === 'object' && produits[categorie][produit].default !== undefined) {
                PRODUITS.push(produit);
                PRIX_DEFAUT[produit] = produits[categorie][produit].default;
            }
        });
    }
});

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
        const response = await fetch(`/api/stock/${typeStock}?date=${dateSelectionnee}`, {
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
            PRODUITS_INVENTAIRE.forEach(produit => {
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
                PRODUITS_INVENTAIRE.forEach(prod => {
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
                inputQuantite.step = '0.001';
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
                    inputPrixUnitaire.value = donnees[key].PU || donnees[key].prixUnitaire || PRIX_DEFAUT_INVENTAIRE[produit] || '0';
                    inputCommentaire.value = donnees[key].Commentaire || donnees[key].commentaire || '';
                    // Recalculer le total
                    const total = (parseFloat(inputQuantite.value) * parseFloat(inputPrixUnitaire.value));
                    tdTotal.textContent = total.toLocaleString('fr-FR');
                } else {
                    console.log(`%cPas de données pour ${key}, utilisation des valeurs par défaut`, 'color: #ff9900;');
                    inputQuantite.value = '0';
                    inputPrixUnitaire.value = PRIX_DEFAUT_INVENTAIRE[produit] || '0';
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
                    inputPrixUnitaire.value = PRIX_DEFAUT_INVENTAIRE[nouveauProduit] || '0';
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
        const response = await fetch(`/api/ventes/${venteId}`, {
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
        const response = await fetch(`/api/ventes-date?date=${date}`, {
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
        const reconciliation = await calculerReconciliationParPointVente(date, stockMatin, stockSoir, transferts, debugInfo);
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
        const response = await fetch(`/api/stock/${type}?date=${date}`, {
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
        const response = await fetch(`/api/transferts?date=${date}`, {
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
async function calculerReconciliationParPointVente(date, stockMatin, stockSoir, transferts, debugInfo) {
    const reconciliation = {};
    
    // Récupérer la date sélectionnée pour charger les ventes saisies
    // Utiliser la date passée en paramètre directement
    const dateSelectionnee = date || ''; // Use passed date, fallback to empty string
    
    // Debug logs for inputs
    console.log(`[DEBUG calcReconPV] Date used for fetch: ${dateSelectionnee}`);
    console.log(`[DEBUG calcReconPV] Stock Matin Input keys:`, Object.keys(stockMatin));
    console.log(`[DEBUG calcReconPV] Stock Soir Input keys:`, Object.keys(stockSoir));
    console.log(`[DEBUG calcReconPV] Transferts Input count:`, transferts.length);
    
    // Vérifier si les données de stock sont vides pour cette date
    console.log("[DEBUG calcReconPV] Données de stock pour la date", dateSelectionnee, ":");
    console.log("[DEBUG calcReconPV] Stock matin:", Object.keys(stockMatin).length, "entrées");
    console.log("[DEBUG calcReconPV] Stock soir:", Object.keys(stockSoir).length, "entrées");
    console.log("[DEBUG calcReconPV] Transferts:", transferts.length, "entrées");
    
    const dateEstVide = Object.keys(stockMatin).length === 0 && 
                        Object.keys(stockSoir).length === 0 && 
                        transferts.length === 0;
    
    if (dateEstVide) {
        console.log(`[DEBUG calcReconPV] Aucune donnée trouvée pour la date ${dateSelectionnee}, initialisation avec des valeurs à zéro`);
    }
    
    // Récupérer les ventes saisies pour la date sélectionnée (Internal fetch)
    let ventesSaisies = {};
    try {
        // Use dateSelectionnee (which now directly comes from the function parameter)
        const response = await fetch(`/api/ventes-date?date=${dateSelectionnee}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        const data = await response.json();
        console.log('[DEBUG calcReconPV] Internal Sales Fetch Response:', data);
        
        if (data.success && data.totaux) {
            ventesSaisies = data.totaux;
            
            // Organiser les ventes par point de vente pour les détails de débogage
            if (data.ventes && Array.isArray(data.ventes)) {
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
                // Stocker les ventes regroupées dans debugInfo s'il existe
                if (debugInfo) {
                     debugInfo.ventesParPointVente = ventesParPointVente;
                }
            }
        }
    } catch (error) {
        console.error('[DEBUG calcReconPV] Error fetching internal sales:', error);
    }
    console.log('[DEBUG calcReconPV] Ventes Saisies (Internal Fetch):', ventesSaisies);
    
    // Initialiser les totaux pour chaque point de vente
    POINTS_VENTE_PHYSIQUES.forEach(pointVente => {
        // LOG: Check the specific sales value for this point of sale
        console.log(`[DEBUG calcReconPV] Initializing ${pointVente}: Ventes Saisies value =`, ventesSaisies[pointVente]);
        reconciliation[pointVente] = {
            stockMatin: 0,
            stockSoir: 0,
            transferts: 0,
            ventes: 0,
            ventesSaisies: ventesSaisies[pointVente] || 0, // Use internal fetch result
            difference: 0,
            pourcentageEcart: 0,
            cashPayment: 0,
            ecartCash: 0,
            commentaire: ''
        };
        
        // Initialiser les détails de débogage pour ce point de vente s'il existe
        if (debugInfo && debugInfo.detailsParPointVente) {
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
        }
    });
    
    // Si la date est vide, retourner directement les données initialisées à zéro
    if (dateEstVide) {
        console.log("[DEBUG calcReconPV] Retour des données initialisées à zéro pour tous les points de vente");
        return reconciliation;
    }
    
    // Calculer les totaux du stock matin
    Object.entries(stockMatin).forEach(([key, item]) => {
        const [pointVente, produit] = key.split('-');
        if (POINTS_VENTE_PHYSIQUES.includes(pointVente)) {
            const montant = parseFloat(item.Montant || item.total || 0);
            console.log(`  [DEBUG calcReconPV] StockMatin ${key}: montant parsed = ${montant}`); // Log parsed amount
            reconciliation[pointVente].stockMatin += montant;
            
            const quantite = parseFloat(item.Quantite || item.Nombre || item.quantite || 0);
            const prixUnitaire = parseFloat(item.PU || item.prixUnitaire || 0);
            
            if (debugInfo && debugInfo.detailsParPointVente && debugInfo.detailsParPointVente[pointVente]) {
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
            console.log(`  [DEBUG calcReconPV] StockSoir ${key}: montant parsed = ${montant}`); // Log parsed amount
            reconciliation[pointVente].stockSoir += montant;
            
            const quantite = parseFloat(item.Quantite || item.Nombre || item.quantite || 0);
            const prixUnitaire = parseFloat(item.PU || item.prixUnitaire || 0);
            
            if (debugInfo && debugInfo.detailsParPointVente && debugInfo.detailsParPointVente[pointVente]) {
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
    
    // Calculer les totaux des transferts
    console.log('[DEBUG calcReconPV] Calcul des transferts par point de vente:');
    POINTS_VENTE_PHYSIQUES.forEach(pointVente => {
        let totalTransfert = 0;
        const transfertsDuPoint = transferts.filter(t => 
            (t.pointVente || t["Point de Vente"]) === pointVente
        );
        
        transfertsDuPoint.forEach(transfert => {
            const impact = parseInt(transfert.impact) || 1;
            const montant = parseFloat(transfert.total || 0);
            const valeurTransfert = montant; // Formule simplifiée
            console.log(`  [DEBUG calcReconPV] Transfert ${pointVente}-${transfert.produit}: valeurTransfert = ${valeurTransfert}`); // Log transfer value
            totalTransfert += valeurTransfert;
            
            if (debugInfo && debugInfo.detailsParPointVente && debugInfo.detailsParPointVente[pointVente]) {
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
        if (debugInfo && debugInfo.detailsParPointVente && debugInfo.detailsParPointVente[pointVente]) {
            debugInfo.detailsParPointVente[pointVente].totalTransferts = totalTransfert;
        }
    });
    
  
    // Log state before final calculations
    console.log('[DEBUG calcReconPV] Reconciliation state BEFORE final calculations:');
    POINTS_VENTE_PHYSIQUES.forEach(pointVente => {
        console.log(`  - ${pointVente}:`, JSON.stringify(reconciliation[pointVente]));
    });

    // Calculer les ventes théoriques et différences
    POINTS_VENTE_PHYSIQUES.forEach(pointVente => {
        reconciliation[pointVente].ventes = 
            reconciliation[pointVente].stockMatin - 
            reconciliation[pointVente].stockSoir + 
            reconciliation[pointVente].transferts;
            
        reconciliation[pointVente].difference = 
            reconciliation[pointVente].ventes - 
            reconciliation[pointVente].ventesSaisies;
            
        if (reconciliation[pointVente].ventes !== 0) {
            reconciliation[pointVente].pourcentageEcart = 
                (reconciliation[pointVente].difference / reconciliation[pointVente].ventes) * 100;
        } else {
            reconciliation[pointVente].pourcentageEcart = 0;
        }
        
        if (debugInfo && debugInfo.detailsParPointVente && debugInfo.detailsParPointVente[pointVente]) {
            debugInfo.detailsParPointVente[pointVente].venteTheoriques = reconciliation[pointVente].ventes;
            debugInfo.detailsParPointVente[pointVente].difference = reconciliation[pointVente].difference;
            debugInfo.detailsParPointVente[pointVente].pourcentageEcart = reconciliation[pointVente].pourcentageEcart;
        }
    });
    
    // Log final object
    console.log('[DEBUG calcReconPV] Final Reconciliation Object:', reconciliation);
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
        const response = await fetch('/api/reconciliation/save', {
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
        const response = await fetch(`/api/reconciliation/load?date=${date}`, {
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
        const reconciliation = await calculerReconciliationParPointVente(date, stockMatin, stockSoir, transferts, debugInfo);
        
        // Afficher les résultats
        ReconciliationManager.afficherReconciliation(reconciliation, debugInfo);
        
        // Stocker les données dans la variable globale pour la sauvegarde
        window.currentReconciliation = {
            date: date,
            data: reconciliation
        };
        window.currentDebugInfo = debugInfo;
        
        // Activer le bouton de sauvegarde
        const btnSauvegarder = document.getElementById('sauvegarder-reconciliation');
        if (btnSauvegarder) {
            btnSauvegarder.disabled = false;
        }
        
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

    // --- Update explanation text ---
    const infoDiv = document.querySelector('#stock-alerte-section .alert.alert-info');
    if (infoDiv) {
        infoDiv.innerHTML = `
            <p>Cet outil recherche:</p>
            <ul>
                <li><strong>Accumulation</strong>: produits dont le stock soir dépasse 90% du (stock matin + transferts) <strong>et</strong> dont la différence est positive.</li>
                <li><strong>Apparition</strong>: produits présents en stock soir mais absents du stock matin.</li>
            </ul>
            <p>Exemple avec seuil à 10%: accumulation si stock soir > 90% (stock matin + transferts) <strong>et</strong> différence > 0.</p>
            <p class="fw-bold">Important: Une alerte pour un produit et un point de vente n'est affichée que si la condition (accumulation ou apparition) est remplie pendant 3 jours consécutifs dans la période sélectionnée.</p>
        `;
    }
    // --- End update explanation ---
    
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
    console.log('%c=== Recherche des alertes d\'accumulation de stock (Règle 3 jours consécutifs) ===', 'background: #222; color: #bada55; font-size: 16px; padding: 5px;');
    
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
    
    // --- Structure pour tracker les alertes potentielles ---
    // Format: { 'PointVente-Produit': { dates: ['dd/mm/yyyy', ...], detailsByDate: {'dd/mm/yyyy': {...alertDetails}} } }
    const potentialAlerts = {}; 
    const oneDayInMillis = 24 * 60 * 60 * 1000;

    // Helper pour parser la date en millisecondes
    const parseDateToMillis = (dateStr) => {
        try {
            const parts = dateStr.split('/');
            // Month is 0-indexed in JavaScript Date
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
        } catch (e) {
            console.error(`Error parsing date: ${dateStr}`, e);
            return NaN;
        }
    };
    // --- Fin structure tracker ---

    try {
        // Générer la liste des dates à traiter
        const datesRange = generateDateRange(dateDebut, dateFin);
        console.log('Dates à traiter:', datesRange);
        
        // Tableau pour stocker toutes les alertes -> Remplacé par potentialAlerts
        // const alertes = []; 
        
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
            
            // --- Logique inchangée pour organiser les transferts ---
            const transfertsMap = new Map();
            transferts.forEach(transfert => {
                const pointVente = transfert.pointVente || transfert["Point de Vente"];
                const produitBrut = transfert.produit || transfert.Produit;
                if (!pointVente || !produitBrut) {
                    console.warn('Transfert ignoré car point de vente ou produit manquant:', transfert);
                    return; 
                }
                const produit = produitBrut.trim();
                const key = `${pointVente}-${produit}`;
                if (!transfertsMap.has(key)) {
                    transfertsMap.set(key, 0);
                }
                let montant = 0;
                if (transfert.total !== undefined && transfert.total !== null) {
                    montant = parseFloat(transfert.total);
                } else if (transfert.montant !== undefined && transfert.montant !== null) {
                    montant = parseFloat(transfert.montant);
                } else if (transfert.Montant !== undefined && transfert.Montant !== null) {
                    montant = parseFloat(transfert.Montant);
                } else {
                    const quantite = parseFloat(transfert.quantite || transfert.Quantite || transfert.Nombre || transfert.nombre || 0);
                    const pu = parseFloat(transfert.prixUnitaire || transfert.PU || transfert.pu || 0);
                    if (quantite > 0 && pu > 0) {
                        montant = quantite * pu;
                    }
                }
                if (isNaN(montant) || montant === 0) {
                    console.warn(`Montant invalide pour le transfert ${key}:`, transfert);
                }
                const valeurTransfert = montant;
                transfertsMap.set(key, transfertsMap.get(key) + valeurTransfert);
            });
            // --- Fin logique transferts ---
            
            const keysTraitees = new Set(); 
            
            // --- Boucle pour accumulation --- 
            for (const key in stockMatin) {
                const [pointVente, produitBrut] = key.split('-');
                if (!POINTS_VENTE_PHYSIQUES.includes(pointVente)) continue;
                const produit = produitBrut.trim();
                const keyNorm = `${pointVente}-${produit}`;
                keysTraitees.add(keyNorm);
                
                const stockMatinItem = stockMatin[key];
                const stockMatinMontant = parseFloat(stockMatinItem.Montant || stockMatinItem.total || 0);
                const transfertMontant = transfertsMap.has(keyNorm) ? transfertsMap.get(keyNorm) : 0;
                const stockAttendu = stockMatinMontant + transfertMontant;
                
                if (stockAttendu <= 0) continue;
                
                if (stockSoir[key]) {
                    const stockSoirItem = stockSoir[key];
                    const stockSoirMontant = parseFloat(stockSoirItem.Montant || stockSoirItem.total || 0);
                    const difference = stockSoirMontant - stockAttendu;
                    const pourcentageAccumulation = stockAttendu !== 0 ? (difference / stockAttendu) * 100 : (difference > 0 ? Infinity : -Infinity);
                    
                    const conditionSeuil = stockAttendu === 0 ? (difference > 0) : (pourcentageAccumulation > -pourcentageSeuil);
                    const conditionDifference = difference > 0;
                    
                    if (conditionSeuil && conditionDifference) {
                        console.log(`[+] Condition Accumulation REMPLIE pour ${keyNorm} le ${date}`);
                        // --- Logique pour tracker l'alerte ---
                        const stockMatinQuantite = parseFloat(stockMatinItem.Quantite || stockMatinItem.Nombre || 0);
                        const stockMatinPU = parseFloat(stockMatinItem.PU || stockMatinItem.prixUnitaire || 0);
                        const stockSoirQuantite = parseFloat(stockSoirItem.Quantite || stockSoirItem.Nombre || 0);
                        const stockSoirPU = parseFloat(stockSoirItem.PU || stockSoirItem.prixUnitaire || 0);
                        const transfertDetails = { quantite: 0, prixUnitaire: 0 }; // Simplifié pour l'exemple
                        transferts.forEach(t => { /* ... logique pour remplir transfertDetails si besoin ... */ });

                        const alertDetails = {
                            pointVente,
                            produit,
                            date, // Garder la date spécifique de cette alerte
                            stockMatin: stockMatinMontant,
                            stockSoir: stockSoirMontant,
                            transfert: transfertMontant,
                            difference,
                            pourcentage: pourcentageAccumulation,
                            type: 'accumulation',
                            stockMatinDetails: { quantite: stockMatinQuantite, prixUnitaire: stockMatinPU },
                            stockSoirDetails: { quantite: stockSoirQuantite, prixUnitaire: stockSoirPU },
                            transfertDetails: transfertDetails
                        };

                        if (!potentialAlerts[keyNorm]) {
                            potentialAlerts[keyNorm] = { dates: [], detailsByDate: {} };
                        }
                        potentialAlerts[keyNorm].dates.push(date);
                        potentialAlerts[keyNorm].detailsByDate[date] = alertDetails;
                        // -----------------------------------
                    }
                }
            }
            // --- Fin boucle accumulation ---
            
            // --- Boucle pour apparition ---
            for (const key in stockSoir) {
                const [pointVente, produitBrut] = key.split('-');
                if (!POINTS_VENTE_PHYSIQUES.includes(pointVente)) continue;
                const produit = produitBrut.trim();
                const keyNorm = `${pointVente}-${produit}`;
                
                if (keysTraitees.has(keyNorm)) continue;
                
                const stockSoirItem = stockSoir[key];
                const stockSoirMontant = parseFloat(stockSoirItem.Montant || stockSoirItem.total || 0);
                
                if (stockSoirMontant > 0) {
                     console.log(`[+] Condition Apparition REMPLIE pour ${keyNorm} le ${date}`);
                    // --- Logique pour tracker l'alerte ---
                    const stockSoirQuantite = parseFloat(stockSoirItem.Quantite || stockSoirItem.Nombre || 0);
                    const stockSoirPU = parseFloat(stockSoirItem.PU || stockSoirItem.prixUnitaire || 0);

                     const alertDetails = {
                        pointVente,
                        produit,
                        date, // Garder la date spécifique de cette alerte
                        stockMatin: 0,
                        stockSoir: stockSoirMontant,
                        transfert: 0,
                        difference: stockSoirMontant,
                        pourcentage: 100, 
                        type: 'apparition',
                        stockMatinDetails: { quantite: 0, prixUnitaire: 0 },
                        stockSoirDetails: { quantite: stockSoirQuantite, prixUnitaire: stockSoirPU },
                        transfertDetails: null
                    };

                    if (!potentialAlerts[keyNorm]) {
                        potentialAlerts[keyNorm] = { dates: [], detailsByDate: {} };
                    }
                    potentialAlerts[keyNorm].dates.push(date);
                    potentialAlerts[keyNorm].detailsByDate[date] = alertDetails;
                    // -----------------------------------
                }
            }
             // --- Fin boucle apparition ---
        }
        // --- Fin boucle dates --- 
        
        console.log(`[DEBUG] ===== Vérification des alertes consécutives =====`);
        const finalAlerts = []; // Tableau pour les alertes à afficher
        
        for (const keyNorm in potentialAlerts) {
            const entry = potentialAlerts[keyNorm];
            const alertDates = entry.dates;
            
            if (alertDates.length < 3) continue; // Pas assez de jours pour être consécutifs
            
            console.log(`[Check] Vérification pour ${keyNorm}, dates: [${alertDates.join(', ')}]`);
            
            // Convertir les dates en millisecondes et trier
            const dateMillis = alertDates.map(parseDateToMillis).filter(t => !isNaN(t)).sort((a, b) => a - b);
            
            if (dateMillis.length < 3) continue;
            
            let foundConsecutive = false;
            let lastDateOfSequence = null;

            for (let i = 0; i <= dateMillis.length - 3; i++) {
                const t1 = dateMillis[i];
                const t2 = dateMillis[i+1];
                const t3 = dateMillis[i+2];
                
                // Vérifier si t2 est exactement 1 jour après t1 ET t3 est exactement 1 jour après t2
                const isConsecutive = (t2 - t1 === oneDayInMillis) && (t3 - t2 === oneDayInMillis);
                
                if (isConsecutive) {
                    foundConsecutive = true;
                    // Récupérer la date string du dernier jour de la séquence
                    const lastDateObj = new Date(t3);
                    lastDateOfSequence = formatDateForStockAlerte(lastDateObj); // Use renamed function
                    console.log(`[OK] Séquence de 3 jours trouvée pour ${keyNorm} finissant le ${lastDateOfSequence}`);
                    break; // On a trouvé une séquence, pas besoin de chercher plus loin pour ce produit/PV
                }
            }
            
            // Si une séquence de 3 jours consécutifs a été trouvée
            if (foundConsecutive && lastDateOfSequence) {
                 // Récupérer les détails de l'alerte pour le DERNIER jour de la séquence
                const detailsToShow = entry.detailsByDate[lastDateOfSequence];
                if(detailsToShow){
                     finalAlerts.push(detailsToShow);
                } else {
                    console.warn(`Détails non trouvés pour la date ${lastDateOfSequence} de ${keyNorm}, alerte non ajoutée.`);
                }
            }
        }
        
        console.log(`[DEBUG] ===== Résumé final (après filtre 3 jours) =====`);
        console.log(`[DEBUG] Nombre total d'alertes à afficher: ${finalAlerts.length}`);
        
        // Trier les alertes finales (facultatif, peut reprendre le tri précédent si nécessaire)
        finalAlerts.sort((a, b) => {
             const ordrePointsVente = ["O.Foire", "Mbao"];
             const indexA = ordrePointsVente.indexOf(a.pointVente);
             const indexB = ordrePointsVente.indexOf(b.pointVente);
             if (indexA !== -1 && indexB !== -1) return indexA - indexB;
             else if (indexA !== -1) return -1;
             else if (indexB !== -1) return 1;
             else if (a.pointVente !== b.pointVente) return a.pointVente.localeCompare(b.pointVente);
             return parseDateToMillis(b.date) - parseDateToMillis(a.date); // Trier par date si même PV
        });
        
        // Afficher les résultats filtrés
        console.log(`[DEBUG StockAlerts] Final alerts to display:`, JSON.stringify(finalAlerts, null, 2)); // Added for debugging
        console.log(`[DEBUG] Appel à afficherAlertesAccumulation avec ${finalAlerts.length} alertes finales`);
        afficherAlertesAccumulation(finalAlerts);
        
    } catch (error) {
        console.error('Detailed error in rechercherAlertesAccumulation:', error); // Added for debugging
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
        dateRange.push(formatDateForStockAlerte(current)); // Use renamed function
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
function formatDateForStockAlerte(date) { // Renamed from formatDate
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
}

// Fonction pour récupérer les données de stock pour une date donnée
async function getStockForDate(date, type) {
    try {
        const response = await fetch(`/api/stock/${type}?date=${date}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            // If response is not OK, but it's a 404 (Not Found), return empty object gracefully
            if (response.status === 404) {
                console.log(`Stock ${type} data not found for ${date}, returning empty object.`);
                return {};
            }
            throw new Error(`Erreur HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle the actual response format: the response body IS the data object
        // Check if data is an object (basic validation)
        if (data && typeof data === 'object' && !Array.isArray(data)) {
             console.log(`Stock ${type} data received for ${date}:`, data);
             // No normalization needed here if the structure is already PointVente-Produit keys
            return data; 
        } else {
            console.warn(`Unexpected data format for stock ${type} on ${date}:`, data);
            return {};
        }

    } catch (error) {
        // Handle JSON parsing errors specifically if needed
        if (error instanceof SyntaxError) {
             console.error(`Erreur JSON lors de la récupération du stock ${type} pour ${date}:`, error);
        } else {
            console.error(`Erreur lors de la récupération du stock ${type} pour ${date}:`, error);
        }
        return {};
    }
}

// Fonction pour récupérer les transferts pour une date donnée
async function getTransfersForDate(date) {
    try {
        const response = await fetch(`/api/transferts?date=${date}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            // If response is not OK, but it's a 404 (Not Found), return empty array gracefully
            if (response.status === 404) {
                console.log(`Transfer data not found for ${date}, returning empty array.`);
                return [];
            }
            throw new Error(`Erreur HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Use the correct key 'transferts' as seen in Network logs
        if (data.success && Array.isArray(data.transferts)) {
             console.log(`Transfer data received for ${date}:`, data.transferts);
            return data.transferts;
        } else {
            console.warn(`Unexpected data format for transfers on ${date}:`, data);
            return [];
        }
        
    } catch (error) {
         if (error instanceof SyntaxError) {
             console.error(`Erreur JSON lors de la récupération des transferts pour ${date}:`, error);
        } else {
            console.error(`Erreur lors de la récupération des transferts pour ${date}:`, error);
        }
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

// Fonction pour filtrer le tableau de stock par point de vente et produit
function filtrerStock() {
    const pointVenteFiltre = document.getElementById('filtre-point-vente').value;
    const produitFiltre = document.getElementById('filtre-produit').value;
    const masquerQuantiteZero = document.getElementById('masquer-quantite-zero').checked;
    const rows = document.querySelectorAll('#stock-table tbody tr');

    console.log(`Filtrage du stock - Point de vente: ${pointVenteFiltre}, Produit: ${produitFiltre}, Masquer quantité zéro: ${masquerQuantiteZero}`);
    
    rows.forEach(row => {
        const pointVenteCell = row.querySelector('td:first-child select');
        const produitCell = row.querySelector('td:nth-child(2) select');
        const quantiteInput = row.querySelector('td:nth-child(3) input');
        
        if (!pointVenteCell || !produitCell) return;
        
        const pointVente = pointVenteCell.value;
        const produit = produitCell.value;
        const quantite = quantiteInput ? parseFloat(quantiteInput.value) || 0 : 0;
        
        const matchPointVente = pointVenteFiltre === 'tous' || pointVente === pointVenteFiltre;
        const matchProduit = produitFiltre === 'tous' || produit === produitFiltre;
        const matchQuantite = !masquerQuantiteZero || quantite > 0;
        
        if (matchPointVente && matchProduit && matchQuantite) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Fonction pour initialiser les filtres de stock
function initFilterStock() {
    const filtrePointVente = document.getElementById('filtre-point-vente');
    const filtreProduit = document.getElementById('filtre-produit');
    const masquerQuantiteZero = document.getElementById('masquer-quantite-zero');
    
    // Peupler le filtre de produits avec les produits de produitsInventaire.js
    if (filtreProduit && typeof produitsInventaire !== 'undefined') {
        // Vider les options existantes (sauf la première "Tous les produits")
        while (filtreProduit.children.length > 1) {
            filtreProduit.removeChild(filtreProduit.lastChild);
        }
        
        // Ajouter les produits de produitsInventaire.js
        if (typeof produitsInventaire.getTousLesProduits === 'function') {
            const produitsList = produitsInventaire.getTousLesProduits();
            produitsList.forEach(produit => {
                const option = document.createElement('option');
                option.value = produit;
                option.textContent = produit;
                filtreProduit.appendChild(option);
            });
        }
    }
    
    if (filtrePointVente) {
        filtrePointVente.addEventListener('change', filtrerStock);
    }
    
    if (filtreProduit) {
        filtreProduit.addEventListener('change', filtrerStock);
    }
    
    if (masquerQuantiteZero) {
        masquerQuantiteZero.addEventListener('change', filtrerStock);
    }
    
    // Initialiser le bouton "Aller à la rec."
    const btnAllerReconciliation = document.getElementById('btn-aller-reconciliation');
    if (btnAllerReconciliation) {
        btnAllerReconciliation.addEventListener('click', function() {
            naviguerVersReconciliation();
        });
    }
}

// Fonction pour naviguer vers la page Réconciliation avec la date du Stock inventaire
function naviguerVersReconciliation() {
    // Récupérer la date sélectionnée dans le Stock inventaire
    const dateInventaireInput = document.getElementById('date-inventaire');
    console.log("Élément date inventaire trouvé:", !!dateInventaireInput);
    
    if (!dateInventaireInput || !dateInventaireInput.value) {
        console.error("Aucune date sélectionnée ou élément date-inventaire non trouvé");
        alert('Veuillez sélectionner une date avant de naviguer vers la réconciliation');
        return;
    }
    
    // Récupérer la date avec le format complet (comme retourné par flatpickr)
    const dateInventaire = dateInventaireInput.value;
    console.log("Date récupérée du Stock inventaire:", dateInventaire);
    console.log("Type de la date:", typeof dateInventaire);
    
    // Stocker la date dans sessionStorage pour la récupérer dans la page Réconciliation
    sessionStorage.setItem('reconciliation_date', dateInventaire);
    console.log("Date stockée dans sessionStorage:", sessionStorage.getItem('reconciliation_date'));
    
    // Naviguer vers l'onglet Réconciliation
    const reconciliationTab = document.getElementById('reconciliation-tab');
    console.log("Onglet réconciliation trouvé:", !!reconciliationTab);
    
    if (reconciliationTab) {
        console.log("Clic sur l'onglet Réconciliation");
        reconciliationTab.click();
    } else {
        console.error("L'onglet Réconciliation n'a pas été trouvé");
        alert("Impossible de naviguer vers l'onglet Réconciliation. L'élément n'existe pas.");
    }
}

// ... existing code ...

// Fonction pour initialiser les écouteurs d'événements des onglets
function initTabListeners() {
    // Écouter les changements d'onglets
    const tabLinks = document.querySelectorAll('.nav-link');
    tabLinks.forEach(tab => {
        tab.addEventListener('click', function(e) {
            const tabId = this.id;
            console.log(`Navigation vers l'onglet: ${tabId}`);
            
            // Gestion spécifique pour l'onglet inventaire
            if (tabId === 'stock-inventaire-tab') {
                // Vérifier s'il y a des filtres à appliquer depuis la section réconciliation
                const pointVente = sessionStorage.getItem('inventaire_filter_point_vente');
                const date = sessionStorage.getItem('inventaire_filter_date');
                const periode = sessionStorage.getItem('inventaire_filter_periode');
                
                if (pointVente && date) {
                    console.log(`Filtrage de l'inventaire pour: ${pointVente}, date: ${date}, période: ${periode}`);
                    
                    // Définir la date dans le sélecteur de date
                    const dateInput = document.getElementById('date-inventaire');
                    if (dateInput) {
                        dateInput.value = date;
                        // Déclencher l'événement de changement pour charger les données
                        const event = new Event('change');
                        dateInput.dispatchEvent(event);
                    }
                    
                    // Définir le type de stock (matin ou soir)
                    const typeStockSelect = document.getElementById('type-stock');
                    if (typeStockSelect && periode) {
                        typeStockSelect.value = periode === 'matin' ? 'matin' : 'soir';
                        // Déclencher l'événement de changement
                        const event = new Event('change');
                        typeStockSelect.dispatchEvent(event);
                    }
                    
                    // Définir le point de vente dans le filtre
                    setTimeout(() => {
                        const filtrePointVente = document.getElementById('filtre-point-vente');
                        if (filtrePointVente) {
                            filtrePointVente.value = pointVente;
                            // Déclencher l'événement de changement pour filtrer
                            filtrerStock();
                        }
                        
                        // Effacer les filtres stockés pour éviter de les réappliquer à la prochaine ouverture
                        sessionStorage.removeItem('inventaire_filter_point_vente');
                        sessionStorage.removeItem('inventaire_filter_date');
                        sessionStorage.removeItem('inventaire_filter_periode');
                    }, 1000); // Attendre 1 seconde pour s'assurer que les données sont chargées
                }
            }
            
            // Gestion spécifique pour l'onglet réconciliation
            if (tabId === 'reconciliation-tab') {
                console.log("Navigation vers l'onglet Réconciliation");
                
                // Vérifier s'il y a une date stockée dans sessionStorage
                const storedDate = sessionStorage.getItem('reconciliation_date');
                console.log("Date stockée pour la réconciliation:", storedDate);
                
                if (storedDate) {
                    console.log("Date trouvée, va être appliquée après l'initialisation de flatpickr");
                    
                    // Attendre que l'onglet soit visible et que flatpickr soit initialisé
                    setTimeout(() => {
                        const dateInput = document.getElementById('date-reconciliation');
                        if (dateInput) {
                            console.log("Élément date-reconciliation trouvé");
                            
                            // Essayer d'abord avec flatpickr s'il est initialisé
                            if (dateInput._flatpickr) {
                                console.log("Flatpickr est initialisé, mise à jour de la date via flatpickr");
                                dateInput._flatpickr.setDate(storedDate, true); // true pour déclencher l'événement change
                                console.log("Date définie via flatpickr:", dateInput.value);
                            } else {
                                // Fallback: définir directement la valeur
                                console.log("Flatpickr non initialisé, définition directe de la valeur");
                                dateInput.value = storedDate;
                                
                                // Déclencher manuellement l'événement change
                                const event = new Event('change');
                                dateInput.dispatchEvent(event);
                                console.log("Événement change déclenché manuellement");
                            }
                            
                            // Mettre à jour explicitement l'élément d'affichage de la date
                            const dateDisplay = document.getElementById('date-reconciliation-display');
                            if (dateDisplay) {
                                console.log("Mise à jour de l'affichage de la date:", storedDate);
                                dateDisplay.textContent = storedDate;
                            } else {
                                console.error("Élément date-reconciliation-display non trouvé");
                            }
                            
                            // Supprimer la date du stockage
                            sessionStorage.removeItem('reconciliation_date');
                            console.log("Date supprimée de sessionStorage");
                        } else {
                            console.error("Élément date-reconciliation non trouvé");
                        }
                    }, 500); // Attendre 500ms pour s'assurer que l'onglet est visible et que flatpickr est initialisé
                }
            }

            // Gestion spécifique pour l'onglet estimation
            if (tabId === 'estimation-tab') {
                e.preventDefault();
                showSection('estimation-section');
                initEstimation();
            }
        });
    });
}

// Appeler l'initialisation des écouteurs d'onglets au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    initTabListeners();
    // ... autres initialisations existantes ...
});

// Gestionnaires d'onglets
document.getElementById('saisie-tab').addEventListener('click', function(e) {
    e.preventDefault();
    showSection('saisie-section');
});

document.getElementById('visualisation-tab').addEventListener('click', function(e) {
    e.preventDefault();
    showSection('visualisation-section');
});

document.getElementById('stock-inventaire-tab').addEventListener('click', function(e) {
    e.preventDefault();
    showSection('stock-inventaire-section');
});

document.getElementById('copier-stock-tab').addEventListener('click', function(e) {
    e.preventDefault();
    showSection('copier-stock-section');
});

document.getElementById('suivi-achat-boeuf-tab').addEventListener('click', function(e) {
    e.preventDefault();
    showSection('suivi-achat-boeuf-section');
});

document.getElementById('reconciliation-tab').addEventListener('click', function(e) {
    e.preventDefault();
    showSection('reconciliation-section');
});


document.getElementById('stock-alerte-tab').addEventListener('click', function(e) {
    e.preventDefault();
    showSection('stock-alerte-section');
});

document.getElementById('cash-payment-tab').addEventListener('click', function(e) {
    e.preventDefault();
    showSection('cash-payment-section');
});

document.getElementById('estimation-tab').addEventListener('click', function(e) {
    e.preventDefault();
    showSection('estimation-section');
});

// Fonction pour initialiser la section de réconciliation mensuelle
function initReconciliationMensuelle() {
    console.log('Initialisation de la section de réconciliation mensuelle');
    
    // S'assurer que la section est visible
    document.getElementById('reconciliation-mois-section').style.display = 'block';
    
    // Initialiser le mois et l'année avec les valeurs actuelles
    const currentDate = new Date();
    const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const currentYear = currentDate.getFullYear().toString();
    
    const moisSelect = document.getElementById('mois-reconciliation');
    const anneeSelect = document.getElementById('annee-reconciliation');
    
    // Définir les valeurs par défaut
    if (moisSelect) moisSelect.value = currentMonth;
    if (anneeSelect) {
        // Vérifier si l'année courante existe dans les options
        let yearExists = false;
        for (let i = 0; i < anneeSelect.options.length; i++) {
            if (anneeSelect.options[i].value === currentYear) {
                yearExists = true;
                break;
            }
        }
        
        // Si l'année n'existe pas, l'ajouter
        if (!yearExists) {
            const option = document.createElement('option');
            option.value = currentYear;
            option.textContent = currentYear;
            anneeSelect.appendChild(option);
        }
        
        anneeSelect.value = currentYear;
    }
    
    // Ajouter les écouteurs d'événements pour les changements de mois/année
    if (moisSelect) {
        moisSelect.addEventListener('change', function() {
            chargerReconciliationMensuelle();
        });
    }
    
    if (anneeSelect) {
        anneeSelect.addEventListener('change', function() {
            chargerReconciliationMensuelle();
        });
    }
        // Ajouter l'écouteur d'événement pour le bouton d'export Excel
        const btnExportExcelMois = document.getElementById('export-reconciliation-mois');
        if (btnExportExcelMois) {
            console.log('[DEBUG] Bouton Export Excel (export-reconciliation-mois) trouvé. Ajout écouteur.'); 
            btnExportExcelMois.addEventListener('click', exportReconciliationMoisToExcel);
        } else {
            console.error('Bouton d\'export Excel non trouvé!');
        }
    // Ajouter l'écouteur d'événement pour le filtre de point de vente
    const pointVenteFiltre = document.getElementById('point-vente-filtre-mois');
    if (pointVenteFiltre) {
        // Vider les options existantes sauf la première
        while (pointVenteFiltre.options.length > 1) {
            pointVenteFiltre.remove(1);
        }
        
        // Populer les options de point de vente
        POINTS_VENTE_PHYSIQUES.forEach(pointVente => {
            const option = document.createElement('option');
            option.value = pointVente;
            option.textContent = pointVente;
            pointVenteFiltre.appendChild(option);
        });
        
        pointVenteFiltre.addEventListener('change', function() {
            filtrerTableauReconciliationMensuelle();
        });
    }
    
    // Ajouter l'écouteur d'événement pour le bouton de chargement des commentaires
    const btnChargerCommentairesMois = document.getElementById('charger-commentaires-mois');
    if (btnChargerCommentairesMois) {
        btnChargerCommentairesMois.addEventListener('click', function(e) {
            e.preventDefault();
            chargerCommentairesMensuels();
            return false;
        });
    }
    
    // Charger les données
    chargerReconciliationMensuelle();
}

let isLoadingReconciliationMensuelle = false; // Moved to global scope here

/**
 * Charge les données de réconciliation pour le mois et l'année sélectionnés
 */
async function chargerReconciliationMensuelle() {
    if (isLoadingReconciliationMensuelle) {
        console.log("Chargement de la réconciliation mensuelle déjà en cours. Annulation de la nouvelle demande.");
        return;
    }
    isLoadingReconciliationMensuelle = true;

    try { // Add try block
        const moisSelect = document.getElementById('mois-reconciliation');
        const anneeSelect = document.getElementById('annee-reconciliation');

        // --- Récupérer les éléments des totaux ---
        const totalVentesTheoriquesEl = document.getElementById('total-ventes-theoriques-mois');
        const totalVentesSaisiesEl = document.getElementById('total-ventes-saisies-mois');
        const totalVersementsEl = document.getElementById('total-versements-mois');
        // --- Récupérer l'élément pour l'estimation ---
        const estimationVersementsEl = document.getElementById('estimation-versements-mois');

        // --- Réinitialiser les totaux affichés ---
        if (totalVentesTheoriquesEl) totalVentesTheoriquesEl.textContent = formatMonetaire(0);
        if (totalVentesSaisiesEl) totalVentesSaisiesEl.textContent = formatMonetaire(0);
        if (totalVersementsEl) totalVersementsEl.textContent = formatMonetaire(0);
        // --- Réinitialiser l'estimation ---
        if (estimationVersementsEl) estimationVersementsEl.textContent = formatMonetaire(0);

        // --- Initialiser les variables de calcul des totaux ---
        let totalVentesTheoriquesMois = 0;
        let totalVentesSaisiesMois = 0;
        let totalVersementsMois = 0;
        let dernierJourAvecDonnees = 0; // Pour l'estimation
        // --- Fin initialisation totaux ---

        if (!moisSelect || !anneeSelect) {
            console.error('Sélecteurs de mois/année non trouvés');
            return;
        }

        const mois = moisSelect.value;
        const annee = anneeSelect.value;

        console.log(`Chargement des données de réconciliation pour ${mois}/${annee}`);

        const loadingIndicator = document.getElementById('loading-indicator-reconciliation-mois');
        if (loadingIndicator) loadingIndicator.style.display = 'block';

        const tableBody = document.querySelector('#reconciliation-mois-table tbody');
        tableBody.innerHTML = ''; // Vider le tableau

        // --- Add check for valid month selection ---
        if (!mois) {
            console.warn("Aucun mois valide sélectionné. Arrêt du chargement.");
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 12; // Adjust colspan if needed
            cell.textContent = 'Aucun mois sélectionné ou aucune donnée pour cette année.';
            cell.className = 'text-center';
            row.appendChild(cell);
            tableBody.appendChild(row);
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            // Reset totals and estimation if no month selected
            if (totalVentesTheoriquesEl) totalVentesTheoriquesEl.textContent = formatMonetaire(0);
            if (totalVentesSaisiesEl) totalVentesSaisiesEl.textContent = formatMonetaire(0);
            if (totalVersementsEl) totalVersementsEl.textContent = formatMonetaire(0);
            if (estimationVersementsEl) estimationVersementsEl.textContent = formatMonetaire(0);
            return; // Stop execution
        }
        // --- End check ---

        const anneeNum = parseInt(annee);
        const moisNum = parseInt(mois); // Mois est 1-basé ici
        const totalDaysInMonth = new Date(anneeNum, moisNum, 0).getDate();
        let hasAnyData = false; // Flag to check if any data was found for the month

        for (let jour = 1; jour <= totalDaysInMonth; jour++) {
            const dateStr = `${jour.toString().padStart(2, '0')}/${mois}/${annee}`;
            console.log(`Traitement du jour ${dateStr}...`);

            // 1. Fetch base data components
            let stockMatin, stockSoir, transferts, ventesData;
            try {
                [stockMatin, stockSoir, transferts, ventesData] = await Promise.all([
                    getStockForDate(dateStr, 'matin'),
                    getStockForDate(dateStr, 'soir'),
                    getTransfersForDate(dateStr),
                    fetch(`/api/ventes-date?date=${dateStr}`, { method: 'GET', credentials: 'include' }).then(res => res.ok ? res.json() : { success: false })
                ]);
                console.log(`Données brutes pour ${dateStr}:`, { stockMatin: Object.keys(stockMatin).length, stockSoir: Object.keys(stockSoir).length, transferts: transferts.length, ventes: ventesData.success ? ventesData.totaux : {} });
            } catch (fetchError) {
                console.error(`Erreur de fetch pour ${dateStr}:`, fetchError);
                continue; // Skip this day if base data fetch fails
            }

            const ventesSaisies = ventesData.success && ventesData.totaux ? ventesData.totaux : {};

            // 2. Check if any data exists for this date
            const dayHasData =
                Object.keys(stockMatin).length > 0 ||
                Object.keys(stockSoir).length > 0 ||
                transferts.length > 0 ||
                Object.keys(ventesSaisies).length > 0;

            if (!dayHasData) {
                console.log(`Aucune donnée pour ${dateStr}, jour ignoré.`);
                continue; // Skip this day if no data
            }

            hasAnyData = true; // Mark that we found data for at least one day
            dernierJourAvecDonnees = jour; // Update last day with data for estimation

            // 3. Calculate reconciliation for the day
            let dailyReconciliation = {};
            const debugInfo = { date: dateStr, detailsParPointVente: {} }; // Minimal debug info
            try {
                // Pass dateStr as the first argument
                dailyReconciliation = await calculerReconciliationParPointVente(dateStr, stockMatin, stockSoir, transferts, debugInfo);
                console.log(`Réconciliation calculée pour ${dateStr}:`, dailyReconciliation);
            } catch (calcError) {
                console.error(`Erreur de calcul pour ${dateStr}:`, calcError);
                // Initialize with zeros if calculation fails but base data exists
                POINTS_VENTE_PHYSIQUES.forEach(pv => {
                    dailyReconciliation[pv] = { stockMatin: 0, stockSoir: 0, transferts: 0, ventes: 0, ventesSaisies: 0, difference: 0, pourcentageEcart: 0, cashPayment: 0, ecartCash: 0, commentaire: 'Erreur calcul' };
                });
            }

            // 4. Fetch saved reconciliation data (for comments/cash)
            let savedData = null;
            try {
                const loadResponse = await fetch(`/api/reconciliation/load?date=${dateStr}`, {
                    method: 'GET',
                    credentials: 'include'
                });
                if (loadResponse.ok) {
                    const loadResult = await loadResponse.json();
                    if (loadResult.success && loadResult.data) {
                        if (loadResult.data.reconciliation) {
                            savedData = loadResult.data.reconciliation;
                        } else if (loadResult.data.data) { // Compatibility
                            try { savedData = JSON.parse(loadResult.data.data); } catch(e) { savedData = loadResult.data.data; }
                        }
                        console.log(`Données sauvegardées chargées pour ${dateStr}:`, savedData);
                    }
                }
            } catch (loadError) {
                console.warn(`Erreur chargement données sauvegardées pour ${dateStr}:`, loadError);
            }

            // 5. Merge saved comments/cash into calculated data and Accumulate totals
            if (savedData) {
                Object.keys(savedData).forEach(pointVente => {
                    if (dailyReconciliation[pointVente]) {
                        if (savedData[pointVente].commentaire) {
                            dailyReconciliation[pointVente].commentaire = savedData[pointVente].commentaire;
                        }
                        if (savedData[pointVente].cashPayment !== undefined) { // Check for undefined, as 0 is valid
                            dailyReconciliation[pointVente].cashPayment = parseFloat(savedData[pointVente].cashPayment) || 0; // Ensure it's a number
                            // Recalculate ecartCash if cashPayment was loaded
                            dailyReconciliation[pointVente].ecartCash = (dailyReconciliation[pointVente].cashPayment || 0) - (dailyReconciliation[pointVente].ventesSaisies || 0);
                        } else {
                            // Ensure cashPayment is initialized if not in saved data
                             dailyReconciliation[pointVente].cashPayment = 0;
                             dailyReconciliation[pointVente].ecartCash = 0 - (dailyReconciliation[pointVente].ventesSaisies || 0);
                        }
                    }
                });
            } else {
                // Ensure cashPayment is initialized if no saved data
                Object.keys(dailyReconciliation).forEach(pointVente => {
                     if (dailyReconciliation[pointVente]) {
                         dailyReconciliation[pointVente].cashPayment = 0;
                         dailyReconciliation[pointVente].ecartCash = 0 - (dailyReconciliation[pointVente].ventesSaisies || 0);
                     }
                });
            }

             // --- Accumuler les totaux pour ce jour ---
             Object.values(dailyReconciliation).forEach(data => {
                 totalVentesTheoriquesMois += parseFloat(data.ventes) || 0;
                 totalVentesSaisiesMois += parseFloat(data.ventesSaisies) || 0;
                 totalVersementsMois += parseFloat(data.cashPayment) || 0;
             });
             // --- Fin accumulation totaux ---

            // 6. Generate table rows for this date
            Object.keys(dailyReconciliation).forEach(pointVente => {
                 if (!POINTS_VENTE_PHYSIQUES.includes(pointVente)) return;

                 const data = dailyReconciliation[pointVente];
                 const row = document.createElement('tr');

                 // Cellule Date
                 let cell = document.createElement('td');
                 cell.textContent = dateStr;
                 row.appendChild(cell);

                 // Cellule Point de Vente
                 cell = document.createElement('td');
                 cell.textContent = pointVente;
                 row.appendChild(cell);

                 // Cellules de valeurs (stock matin, stock soir, etc.)
                 const columns = [
                     { key: 'stockMatin', format: 'currency' },
                     { key: 'stockSoir', format: 'currency' },
                     { key: 'transferts', format: 'currency' },
                     { key: 'ventes', format: 'currency' }, // Theoretical Sales
                     { key: 'ventesSaisies', format: 'currency' },
                     { key: 'difference', format: 'currency' }, // Ecart
                     { key: 'cashPayment', format: 'currency' },
                     { key: 'pourcentageEcart', format: 'percentage' }, // Ecart %
                     { key: 'ecartCash', format: 'currency' }
                 ];

                 columns.forEach(columnInfo => {
                     cell = document.createElement('td');
                     cell.className = 'text-end';

                     const value = data ? data[columnInfo.key] : 0;

                     if (columnInfo.format === 'percentage') {
                         const percentageValue = parseFloat(value) || 0;
                         cell.textContent = `${percentageValue.toFixed(2)}%`;

                         if (Math.abs(percentageValue) > 10) {
                             cell.classList.add('text-danger', 'fw-bold');
                         } else if (Math.abs(percentageValue) > 8) {
                             cell.classList.add('text-warning', 'fw-bold');
                         } else if (Math.abs(percentageValue) > 0) {
                             cell.classList.add('text-success', 'fw-bold');
                         }
                     } else { // currency
                         const currencyValue = parseFloat(value) || 0;
                         cell.textContent = formatMonetaire(currencyValue);

                         if ((columnInfo.key === 'difference' || columnInfo.key === 'ecartCash') && currencyValue !== 0) {
                             cell.classList.add(currencyValue < 0 ? 'negative' : 'positive');
                         }
                     }
                     row.appendChild(cell);
                 });

                 // Cellule Commentaire
                 cell = document.createElement('td');
                 const inputComment = document.createElement('input');
                 inputComment.type = 'text';
                 inputComment.className = 'form-control form-control-sm'; // smaller input
                 inputComment.value = data.commentaire || '';
                 inputComment.setAttribute('data-point-vente', pointVente);
                 inputComment.setAttribute('data-date', dateStr);
                 // Add event listener for saving comments if needed later
                 cell.appendChild(inputComment);
                 row.appendChild(cell);

                 tableBody.appendChild(row);
             });
        }

        // --- Calcul et affichage de l'estimation ---
        let estimationVersements = 0;
        if (hasAnyData && dernierJourAvecDonnees > 0) {
            let effectiveDaysPassed = 0;
            for (let d = 1; d <= dernierJourAvecDonnees; d++) {
                const currentDate = new Date(anneeNum, moisNum - 1, d);
                effectiveDaysPassed += (currentDate.getDay() === 0) ? 0.5 : 1; // Sunday is 0
            }

            let totalEffectiveDaysInMonth = 0;
            for (let d = 1; d <= totalDaysInMonth; d++) {
                const currentDate = new Date(anneeNum, moisNum - 1, d);
                totalEffectiveDaysInMonth += (currentDate.getDay() === 0) ? 0.5 : 1; // Sunday is 0
            }

            if (effectiveDaysPassed > 0) {
                estimationVersements = totalVersementsMois * (totalEffectiveDaysInMonth / effectiveDaysPassed);
                console.log(`Estimation calculée: TotalVersements=${totalVersementsMois}, JoursEffectifsPassés=${effectiveDaysPassed}, TotalJoursEffectifs=${totalEffectiveDaysInMonth}, Estimation=${estimationVersements}`);
            } else {
                 console.log("Jours effectifs passés est 0, estimation mise à 0.");
            }
        } else {
            console.log("Aucune donnée ou dernier jour avec données est 0, estimation mise à 0.");
        }

        if (estimationVersementsEl) {
            estimationVersementsEl.textContent = formatMonetaire(estimationVersements);
        }
        // --- Fin calcul et affichage estimation ---


        // If after checking all days, no data was found, display a message
        if (!hasAnyData) {
             const row = document.createElement('tr');
             const cell = document.createElement('td');
             cell.colSpan = 12; // Adjust colspan to match the number of columns
             cell.textContent = 'Aucune donnée trouvée pour ce mois.';
             cell.className = 'text-center';
             row.appendChild(cell);
             tableBody.appendChild(row);
             // --- Réinitialiser les totaux si aucune donnée ---
             if (totalVentesTheoriquesEl) totalVentesTheoriquesEl.textContent = formatMonetaire(0);
             if (totalVentesSaisiesEl) totalVentesSaisiesEl.textContent = formatMonetaire(0);
             if (totalVersementsEl) totalVersementsEl.textContent = formatMonetaire(0);
             // --- Reset estimation si aucune donnée ---
             if (estimationVersementsEl) estimationVersementsEl.textContent = formatMonetaire(0);

        } else {
            // --- Mettre à jour les totaux affichés si des données existent ---
            if (totalVentesTheoriquesEl) totalVentesTheoriquesEl.textContent = formatMonetaire(totalVentesTheoriquesMois);
            if (totalVentesSaisiesEl) totalVentesSaisiesEl.textContent = formatMonetaire(totalVentesSaisiesMois);
            if (totalVersementsEl) totalVersementsEl.textContent = formatMonetaire(totalVersementsMois);
            // Estimation déjà mise à jour ci-dessus
        }

        // Filter the table based on the current dropdown selection
        filtrerTableauReconciliationMensuelle();

    } catch (error) {
        console.error('Erreur majeure lors du chargement des données mensuelles:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="12" class="text-center text-danger">
                    Une erreur majeure est survenue: ${error.message}
                </td>
            </tr>
        `;
        // --- Réinitialiser les totaux en cas d'erreur majeure ---
        if (totalVentesTheoriquesEl) totalVentesTheoriquesEl.textContent = formatMonetaire(0);
        if (totalVentesSaisiesEl) totalVentesSaisiesEl.textContent = formatMonetaire(0);
        if (totalVersementsEl) totalVersementsEl.textContent = formatMonetaire(0);
        // --- Reset estimation en cas d'erreur majeure ---
         if (estimationVersementsEl) estimationVersementsEl.textContent = formatMonetaire(0);
    } finally { // Add finally block
        isLoadingReconciliationMensuelle = false;
        const loadingIndicator = document.getElementById('loading-indicator-reconciliation-mois'); // Ensure indicator is hidden
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
}

/**
 * Filtre le tableau de réconciliation mensuelle selon le point de vente sélectionné
 */
function filtrerTableauReconciliationMensuelle() {
    const filtre = document.getElementById('point-vente-filtre-mois').value;
    const rows = document.querySelectorAll('#reconciliation-mois-table tbody tr');
    
    rows.forEach(row => {
        const pointVente = row.cells[1].textContent;
        if (filtre === '' || pointVente === filtre) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

/**
 * Charge les commentaires pour la réconciliation mensuelle
 */
async function chargerCommentairesMensuels() {
    console.log('Chargement des commentaires pour la réconciliation mensuelle');
    
    const mois = document.getElementById('mois-reconciliation').value;
    const annee = document.getElementById('annee-reconciliation').value;
    
    // Afficher l'indicateur de chargement
    const loadingIndicator = document.getElementById('loading-indicator-reconciliation-mois');
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    
    try {
        // Récupérer les commentaires pour chaque jour du mois
        const commentaires = {};
        
        // Déterminer le nombre de jours dans le mois
        const dernierJour = new Date(parseInt(annee), parseInt(mois), 0).getDate();
        
        // Pour chaque jour du mois, récupérer les commentaires
        for (let jour = 1; jour <= dernierJour; jour++) {
            const dateStr = `${jour.toString().padStart(2, '0')}/${mois}/${annee}`;
            
            try {
                // Charger les commentaires pour cette date
                const response = await fetch(`reconciliation/commentaires_${dateStr}.json`);
                if (response.ok) {
                    const data = await response.json();
                    commentaires[dateStr] = data;
                }
            } catch (error) {
                console.log(`Pas de commentaires pour ${dateStr}`);
            }
        }
        
        // Mettre à jour les commentaires dans le tableau
        const rows = document.querySelectorAll('#reconciliation-mois-table tbody tr');
        rows.forEach(row => {
            const date = row.cells[0].textContent;
            const pointVente = row.cells[1].textContent;
            
            if (commentaires[date] && commentaires[date][pointVente]) {
                const commentaireInput = row.querySelector(`input[data-date="${date}"][data-point-vente="${pointVente}"]`);
                if (commentaireInput) {
                    commentaireInput.value = commentaires[date][pointVente].commentaire || '';
                }
            }
        });
        
    } catch (error) {
        console.error('Erreur lors du chargement des commentaires mensuels:', error);
        alert('Une erreur est survenue lors du chargement des commentaires');
    } finally {
        // Masquer l'indicateur de chargement
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
}

// Fonction pour afficher une section spécifique
function showSection(sectionId) {
    hideAllSections();
    document.getElementById(sectionId).style.display = 'block';
    
    // Désactiver tous les onglets
    const tabs = document.querySelectorAll('.nav-link');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // Activer l'onglet correspondant
    const tabId = sectionId.replace('-section', '-tab');
    const tab = document.getElementById(tabId);
    if (tab) {
        tab.classList.add('active');
    }
    
    // Keep content-section elements hidden when showing saisie section
    if (sectionId === 'saisie-section') {
        console.log('Showing saisie section - hiding content-section elements');
        const contentSections = document.querySelectorAll('.content-section');
        console.log(`Found ${contentSections.length} content-section elements to hide`);
        contentSections.forEach(el => {
            console.log(`Hiding element: ${el.id}`);
            el.style.display = 'none';
        });
    }
    
    // Initialiser la section selon son type
    if (sectionId === 'reconciliation-section') {
        initReconciliation();
    } else if (sectionId === 'reconciliation-mois-section') {
        initReconciliationMensuelle();
    } else if (sectionId === 'visualisation-section') {
        chargerVentes();
    } else if (sectionId === 'stock-inventaire-section') {
        initInventaire();
    } else if (sectionId === 'stock-alerte-section') {
        initStockAlerte();
    } else if (sectionId === 'copier-stock-section') {
        initCopierStock();
    }
    // Add condition for the new section
    else if (sectionId === 'suivi-achat-boeuf-section') {
        if (typeof initSuiviAchatBoeuf === 'function') {
            initSuiviAchatBoeuf();
        } else {
            console.error('initSuiviAchatBoeuf function not found when showing section!');
        }
    }
}


window.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Loaded - Adding button...');
    
    // Définir les prix par défaut acceptables
    const PRIX_DEFAUT_RANGES = {
        'Boeuf': [3400, 3500, 3600, 3700, 3800, 3900],
        'Veau': [3500, 3600, 3700, 3800, 3900]
    };

    // Fonction pour vérifier si un prix est considéré comme "par défaut"
    function isPrixDefaut(produit, prix) {
        const prixNum = parseFloat(prix) || 0;
        const validPrices = PRIX_DEFAUT_RANGES[produit];
        return !prix || prixNum === 0 || (validPrices && validPrices.includes(prixNum));
    }
    
    // Add the button only if not already present
    if (!document.getElementById('btn-prix-pondere')) {
        const btn = document.createElement('button');
        btn.id = 'btn-prix-pondere';
        btn.className = 'btn btn-info mb-2';
        btn.textContent = 'Remplir Prix Moyen Pondéré (Boeuf/Veau)';
        
         // Style pour aligner à droite
         btn.style.cssText = `
         margin: 10px;
         float: right;
         margin-right: 20px;
     `;
        
        // Try multiple locations to insert the button
        const stockSection = document.getElementById('stock-inventaire-section');
        const stockTable = document.getElementById('stock-table');
        
        if (stockSection) {
            stockSection.insertBefore(btn, stockSection.firstChild);
            console.log('Button added to stock section');
        } else if (stockTable && stockTable.parentElement) {
            stockTable.parentElement.insertBefore(btn, stockTable);
            console.log('Button added before stock table');
        } else {
            // Fallback: add to the top of the page
            document.body.insertBefore(btn, document.body.firstChild);
            console.log('Button added to body');
        }
        
        console.log('Button "Remplir Prix Moyen Pondéré" has been added!');
    }

    // Add click event listener
    setTimeout(function() {
        const button = document.getElementById('btn-prix-pondere');
        if (button) {
            button.addEventListener('click', async function() {
                const typeStock = document.getElementById('type-stock') ? document.getElementById('type-stock').value : '';
                const date = document.getElementById('date-inventaire') ? document.getElementById('date-inventaire').value : '';

                console.log('=== DEBUG: Button clicked ===');
                console.log('typeStock:', typeStock);
                console.log('date:', date);
                console.log('PRIX_DEFAUT_RANGES:', PRIX_DEFAUT_RANGES);

                // --- STOCK TABLE ---
                const stockRows = Array.from(document.querySelectorAll('#stock-table tbody tr'));
                console.log('Stock rows found:', stockRows.length);
                
                for (const row of stockRows) {
                    const produitSelect = row.querySelector('.produit-select');
                    const pointVenteSelect = row.querySelector('.point-vente-select');
                    const prixInput = row.querySelector('.prix-unitaire-input');
                    
                    if (!produitSelect || !pointVenteSelect || !prixInput) {
                        console.log('Missing elements in row, skipping');
                        continue;
                    }
                    
                    const produit = produitSelect.value;
                    const pointVente = pointVenteSelect.value;
                    
                    console.log('=== Row Debug ===');
                    console.log('Produit:', produit);
                    console.log('Point de Vente:', pointVente);
                    console.log('Prix Input Value:', prixInput.value);
                    console.log('Is Boeuf or Veau?', (produit === 'Boeuf' || produit === 'Veau'));
                    console.log('Is prix défaut?', isPrixDefaut(produit, prixInput.value));
                    
                    if ((produit === 'Boeuf' || produit === 'Veau') && isPrixDefaut(produit, prixInput.value)) {
                        console.log('*** MAKING API CALL FOR:', produit);
                        try {
                            if (typeStock === 'matin' || typeStock === 'soir') {
                                const url = `/api/prix-moyen?type=${encodeURIComponent(produit.toLowerCase())}&date=${encodeURIComponent(date)}&pointVente=${encodeURIComponent(pointVente)}`;
                                console.log('API URL:', url);
                                const response = await fetch(url);
                                console.log('API Response status:', response.status);
                                if (!response.ok) throw new Error('API error: ' + response.status);
                                const data = await response.json();
                                console.log('API Response:', data);
                                if (data.success && Array.isArray(data.data) && data.data.length > 0) {
                                    prixInput.value = parseFloat(data.data[0].prix_moyen_pondere);
                                    console.log('Updated price to:', prixInput.value);
                                    // Trigger change event to update totals
                                    prixInput.dispatchEvent(new Event('input', { bubbles: true }));
                                } else {
                                    // Fallback to default if no data
                                    const fallbackPrice = (typeof PRIX_DEFAUT !== 'undefined' && PRIX_DEFAUT[produit]) ? PRIX_DEFAUT[produit] : (PRIX_DEFAUT_RANGES[produit] ? PRIX_DEFAUT_RANGES[produit][3] : 0);
                                    prixInput.value = fallbackPrice;
                                    console.log('Stock - No data, using fallback:', fallbackPrice);
                                    prixInput.dispatchEvent(new Event('input', { bubbles: true }));
                                }
                            }
                        } catch (err) {
                            console.error('Erreur lors de la récupération du prix moyen (stock):', err);
                            // Use fallback on error
                            const fallbackPrice = (typeof PRIX_DEFAUT !== 'undefined' && PRIX_DEFAUT[produit]) ? PRIX_DEFAUT[produit] : (PRIX_DEFAUT_RANGES[produit] ? PRIX_DEFAUT_RANGES[produit][3] : 0);
                            prixInput.value = fallbackPrice;
                            console.log('Stock - Error, using fallback:', fallbackPrice);
                            prixInput.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    } else {
                        console.log('*** SKIPPING ROW - conditions not met');
                    }
                }

                // --- TRANSFERT TABLE ---
                const transfertRows = Array.from(document.querySelectorAll('#transfertTable tbody tr'));
                console.log('Transfert rows found:', transfertRows.length);
                
                for (const row of transfertRows) {
                    const produitSelect = row.querySelector('.produit-select');
                    const prixInput = row.querySelector('.prix-unitaire-input');
                    
                    if (!produitSelect || !prixInput) {
                        console.log('Missing elements in transfert row, skipping');
                        continue;
                    }
                    
                    const produit = produitSelect.value;
                    console.log('Transfert - Produit:', produit, 'Prix:', prixInput.value);
                    
                    // For transfert: Only check if it's Boeuf or Veau (no strict price condition)
                    if (produit === 'Boeuf' || produit === 'Veau') {
                        console.log('*** MAKING TRANSFERT API CALL FOR:', produit);
                        try {
                            // TRANSFERT: Call API without pointVente parameter
                            const url = `/api/prix-moyen?type=${encodeURIComponent(produit.toLowerCase())}&date=${encodeURIComponent(date)}`;
                            console.log('Transfert API URL:', url);
                            const response = await fetch(url);
                            console.log('Transfert API Response status:', response.status);
                            if (!response.ok) throw new Error('API error: ' + response.status);
                            const data = await response.json();
                            console.log('Transfert API Response:', data);
                            if (data.success && Array.isArray(data.data) && data.data.length > 0) {
                                prixInput.value = parseFloat(data.data[0].prix_moyen_pondere);
                                console.log('Transfert - Updated price to:', prixInput.value);
                                // Trigger change event to update totals
                                prixInput.dispatchEvent(new Event('input', { bubbles: true }));
                            } else {
                                // Fallback to default if no data
                                const defaultPrice = (typeof PRIX_DEFAUT !== 'undefined' && PRIX_DEFAUT[produit]) ? PRIX_DEFAUT[produit] : (PRIX_DEFAUT_RANGES[produit] ? PRIX_DEFAUT_RANGES[produit][3] : 0);
                                prixInput.value = defaultPrice;
                                console.log('Transfert - No data, using fallback:', defaultPrice);
                                prixInput.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                        } catch (err) {
                            console.error('Erreur lors de la récupération du prix moyen (transfert):', err);
                            // Use fallback on error
                            const defaultPrice = (typeof PRIX_DEFAUT !== 'undefined' && PRIX_DEFAUT[produit]) ? PRIX_DEFAUT[produit] : (PRIX_DEFAUT_RANGES[produit] ? PRIX_DEFAUT_RANGES[produit][3] : 0);
                            prixInput.value = defaultPrice;
                            console.log('Transfert - Error, using fallback:', defaultPrice);
                            prixInput.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    } else {
                        console.log('*** SKIPPING TRANSFERT ROW - not Boeuf/Veau');
                    }
                }

                alert('Prix moyen pondéré appliqué (si disponible) pour Boeuf/Veau dans Stock et Transfert.');
            });
            console.log('Click event listener added to button');
        } else {
            console.error('Button not found after creation!');
        }
    }, 100);
});

// Function to export visualization/ventes data to Excel
function exportVisualisationToExcel() {
    try {
        // Check if XLSX library is loaded
        if (typeof XLSX === 'undefined') {
            console.error("Erreur: La bibliothèque XLSX n'est pas chargée.");
            alert("Erreur: La bibliothèque XLSX n'est pas chargée. Veuillez rafraîchir la page.");
            return;
        }

        // Get data from the visualization table
        const table = document.getElementById('tableau-ventes');
        if (!table) {
            alert('Tableau des ventes non trouvé');
            return;
        }

        const tbody = table.querySelector('tbody');
        if (!tbody || tbody.rows.length === 0) {
            alert('Aucune donnée à exporter dans le tableau des ventes');
            return;
        }

        // Extract headers
        const headers = [];
        const headerCells = table.querySelectorAll('thead th');
        headerCells.forEach(cell => {
            headers.push(cell.textContent.trim());
        });

        // Extract data rows
        const exportData = [];
        
        // Process each row in the table
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            const rowData = {};
            const cells = row.querySelectorAll('td');
            
            cells.forEach((cell, index) => {
                if (index < headers.length) {
                    const headerName = headers[index];
                    let cellValue = cell.textContent.trim();
                    
                    // Convert numeric fields to numbers for proper Excel formatting
                    if (headerName === 'Prix Unitaire' || headerName === 'Quantité' || headerName === 'Montant') {
                        // Remove any formatting and convert to number
                        const numericValue = parseFloat(cellValue.replace(/[^0-9.,]/g, '').replace(',', '.'));
                        cellValue = isNaN(numericValue) ? 0 : numericValue;
                    }
                    
                    rowData[headerName] = cellValue;
                }
            });
            
            // Only add rows that have actual data
            if (Object.values(rowData).some(value => value !== '' && value !== 0)) {
                exportData.push(rowData);
            }
        });

        if (exportData.length === 0) {
            alert('Aucune donnée valide à exporter');
            return;
        }

        // Create workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(exportData);

        // Format currency columns
        const currencyFormat = '#,##0 FCFA';
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        
        for (let R = range.s.r + 1; R <= range.e.r; ++R) {
            // Prix Unitaire, Montant columns (adjust indices based on actual headers)
            const prixUnitaireCol = headers.indexOf('Prix Unitaire');
            const montantCol = headers.indexOf('Montant');
            const quantiteCol = headers.indexOf('Quantité');
            
            [prixUnitaireCol, montantCol].forEach(C => {
                if (C >= 0) {
                    const cell_address = { c: C, r: R };
                    const cell_ref = XLSX.utils.encode_cell(cell_address);
                    if (worksheet[cell_ref] && typeof worksheet[cell_ref].v === 'number') {
                        worksheet[cell_ref].t = 'n';
                        worksheet[cell_ref].z = currencyFormat;
                    }
                }
            });
            
            // Format quantity column
            if (quantiteCol >= 0) {
                const qty_cell_address = { c: quantiteCol, r: R };
                const qty_cell_ref = XLSX.utils.encode_cell(qty_cell_address);
                if (worksheet[qty_cell_ref] && typeof worksheet[qty_cell_ref].v === 'number') {
                    worksheet[qty_cell_ref].t = 'n';
                }
            }
        }

        // Set column widths
        const colWidths = headers.map(header => {
            switch (header) {
                case 'Date': return { wch: 12 };
                case 'Point de Vente': case 'Préparation': return { wch: 15 };
                case 'Produit': return { wch: 18 };
                case 'Catégorie': return { wch: 12 };
                case 'Prix Unitaire': case 'Montant': return { wch: 15 };
                case 'Nom Client': case 'Adresse Client': return { wch: 20 };
                case 'Numéro Client': return { wch: 15 };
                default: return { wch: 10 };
            }
        });
        worksheet['!cols'] = colWidths;

        // Add the worksheet to the workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Tableau des Ventes');

        // Generate filename with current date
        const currentDate = new Date();
        const dateStr = currentDate.toISOString().slice(0, 10).replace(/-/g, '');
        const filename = `Tableau_Ventes_${dateStr}.xlsx`;

        // Save the file
        XLSX.writeFile(workbook, filename);

        alert(`Export Excel réussi !\n\nDonnées exportées: ${exportData.length} entrées\nFichier: ${filename}`);

    } catch (error) {
        console.error('Erreur lors de l\'export Excel visualization:', error);
        alert('Erreur lors de l\'export Excel : ' + error.message);
    }
}

// Function to export monthly reconciliation data to Excel
function exportReconciliationMoisToExcel() {
    try {
        // Check if XLSX library is loaded
        if (typeof XLSX === 'undefined') {
            console.error("Erreur: La bibliothèque XLSX n'est pas chargée.");
            alert("Erreur: La bibliothèque XLSX n'est pas chargée. Veuillez rafraîchir la page.");
            return;
        }

        // Get data from the monthly reconciliation table
        const table = document.getElementById('reconciliation-mois-table');
        if (!table) {
            alert('Tableau de réconciliation mensuelle non trouvé');
            return;
        }

        const tbody = table.querySelector('tbody');
        if (!tbody || tbody.rows.length === 0) {
            alert('Aucune donnée à exporter dans le tableau de réconciliation mensuelle');
            return;
        }

        // Extract headers
        const headers = [];
        const headerCells = table.querySelectorAll('thead th');
        headerCells.forEach(cell => {
            headers.push(cell.textContent.trim());
        });

        // Extract data rows
        const exportData = [];
        
        // Process each row in the table
        const rows = tbody.querySelectorAll('tr');
        let processedRows = 0;
        
        rows.forEach(row => {
            // Skip hidden rows (filtered out)
            if (row.style.display === 'none') {
                return;
            }
            
            const rowData = {};
            const cells = row.querySelectorAll('td');
            
            cells.forEach((cell, index) => {
                if (index < headers.length) {
                    const headerName = headers[index];
                    let cellValue;
                    
                    // Handle comment input fields
                    if (headerName === 'Commentaire' || headerName.toLowerCase().includes('commentaire')) {
                        const input = cell.querySelector('input');
                        cellValue = input ? input.value.trim() : cell.textContent.trim();
                    } else {
                        cellValue = cell.textContent.trim();
                    }
                    
                    // Convert numeric/currency fields to numbers for proper Excel formatting
                    if (headerName.includes('Stock') || headerName.includes('Transfert') || 
                        headerName.includes('Vente') || headerName.includes('Montant') || 
                        headerName.includes('Cash') || headerName.includes('Ecart')) {
                        
                        // Remove currency formatting and convert to number
                        let numericValue = cellValue.replace(/[^0-9.,-]/g, '').replace(',', '.');
                        
                        // Handle percentage values
                        if (cellValue.includes('%')) {
                            numericValue = parseFloat(numericValue);
                            cellValue = isNaN(numericValue) ? 0 : numericValue;
                        } else {
                            numericValue = parseFloat(numericValue);
                            cellValue = isNaN(numericValue) ? 0 : numericValue;
                        }
                    }
                    
                    rowData[headerName] = cellValue;
                }
            });
            
            // Only add rows that have actual data
            if (Object.values(rowData).some(value => value !== '' && value !== 0)) {
                exportData.push(rowData);
                processedRows++;
            }
        });

        if (exportData.length === 0) {
            alert('Aucune donnée valide à exporter dans la réconciliation mensuelle');
            return;
        }

        // Create workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(exportData);

        // Format currency and percentage columns
        const currencyFormat = '#,##0 FCFA';
        const percentageFormat = '0.00%';
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        
        for (let R = range.s.r + 1; R <= range.e.r; ++R) {
            headers.forEach((header, C) => {
                const cell_address = { c: C, r: R };
                const cell_ref = XLSX.utils.encode_cell(cell_address);
                
                if (worksheet[cell_ref] && typeof worksheet[cell_ref].v === 'number') {
                    // Apply currency format to monetary columns
                    if (header.includes('Stock') || header.includes('Transfert') || 
                        header.includes('Vente') || header.includes('Montant') || 
                        header.includes('Cash') || header.includes('Ecart')) {
                        
                        if (header.includes('%') || header.includes('Ecart %')) {
                            worksheet[cell_ref].t = 'n';
                            worksheet[cell_ref].z = percentageFormat;
                            // Convert percentage value back to decimal for Excel
                            worksheet[cell_ref].v = worksheet[cell_ref].v / 100;
                        } else {
                            worksheet[cell_ref].t = 'n';
                            worksheet[cell_ref].z = currencyFormat;
                        }
                    }
                }
            });
        }

        // Set column widths
        const colWidths = headers.map(header => {
            switch (true) {
                case header === 'Date': return { wch: 12 };
                case header === 'Point de Vente': return { wch: 15 };
                case header.includes('Stock') || header.includes('Vente') || header.includes('Cash'): return { wch: 15 };
                case header === 'Commentaire': return { wch: 30 };
                case header.includes('Ecart'): return { wch: 12 };
                default: return { wch: 12 };
            }
        });
        worksheet['!cols'] = colWidths;

        // Add summary data
        const moisSelect = document.getElementById('mois-reconciliation');
        const anneeSelect = document.getElementById('annee-reconciliation');
        
        // Get summary values from the page
        const totalVentesTheoriques = document.getElementById('total-ventes-theoriques-mois')?.textContent || '0';
        const totalVentesSaisies = document.getElementById('total-ventes-saisies-mois')?.textContent || '0';
        const totalVersements = document.getElementById('total-versements-mois')?.textContent || '0';
        const estimationVersements = document.getElementById('estimation-versements-mois')?.textContent || '0';

        // Add empty rows and summary
        const summaryData = [
            {},
            { [headers[0]]: 'RÉSUMÉ DU MOIS', [headers[1]]: `${moisSelect?.value || ''}/${anneeSelect?.value || ''}` },
            { [headers[0]]: 'Total Ventes Théoriques:', [headers[1]]: totalVentesTheoriques },
            { [headers[0]]: 'Total Ventes Saisies:', [headers[1]]: totalVentesSaisies },
            { [headers[0]]: 'Total Versements:', [headers[1]]: totalVersements },
            { [headers[0]]: 'Estimation Versements:', [headers[1]]: estimationVersements }
        ];

        // Add summary to export data
        exportData.push(...summaryData);

        // Recreate worksheet with summary data
        const finalWorksheet = XLSX.utils.json_to_sheet(exportData);
        
        // Reapply formatting
        const finalRange = XLSX.utils.decode_range(finalWorksheet['!ref']);
        for (let R = range.s.r + 1; R <= range.e.r; ++R) {
            headers.forEach((header, C) => {
                const cell_address = { c: C, r: R };
                const cell_ref = XLSX.utils.encode_cell(cell_address);
                
                if (finalWorksheet[cell_ref] && typeof finalWorksheet[cell_ref].v === 'number') {
                    if (header.includes('Stock') || header.includes('Transfert') || 
                        header.includes('Vente') || header.includes('Montant') || 
                        header.includes('Cash') || header.includes('Ecart')) {
                        
                        if (header.includes('%') || header.includes('Ecart %')) {
                            finalWorksheet[cell_ref].t = 'n';
                            finalWorksheet[cell_ref].z = percentageFormat;
                            finalWorksheet[cell_ref].v = finalWorksheet[cell_ref].v / 100;
                        } else {
                            finalWorksheet[cell_ref].t = 'n';
                            finalWorksheet[cell_ref].z = currencyFormat;
                        }
                    }
                }
            });
        }
        
        finalWorksheet['!cols'] = colWidths;

        // Add the worksheet to the workbook
        XLSX.utils.book_append_sheet(workbook, finalWorksheet, 'Réconciliation Mensuelle');

        // Generate filename
        const mois = moisSelect?.value || 'XX';
        const annee = anneeSelect?.value || 'XXXX';
        const filename = `Reconciliation_Mensuelle_${mois}_${annee}.xlsx`;

        // Save the file
        XLSX.writeFile(workbook, filename);

        alert(`Export Excel réussi !\n\nDonnées exportées: ${processedRows} entrées pour ${mois}/${annee}\nFichier: ${filename}`);

    } catch (error) {
        console.error('Erreur lors de l\'export Excel réconciliation mensuelle:', error);
        alert('Erreur lors de l\'export Excel : ' + error.message);
    }
}