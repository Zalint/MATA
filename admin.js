// Vérification de l'authentification et des droits
async function checkAuth() {
    try {
        const response = await fetch('http://localhost:3000/api/check-session', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (!data.success) {
            window.location.href = 'login.html';
            return false;
        }
        
        if (!data.user.isAdmin) {
            window.location.href = 'index.html';
            return false;
        }
        
        // Afficher les informations de l'utilisateur
        document.getElementById('user-info').textContent = `Connecté en tant que ${data.user.username}`;
        return true;
    } catch (error) {
        console.error('Erreur lors de la vérification de la session:', error);
        window.location.href = 'login.html';
        return false;
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
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
    }
});

// Configuration des dates
flatpickr("#date-correction", {
    locale: "fr",
    dateFormat: "d/m/Y",
    defaultDate: "today"
});

// Gestion des onglets
document.querySelectorAll('.nav-link[data-section]').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const section = this.dataset.section;
        
        // Mettre à jour les classes actives
        document.querySelectorAll('.nav-link[data-section]').forEach(l => l.classList.remove('active'));
        this.classList.add('active');
        
        // Afficher la section correspondante
        document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
        document.getElementById(`${section}-section`).classList.add('active');
    });
});

// Charger les points de vente
async function chargerPointsVente() {
    try {
        console.log('Chargement des points de vente...'); // Log de débogage
        const response = await fetch('http://localhost:3000/api/admin/points-vente', {
            credentials: 'include'
        });
        const data = await response.json();
        console.log('Données reçues:', data); // Log de débogage
        
        if (data.success) {
            const pointsVente = data.pointsVente;
            const tbody = document.querySelector('#pointsVenteTable tbody');
            console.log('Table trouvée:', tbody); // Log de débogage
            
            if (!tbody) {
                console.error('Table des points de vente non trouvée');
                return;
            }
            
            tbody.innerHTML = '';
            
            Object.entries(pointsVente).forEach(([nom, info]) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${nom}</td>
                    <td>
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" 
                                   ${info.active ? 'checked' : ''} 
                                   onchange="togglePointVente('${nom}')">
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            console.log('Points de vente chargés avec succès'); // Log de débogage
        } else {
            console.error('Erreur lors du chargement des points de vente:', data.message);
            alert('Erreur lors du chargement des points de vente');
        }
    } catch (error) {
        console.error('Erreur lors du chargement des points de vente:', error);
        alert('Erreur lors du chargement des points de vente');
    }
}

// Gérer l'ajout d'un point de vente
document.getElementById('addPointVenteForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const nom = document.getElementById('newPointVente').value;
    
    try {
        const response = await fetch('http://localhost:3000/api/admin/points-vente', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                nom,
                action: 'add'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('newPointVente').value = '';
            chargerPointsVente();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Erreur lors de l\'ajout du point de vente:', error);
        alert('Erreur lors de l\'ajout du point de vente');
    }
});

// Gérer l'activation/désactivation d'un point de vente
async function togglePointVente(nom) {
    try {
        const response = await fetch('http://localhost:3000/api/admin/points-vente', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                nom,
                action: 'toggle'
            })
        });
        
        const data = await response.json();
        
        if (!data.success) {
            alert(data.message);
            chargerPointsVente(); // Recharger pour annuler le changement
        }
    } catch (error) {
        console.error('Erreur lors de la modification du point de vente:', error);
        alert('Erreur lors de la modification du point de vente');
        chargerPointsVente(); // Recharger pour annuler le changement
    }
}

// Charger les produits dans les menus déroulants
async function chargerProduits() {
    try {
        const response = await fetch('http://localhost:3000/api/admin/produits', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            const produits = data.produits;
            
            // Remplir les menus déroulants pour la gestion des prix
            const categorieSelect = document.getElementById('categoriePrix');
            const produitSelect = document.getElementById('produitPrix');
            
            // Vider les menus déroulants
            categorieSelect.innerHTML = '<option value="">Sélectionner une catégorie</option>';
            produitSelect.innerHTML = '<option value="">Sélectionner un produit</option>';
            
            // Remplir le menu des catégories
            Object.keys(produits).forEach(categorie => {
                const option = document.createElement('option');
                option.value = categorie;
                option.textContent = categorie;
                categorieSelect.appendChild(option);
            });

            // Remplir les menus déroulants pour les corrections
            const categorieCorrection = document.getElementById('categorie-correction');
            const produitCorrection = document.getElementById('produit-correction');
            
            categorieCorrection.innerHTML = '<option value="">Sélectionner une catégorie</option>';
            produitCorrection.innerHTML = '<option value="">Sélectionner un produit</option>';
            
            Object.keys(produits).forEach(categorie => {
                const option = document.createElement('option');
                option.value = categorie;
                option.textContent = categorie;
                categorieCorrection.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erreur lors du chargement des produits:', error);
        alert('Erreur lors du chargement des produits');
    }
}

// Gérer le changement de catégorie pour les prix
document.getElementById('categoriePrix').addEventListener('change', function() {
    const categorie = this.value;
    const produitSelect = document.getElementById('produitPrix');
    
    // Vider le menu des produits
    produitSelect.innerHTML = '<option value="">Sélectionner un produit</option>';
    
    if (categorie) {
        // Remplir le menu des produits de la catégorie sélectionnée
        Object.keys(produits[categorie]).forEach(produit => {
            const option = document.createElement('option');
            option.value = produit;
            option.textContent = produit;
            produitSelect.appendChild(option);
        });
    }
});

// Gérer le changement de catégorie pour les corrections
document.getElementById('categorie-correction').addEventListener('change', function() {
    const categorie = this.value;
    const produitSelect = document.getElementById('produit-correction');
    
    // Vider le menu des produits
    produitSelect.innerHTML = '<option value="">Sélectionner un produit</option>';
    
    if (categorie) {
        // Remplir le menu des produits de la catégorie sélectionnée
        Object.keys(produits[categorie]).forEach(produit => {
            const option = document.createElement('option');
            option.value = produit;
            option.textContent = produit;
            produitSelect.appendChild(option);
        });
    }
});

// Modifier un prix
document.getElementById('modifier-prix').addEventListener('click', async function() {
    const categorie = document.getElementById('categoriePrix').value;
    const produit = document.getElementById('produitPrix').value;
    const nouveauPrix = document.getElementById('nouveau-prix').value;
    
    if (!categorie || !produit || !nouveauPrix) {
        alert('Veuillez remplir tous les champs');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:3000/api/admin/prix', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                categorie,
                produit,
                nouveauPrix: parseFloat(nouveauPrix)
            })
        });
        
        const data = await response.json();
        if (data.success) {
            document.getElementById('nouveau-prix').value = '';
            alert('Prix modifié avec succès');
            chargerProduits(); // Recharger les produits pour mettre à jour les menus
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Erreur lors de la modification du prix:', error);
        alert('Erreur lors de la modification du prix');
    }
});

// Corriger un total
document.getElementById('corriger-total').addEventListener('click', async function() {
    const date = document.getElementById('date-correction').value;
    const pointVente = document.getElementById('point-vente-correction').value;
    const categorie = document.getElementById('categorie-correction').value;
    const produit = document.getElementById('produit-correction').value;
    const nouveauTotal = document.getElementById('nouveau-total').value;
    
    if (!date || !pointVente || !categorie || !produit || !nouveauTotal) {
        alert('Veuillez remplir tous les champs');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:3000/api/admin/corriger-total', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                date,
                pointVente,
                categorie,
                produit,
                nouveauTotal: parseFloat(nouveauTotal)
            })
        });
        
        const data = await response.json();
        if (data.success) {
            document.getElementById('nouveau-total').value = '';
            alert('Total corrigé avec succès');
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Erreur lors de la correction du total:', error);
        alert('Erreur lors de la correction du total');
    }
});

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initialisation de la page...'); // Log de débogage
    checkAuth().then(isAuthenticated => {
        if (isAuthenticated) {
            console.log('Authentification vérifiée, chargement des points de vente...'); // Log de débogage
            chargerPointsVente();
            chargerProduits();

            // Ajouter les écouteurs d'événements après le chargement du DOM
            // Gestion des onglets
            document.querySelectorAll('.nav-link[data-section]').forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const section = this.dataset.section;
                    
                    // Mettre à jour les classes actives
                    document.querySelectorAll('.nav-link[data-section]').forEach(l => l.classList.remove('active'));
                    this.classList.add('active');
                    
                    // Afficher la section correspondante
                    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
                    document.getElementById(`${section}-section`).classList.add('active');
                });
            });

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
                        localStorage.removeItem('user');
                        window.location.href = 'login.html';
                    }
                } catch (error) {
                    console.error('Erreur lors de la déconnexion:', error);
                }
            });

            // Gestion de l'ajout de point de vente
            document.getElementById('addPointVenteForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const nom = document.getElementById('newPointVente').value;
                
                try {
                    const response = await fetch('http://localhost:3000/api/admin/points-vente', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        credentials: 'include',
                        body: JSON.stringify({
                            nom,
                            action: 'add'
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        document.getElementById('newPointVente').value = '';
                        chargerPointsVente();
                    } else {
                        alert(data.message);
                    }
                } catch (error) {
                    console.error('Erreur lors de l\'ajout du point de vente:', error);
                    alert('Erreur lors de l\'ajout du point de vente');
                }
            });

            // Gestion des changements de catégorie pour les prix
            const categoriePrixSelect = document.getElementById('categoriePrix');
            if (categoriePrixSelect) {
                categoriePrixSelect.addEventListener('change', function() {
                    const categorie = this.value;
                    const produitSelect = document.getElementById('produitPrix');
                    
                    // Vider le menu des produits
                    produitSelect.innerHTML = '<option value="">Sélectionner un produit</option>';
                    
                    if (categorie) {
                        // Remplir le menu des produits de la catégorie sélectionnée
                        Object.keys(produits[categorie]).forEach(produit => {
                            const option = document.createElement('option');
                            option.value = produit;
                            option.textContent = produit;
                            produitSelect.appendChild(option);
                        });
                    }
                });
            }

            // Gestion des changements de catégorie pour les corrections
            const categorieCorrectionSelect = document.getElementById('categorie-correction');
            if (categorieCorrectionSelect) {
                categorieCorrectionSelect.addEventListener('change', function() {
                    const categorie = this.value;
                    const produitSelect = document.getElementById('produit-correction');
                    
                    // Vider le menu des produits
                    produitSelect.innerHTML = '<option value="">Sélectionner un produit</option>';
                    
                    if (categorie) {
                        // Remplir le menu des produits de la catégorie sélectionnée
                        Object.keys(produits[categorie]).forEach(produit => {
                            const option = document.createElement('option');
                            option.value = produit;
                            option.textContent = produit;
                            produitSelect.appendChild(option);
                        });
                    }
                });
            }

            // Gestion de la modification des prix
            const modifierPrixBtn = document.getElementById('modifier-prix');
            if (modifierPrixBtn) {
                modifierPrixBtn.addEventListener('click', async function() {
                    const categorie = document.getElementById('categoriePrix').value;
                    const produit = document.getElementById('produitPrix').value;
                    const nouveauPrix = document.getElementById('nouveau-prix').value;
                    
                    if (!categorie || !produit || !nouveauPrix) {
                        alert('Veuillez remplir tous les champs');
                        return;
                    }
                    
                    try {
                        const response = await fetch('http://localhost:3000/api/admin/prix', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            credentials: 'include',
                            body: JSON.stringify({
                                categorie,
                                produit,
                                nouveauPrix: parseFloat(nouveauPrix)
                            })
                        });
                        
                        const data = await response.json();
                        if (data.success) {
                            document.getElementById('nouveau-prix').value = '';
                            alert('Prix modifié avec succès');
                            chargerProduits(); // Recharger les produits pour mettre à jour les menus
                        } else {
                            alert(data.message);
                        }
                    } catch (error) {
                        console.error('Erreur lors de la modification du prix:', error);
                        alert('Erreur lors de la modification du prix');
                    }
                });
            }

            // Gestion de la correction des totaux
            const corrigerTotalBtn = document.getElementById('corriger-total');
            if (corrigerTotalBtn) {
                corrigerTotalBtn.addEventListener('click', async function() {
                    const date = document.getElementById('date-correction').value;
                    const pointVente = document.getElementById('point-vente-correction').value;
                    const categorie = document.getElementById('categorie-correction').value;
                    const produit = document.getElementById('produit-correction').value;
                    const nouveauTotal = document.getElementById('nouveau-total').value;
                    
                    if (!date || !pointVente || !categorie || !produit || !nouveauTotal) {
                        alert('Veuillez remplir tous les champs');
                        return;
                    }
                    
                    try {
                        const response = await fetch('http://localhost:3000/api/admin/corriger-total', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            credentials: 'include',
                            body: JSON.stringify({
                                date,
                                pointVente,
                                categorie,
                                produit,
                                nouveauTotal: parseFloat(nouveauTotal)
                            })
                        });
                        
                        const data = await response.json();
                        if (data.success) {
                            document.getElementById('nouveau-total').value = '';
                            alert('Total corrigé avec succès');
                        } else {
                            alert(data.message);
                        }
                    } catch (error) {
                        console.error('Erreur lors de la correction du total:', error);
                        alert('Erreur lors de la correction du total');
                    }
                });
            }
        }
    });
}); 