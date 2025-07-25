// Variables globales
let currentUser = null;
let users = [];
let confirmModal = null;
let pendingAction = null;

// Vérification de l'authentification et des droits admin
async function checkAuth() {
    try {
        const response = await fetch('/api/check-session', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (!data.success) {
            window.location.href = 'login.html';
            return false;
        }
        
        // Vérifier que l'utilisateur est admin
        if (data.user.role !== 'admin') {
            alert('Accès non autorisé. Seuls les administrateurs peuvent accéder à cette page.');
            window.location.href = 'index.html';
            return false;
        }
        
        currentUser = data.user;
        document.getElementById('user-info').textContent = `Connecté en tant que ${currentUser.username}`;
        return true;
    } catch (error) {
        console.error('Erreur lors de la vérification de la session:', error);
        window.location.href = 'login.html';
        return false;
    }
}

// Charger la liste des utilisateurs
async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            users = data.users;
            displayUsers();
        } else {
            console.error('Erreur lors du chargement des utilisateurs:', data.message);
            alert('Erreur lors du chargement des utilisateurs');
        }
    } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error);
        alert('Erreur lors du chargement des utilisateurs');
    }
}

// Afficher les utilisateurs dans le tableau
function displayUsers() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <strong>${user.username}</strong>
                ${user.username === 'ADMIN' ? '<i class="fas fa-crown text-warning ms-2" title="Super Administrateur"></i>' : ''}
            </td>
            <td>
                <span class="badge ${user.role === 'admin' ? 'bg-danger' : user.role === 'lecteur' ? 'bg-info' : 'bg-primary'}">
                    ${user.role === 'admin' ? 'Administrateur' : user.role === 'lecteur' ? 'Lecteur' : 'Utilisateur'}
                </span>
            </td>
            <td>${user.pointVente}</td>
            <td>
                <span class="badge ${user.active ? 'bg-success' : 'bg-secondary'} status-badge">
                    ${user.active ? 'Actif' : 'Inactif'}
                </span>
            </td>
            <td>
                ${user.username !== 'ADMIN' ? `
                    <button class="btn btn-sm btn-primary btn-action" 
                            onclick="editUser('${user.username}')" 
                            title="Modifier l'utilisateur">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm ${user.active ? 'btn-warning' : 'btn-success'} btn-action" 
                            onclick="toggleUserStatus('${user.username}')" 
                            title="${user.active ? 'Désactiver' : 'Activer'} l'utilisateur">
                        <i class="fas ${user.active ? 'fa-user-slash' : 'fa-user-check'}"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-action" 
                            onclick="deleteUser('${user.username}')" 
                            title="Supprimer l'utilisateur">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : '<span class="text-muted">Actions non disponibles</span>'}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Créer un nouvel utilisateur
async function createUser(userData) {
    try {
        const response = await fetch('/api/admin/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Utilisateur créé avec succès !');
            document.getElementById('createUserForm').reset();
            loadUsers();
        } else {
            alert('Erreur lors de la création : ' + data.message);
        }
    } catch (error) {
        console.error('Erreur lors de la création de l\'utilisateur:', error);
        alert('Erreur lors de la création de l\'utilisateur');
    }
}

// Activer/désactiver un utilisateur
async function toggleUserStatus(username) {
    const user = users.find(u => u.username === username);
    if (!user) return;
    
    const action = user.active ? 'désactiver' : 'activer';
    const message = `Êtes-vous sûr de vouloir ${action} l'utilisateur "${username}" ?`;
    
    showConfirmModal(message, async () => {
        try {
            const response = await fetch(`/api/admin/users/${username}/toggle-status`, {
                method: 'POST',
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert(`Utilisateur ${action === 'activer' ? 'activé' : 'désactivé'} avec succès !`);
                loadUsers();
            } else {
                alert('Erreur lors de la modification : ' + data.message);
            }
        } catch (error) {
            console.error('Erreur lors de la modification du statut:', error);
            alert('Erreur lors de la modification du statut');
        }
    });
}

// Supprimer un utilisateur
async function deleteUser(username) {
    const message = `Êtes-vous sûr de vouloir supprimer l'utilisateur "${username}" ? Cette action est irréversible.`;
    
    showConfirmModal(message, async () => {
        try {
            const response = await fetch(`/api/admin/users/${username}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('Utilisateur supprimé avec succès !');
                loadUsers();
            } else {
                alert('Erreur lors de la suppression : ' + data.message);
            }
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            alert('Erreur lors de la suppression');
        }
    });
}

// Afficher le modal de confirmation
function showConfirmModal(message, callback) {
    document.getElementById('confirmModalBody').textContent = message;
    pendingAction = callback;
    confirmModal.show();
}

// Gestion de la déconnexion
async function logout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
        const data = await response.json();
        if (data.success) {
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
    }
}

// Fonction pour ouvrir le modal d'édition d'utilisateur
function editUser(username) {
    const user = users.find(u => u.username === username);
    if (!user) {
        alert('Utilisateur non trouvé');
        return;
    }
    
    // Remplir le formulaire d'édition avec les données actuelles
    document.getElementById('editUsername').value = user.username;
    document.getElementById('editNewUsername').value = user.username;
    document.getElementById('editNewPassword').value = ''; // Mot de passe vide par défaut
    document.getElementById('editNewRole').value = user.role;
    document.getElementById('editNewPointVente').value = user.pointVente;
    document.getElementById('editNewUserActive').checked = user.active;
    
    // Afficher le modal
    const editModal = new bootstrap.Modal(document.getElementById('editUserModal'));
    editModal.show();
}

// Fonction pour sauvegarder les modifications d'un utilisateur
async function saveEditUser() {
    const originalUsername = document.getElementById('editUsername').value;
    const newUsername = document.getElementById('editNewUsername').value.trim();
    const newPassword = document.getElementById('editNewPassword').value;
    const newRole = document.getElementById('editNewRole').value;
    const newPointVente = document.getElementById('editNewPointVente').value;
    const newActive = document.getElementById('editNewUserActive').checked;
    
    if (!newUsername || !newRole || !newPointVente) {
        alert('Veuillez remplir tous les champs obligatoires');
        return;
    }
    
    // Vérifier que le nouveau nom d'utilisateur n'existe pas déjà (sauf pour l'utilisateur actuel)
    if (newUsername !== originalUsername && users.some(u => u.username === newUsername)) {
        alert('Ce nom d\'utilisateur existe déjà');
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/users/${originalUsername}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                username: newUsername,
                password: newPassword, // Peut être vide si on ne veut pas changer le mot de passe
                role: newRole,
                pointVente: newPointVente,
                active: newActive
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Utilisateur modifié avec succès !');
            
            // Fermer le modal
            const editModal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
            editModal.hide();
            
            // Recharger la liste des utilisateurs
            await loadUsers();
        } else {
            alert('Erreur lors de la modification : ' + data.message);
        }
    } catch (error) {
        console.error('Erreur lors de la modification:', error);
        alert('Erreur lors de la modification');
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', async function() {
    // Initialiser le modal Bootstrap
    confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
    
    // Vérifier l'authentification
    const isAuthenticated = await checkAuth();
    if (isAuthenticated) {
        // Charger les utilisateurs
        await loadUsers();
        
        // Gestionnaire pour le formulaire de création
        document.getElementById('createUserForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('newUsername').value.trim();
            const password = document.getElementById('newPassword').value;
            const role = document.getElementById('newRole').value;
            const pointVente = document.getElementById('newPointVente').value;
            const active = document.getElementById('newUserActive').checked;
            
            if (!username || !password || !role || !pointVente) {
                alert('Veuillez remplir tous les champs obligatoires');
                return;
            }
            
            // Vérifier que le nom d'utilisateur n'existe pas déjà
            if (users.some(u => u.username === username)) {
                alert('Ce nom d\'utilisateur existe déjà');
                return;
            }
            
            createUser({
                username,
                password,
                role,
                pointVente,
                active
            });
        });
        
        // Gestionnaire pour le bouton de déconnexion
        document.getElementById('logout-btn').addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
        
        // Gestionnaire pour la confirmation d'action
        document.getElementById('confirmAction').addEventListener('click', function() {
            if (pendingAction) {
                pendingAction();
                confirmModal.hide();
                pendingAction = null;
            }
        });
        
        // Gestionnaire pour le bouton d'enregistrement du modal d'édition
        document.getElementById('saveEditUser').addEventListener('click', function() {
            saveEditUser();
        });
    }
}); 