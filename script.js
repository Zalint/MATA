// Vérification de l'authentification
let currentUser = null;

// Variables globales
let donneesImportees = {
    matin: new Map(),
    soir: new Map(),
    transferts: []
};

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
        
        if (usersWithSpecialAccess.includes(currentUser.username) || currentUser.isSuperAdmin) {
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
    // Récupérer la date sélectionnée
    const dateSelectionnee = document.getElementById('date').value;
    
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
    
    // Normaliser la date sélectionnée une seule fois pour éviter de recalculer à chaque itération
    const dateNormalisee = normaliserDate(dateSelectionnee);
    
    // 1. Calculer le total des lignes en cours de saisie plus efficacement
    const totalSaisie = Array.from(document.querySelectorAll('.total'))
        .reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0);
    
    // 2. Calculer le total des dernières ventes affichées pour la date sélectionnée
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
            const dateVente = normaliserDate(row.querySelector('td:nth-child(2)').textContent.trim());
            
            // N'ajouter le montant que si la date correspond à la date sélectionnée
            if (dateVente === dateNormalisee) {
                const montantText = row.querySelector('td:nth-child(10)').textContent.trim();
                const montant = parseFloat(montantText.replace(/\s/g, '').replace(/,/g, '.')) || 0;
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
    if (dateInput) {
        dateInput.addEventListener('change', function() {
            // Recalculer le total général quand la date change
            setTimeout(calculerTotalGeneral, 0);
        });
        
        // Calculer le total général au chargement de la page
        setTimeout(calculerTotalGeneral, 100);
    }
});

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
    
    ventes.forEach(vente => {
        console.log("Structure de la vente reçue:", vente);
        
        const tr = document.createElement('tr');
        
        // Extraire et nettoyer les valeurs
        const mois = vente.Mois || '';
        let date = vente.Date || '';
        const semaine = vente.Semaine || '';
        const pointVente = vente['Point de Vente'] || '';
        const preparation = vente.Preparation || pointVente || '';
        const categorie = vente.Catégorie || '';
        const produit = vente.Produit || '';
        
        // Formater la date en DD-MM-YY si elle n'est pas déjà dans ce format
        if (date && !date.match(/^\d{2}-\d{2}-\d{2}$/)) {
            const [jour, mois, annee] = date.split('/');
            if (jour && mois && annee) {
                // Si la date est au format DD/MM/YYYY, la convertir en DD-MM-YY
                date = `${jour.padStart(2, '0')}-${mois.padStart(2, '0')}-${annee.slice(-2)}`;
            }
        }
        
        // Gérer les valeurs numériques
        let prixUnitaire = 0;
        if (vente.PU) {
            prixUnitaire = parseFloat(vente.PU.toString().replace(/[^\d.-]/g, '')) || 0;
        }
        
        let nombre = 0;
        if (vente.Nombre) {
            nombre = parseFloat(vente.Nombre.toString().replace(/[^\d.-]/g, '')) || 0;
        }
        
        // Calculer le montant
        const montant = prixUnitaire * nombre;
        
        // Vérifier si la vente est d'aujourd'hui
        const estAujourdhui = isToday(date);
        console.log("Date de la vente:", date, "Est aujourd'hui:", estAujourdhui);
        
        tr.innerHTML = `
            <td>${mois}</td>
            <td>${date}</td>
            <td>${semaine}</td>
            <td>${pointVente}</td>
            <td>${preparation}</td>
            <td>${categorie}</td>
            <td>${produit}</td>
            <td>${prixUnitaire.toLocaleString('fr-FR')}</td>
            <td>${nombre.toLocaleString('fr-FR')}</td>
            <td>${montant.toLocaleString('fr-FR')}</td>
            <td>
                ${estAujourdhui ? `
                <button class="btn btn-sm btn-danger supprimer-vente ms-2" 
                    data-vente-id="${vente.id}"
                    data-categorie="${categorie}"
                    data-produit="${produit}"
                    data-point-vente="${pointVente}"
                    data-prix="${prixUnitaire}"
                    data-quantite="${nombre}"
                    data-montant="${montant}"
                    data-date="${date}">
                    Supprimer
                </button>
                ` : ''}
            </td>
        `;
        
        // Ajouter les gestionnaires d'événements pour les boutons
        const supprimerBtn = tr.querySelector('.supprimer-vente');
        
        if (supprimerBtn) {
            supprimerBtn.addEventListener('click', async function() {
                const venteId = this.dataset.venteId;
                const pointVente = this.dataset.pointVente;
                const categorie = this.dataset.categorie;
                const produit = this.dataset.produit;
                const prix = parseFloat(this.dataset.prix).toLocaleString('fr-FR');
                const quantite = parseFloat(this.dataset.quantite).toLocaleString('fr-FR');
                const montant = parseFloat(this.dataset.montant).toLocaleString('fr-FR');
                const date = this.dataset.date;
                
                const message = `Voulez-vous vraiment supprimer cette vente ?\n\n` +
                              `Date: ${date}\n` +
                              `Point de vente: ${pointVente}\n` +
                              `Catégorie: ${categorie}\n` +
                              `Produit: ${produit}\n` +
                              `Prix unitaire: ${prix} FCFA\n` +
                              `Quantité: ${quantite}\n` +
                              `Montant total: ${montant} FCFA`;
                
                if (confirm(message)) {
                    try {
                        const response = await fetch(`http://localhost:3000/api/ventes/${venteId}?pointVente=${pointVente}`, {
                            method: 'DELETE',
                            credentials: 'include'
                        });
                        
                        const data = await response.json();
                        
                        if (data.success) {
                            // Recharger les ventes après la suppression
                            chargerDernieresVentes();
                        } else {
                            alert(data.message || 'Erreur lors de la suppression de la vente');
                        }
                    } catch (error) {
                        console.error('Erreur lors de la suppression:', error);
                        alert('Erreur lors de la suppression de la vente');
                    }
                }
            });
        }
        
        tbody.appendChild(tr);
    });
}

// Fonction pour charger les dernières ventes
async function chargerDernieresVentes() {
    try {
        console.log('Début du chargement des dernières ventes');
        
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
            
            // Filtrer les ventes pour le point de vente de l'utilisateur
            let ventesAffichees = data.dernieresVentes;
            if (currentUser && currentUser.pointVente !== "tous") {
                ventesAffichees = data.dernieresVentes.filter(vente => 
                    vente['Point de Vente'] === currentUser.pointVente
                );
            }
            
            // Prendre les 20 dernières ventes
            ventesAffichees = ventesAffichees.slice(-20);
            
            console.log('Données filtrées, affichage des ventes:', ventesAffichees.length, 'entrées');
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

    // Regrouper les ventes par date
    const ventesParDate = {};
    donnees.forEach(vente => {
        const date = vente.Date || vente.date;
        if (!ventesParDate[date]) {
            ventesParDate[date] = 0;
        }
        ventesParDate[date] += parseFloat(vente.Montant || vente.total || 0);
    });
    console.log('Ventes regroupées par date:', ventesParDate);

    // Convertir en tableaux et trier par date
    const dates = Object.keys(ventesParDate).sort((a, b) => {
        const [jourA, moisA, anneeA] = a.includes('/') ? a.split('/') : a.split('-');
        const [jourB, moisB, anneeB] = b.includes('/') ? b.split('/') : b.split('-');
        const anneeA4 = anneeA.length === 2 ? '20' + anneeA : anneeA;
        const anneeB4 = anneeB.length === 2 ? '20' + anneeB : anneeB;
        return new Date(anneeA4, moisA - 1, jourA) - new Date(anneeB4, moisB - 1, jourB);
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
        // S'assurer que la section de visualisation est visible
        const visualisationSection = document.getElementById('visualisation-section');
        if (visualisationSection) {
            visualisationSection.style.display = 'block';
        }

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

// Fonction pour créer le graphique des ventes par catégorie
function creerGraphiqueVentesParCategorie(ventes) {
    console.log('Création du graphique par catégorie avec les données:', ventes);
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
    ventesParCategorieChart = new Chart(ctx, {
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
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right'
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
    'Keur Massar', 'Mbao', 'O.Foire', 'Linguere', 'Dahra', 'Touba',
    'Abattage', 'Depot', 'Gros Client'
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

        console.log('%cDonnées collectées pour ' + pointVente + ' - ' + produit + ':', 'color: #00aaff;', {
            quantite,
            prixUnitaire,
            total,
            commentaire
        });
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
    
    // Initialiser le bouton d'ajout de ligne pour le stock
    const btnAjouterLigneStock = document.getElementById('add-stock-row');
    if (btnAjouterLigneStock) {
        console.log('Bouton add-stock-row trouvé, ajout de l\'écouteur click');
        btnAjouterLigneStock.addEventListener('click', function() {
            console.log('Clic sur le bouton ajouter ligne stock');
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
        });
    } else {
        console.error('Bouton add-stock-row non trouvé');
    }

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

    // Initialiser les écouteurs d'événements pour l'import CSV
    console.log('Initialisation des écouteurs d\'import CSV...');
    
    // Écouteur pour le bouton d'import CSV
    const importCsvBtn = document.getElementById('import-csv');
    if (importCsvBtn) {
        console.log('Bouton import-csv trouvé, ajout de l\'écouteur click');
        importCsvBtn.addEventListener('click', function() {
            console.log('Clic sur le bouton import-csv');
            const fileInput = document.getElementById('csv-file');
            if (fileInput) {
                fileInput.click();
            } else {
                console.error('Élément csv-file non trouvé');
            }
        });
    } else {
        console.error('Bouton import-csv non trouvé');
    }

    // Écouteur pour l'input file
    const csvFileInput = document.getElementById('csv-file');
    if (csvFileInput) {
        console.log('Input csv-file trouvé, ajout de l\'écouteur change');
        csvFileInput.addEventListener('change', importerCSV);
    } else {
        console.error('Input csv-file non trouvé');
    }

    // Nous ne configurons pas l'écouteur pour le bouton sauvegarderTransfert ici car 
    // il est déjà configuré dans l'event listener DOMContentLoaded plus bas dans le code (ligne ~2574)
    // Cela évite la double sauvegarde des transferts qui provoquait l'erreur
    const sauvegarderTransfertBtn = document.getElementById('sauvegarderTransfert');
    if (!sauvegarderTransfertBtn) {
        console.error('Bouton sauvegarderTransfert non trouvé');
    }

    // Initialiser le sélecteur de type de stock
    const typeStockSelect = document.getElementById('type-stock');
    typeStockSelect.addEventListener('change', onTypeStockChange);

    // Charger les données initiales
    try {
        const typeStockInitial = typeStockSelect.value;
        const dateInitiale = document.getElementById('date-inventaire').value;
        console.log('%cChargement initial des données pour le type:', 'color: #00aaff;', typeStockInitial);
        console.log('%cDate initiale:', 'color: #00aaff;', dateInitiale);
        
        // Charger les données pour les deux types de stock (matin et soir)
        const [matinResponse, soirResponse] = await Promise.all([
            fetch(`http://localhost:3000/api/stock/matin?date=${dateInitiale}`, {
                method: 'GET',
                credentials: 'include'
            }),
            fetch(`http://localhost:3000/api/stock/soir?date=${dateInitiale}`, {
                method: 'GET',
                credentials: 'include'
            })
        ]);

        const [matinData, soirData] = await Promise.all([
            matinResponse.json(),
            soirResponse.json()
        ]);

        console.log('%cDonnées matin chargées:', 'color: #00ff00;', matinData);
        console.log('%cDonnées soir chargées:', 'color: #00ff00;', soirData);

        // Convertir les données en Map pour un accès plus facile
        stockData.matin = new Map();
        stockData.soir = new Map();

        // Traiter les données du matin
        if (Array.isArray(matinData)) {
            matinData.forEach(item => {
                const key = `${item["Point de Vente"] || item.pointVente}-${item.Produit || item.produit}`;
                stockData.matin.set(key, item);
            });
        } else {
            Object.entries(matinData || {}).forEach(([key, value]) => {
                stockData.matin.set(key, value);
            });
        }

        // Traiter les données du soir
        if (Array.isArray(soirData)) {
            soirData.forEach(item => {
                const key = `${item["Point de Vente"] || item.pointVente}-${item.Produit || item.produit}`;
                stockData.soir.set(key, item);
            });
        } else {
            Object.entries(soirData || {}).forEach(([key, value]) => {
                stockData.soir.set(key, value);
            });
        }

        console.log('%cDonnées stockées dans stockData:', 'color: #00ff00;', {
            matin: Array.from(stockData.matin.entries()),
            soir: Array.from(stockData.soir.entries())
        });
        
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

    // Charger les transferts initiaux
    await chargerTransferts();
    console.log('Chargement initial des transferts effectué');
}

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
    async saveTransferts(transfertsFromForm) {
        try {
            // Vérifier si des transferts sont fournis
            if (!Array.isArray(transfertsFromForm) || transfertsFromForm.length === 0) {
                throw new Error('Aucun transfert à sauvegarder');
            }
            
            // Filtrer les transferts valides (quantité > 0)
            const transfertsValides = transfertsFromForm.filter(t => {
                return t.quantite > 0 && t.prixUnitaire > 0;
            });
            
            // Vérifier qu'il reste des transferts valides après filtrage
            if (transfertsValides.length === 0) {
                throw new Error('Aucun transfert valide à sauvegarder. Vérifiez que les quantités sont supérieures à 0.');
            }
            
            console.log(`Transferts à sauvegarder: ${transfertsValides.length} sur ${transfertsFromForm.length} fournis`);
            
            const donnees = transfertsValides.map(t => ({
                date: t.date,
                pointVente: t.pointVente,
                produit: t.produit,
                impact: t.impact,
                quantite: t.quantite,
                prixUnitaire: t.prixUnitaire,
                total: t.quantite * t.prixUnitaire * t.impact,
                commentaire: t.commentaire || ''
            }));

            const response = await fetch('http://localhost:3000/api/transferts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(donnees)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erreur lors de la sauvegarde des transferts');
            }
            
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
    console.log('Début de la fonction ajouterLigneTransfert');
    
    const tbody = document.querySelector('#transfertTable tbody');
    if (!tbody) {
        console.error('Table des transferts non trouvée');
        return;
    }
    console.log('Table des transferts trouvée');
    
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
    console.log('Nouvelle ligne de transfert ajoutée');
}

// Initialisation du bouton d'ajout de ligne de transfert
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initialisation des boutons de transfert');
    const btnAjouterLigne = document.getElementById('ajouterLigne');
    if (btnAjouterLigne) {
        console.log('Bouton ajouterLigne trouvé, ajout de l\'écouteur click');
        btnAjouterLigne.addEventListener('click', function() {
            console.log('Clic sur le bouton ajouter ligne transfert');
            ajouterLigneTransfert();
        });
    } else {
        console.error('Bouton ajouterLigne non trouvé');
    }
    
    // Initialiser le bouton de sauvegarde des transferts
    const btnSaveTransfert = document.getElementById('sauvegarderTransfert');
    if (btnSaveTransfert) {
        console.log('Bouton sauvegarderTransfert trouvé, ajout de l\'écouteur click');
        btnSaveTransfert.addEventListener('click', async () => {
            try {
                const tbody = document.querySelector('#transfertTable tbody');
                const rows = Array.from(tbody.querySelectorAll('tr:not([disabled])'));
                
                const transferts = rows.map(row => {
                    const pointVenteSelect = row.querySelector('.point-vente-select');
                    const produitSelect = row.querySelector('.produit-select');
                    const impactSelect = row.querySelector('.impact-select');
                    const quantiteInput = row.querySelector('.quantite-input');
                    const prixUnitaireInput = row.querySelector('.prix-unitaire-input');
                    const commentaireInput = row.querySelector('.commentaire-input');

                    if (!pointVenteSelect || !produitSelect || !impactSelect || !quantiteInput || !prixUnitaireInput) {
                        throw new Error('Certains champs sont manquants');
                    }

                    return {
                        date: document.getElementById('date-inventaire').value,
                        pointVente: pointVenteSelect.value,
                        produit: produitSelect.value,
                        impact: parseInt(impactSelect.value),
                        quantite: parseFloat(quantiteInput.value),
                        prixUnitaire: parseFloat(prixUnitaireInput.value),
                        commentaire: commentaireInput ? commentaireInput.value : ''
                    };
                });

                await transfertsManager.saveTransferts(transferts);
                alert('Transferts sauvegardés avec succès');
                chargerTransferts(); // Recharger les transferts
            } catch (error) {
                console.error('Erreur lors de la sauvegarde des transferts:', error);
                alert('Erreur lors de la sauvegarde des transferts: ' + error.message);
            }
        });
    } else {
        console.error('Bouton sauvegarderTransfert non trouvé');
    }
});

// Supprimer l'ancien event listener qui causait l'erreur
// document.getElementById('save-transfert').addEventListener('click', async () => { ... });

// Vérifier l'authentification au chargement de la page
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('Vérification de l\'authentification au chargement de la page');
        const response = await fetch('http://localhost:3000/api/check-session', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Non authentifié');
        }
        
        const data = await response.json();
        console.log('Données de session reçues:', data);
        
        if (data.success && data.user) {
            currentUser = data.user;
            console.log('Utilisateur authentifié:', currentUser);
            
            // Charger les dernières ventes après l'authentification
            await chargerDernieresVentes();
            
            // Initialiser le rafraîchissement automatique
            initialiserRafraichissementAutomatique();
        } else {
            console.error('Session invalide');
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Erreur lors de la vérification de l\'authentification:', error);
        window.location.href = 'login.html';
    }
});

// Ne pas charger les ventes immédiatement, attendre l'authentification
// chargerDernieresVentes();

// Ajout d'une fonction pour mettre à jour régulièrement les dernières ventes
function initialiserRafraichissementAutomatique() {
    // Rafraîchir les dernières ventes toutes les 60 secondes
    setInterval(chargerDernieresVentes, 60000);
    console.log('Rafraîchissement automatique des dernières ventes configuré');
    
    // Charger les ventes immédiatement
    chargerDernieresVentes();
}

// Fonction pour importer un fichier CSV
async function importerCSV(event) {
    try {
        console.log('Début de l\'importation CSV');
        const file = event.target.files[0];
        if (!file) {
            console.error('Aucun fichier sélectionné');
            return;
        }

        // Afficher un message de chargement
        document.getElementById('previewSection').style.display = 'block';
        document.querySelector('#previewTable tbody').innerHTML = '<tr><td colspan="7" class="text-center">Chargement en cours...</td></tr>';

        const data = await lireFichier(file);
        console.log('Données lues:', data);

        // Préparer les données pour l'affichage
        const previewData = [];
        for (const row of data) {
            if (row.length >= 8) { // Vérifier qu'il y a assez de colonnes
                const [pointVente, date, stock, produit, impact, quantite, pu, total] = row;
                
                // Standardiser le nom du point de vente
                const standardPointVente = MAPPING_POINTS_VENTE[pointVente.toUpperCase()] || pointVente;
                
                // Standardiser le nom du produit
                const standardProduit = MAPPING_PRODUITS[produit.toUpperCase()] || produit;

                // Vérifier que les valeurs numériques sont valides
                const quantiteNum = parseFloat(quantite);
                const puNum = parseFloat(pu);
                
                if (!isNaN(quantiteNum) && !isNaN(puNum)) {
                    previewData.push({
                        pointVente: standardPointVente,
                        date,
                        stock,
                        produit: standardProduit,
                        impact: impact === '+' ? 1 : -1,
                        quantite: quantiteNum,
                        prixUnitaire: puNum,
                        total: quantiteNum * puNum
                    });
                }
            }
        }

        // Afficher l'aperçu
        const tbody = document.querySelector('#previewTable tbody');
        tbody.innerHTML = '';
        
        if (previewData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Aucune donnée valide trouvée dans le fichier</td></tr>';
            return;
        }

        previewData.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.dataset.index = index;
            tr.innerHTML = `
                <td>${row.pointVente}</td>
                <td>${row.date}</td>
                <td>${row.produit}</td>
                <td>${row.stock === 'Stock Matin' ? row.quantite : ''}</td>
                <td>${row.stock === 'Stock Soir' ? row.quantite : ''}</td>
                <td>${row.impact === 1 ? '+' : '-'}${row.quantite}</td>
                <td>
                    <button class="btn btn-danger btn-sm delete-row">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);

            // Ajouter l'écouteur d'événements pour le bouton de suppression
            const deleteBtn = tr.querySelector('.delete-row');
            deleteBtn.addEventListener('click', function() {
                if (confirm('Voulez-vous vraiment supprimer cette ligne ?')) {
                    previewData.splice(index, 1);
                    tr.remove();
                    // Mettre à jour les indices des lignes restantes
                    tbody.querySelectorAll('tr').forEach((row, newIndex) => {
                        row.dataset.index = newIndex;
                    });
                }
            });
        });

        // Stocker les données pour l'import
        window.donneesImportees = previewData;
        
        // Activer le bouton de confirmation
        document.getElementById('confirmImport').disabled = false;

    } catch (error) {
        console.error('Erreur lors de l\'importation:', error);
        const tbody = document.querySelector('#previewTable tbody');
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Erreur: ${error.message}</td></tr>`;
        document.getElementById('confirmImport').disabled = true;
    }
}

// Fonction pour charger les transferts
async function chargerTransferts() {
    try {
        console.log('Chargement des transferts...');
        const date = document.getElementById('date-inventaire').value;
        
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
        const transfertsFiltres = Array.isArray(transferts) ? transferts.filter(t => t.date === date) : [];
        console.log('Transferts filtrés par date:', transfertsFiltres);

        // Vider le tableau des transferts
        const tbody = document.querySelector('#transfertTable tbody');
        if (!tbody) {
            console.error('Table des transferts non trouvée');
            return;
        }
        
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
          
        // Toujours ajouter un bouton pour créer une nouvelle ligne
        const tfoot = document.querySelector('#transfertTable tfoot');
        if (tfoot) {
            tfoot.innerHTML = `
              <tr>
                <td colspan="8" class="text-center">
                  <button id="ajouterLigne" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Ajouter une ligne
                  </button>
                </td>
              </tr>
            `;
            
            // Réattacher l'événement au bouton
            document.getElementById('ajouterLigne').addEventListener('click', function() {
                ajouterLigneTransfert();
            });
        }

        console.log('Transferts chargés avec succès');
    } catch (error) {
        console.error('Erreur lors du chargement des transferts:', error);
        const tbody = document.querySelector('#transfertTable tbody');
        if (tbody) {
            // Ajouter un message d'erreur plus convivial
            tbody.innerHTML = '';
            ajouterLigneTransfert();
            
            // Ajouter le bouton d'ajout également en cas d'erreur
            const tfoot = document.querySelector('#transfertTable tfoot');
            if (tfoot) {
                tfoot.innerHTML = `
                  <tr>
                    <td colspan="8" class="text-center">
                      <button id="ajouterLigne" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Ajouter une ligne
                      </button>
                    </td>
                  </tr>
                `;
                
                // Réattacher l'événement au bouton
                document.getElementById('ajouterLigne').addEventListener('click', function() {
                    ajouterLigneTransfert();
                });
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    // Vérifier si l'onglet Stock inventaire est actif
    const stockInventaireTab = document.getElementById('stock-inventaire-tab');
    const stockInventaireSection = document.getElementById('stock-inventaire-section');
    
    if (stockInventaireTab && stockInventaireTab.classList.contains('active')) {
        console.log('Onglet Stock inventaire actif au chargement, initialisation...');
        hideAllSections();
        stockInventaireSection.style.display = 'block';
        await initInventaire();
    }

    // ... code existant ...
});

// Fonction pour formater les données des ventes
function formaterDonneesVentes(ventes) {
    if (!Array.isArray(ventes)) {
        console.error('Les ventes ne sont pas un tableau:', ventes);
        return [];
    }

    return ventes.map(vente => ({
        Date: vente.Date || vente.date,
        Montant: parseFloat(vente.Montant || vente.total || 0),
        Produit: vente.Produit || vente.produit,
        Catégorie: vente.Catégorie || vente.categorie
    }));
}

// Fonction pour charger les données de stock d'une date spécifique
async function chargerStock(date) {
    try {
        console.log('%cChargement des données de stock pour la date:', 'color: #00aaff;', date);
        
        // Charger les données pour les deux types de stock (matin et soir)
        const [matinResponse, soirResponse] = await Promise.all([
            fetch(`http://localhost:3000/api/stock/matin?date=${date}`, {
                method: 'GET',
                credentials: 'include'
            }),
            fetch(`http://localhost:3000/api/stock/soir?date=${date}`, {
                method: 'GET',
                credentials: 'include'
            })
        ]);

        const [matinData, soirData] = await Promise.all([
            matinResponse.json(),
            soirResponse.json()
        ]);

        console.log('%cDonnées matin chargées pour date ' + date + ':', 'color: #00ff00;', matinData);
        console.log('%cDonnées soir chargées pour date ' + date + ':', 'color: #00ff00;', soirData);

        // Vérifier si les données reçues sont vides
        const matinEmpty = !matinData || (Array.isArray(matinData) && matinData.length === 0) || Object.keys(matinData).length === 0;
        const soirEmpty = !soirData || (Array.isArray(soirData) && soirData.length === 0) || Object.keys(soirData).length === 0;
        
        console.log('%cDonnées vides? Matin:', 'color: #ff9900;', matinEmpty, 'Soir:', soirEmpty);

        // Convertir les données en Map pour un accès plus facile
        stockData.matin = new Map();
        stockData.soir = new Map();

        // Initialiser avec des valeurs par défaut si les données sont vides
        if (matinEmpty || soirEmpty) {
            console.log('%cInitialisation des données de stock par défaut (à zéro)', 'color: #ff9900;');
            
            // Pour chaque combinaison de point de vente et produit, créer une entrée avec des valeurs à zéro
            POINTS_VENTE_PHYSIQUES.forEach(pointVente => {
                PRODUITS.forEach(produit => {
                    const key = `${pointVente}-${produit}`;
                    
                    if (matinEmpty) {
                        stockData.matin.set(key, {
                            date: date,
                            typeStock: 'matin',
                            "Point de Vente": pointVente,
                            Produit: produit,
                            Nombre: '0',
                            PU: PRIX_DEFAUT[produit] || '0',
                            Montant: '0',
                            Commentaire: ''
                        });
                    }
                    
                    if (soirEmpty) {
                        stockData.soir.set(key, {
                            date: date,
                            typeStock: 'soir',
                            "Point de Vente": pointVente,
                            Produit: produit,
                            Nombre: '0',
                            PU: PRIX_DEFAUT[produit] || '0',
                            Montant: '0',
                            Commentaire: ''
                        });
                    }
                });
            });
        }

        // Traiter les données du matin si elles ne sont pas vides
        if (!matinEmpty) {
            if (Array.isArray(matinData)) {
                matinData.forEach(item => {
                    const key = `${item["Point de Vente"] || item.pointVente}-${item.Produit || item.produit}`;
                    stockData.matin.set(key, item);
                });
            } else {
                Object.entries(matinData || {}).forEach(([key, value]) => {
                    stockData.matin.set(key, value);
                });
            }
        }

        // Traiter les données du soir si elles ne sont pas vides
        if (!soirEmpty) {
            if (Array.isArray(soirData)) {
                soirData.forEach(item => {
                    const key = `${item["Point de Vente"] || item.pointVente}-${item.Produit || item.produit}`;
                    stockData.soir.set(key, item);
                });
            } else {
                Object.entries(soirData || {}).forEach(([key, value]) => {
                    stockData.soir.set(key, value);
                });
            }
        }

        console.log('%cDonnées stockées dans stockData pour date ' + date + ':', 'color: #00ff00;', {
            matin: Array.from(stockData.matin.entries()),
            soir: Array.from(stockData.soir.entries())
        });
        
        // Mettre à jour l'affichage selon le type de stock actuellement sélectionné
        const typeStock = document.getElementById('type-stock').value;
        onTypeStockChange();
        
    } catch (error) {
        console.error('%cErreur lors du chargement des données de stock:', 'color: #ff0000;', error);
        
        // En cas d'erreur, initialiser quand même avec des valeurs par défaut
        stockData.matin = new Map();
        stockData.soir = new Map();
        
        // Pour chaque combinaison de point de vente et produit, créer une entrée avec des valeurs à zéro
        POINTS_VENTE_PHYSIQUES.forEach(pointVente => {
            PRODUITS.forEach(produit => {
                const key = `${pointVente}-${produit}`;
                
                stockData.matin.set(key, {
                    date: date,
                    typeStock: 'matin',
                    "Point de Vente": pointVente,
                    Produit: produit,
                    Nombre: '0',
                    PU: PRIX_DEFAUT[produit] || '0',
                    Montant: '0',
                    Commentaire: ''
                });
                
                stockData.soir.set(key, {
                    date: date,
                    typeStock: 'soir',
                    "Point de Vente": pointVente,
                    Produit: produit,
                    Nombre: '0',
                    PU: PRIX_DEFAUT[produit] || '0',
                    Montant: '0',
                    Commentaire: ''
                });
            });
        });
        
        // Mettre à jour l'affichage
        onTypeStockChange();
    }
}