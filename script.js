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
        
        // Gérer la visibilité de l'onglet Import
        const importTabContainer = document.getElementById('import-tab-container');
        if (importTabContainer) {
            if (currentUser.username === 'SALIOU' || currentUser.isSuperAdmin) {
                importTabContainer.style.display = 'block';
            } else {
                importTabContainer.style.display = 'none';
            }
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

// Gestion des onglets
document.addEventListener('DOMContentLoaded', function() {
    const saisieTab = document.getElementById('saisie-tab');
    const visualisationTab = document.getElementById('visualisation-tab');
    const importTab = document.getElementById('import-tab');
    const saisieSection = document.getElementById('saisie-section');
    const visualisationSection = document.getElementById('visualisation-section');
    const importSection = document.getElementById('import-section');

    if (saisieTab && visualisationTab && importTab && saisieSection && visualisationSection && importSection) {
        saisieTab.addEventListener('click', function(e) {
            e.preventDefault();
            saisieSection.style.display = 'block';
            visualisationSection.style.display = 'none';
            importSection.style.display = 'none';
            this.classList.add('active');
            visualisationTab.classList.remove('active');
            importTab.classList.remove('active');
        });

        visualisationTab.addEventListener('click', function(e) {
            e.preventDefault();
            saisieSection.style.display = 'none';
            visualisationSection.style.display = 'block';
            importSection.style.display = 'none';
            this.classList.add('active');
            saisieTab.classList.remove('active');
            importTab.classList.remove('active');
            chargerVentes();
        });

        importTab.addEventListener('click', function(e) {
            e.preventDefault();
            saisieSection.style.display = 'none';
            visualisationSection.style.display = 'none';
            importSection.style.display = 'block';
            this.classList.add('active');
            saisieTab.classList.remove('active');
            visualisationTab.classList.remove('active');
        });
    }

    // Gestion de la visualisation
    const periodeSelect = document.getElementById('periode-select');
    if (periodeSelect) {
        // Définir "Ce mois" comme période par défaut
        periodeSelect.value = 'mois';
        
        // Déclencher l'événement change pour initialiser les dates
        periodeSelect.dispatchEvent(new Event('change'));
        
        periodeSelect.addEventListener('change', function() {
            const periode = this.value;
            const dateDebut = document.getElementById('date-debut');
            const dateFin = document.getElementById('date-fin');
            
            // Réinitialiser les dates
            dateDebut._flatpickr.clear();
            dateFin._flatpickr.clear();
            
            const today = new Date();
            
            switch(periode) {
                case 'jour':
                    dateDebut._flatpickr.setDate(today);
                    dateFin._flatpickr.setDate(today);
                    break;
                case 'semaine':
                    const debutSemaine = new Date(today);
                    debutSemaine.setDate(today.getDate() - today.getDay());
                    dateDebut._flatpickr.setDate(debutSemaine);
                    dateFin._flatpickr.setDate(today);
                    break;
                case 'mois':
                    // Définir la date de début au 1er du mois en cours
                    const debutMois = new Date(today.getFullYear(), today.getMonth(), 1);
                    dateDebut._flatpickr.setDate(debutMois);
                    dateFin._flatpickr.setDate(today);
                    break;
            }
            
            // Formater les dates pour l'affichage
            const formatDate = (date) => {
                return date.toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
            };
            
            // Mettre à jour les valeurs des champs de date
            dateDebut.value = formatDate(dateDebut._flatpickr.selectedDates[0]);
            dateFin.value = formatDate(dateFin._flatpickr.selectedDates[0]);
            
            chargerVentes();
        });
    }

    // Ajouter les event listeners pour le rechargement des données
    const dateDebut = document.getElementById('date-debut');
    const dateFin = document.getElementById('date-fin');
    const pointVenteSelect = document.getElementById('point-vente-select');

    if (dateDebut) dateDebut.addEventListener('change', chargerVentes);
    if (dateFin) dateFin.addEventListener('change', chargerVentes);
    if (pointVenteSelect) pointVenteSelect.addEventListener('change', chargerVentes);

    // Gestion du bouton de vidage de la base de données
    const viderBaseBtn = document.getElementById('vider-base');
    if (viderBaseBtn) {
        // Vérifier si l'utilisateur est SALIOU
        if (currentUser && currentUser.username === 'SALIOU') {
            viderBaseBtn.style.display = 'block';
            console.log('Bouton de vidage affiché pour SALIOU');
        } else {
            viderBaseBtn.style.display = 'none';
            console.log('Bouton de vidage masqué - utilisateur:', currentUser ? currentUser.username : 'non connecté');
        }

        // Gérer le clic sur le bouton
        viderBaseBtn.addEventListener('click', async function() {
            if (confirm('Êtes-vous sûr de vouloir vider la base de données ? Cette action est irréversible.')) {
                try {
                    const response = await fetch('http://localhost:3000/api/vider-base', {
                        method: 'POST',
                        credentials: 'include'
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        alert('Base de données vidée avec succès');
                        // Recharger les données
                        chargerVentes();
                        chargerDernieresVentes();
                    } else {
                        throw new Error(data.message || 'Erreur lors du vidage de la base de données');
                    }
                } catch (error) {
                    console.error('Erreur:', error);
                    alert(error.message || 'Erreur lors du vidage de la base de données');
                }
            }
        });
    }
});

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
        const response = await fetch('http://localhost:3000/api/import-ventes', {
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