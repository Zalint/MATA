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
}

// Exporter les fonctions du module
export {
    checkAuth,
    logout,
    getCurrentUser,
    afficherOngletsSuivantDroits
}; 