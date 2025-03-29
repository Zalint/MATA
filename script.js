// Vérification de l'authentification
let currentUser = null;

// Fonction pour mettre à jour la visibilité du bouton de vidage
function updateViderBaseButtonVisibility() {
    const viderBaseBtn = document.getElementById('vider-base');
    if (viderBaseBtn) {
        if (currentUser && currentUser.username === 'SALIOU') {
            viderBaseBtn.style.display = 'block';
            console.log('Bouton de vidage affiché pour SALIOU');
        } else {
            viderBaseBtn.style.display = 'none';
            console.log('Bouton de vidage masqué - utilisateur:', currentUser ? currentUser.username : 'non connecté');
        }
    }
}

// Fonction pour cacher toutes les sections
function hideAllSections() {
    document.getElementById('saisie-section').style.display = 'none';
    document.getElementById('visualisation-section').style.display = 'none';
    document.getElementById('import-section').style.display = 'none';
    document.getElementById('stock-inventaire-section').style.display = 'none';
}

// Gestion des onglets
document.addEventListener('DOMContentLoaded', function() {
    const saisieTab = document.getElementById('saisie-tab');
    const visualisationTab = document.getElementById('visualisation-tab');
    const importTab = document.getElementById('import-tab');
    const stockInventaireTab = document.getElementById('stock-inventaire-tab');
    
    const saisieSection = document.getElementById('saisie-section');
    const visualisationSection = document.getElementById('visualisation-section');
    const importSection = document.getElementById('import-section');
    const stockInventaireSection = document.getElementById('stock-inventaire-section');

    // Fonction pour désactiver tous les onglets
    function deactivateAllTabs() {
        saisieTab.classList.remove('active');
        visualisationTab.classList.remove('active');
        importTab.classList.remove('active');
        if (stockInventaireTab) stockInventaireTab.classList.remove('active');
    }

    if (saisieTab) {
        saisieTab.addEventListener('click', function(e) {
            e.preventDefault();
            hideAllSections();
            saisieSection.style.display = 'block';
            deactivateAllTabs();
            this.classList.add('active');
        });
    }

    if (visualisationTab) {
        visualisationTab.addEventListener('click', function(e) {
            e.preventDefault();
            hideAllSections();
            visualisationSection.style.display = 'block';
            deactivateAllTabs();
            this.classList.add('active');
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
        stockInventaireTab.addEventListener('click', function(e) {
            e.preventDefault();
            hideAllSections();
            stockInventaireSection.style.display = 'block';
            deactivateAllTabs();
            this.classList.add('active');
            initInventaire();
        });
    }
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
        
        // Gérer la visibilité des onglets spéciaux
        const importTabContainer = document.getElementById('import-tab-container');
        const stockInventaireItem = document.getElementById('stock-inventaire-item');
        
        if (currentUser.username === 'SALIOU' || currentUser.isSuperAdmin) {
            if (importTabContainer) importTabContainer.style.display = 'block';
            if (stockInventaireItem) stockInventaireItem.style.display = 'block';
        } else {
            if (importTabContainer) importTabContainer.style.display = 'none';
            if (stockInventaireItem) stockInventaireItem.style.display = 'none';
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

flatpickr("#date-debut", {
    locale: "fr",
    dateFormat: "d/m/Y",
    defaultDate: "today"
});

flatpickr("#date-fin", {
    locale: "fr",
    dateFormat: "d/m/Y",
    defaultDate: "today"
});

// Base de données des produits et leurs prix
const produitsDB = {
    "Bovin": {
        "Boeuf en détail": [3600, 3700],
        "Boeuf en gros": [3400],
        "Dechet": [1000],
        "Foie": [4000],
        "Yell": [2000, 2500],
        "Jarret": [250],
        "Abats": [1000, 1500],
        "Faux Filet": [3500],
        "Filet": [5000, 4000, 7000],
        "Sans Os": [4500, 4000],
        "Viande Hachée": [5000],
        "Veau en détail": [3700, 3800],
        "Veau en gros": [3500, 3600],
        "Veau sur pied": [],
        "Merguez": [4500],
        "Boeuf sur pied": []
    },
    "Ovin": {
        "Agneau": [4500],
        "Tete Agneau": [1000, 1500]
    },
    "Volaille": {
        "Poulet en détail": [3500, 3000, 3700],
        "Poulet en gros": [3000, 3300],
        "Oeuf": [2500, 2800, 2900],
        "Pack Pigeon": [2500, 2000],
        "Pilon": [3500],
        "Merguez poulet": [5500]
    },
    "Pack": {
        "Pack25000": [25000],
        "Pack30000": [30000],
        "Pack35000": [35000],
        "Pack50000": [50000],
        "Pack75000": [75000],
        "Pack100000": [100000],
        "Pack20000": [20000]
    }
};

// Gestion des catégories et produits
document.querySelectorAll('.categorie-select').forEach(select => {
    select.addEventListener('change', function() {
        const produitSelect = this.closest('.row').querySelector('.produit-select');
        const categorie = this.value;
        
        produitSelect.innerHTML = '<option value="">Sélectionner un produit</option>';
        
        if (categorie && produitsDB[categorie]) {
            Object.keys(produitsDB[categorie]).forEach(produit => {
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
        
        if (categorie && produit && produitsDB[categorie][produit]) {
            const prix = produitsDB[categorie][produit][0];
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
    const totalGeneral = Array.from(document.querySelectorAll('.total'))
        .reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0);
    document.getElementById('total-general').textContent = `${totalGeneral.toFixed(2)} FCFA`;
}

// Fonction pour créer une nouvelle entrée de produit
function creerNouvelleEntree() {
    const container = document.getElementById('produits-container');
    const newEntry = document.createElement('div');
    newEntry.className = 'produit-entry mb-3';
    newEntry.innerHTML = `
        <div class="row">
            <div class="col-md-3">
                <label class="form-label">Catégorie</label>
                <select class="form-select categorie-select" required>
                    <option value="">Sélectionner une catégorie</option>
                    <option value="Bovin">Bovin</option>
                    <option value="Ovin">Ovin</option>
                    <option value="Volaille">Volaille</option>
                    <option value="Pack">Pack</option>
                </select>
            </div>
            <div class="col-md-3">
                <label class="form-label">Produit</label>
                <select class="form-select produit-select" required>
                    <option value="">Sélectionner un produit</option>
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
        </div>
    `;
    
    // Ajouter les event listeners
    newEntry.querySelector('.categorie-select').addEventListener('change', function() {
        const produitSelect = this.closest('.row').querySelector('.produit-select');
        const categorie = this.value;
        
        produitSelect.innerHTML = '<option value="">Sélectionner un produit</option>';
        
        if (categorie && produitsDB[categorie]) {
            Object.keys(produitsDB[categorie]).forEach(produit => {
                const option = document.createElement('option');
                option.value = produit;
                option.textContent = produit;
                produitSelect.appendChild(option);
            });
        }
    });
    
    newEntry.querySelector('.produit-select').addEventListener('change', function() {
        const row = this.closest('.row');
        const categorie = row.querySelector('.categorie-select').value;
        const produit = this.value;
        const prixUnitInput = row.querySelector('.prix-unit');
        
        if (categorie && produit && produitsDB[categorie][produit]) {
            const prix = produitsDB[categorie][produit][0];
            prixUnitInput.value = prix;
            calculerTotal(row);
        } else {
            prixUnitInput.value = '';
        }
    });
    
    newEntry.querySelectorAll('.quantite, .prix-unit').forEach(input => {
        input.addEventListener('input', function() {
            calculerTotal(this.closest('.row'));
        });
    });
    
    return newEntry;
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
    
    const entries = [];
    
    document.querySelectorAll('.produit-entry').forEach(entry => {
        const categorie = entry.querySelector('.categorie-select').value;
        const produit = entry.querySelector('.produit-select').value;
        const quantite = entry.querySelector('.quantite').value;
        const prixUnit = entry.querySelector('.prix-unit').value;
        const total = entry.querySelector('.total').value;
        
        if (categorie && produit && quantite && prixUnit) {
            const mois = new Date(date.split('/').reverse().join('-')).toLocaleString('fr-FR', { month: 'long' });
            const semaine = `S${Math.ceil(new Date(date.split('/').reverse().join('-')).getDate() / 7)}`;
            
            entries.push({
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
        const response = await fetch('http://localhost:3000/api/ventes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(entries)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Ventes enregistrées avec succès');
            // Réinitialiser le formulaire
            this.reset();
            // Réinitialiser la date à aujourd'hui
            document.getElementById('date')._flatpickr.setDate(new Date());
            document.getElementById('produits-container').innerHTML = '';
            // Ajouter une nouvelle entrée vide
            document.getElementById('produits-container').appendChild(creerNouvelleEntree());
            calculerTotalGeneral();
            
            // Afficher les dernières ventes
            afficherDernieresVentes(data.dernieresVentes);
        } else {
            throw new Error('Erreur lors de l\'enregistrement des ventes');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de l\'enregistrement des ventes');
    }
});

// Modifier l'ajout de nouveaux produits
document.getElementById('ajouter-produit').addEventListener('click', function() {
    const container = document.getElementById('produits-container');
    container.appendChild(creerNouvelleEntree());
});

// Fonction pour afficher les dernières ventes
function afficherDernieresVentes(ventes) {
    const tbody = document.querySelector('#dernieres-ventes tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (Array.isArray(ventes)) {
        ventes.forEach(vente => {
            // Filtrer selon les droits d'accès
            if (currentUser.pointVente === "tous" || vente['Point de Vente'] === currentUser.pointVente) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${vente.Mois || vente.mois || ''}</td>
                    <td>${vente.Date || vente.date || ''}</td>
                    <td>${vente.Semaine || vente.semaine || ''}</td>
                    <td>${vente['Point de Vente'] || vente.pointVente || ''}</td>
                    <td>${vente.Preparation || vente.preparation || vente['Point de Vente'] || vente.pointVente || ''}</td>
                    <td>${vente.Catégorie || vente.categorie || ''}</td>
                    <td>${vente.Produit || vente.produit || ''}</td>
                    <td>${vente.PU || vente.prixUnit || '0'}</td>
                    <td>${vente.Nombre || vente.quantite || '0'}</td>
                    <td>${vente.Montant || vente.total || '0'}</td>
                `;
                tbody.appendChild(tr);
            }
        });
    }
}

// Fonction pour charger les dernières ventes
async function chargerDernieresVentes() {
    try {
        const response = await fetch('http://localhost:3000/api/dernieres-ventes');
        const data = await response.json();
        
        if (data.success && Array.isArray(data.dernieresVentes)) {
            afficherDernieresVentes(data.dernieresVentes);
        } else {
            console.error('Format de données invalide:', data);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des dernières ventes:', error);
    }
}

// Charger les dernières ventes au démarrage
chargerDernieresVentes();

// Variables pour les graphiques
let ventesParMoisChart = null;
let ventesParProduitChart = null;

// Fonction pour créer le graphique des ventes par mois
function creerGraphiqueVentesParMois(donnees) {
    const ctx = document.getElementById('ventesParMoisChart');
    if (!ctx) return;

    // Détruire le graphique existant s'il existe
    if (ventesParMoisChart) {
        ventesParMoisChart.destroy();
    }

    // Regrouper les ventes par date
    const ventesParDate = {};
    donnees.forEach(vente => {
        const date = vente.Date || vente.date;
        if (!ventesParDate[date]) {
            ventesParDate[date] = 0;
        }
        ventesParDate[date] += parseFloat(vente.Montant || vente.total || 0);
    });

    // Convertir en tableaux et trier par date
    const dates = Object.keys(ventesParDate).sort((a, b) => {
        const [jourA, moisA, anneeA] = a.split('/');
        const [jourB, moisB, anneeB] = b.split('/');
        return new Date(anneeA, moisA - 1, jourA) - new Date(anneeB, moisB - 1, jourB);
    });

    const montants = dates.map(date => ventesParDate[date]);

    // Créer le nouveau graphique
    ventesParMoisChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Ventes par jour',
                data: montants,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
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

// Fonction pour créer le graphique des ventes par produit
function creerGraphiqueVentesParProduit(donnees) {
    const ctx = document.getElementById('ventesParProduitChart');
    if (!ctx) return;

    // Détruire le graphique existant s'il existe
    if (ventesParProduitChart) {
        ventesParProduitChart.destroy();
    }

    // Regrouper les ventes par produit
    const ventesParProduit = {};
    donnees.forEach(vente => {
        const produit = vente.Produit || vente.produit;
        if (!ventesParProduit[produit]) {
            ventesParProduit[produit] = 0;
        }
        ventesParProduit[produit] += parseFloat(vente.Montant || vente.total || 0);
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
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgb(75, 192, 192)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',  // Changer l'axe pour un graphique horizontal
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString('fr-FR') + ' FCFA';
                        }
                    }
                },
                y: {
                    ticks: {
                        autoSkip: false,
                        font: {
                            size: 11
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            return value.toLocaleString('fr-FR') + ' FCFA';
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
        let dateDebut = document.getElementById('date-debut').value;
        let dateFin = document.getElementById('date-fin').value;
        const pointVente = document.getElementById('point-vente-select').value;

        // Si aucune date n'est spécifiée, utiliser le 1er du mois en cours
        if (!dateDebut) {
            const today = new Date();
            const debutMois = new Date(today.getFullYear(), today.getMonth(), 1);
            dateDebut = debutMois.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            // Mettre à jour le champ de date
            document.getElementById('date-debut').value = dateDebut;
            console.log('Date de début par défaut:', dateDebut);
        }

        if (!dateFin) {
            dateFin = new Date().toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        }

        // Convertir les dates au format YYYY-MM-DD
        const debut = dateDebut.split('/').reverse().join('-');
        const fin = dateFin.split('/').reverse().join('-');

        console.log('Chargement des ventes avec les paramètres:', { 
            dateDebut, 
            dateFin, 
            debut, 
            fin, 
            pointVente 
        });

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
            console.log('Dates des ventes reçues:', data.ventes.map(v => v.Date));
            
            // Vérifier si les ventes sont un tableau
            if (!Array.isArray(data.ventes)) {
                console.error('Les ventes ne sont pas un tableau:', data.ventes);
                return;
            }
            
            // Stocker toutes les ventes
            allVentes = data.ventes;
            
            // Vérifier si le tableau est vide
            if (allVentes.length === 0) {
                console.log('Aucune vente trouvée pour la période sélectionnée');
                const tbody = document.querySelector('#tableau-ventes tbody');
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="10" class="text-center">Aucune vente trouvée pour la période sélectionnée</td></tr>';
                }
                // Réinitialiser le montant total si l'élément existe
                const montantTotalElement = document.getElementById('montant-total');
                if (montantTotalElement) {
                    montantTotalElement.textContent = '0 FCFA';
                }
                return;
            }
            
            // Calculer le montant total des ventes
            const montantTotal = allVentes.reduce((total, vente) => {
                return total + parseFloat(vente.Montant || vente.total || 0);
            }, 0);
            
            // Afficher le montant total si l'élément existe
            const montantTotalElement = document.getElementById('montant-total');
            if (montantTotalElement) {
                montantTotalElement.textContent = `${montantTotal.toLocaleString('fr-FR')} FCFA`;
            }
            
            // Mettre à jour les graphiques
            creerGraphiqueVentesParMois(data.ventes);
            creerGraphiqueVentesParProduit(data.ventes);
            creerGraphiqueVentesParCategorie(data.ventes);

            // Afficher la première page
            afficherPageVentes(1);
            
            // Mettre à jour les informations de pagination
            updatePaginationInfo();
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

// Variables globales pour stocker les données importées
let donneesImportees = [];

// Gestion du formulaire d'import
document.getElementById('import-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('file-import');
    
    if (!fileInput.files[0]) {
        alert('Veuillez sélectionner un fichier');
        return;
    }
    
    try {
        donneesImportees = await lireFichier(fileInput.files[0]);
        afficherApercu(donneesImportees);
    } catch (error) {
        console.error('Erreur:', error);
        alert(error.message || 'Erreur lors de l\'importation des données');
    }
});

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

// Fonction pour créer le graphique des ventes par catégorie
function creerGraphiqueVentesParCategorie(ventes) {
    const ctx = document.getElementById('ventesParCategorieChart');
    if (!ctx) return;

    // Détruire le graphique existant s'il existe
    if (window.ventesParCategorieChart instanceof Chart) {
        window.ventesParCategorieChart.destroy();
    }

    // Grouper les ventes par catégorie
    const ventesParCategorie = {
        'Bovin': 0,
        'Ovin': 0,
        'Volaille': 0,
        'Pack': 0
    };

    ventes.forEach(vente => {
        const categorie = vente.Catégorie || vente.categorie;
        if (categorie && ventesParCategorie.hasOwnProperty(categorie)) {
            ventesParCategorie[categorie] += parseFloat(vente.Montant || vente.total || 0);
        }
    });

    // Calculer le total des ventes
    const totalVentes = Object.values(ventesParCategorie).reduce((a, b) => a + b, 0);

    // Filtrer les catégories avec des ventes
    const categoriesAvecVentes = Object.entries(ventesParCategorie)
        .filter(([_, montant]) => montant > 0);

    // Préparer les données pour le graphique
    const labels = categoriesAvecVentes.map(([categorie]) => categorie);
    const montants = categoriesAvecVentes.map(([_, montant]) => montant);
    const pourcentages = montants.map(montant => ((montant / totalVentes) * 100).toFixed(1));

    // Créer le nouveau graphique
    window.ventesParCategorieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels.map((label, index) => `${label} (${pourcentages[index]}%)`),
            datasets: [{
                data: montants,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.8)',  // Rouge pour Bovin
                    'rgba(54, 162, 235, 0.8)',  // Bleu pour Ovin
                    'rgba(255, 206, 86, 0.8)',  // Jaune pour Volaille
                    'rgba(75, 192, 192, 0.8)'   // Vert pour Pack
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 20,
                        font: {
                            size: 14
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const percentage = ((value / totalVentes) * 100).toFixed(1);
                            return `${value.toLocaleString('fr-FR')} FCFA (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Configuration pour l'inventaire
const POINTS_VENTE = [
    'Mbao', 'O.Foire', 'Linguere', 'Dahra', 'Touba', 'Keur Massar',
    'Abattage', 'Depot', 'Gros Client'
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

const POINTS_VENTE_PHYSIQUES = [
    'Keur Massar', 'Mbao', 'O.Foire', 'Linguere', 'Dahra', 'Touba'
];

// Variables globales pour stocker les données de stock
let stockData = {
    matin: new Map(),
    soir: new Map()
};

async function sauvegarderDonneesStock() {
    console.log('%c=== Sauvegarde des données de stock ===', 'background: #222; color: #bada55; font-size: 16px; padding: 5px;');
    const typeStock = document.getElementById('type-stock').value;
    const date = document.getElementById('date-inventaire').value;
    console.log('%cType de stock:', 'color: #ff9900; font-weight: bold;', typeStock);
    console.log('%cDate:', 'color: #ff9900;', date);

    // Collecter les données du tableau
    const donnees = {};
    document.querySelectorAll('#stock-table tbody tr').forEach(row => {
        const pointVente = row.querySelector('.point-vente-select').value;
        const produit = row.querySelector('.produit-select').value;
        const quantite = row.querySelector('.quantite-input').value || '0';
        const prixUnitaire = row.querySelector('.prix-unitaire-input').value || PRIX_DEFAUT[produit] || '0';
        const commentaire = row.querySelector('.commentaire-input').value || '';
        const total = (parseFloat(quantite) * parseFloat(prixUnitaire)).toString();

        const key = `${pointVente}-${produit}`;
        donnees[key] = {
            date: date,
            typeStock: typeStock,
            "Point de Vente": pointVente,
            Produit: produit,
            Nombre: quantite,
            PU: prixUnitaire,
            Montant: total,
            Commentaire: commentaire
        };

        console.log('%cDonnées collectées pour ' + key + ':', 'color: #00aaff;', donnees[key]);
    });

    console.log('%cDonnées complètes à sauvegarder:', 'color: #00ff00; font-weight: bold;', donnees);

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
        } else {
            console.error('%cErreur lors de la sauvegarde:', 'color: #ff0000; font-weight: bold;', result.error);
            alert('Erreur lors de la sauvegarde des données');
        }
    } catch (error) {
        console.error('%cErreur lors de la sauvegarde:', 'color: #ff0000; font-weight: bold;', error);
        alert('Erreur lors de la sauvegarde des données');
    }
}

// Fonction pour initialiser le tableau de stock
function initTableauStock() {
    console.log('%c=== Début initTableauStock ===', 'background: #222; color: #bada55; font-size: 16px; padding: 5px;');
    
    const tbody = document.querySelector('#stock-table tbody');
    const typeStock = document.getElementById('type-stock').value;
    console.log('%cType de stock actuel:', 'color: #ff9900; font-weight: bold;', typeStock);
    console.log('%cÉtat des données stockData:', 'color: #00ff00; font-weight: bold;', {
        matin: {
            taille: stockData.matin.size + ' entrées',
            données: Array.from(stockData.matin.entries())
        },
        soir: {
            taille: stockData.soir.size + ' entrées',
            données: Array.from(stockData.soir.entries())
        }
    });

    tbody.innerHTML = '';
    console.log('%cTableau vidé', 'color: #ff0000;');

    // Récupérer les données sauvegardées pour le type de stock actuel
    const donneesSauvegardees = stockData[typeStock];
    console.log('%cDonnées récupérées pour', 'color: #00ff00;', typeStock, ':', {
        nombreEntrees: donneesSauvegardees ? donneesSauvegardees.size : 0,
        donnees: donneesSauvegardees ? Array.from(donneesSauvegardees.entries()) : []
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
                inputPrixUnitaire.value = PRIX_DEFAUT[produit];
                inputCommentaire.value = '';
                tdTotal.textContent = '0';
            }
            
            tdQuantite.appendChild(inputQuantite);
            tdPrixUnitaire.appendChild(inputPrixUnitaire);
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
                inputPrixUnitaire.value = PRIX_DEFAUT[nouveauProduit];
                calculateTotal();
            });
            
            inputQuantite.addEventListener('input', calculateTotal);
            inputPrixUnitaire.addEventListener('input', calculateTotal);
            
            tbody.appendChild(row);
        });
    });
    
    console.log('%c=== Fin initTableauStock ===', 'background: #222; color: #bada55; font-size: 16px; padding: 5px;');
}

// Fonction pour initialiser le tableau de transfert
function initTableauTransfert() {
    const tbody = document.querySelector('#transfert-table tbody');
    if (tbody) {
        tbody.innerHTML = '';
        ajouterLigneTransfert();
    }
}

// Modification de la fonction showUserInterface pour afficher l'onglet Stock inventaire
function showUserInterface(userData) {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
    
    // Afficher l'onglet Stock inventaire uniquement pour les utilisateurs avec accès à tous les points de vente
    const stockInventaireItem = document.querySelector('.stock-inventaire-item');
    if (userData.pointVente === 'tous') {
        stockInventaireItem.style.display = 'block';
    } else {
        stockInventaireItem.style.display = 'none';
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
        }
    });

    // Initialiser le sélecteur de type de stock
    const typeStockSelect = document.getElementById('type-stock');
    typeStockSelect.addEventListener('change', onTypeStockChange);

    // Charger les données initiales
    try {
        const typeStockInitial = typeStockSelect.value;
        console.log('%cChargement initial des données pour le type:', 'color: #00aaff;', typeStockInitial);
        
        // Charger le stock
        const response = await fetch(`http://localhost:3000/api/stock/${typeStockInitial}`, {
            method: 'GET',
            credentials: 'include'
        });
        const donnees = await response.json();
        console.log('%cDonnées initiales chargées:', 'color: #00ff00;', donnees);
        
        // Initialiser les tableaux
        initTableauStock();
        await chargerTransferts(); // Charger les transferts
        
    } catch (error) {
        console.error('%cErreur lors du chargement initial des données:', 'color: #ff0000;', error);
        // En cas d'erreur, initialiser quand même les tableaux
        initTableauStock();
        ajouterLigneTransfert();
    }

    // Ajouter les écouteurs d'événements pour les boutons
    document.getElementById('save-stock').addEventListener('click', sauvegarderDonneesStock);
    
    console.log('%c=== Initialisation terminée ===', 'background: #222; color: #bada55; font-size: 16px; padding: 5px;');
}

// Fonction séparée pour gérer le changement de type de stock
async function onTypeStockChange() {
    console.log('%c=== Changement de type de stock ===', 'background: #222; color: #bada55; font-size: 16px; padding: 5px;');
    const typeStock = document.getElementById('type-stock').value;
    console.log('%cNouveau type de stock:', 'color: #ff9900; font-weight: bold;', typeStock);

    // Récupérer les données du nouveau type depuis le serveur
    try {
        console.log('%cRécupération des données depuis le serveur pour le type:', 'color: #00aaff;', typeStock);
        const response = await fetch(`http://localhost:3000/api/stock/${typeStock}`, {
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
                
                // Point de vente (non modifiable)
                const tdPointVente = document.createElement('td');
                const selectPointVente = document.createElement('select');
                selectPointVente.className = 'point-vente-select';
                selectPointVente.disabled = true;
                const optionPointVente = document.createElement('option');
                optionPointVente.value = pointVente;
                optionPointVente.textContent = pointVente;
                selectPointVente.appendChild(optionPointVente);
                tdPointVente.appendChild(selectPointVente);
                tr.appendChild(tdPointVente);

                // Produit (non modifiable)
                const tdProduit = document.createElement('td');
                const selectProduit = document.createElement('select');
                selectProduit.className = 'produit-select';
                selectProduit.disabled = true;
                const optionProduit = document.createElement('option');
                optionProduit.value = produit;
                optionProduit.textContent = produit;
                selectProduit.appendChild(optionProduit);
                tdProduit.appendChild(selectProduit);
                tr.appendChild(tdProduit);

                // Quantité
                const tdQuantite = document.createElement('td');
                const inputQuantite = document.createElement('input');
                inputQuantite.type = 'number';
                inputQuantite.className = 'quantite-input';
                inputQuantite.min = '0';
                tdQuantite.appendChild(inputQuantite);
                tr.appendChild(tdQuantite);

                // Prix unitaire
                const tdPrixUnitaire = document.createElement('td');
                const inputPrixUnitaire = document.createElement('input');
                inputPrixUnitaire.type = 'number';
                inputPrixUnitaire.className = 'prix-unitaire-input';
                inputPrixUnitaire.min = '0';
                tdPrixUnitaire.appendChild(inputPrixUnitaire);
                tr.appendChild(tdPrixUnitaire);

                // Total
                const tdTotal = document.createElement('td');
                const inputTotal = document.createElement('input');
                inputTotal.type = 'number';
                inputTotal.className = 'total-input';
                inputTotal.readOnly = true;
                tdTotal.appendChild(inputTotal);
                tr.appendChild(tdTotal);

                // Commentaire
                const tdCommentaire = document.createElement('td');
                const inputCommentaire = document.createElement('input');
                inputCommentaire.type = 'text';
                inputCommentaire.className = 'commentaire-input';
                tdCommentaire.appendChild(inputCommentaire);
                tr.appendChild(tdCommentaire);

                // Restaurer les données sauvegardées si elles existent
                const key = `${pointVente}-${produit}`;
                if (donnees[key]) {
                    console.log(`%cRestauration des données pour ${key}:`, 'color: #00ff00;', donnees[key]);
                    inputQuantite.value = donnees[key].Nombre || donnees[key].quantite || '0';
                    inputPrixUnitaire.value = donnees[key].PU || donnees[key].prixUnitaire || PRIX_DEFAUT[produit] || '0';
                    inputCommentaire.value = donnees[key].Commentaire || donnees[key].commentaire || '';
                    // Recalculer le total
                    inputTotal.value = (parseFloat(inputQuantite.value) * parseFloat(inputPrixUnitaire.value)).toString();
                } else {
                    console.log(`%cPas de données pour ${key}, utilisation des valeurs par défaut`, 'color: #ff9900;');
                    inputQuantite.value = '0';
                    inputPrixUnitaire.value = PRIX_DEFAUT[produit] || '0';
                    inputCommentaire.value = '';
                    inputTotal.value = '0';
                }

                // Ajouter les écouteurs d'événements pour le calcul automatique du total
                inputQuantite.addEventListener('input', () => {
                    const quantite = parseFloat(inputQuantite.value) || 0;
                    const prixUnitaire = parseFloat(inputPrixUnitaire.value) || 0;
                    inputTotal.value = (quantite * prixUnitaire).toString();
                });

                inputPrixUnitaire.addEventListener('input', () => {
                    const quantite = parseFloat(inputQuantite.value) || 0;
                    const prixUnitaire = parseFloat(inputPrixUnitaire.value) || 0;
                    inputTotal.value = (quantite * prixUnitaire).toString();
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

// Tous les points de vente (physiques et virtuels)
const TOUS_POINTS_VENTE = [
    // Points de vente physiques
    'Mbao', 'O.Foire', 'Linguere', 'Dahra', 'Touba', 'Keur Massar',
    // Points de vente virtuels
    'Abattage', 'Depot', 'Gros Client'
];

// Structure pour gérer les transferts
const transfertsManager = {
    transferts: [],

    // Ajouter un nouveau transfert
    addTransfert(pointVente, produit, impact, quantite, prixUnitaire, commentaire) {
        const transfert = {
            date: document.getElementById('date-inventaire').value,
            pointVente,
            produit,
            impact: parseInt(impact),
            quantite: parseFloat(quantite),
            prixUnitaire: parseFloat(prixUnitaire),
            total: parseFloat(quantite) * parseFloat(prixUnitaire),
            commentaire,
            timestamp: new Date().toISOString()
        };
        this.transferts.push(transfert);
        return transfert;
    },

    // Sauvegarder les transferts
    async saveTransferts() {
        try {
            const donnees = this.transferts.map(t => ({
                date: t.date,
                pointVente: t.pointVente,
                produit: t.produit,
                impact: t.impact,
                quantite: t.quantite,
                prixUnitaire: t.prixUnitaire,
                total: t.total,
                commentaire: t.commentaire
            }));

            const response = await fetch('http://localhost:3000/api/transferts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(donnees)
            });

            const result = await response.json();
            if (result.success) {
                console.log('%cTransferts sauvegardés avec succès', 'color: #00ff00; font-weight: bold;');
                this.transferts = [];
                return true;
            } else {
                throw new Error(result.message || 'Erreur lors de la sauvegarde des transferts');
            }
        } catch (error) {
            console.error('%cErreur lors de la sauvegarde des transferts:', 'color: #ff0000; font-weight: bold;', error);
            throw error;
        }
    }
};

// Fonction pour ajouter une ligne au tableau de transfert
function ajouterLigneTransfert() {
    const tbody = document.querySelector('#transfert-table tbody');
    const row = document.createElement('tr');
    
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
    
    // Impact (+/-)
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
    inputQuantite.step = '0.1';
    inputQuantite.value = '0';
    tdQuantite.appendChild(inputQuantite);
    
    // Prix unitaire
    const tdPrixUnitaire = document.createElement('td');
    const inputPrixUnitaire = document.createElement('input');
    inputPrixUnitaire.type = 'number';
    inputPrixUnitaire.className = 'form-control form-control-sm prix-unitaire-input';
    inputPrixUnitaire.value = '0';
    tdPrixUnitaire.appendChild(inputPrixUnitaire);
    
    // Total (calculé automatiquement)
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
    row.append(tdPointVente, tdProduit, tdImpact, tdQuantite, tdPrixUnitaire, tdTotal, tdCommentaire, tdActions);
    
    // Gestionnaire pour le calcul automatique du total
    const calculateTotal = () => {
        const quantite = parseFloat(inputQuantite.value) || 0;
        const prixUnitaire = parseFloat(inputPrixUnitaire.value) || 0;
        const impact = parseInt(selectImpact.value) || 1;
        const total = quantite * prixUnitaire * impact;
        tdTotal.textContent = total.toLocaleString('fr-FR');
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
    selectImpact.addEventListener('change', calculateTotal);
    
    tbody.appendChild(row);
}

// Ajouter l'écouteur d'événements pour le bouton d'ajout de ligne
document.getElementById('add-transfert-row').addEventListener('click', ajouterLigneTransfert);

// Ajouter l'écouteur d'événements pour la sauvegarde des transferts
document.getElementById('save-transfert').addEventListener('click', async () => {
    try {
        const tbody = document.querySelector('#transfert-table tbody');
        const rows = tbody.querySelectorAll('tr');
        
        const transferts = [];
        
        rows.forEach(row => {
            const pointVente = row.querySelector('.point-vente-select').value;
            const produit = row.querySelector('.produit-select').value;
            const impact = parseInt(row.querySelector('.impact-select').value);
            const quantite = parseFloat(row.querySelector('.quantite-input').value);
            const prixUnitaire = parseFloat(row.querySelector('.prix-unitaire-input').value);
            const commentaire = row.querySelector('.commentaire-input').value;
            
            if (pointVente && produit && !isNaN(quantite) && !isNaN(prixUnitaire)) {
                transferts.push({
                    date: document.getElementById('date-inventaire').value,
                    pointVente,
                    produit,
                    impact,
                    quantite,
                    prixUnitaire,
                    total: quantite * prixUnitaire * impact,
                    commentaire
                });
            }
        });
        
        if (transferts.length === 0) {
            alert('Aucune donnée valide à sauvegarder');
            return;
        }

        // Afficher un résumé des transferts à sauvegarder
        const resume = transferts.map(t => 
            `${t.pointVente} - ${t.produit}: ${t.quantite} unités (${t.impact > 0 ? '+' : '-'}${t.total.toLocaleString('fr-FR')} FCFA)`
        ).join('\n');

        // Demander confirmation
        if (!confirm(`Voulez-vous sauvegarder les transferts suivants ?\n\n${resume}\n\nCette action écrasera les transferts existants pour cette date.`)) {
            return;
        }
        
        console.log('%cSauvegarde des transferts:', 'color: #00aaff;', transferts);
        
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
            console.log('%cTransferts sauvegardés avec succès', 'color: #00ff00; font-weight: bold;');
            alert('Transferts sauvegardés avec succès');
            
            // Recharger les transferts pour mettre à jour l'affichage
            await chargerTransferts();
        } else {
            throw new Error(result.message || 'Erreur lors de la sauvegarde des transferts');
        }
    } catch (error) {
        console.error('%cErreur lors de la sauvegarde des transferts:', 'color: #ff0000; font-weight: bold;', error);
        alert('Erreur lors de la sauvegarde des transferts');
    }
});

// Fonction pour charger les transferts
async function chargerTransferts() {
    console.log('%c=== Chargement des transferts ===', 'background: #222; color: #bada55; font-size: 16px; padding: 5px;');
    const date = document.getElementById('date-inventaire').value;
    try {
        const response = await fetch(`http://localhost:3000/api/transferts?date=${date}`, {
            credentials: 'include'
        });
        const result = await response.json();
        
        if (result.success) {
            console.log('%cTransferts chargés:', 'color: #00ff00;', result.transferts);
            // Vider le tableau existant
            const tbody = document.querySelector('#transfert-table tbody');
            tbody.innerHTML = '';
            
            // Si des transferts existent pour cette date, les afficher
            if (result.transferts && result.transferts.length > 0) {
                result.transferts.forEach(transfert => {
                    afficherTransfert(transfert);
                });
            } else {
                // Si aucun transfert, ajouter une ligne vide
                ajouterLigneTransfert();
            }
        } else {
            console.error('%cErreur lors du chargement des transferts:', 'color: #ff0000;', result.message);
            ajouterLigneTransfert();
        }
    } catch (error) {
        console.error('%cErreur lors du chargement des transferts:', 'color: #ff0000;', error);
        ajouterLigneTransfert();
    }
}

// Fonction pour afficher un transfert existant
function afficherTransfert(transfert) {
    console.log('%cAffichage du transfert:', 'color: #00aaff;', transfert);
    const tbody = document.querySelector('#transfert-table tbody');
    const row = document.createElement('tr');
    
    // Point de vente
    const tdPointVente = document.createElement('td');
    const selectPointVente = document.createElement('select');
    selectPointVente.className = 'form-select form-select-sm point-vente-select';
    TOUS_POINTS_VENTE.forEach(pv => {
        const option = document.createElement('option');
        option.value = pv;
        option.textContent = pv;
        if (pv === transfert.pointVente) option.selected = true;
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
        if (prod === transfert.produit) option.selected = true;
        selectProduit.appendChild(option);
    });
    tdProduit.appendChild(selectProduit);
    
    // Impact (+/-)
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
        if (parseInt(value) === transfert.impact) option.selected = true;
        selectImpact.appendChild(option);
    });
    tdImpact.appendChild(selectImpact);
    
    // Quantité
    const tdQuantite = document.createElement('td');
    const inputQuantite = document.createElement('input');
    inputQuantite.type = 'number';
    inputQuantite.className = 'form-control form-control-sm quantite-input';
    inputQuantite.step = '0.1';
    inputQuantite.value = transfert.quantite;
    tdQuantite.appendChild(inputQuantite);
    
    // Prix unitaire
    const tdPrixUnitaire = document.createElement('td');
    const inputPrixUnitaire = document.createElement('input');
    inputPrixUnitaire.type = 'number';
    inputPrixUnitaire.className = 'form-control form-control-sm prix-unitaire-input';
    inputPrixUnitaire.step = '100';
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
    row.append(tdPointVente, tdProduit, tdImpact, tdQuantite, tdPrixUnitaire, tdTotal, tdCommentaire, tdActions);
    
    // Gestionnaire pour le calcul automatique du total
    const calculateTotal = () => {
        const quantite = parseFloat(inputQuantite.value) || 0;
        const prixUnitaire = parseFloat(inputPrixUnitaire.value) || 0;
        const impact = parseInt(selectImpact.value) || 1;
        const total = quantite * prixUnitaire * impact;
        tdTotal.textContent = total.toLocaleString('fr-FR');
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
    selectImpact.addEventListener('change', calculateTotal);
    
    tbody.appendChild(row);
} 