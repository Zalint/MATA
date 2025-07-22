/**
 * Module de gestion de l'authentification
 */

// Variable pour stocker l'utilisateur actuel
let currentUser = null;

/**
 * Vérifie l'authentification de l'utilisateur
 * @returns {Promise<Object|null>} Les informations de l'utilisateur ou null
 */
async function checkAuth() {
    try {
        const response = await fetch('/api/check-session');
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            document.getElementById('user-info').textContent = `Connecté: ${currentUser.username}`;
            
            // Afficher uniquement les onglets auxquels l'utilisateur a accès
            afficherOngletsSuivantDroits(currentUser);
            
            // Mise à jour de l'affichage des boutons sensibles
            updateViderBaseButtonVisibility();
            
            return currentUser;
        } else {
            currentUser = null;
            document.getElementById('user-info').textContent = 'Non connecté';
            
            // Redirection vers la page de connexion
            window.location.href = 'login.html';
            return null;
        }
    } catch (error) {
        console.error('Erreur lors de la vérification de l\'authentification:', error);
        currentUser = null;
        return null;
    }
}

/**
 * Déconnecte l'utilisateur
 */
async function logout() {
    try {
        await fetch('/api/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        currentUser = null;
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
    }
}

/**
 * Renvoie l'utilisateur actuellement connecté
 * @returns {Object|null} L'utilisateur actuel ou null
 */
function getCurrentUser() {
    return currentUser;
}

/**
 * Met à jour l'affichage des onglets selon les droits de l'utilisateur
 * @param {Object} userData Les données de l'utilisateur
 */
function afficherOngletsSuivantDroits(userData) {
    const isAdmin = userData && (userData.role === 'admin' || userData.role === 'superadmin');
    const isSuperAdmin = userData && userData.role === 'superadmin';
    const isLecteur = userData && userData.role === 'lecteur';
    
    // Éléments à afficher uniquement pour les administrateurs
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(element => {
        element.style.display = isAdmin ? '' : 'none';
    });
    
    // Éléments à afficher uniquement pour les super administrateurs
    const superAdminElements = document.querySelectorAll('.superadmin-only');
    superAdminElements.forEach(element => {
        element.style.display = isSuperAdmin ? '' : 'none';
    });
    
    // Pour les lecteurs, masquer les onglets d'écriture
    if (isLecteur) {
        // Masquer l'onglet de saisie (écriture)
        const saisieTab = document.getElementById('saisie-tab');
        if (saisieTab) {
            saisieTab.style.display = 'none';
        }
        
        // Masquer l'onglet cash payment (écriture)
        const cashPaymentTab = document.getElementById('cash-payment-tab');
        if (cashPaymentTab) {
            cashPaymentTab.style.display = 'none';
        }
        
        // Masquer l'onglet suivi achat boeuf (écriture)
        const suiviAchatBoeufTab = document.getElementById('suivi-achat-boeuf-tab');
        if (suiviAchatBoeufTab) {
            suiviAchatBoeufTab.style.display = 'none';
        }
        
        // Masquer les onglets spéciaux (écriture)
        const stockInventaireItem = document.getElementById('stock-inventaire-item');
        if (stockInventaireItem) {
            stockInventaireItem.style.display = 'none';
        }
        
        // Masquer l'onglet copier stock (écriture)
        const copierStockItem = document.getElementById('copier-stock-item');
        if (copierStockItem) {
            copierStockItem.style.display = 'none';
        }
        
        // Masquer l'onglet cash payment (écriture) - élément de navigation
        const cashPaymentItem = document.getElementById('cash-payment-item');
        if (cashPaymentItem) {
            cashPaymentItem.style.display = 'none';
        }
        
        // Masquer l'onglet estimation (écriture)
        const estimationItem = document.getElementById('estimation-item');
        if (estimationItem) {
            estimationItem.style.display = 'none';
        }
        
        // Afficher un message informatif
        const userInfo = document.getElementById('user-info');
        if (userInfo) {
            userInfo.textContent = `Connecté: ${userData.username} (Lecteur - Lecture seule)`;
        }
        
        // Masquer les boutons d'écriture dans la réconciliation
        masquerBoutonsEcritureReconciliation();
    }
}

/**
 * Masque les boutons d'écriture dans la réconciliation pour les lecteurs
 */
function masquerBoutonsEcritureReconciliation() {
    // Masquer le bouton de sauvegarde dans la réconciliation
    const btnSauvegarder = document.getElementById('sauvegarder-reconciliation');
    if (btnSauvegarder) {
        btnSauvegarder.style.display = 'none';
    }
    
    // Masquer le bouton de chargement des commentaires (écriture)
    const btnChargerCommentaires = document.getElementById('charger-commentaires');
    if (btnChargerCommentaires) {
        btnChargerCommentaires.style.display = 'none';
    }
    
    // Désactiver les champs de commentaire dans le tableau de réconciliation
    const commentaireInputs = document.querySelectorAll('.commentaire-input');
    commentaireInputs.forEach(input => {
        input.disabled = true;
        input.placeholder = 'Lecture seule';
    });
    
    // Masquer les boutons d'écriture dans la réconciliation du mois
    const btnExportReconciliationMois = document.getElementById('export-reconciliation-mois');
    if (btnExportReconciliationMois) {
        btnExportReconciliationMois.style.display = 'none';
    }
    
    // Masquer le bouton de recalcul dans la réconciliation du mois
    const btnRecalculerReconciliationMois = document.getElementById('recalculer-reconciliation-mois');
    if (btnRecalculerReconciliationMois) {
        btnRecalculerReconciliationMois.style.display = 'none';
    }
}

// Exporter les fonctions du module
export {
    checkAuth,
    logout,
    getCurrentUser,
    afficherOngletsSuivantDroits,
    masquerBoutonsEcritureReconciliation
}; 