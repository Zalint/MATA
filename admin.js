// Vérification de l'authentification et des droits
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
        
        if (!data.user.isAdmin) {
            window.location.href = 'index.html';
            return false;
        }
        
        // Afficher les informations de l'utilisateur
        document.getElementById('user-info').textContent = `Connecté en tant que ${data.user.username}`;
        
        // Afficher l'onglet de gestion des utilisateurs seulement pour l'utilisateur ADMIN
        if (data.user.username === 'ADMIN') {
            const userManagementNav = document.getElementById('user-management-nav');
            if (userManagementNav) {
                userManagementNav.style.display = 'block';
            }
        }
        
        return true;
    } catch (error) {
        console.error('Erreur lors de la vérification de la session:', error);
        window.location.href = 'login.html';
        return false;
    }
}

// Gestion de la déconnexion
function initLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
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
        });
    }
}

// Configuration des dates
function initDatePickers() {
    const dateCorrectionInput = document.getElementById('date-correction');
    if (dateCorrectionInput) {
        flatpickr(dateCorrectionInput, {
            locale: "fr",
            dateFormat: "d/m/Y",
            defaultDate: "today"
        });
    }
}

// Gestion des onglets
function initNavigation() {
    document.querySelectorAll('.nav-link[data-section]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.dataset.section;
            
            // Mettre à jour les classes actives
            document.querySelectorAll('.nav-link[data-section]').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // Afficher la section correspondante
            document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
            const targetSection = document.getElementById(`${section}-section`);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });
}

// Charger les points de vente
async function chargerPointsVente() {
    try {
        console.log('Chargement des points de vente...');
        const response = await fetch('/api/admin/points-vente', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Données reçues:', data);
        
        if (!data.success || !data.pointsVente) {
            throw new Error('Format de réponse invalide');
        }
        
        const pointsVente = data.pointsVente;
        console.log('Points de vente:', pointsVente);
        
        // Trouver le select pour les points de vente
        const selectPointVente = document.getElementById('point-vente-filter');
        if (!selectPointVente) {
            console.error('Select point de vente non trouvé');
            return;
        }
        
        // Vider le select
        selectPointVente.innerHTML = '<option value="">Tous</option>';
        
        // Filtrer seulement les points de vente actifs
        const pointsVenteActifs = Object.entries(pointsVente)
            .filter(([nom, config]) => config.active === true)
            .map(([nom]) => nom);
        
        console.log('Points de vente actifs:', pointsVenteActifs);
        
        // Ajouter les options pour les points de vente actifs
        pointsVenteActifs.forEach(pointVente => {
            const option = document.createElement('option');
            option.value = pointVente;
            option.textContent = pointVente;
            selectPointVente.appendChild(option);
        });
        
        console.log('Points de vente chargés avec succès');
        
    } catch (error) {
        console.error('Erreur lors du chargement des points de vente:', error);
    }
}

// Activer/désactiver un point de vente
async function togglePointVente(nom) {
    try {
        const response = await fetch('/api/admin/points-vente', {
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
        
        if (data.success) {
            chargerPointsVente();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Erreur lors de la modification du point de vente:', error);
        alert('Erreur lors de la modification du point de vente');
    }
}

// Charger les produits
async function chargerProduits() {
    try {
        const response = await fetch('/api/admin/produits', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            // Remplir les menus de catégories
            const categorieSelect = document.getElementById('categorie-select');
            const categoriePrix = document.getElementById('categoriePrix');
            const categorieCorrection = document.getElementById('categorie-correction');
            
            if (categorieSelect) {
                categorieSelect.innerHTML = '<option value="">Sélectionner une catégorie</option>';
                Object.keys(data.produits).forEach(categorie => {
                    const option = document.createElement('option');
                    option.value = categorie;
                    option.textContent = categorie;
                    categorieSelect.appendChild(option);
                });
            }
            
            if (categoriePrix) {
                categoriePrix.innerHTML = '<option value="">Sélectionner une catégorie</option>';
                Object.keys(data.produits).forEach(categorie => {
                    const option = document.createElement('option');
                    option.value = categorie;
                    option.textContent = categorie;
                    categoriePrix.appendChild(option);
                });
            }
            
            if (categorieCorrection) {
                categorieCorrection.innerHTML = '<option value="">Sélectionner une catégorie</option>';
                Object.keys(data.produits).forEach(categorie => {
                    const option = document.createElement('option');
                    option.value = categorie;
                    option.textContent = categorie;
                    categorieCorrection.appendChild(option);
                });
            }
            
            // Remplir le menu des produits pour la section stocks
            const produitFilter = document.getElementById('produit-filter');
            if (produitFilter) {
                produitFilter.innerHTML = '<option value="">Tous</option>';
                
                // Créer une liste plate de tous les produits
                const tousProduits = [];
                Object.entries(data.produits).forEach(([categorie, produits]) => {
                    Object.keys(produits).forEach(produit => {
                        tousProduits.push(produit);
                    });
                });
                
                // Trier et ajouter les produits
                tousProduits.sort().forEach(produit => {
                    const option = document.createElement('option');
                    option.value = produit;
                    option.textContent = produit;
                    produitFilter.appendChild(option);
                });
            }
            
            // Stocker les produits globalement pour les utiliser dans les event listeners
            window.produits = data.produits;
        } else {
            console.error('Erreur lors du chargement des produits:', data.message);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des produits:', error);
    }
}

// Initialiser les event listeners pour les prix
function initPrixEventListeners() {
    // Gestion des changements de catégorie pour les prix
    const categoriePrixSelect = document.getElementById('categoriePrix');
    if (categoriePrixSelect) {
        categoriePrixSelect.addEventListener('change', function() {
            const categorie = this.value;
            const produitSelect = document.getElementById('produitPrix');
            
            if (produitSelect) {
                // Vider le menu des produits
                produitSelect.innerHTML = '<option value="">Sélectionner un produit</option>';
                
                if (categorie && window.produits && window.produits[categorie]) {
                    // Remplir le menu des produits de la catégorie sélectionnée
                    Object.keys(window.produits[categorie]).forEach(produit => {
                        const option = document.createElement('option');
                        option.value = produit;
                        option.textContent = produit;
                        produitSelect.appendChild(option);
                    });
                }
            }
        });
    }

    // Gestion de la modification des prix
    const modifierPrixBtn = document.getElementById('modifier-prix');
    if (modifierPrixBtn) {
        modifierPrixBtn.addEventListener('click', async function() {
            const categorie = document.getElementById('categoriePrix')?.value;
            const produit = document.getElementById('produitPrix')?.value;
            const nouveauPrix = document.getElementById('nouveau-prix')?.value;
            
            if (!categorie || !produit || !nouveauPrix) {
                alert('Veuillez remplir tous les champs');
                return;
            }
            
            try {
                const response = await fetch('/api/admin/prix', {
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
}

// Initialiser les event listeners pour les corrections
function initCorrectionsEventListeners() {
    // Gestion des changements de catégorie pour les corrections
    const categorieCorrectionSelect = document.getElementById('categorie-correction');
    if (categorieCorrectionSelect) {
        categorieCorrectionSelect.addEventListener('change', function() {
            const categorie = this.value;
            const produitSelect = document.getElementById('produit-correction');
            
            if (produitSelect) {
                // Vider le menu des produits
                produitSelect.innerHTML = '<option value="">Sélectionner un produit</option>';
                
                if (categorie && window.produits && window.produits[categorie]) {
                    // Remplir le menu des produits de la catégorie sélectionnée
                    Object.keys(window.produits[categorie]).forEach(produit => {
                        const option = document.createElement('option');
                        option.value = produit;
                        option.textContent = produit;
                        produitSelect.appendChild(option);
                    });
                }
            }
        });
    }

    // Gestion de la correction des totaux
    const corrigerTotalBtn = document.getElementById('corriger-total');
    if (corrigerTotalBtn) {
        corrigerTotalBtn.addEventListener('click', async function() {
            const date = document.getElementById('date-correction')?.value;
            const pointVente = document.getElementById('point-vente-correction')?.value;
            const categorie = document.getElementById('categorie-correction')?.value;
            const produit = document.getElementById('produit-correction')?.value;
            const nouveauTotal = document.getElementById('nouveau-total')?.value;
            
            if (!date || !pointVente || !categorie || !produit || !nouveauTotal) {
                alert('Veuillez remplir tous les champs');
                return;
            }
            
            try {
                const response = await fetch('/api/admin/corriger-total', {
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

// Initialiser les event listeners pour les points de vente
function initPointsVenteEventListeners() {
    const addPointVenteForm = document.getElementById('addPointVenteForm');
    if (addPointVenteForm) {
        addPointVenteForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const nom = document.getElementById('newPointVente')?.value;
            
            if (!nom) {
                alert('Veuillez saisir un nom de point de vente');
                return;
            }
            
            try {
                const response = await fetch('/api/admin/points-vente', {
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
                    alert('Point de vente ajouté avec succès');
                } else {
                    alert(data.message);
                }
            } catch (error) {
                console.error('Erreur lors de l\'ajout du point de vente:', error);
                alert('Erreur lors de l\'ajout du point de vente');
            }
        });
    }
}

// Variables globales pour les données de stock
let stockMatinData = [];
let stockSoirData = [];
let transfertsData = [];
let consolidatedData = [];

// Initialisation de la section stocks
function initStocksSection() {
    console.log('Initialisation de la section stocks...');
    
    // Initialiser les datepickers
    const dateDebutInput = document.getElementById('date-debut');
    const dateFinInput = document.getElementById('date-fin');
    
    if (dateDebutInput && dateFinInput) {
        flatpickr(dateDebutInput, {
            dateFormat: "d/m/Y",
            locale: "fr",
            allowInput: true
        });
        
        flatpickr(dateFinInput, {
            dateFormat: "d/m/Y",
            locale: "fr",
            allowInput: true
        });
    }
    
    // Charger les listes des points de vente et produits
    loadFilterOptions();
    
    // Ajouter les event listeners
    const rechercherBtn = document.getElementById('rechercher-stocks');
    if (rechercherBtn) {
        rechercherBtn.addEventListener('click', rechercherStocks);
    }
    
    const exportBtn = document.getElementById('export-excel');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToExcel);
    }
    
    // Charger les données par défaut (derniers 7 jours)
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
    
    if (dateDebutInput && dateFinInput) {
        dateDebutInput.value = sevenDaysAgo.toLocaleDateString('fr-FR');
        dateFinInput.value = today.toLocaleDateString('fr-FR');
        
        // Rechercher automatiquement
        rechercherStocks();
    }
}

// Charger les options des filtres
async function loadFilterOptions() {
    try {
        // Charger les points de vente
        const pointsVente = [
            'Touba', 'Dahra', 'Aliou Sow', 'Linguere', 'Mbao', 
            'Keur Massar', 'O.Foire', 'Sacre Coeur', 'Abattage'
        ];
        
        const pointVenteSelect = document.getElementById('point-vente-filter');
        if (pointVenteSelect) {
            pointsVente.forEach(pv => {
                const option = document.createElement('option');
                option.value = pv;
                option.textContent = pv;
                pointVenteSelect.appendChild(option);
            });
        }
        
        // Charger les produits
        const produits = ['Boeuf', 'Veau', 'Poulet', 'Volaille'];
        const produitSelect = document.getElementById('produit-filter');
        if (produitSelect) {
            produits.forEach(prod => {
                const option = document.createElement('option');
                option.value = prod;
                option.textContent = prod;
                produitSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erreur lors du chargement des options:', error);
    }
}

// Test direct des APIs pour déboguer
async function testAPIs() {
    console.log('=== TEST DES APIs ===');
    
    try {
        // Test stock matin
        console.log('Test API stock matin...');
        const matinResponse = await fetch('/api/stock/matin?date=2025-07-17', {
            credentials: 'include'
        });
        console.log('Status stock matin:', matinResponse.status);
        if (matinResponse.ok) {
            const matinData = await matinResponse.json();
            console.log('Données stock matin:', matinData);
        } else {
            console.log('Erreur stock matin:', matinResponse.statusText);
        }
        
        // Test stock soir
        console.log('Test API stock soir...');
        const soirResponse = await fetch('/api/stock/soir?date=2025-07-17', {
            credentials: 'include'
        });
        console.log('Status stock soir:', soirResponse.status);
        if (soirResponse.ok) {
            const soirData = await soirResponse.json();
            console.log('Données stock soir:', soirData);
        } else {
            console.log('Erreur stock soir:', soirResponse.statusText);
        }
        
        // Test transferts
        console.log('Test API transferts...');
        const transfertsResponse = await fetch('/api/transferts?date=2025-07-17', {
            credentials: 'include'
        });
        console.log('Status transferts:', transfertsResponse.status);
        if (transfertsResponse.ok) {
            const transfertsData = await transfertsResponse.json();
            console.log('Données transferts:', transfertsData);
        } else {
            console.log('Erreur transferts:', transfertsResponse.statusText);
        }
        
    } catch (error) {
        console.error('Erreur lors du test des APIs:', error);
    }
}

// Rechercher les données de stock
async function rechercherStocks() {
    console.log('Recherche des données de stock...');
    
    const dateDebut = document.getElementById('date-debut')?.value;
    const dateFin = document.getElementById('date-fin')?.value;
    const pointVente = document.getElementById('point-vente-filter')?.value;
    const produit = document.getElementById('produit-filter')?.value;
    
    if (!dateDebut || !dateFin) {
        alert('Veuillez sélectionner une période de dates');
        return;
    }
    
    console.log('Paramètres de recherche:', { dateDebut, dateFin, pointVente, produit });
    
    // Afficher le loading
    showLoading();
    
    try {
        // Test des APIs d'abord
        await testAPIs();
        
        // Convertir les dates au format YYYY-MM-DD
        const dateDebutFormatted = convertDateToISO(dateDebut);
        const dateFinFormatted = convertDateToISO(dateFin);
        
        console.log('Dates formatées:', { dateDebutFormatted, dateFinFormatted });
        
        // Récupérer toutes les données pour la période
        const allData = await fetchStockDataForPeriod(dateDebutFormatted, dateFinFormatted);
        
        // Filtrer les données selon les critères
        stockMatinData = filterData(allData.stockMatin, pointVente, produit);
        stockSoirData = filterData(allData.stockSoir, pointVente, produit);
        transfertsData = filterTransfertsData(allData.transferts, pointVente, produit);
        
        // Créer les données consolidées
        consolidatedData = createConsolidatedData();
        
        // Afficher les données consolidées
        displayConsolidatedData();
        
        console.log('Données récupérées:', {
            stockMatin: stockMatinData.length,
            stockSoir: stockSoirData.length,
            transferts: transfertsData.length,
            consolidated: consolidatedData.length
        });
        
    } catch (error) {
        console.error('Erreur lors de la recherche:', error);
        alert('Erreur lors de la récupération des données');
    } finally {
        hideLoading();
    }
}

// Récupérer les données de stock pour une période
async function fetchStockDataForPeriod(dateDebut, dateFin) {
    const stockMatin = [];
    const stockSoir = [];
    const transferts = [];
    
    // Générer la liste des dates entre dateDebut et dateFin
    const dates = generateDateRange(dateDebut, dateFin);
    
    console.log('Dates à traiter:', dates);
    
    // Récupérer les données pour chaque date
    for (const date of dates) {
        try {
            console.log(`Traitement de la date: ${date}`);
            
            // Stock matin
            const matinResponse = await fetch(`/api/stock/matin?date=${date}`, {
                credentials: 'include'
            });
            console.log(`Réponse stock matin pour ${date}:`, matinResponse.status);
            
            if (matinResponse.ok) {
                const matinData = await matinResponse.json();
                console.log(`Données stock matin pour ${date}:`, matinData);
                
                if (matinData && Object.keys(matinData).length > 0) {
                    Object.values(matinData).forEach(item => {
                        stockMatin.push({
                            date: item.date,
                            pointVente: item['Point de Vente'],
                            produit: item.Produit,
                            quantite: parseFloat(item.Nombre) || 0,
                            prixUnitaire: parseFloat(item.PU) || 0,
                            montant: parseFloat(item.Montant) || 0,
                            commentaire: item.Commentaire || ''
                        });
                    });
                }
            }
            
            // Stock soir
            const soirResponse = await fetch(`/api/stock/soir?date=${date}`, {
                credentials: 'include'
            });
            console.log(`Réponse stock soir pour ${date}:`, soirResponse.status);
            
            if (soirResponse.ok) {
                const soirData = await soirResponse.json();
                console.log(`Données stock soir pour ${date}:`, soirData);
                
                if (soirData && Object.keys(soirData).length > 0) {
                    Object.values(soirData).forEach(item => {
                        stockSoir.push({
                            date: item.date,
                            pointVente: item['Point de Vente'],
                            produit: item.Produit,
                            quantite: parseFloat(item.Nombre) || 0,
                            prixUnitaire: parseFloat(item.PU) || 0,
                            montant: parseFloat(item.Montant) || 0,
                            commentaire: item.Commentaire || ''
                        });
                    });
                }
            }
            
            // Transferts
            const transfertsResponse = await fetch(`/api/transferts?date=${date}`, {
                credentials: 'include'
            });
            console.log(`Réponse transferts pour ${date}:`, transfertsResponse.status);
            
            if (transfertsResponse.ok) {
                const transfertsData = await transfertsResponse.json();
                console.log(`Données transferts pour ${date}:`, transfertsData);
                
                if (transfertsData && transfertsData.success && transfertsData.transferts) {
                    transfertsData.transferts.forEach(item => {
                        transferts.push({
                            date: item.date,
                            pointVente: item.pointVente,
                            produit: item.produit,
                            impact: item.impact,
                            quantite: parseFloat(item.quantite) || 0,
                            prixUnitaire: parseFloat(item.prixUnitaire) || 0,
                            total: parseFloat(item.total) || 0,
                            commentaire: item.commentaire || ''
                        });
                    });
                }
            }
            
        } catch (error) {
            console.error(`Erreur pour la date ${date}:`, error);
        }
    }
    
    console.log('Résultats finaux:', {
        stockMatin: stockMatin.length,
        stockSoir: stockSoir.length,
        transferts: transferts.length
    });
    
    return { stockMatin, stockSoir, transferts };
}

// Créer les données consolidées avec ventes théoriques
function createConsolidatedData() {
    const consolidated = [];
    
    // Créer un map pour faciliter la recherche
    const stockMatinMap = new Map();
    const stockSoirMap = new Map();
    const transfertsMap = new Map();
    
    // Indexer les données par clé unique (date + pointVente + produit)
    stockMatinData.forEach(item => {
        const key = `${item.date}-${item.pointVente}-${item.produit}`;
        stockMatinMap.set(key, item);
    });
    
    stockSoirData.forEach(item => {
        const key = `${item.date}-${item.pointVente}-${item.produit}`;
        stockSoirMap.set(key, item);
    });
    
    transfertsData.forEach(item => {
        const key = `${item.date}-${item.pointVente}-${item.produit}`;
        if (transfertsMap.has(key)) {
            // Si plusieurs transferts pour la même clé, additionner les quantités
            const existing = transfertsMap.get(key);
            existing.quantite += item.quantite;
        } else {
            transfertsMap.set(key, { ...item });
        }
    });
    
    // Créer un set de toutes les clés uniques
    const allKeys = new Set([
        ...stockMatinMap.keys(),
        ...stockSoirMap.keys(),
        ...transfertsMap.keys()
    ]);
    
    // Créer les données consolidées
    allKeys.forEach(key => {
        const [date, pointVente, produit] = key.split('-');
        
        const stockMatin = stockMatinMap.get(key);
        const stockSoir = stockSoirMap.get(key);
        const transfert = transfertsMap.get(key);
        
        const stockMatinQuantite = stockMatin ? stockMatin.quantite : 0;
        const stockSoirQuantite = stockSoir ? stockSoir.quantite : 0;
        const transfertQuantite = transfert ? transfert.quantite : 0;
        
        // Calculer les ventes théoriques : Stock Soir - (Stock Matin + Transferts)
        const ventesTheoriques = stockSoirQuantite - (stockMatinQuantite + transfertQuantite);
        
        consolidated.push({
            date: date,
            pointVente: pointVente,
            produit: produit,
            stockMatin: stockMatinQuantite,
            stockSoir: stockSoirQuantite,
            transferts: transfertQuantite,
            ventesTheoriques: ventesTheoriques
        });
    });
    
    // Trier par date, puis par point de vente, puis par produit
    consolidated.sort((a, b) => {
        if (a.date !== b.date) return new Date(a.date.split('/').reverse().join('-')) - new Date(b.date.split('/').reverse().join('-'));
        if (a.pointVente !== b.pointVente) return a.pointVente.localeCompare(b.pointVente);
        return a.produit.localeCompare(b.produit);
    });
    
    return consolidated;
}

// Afficher les données consolidées
function displayConsolidatedData() {
    const tbody = document.getElementById('consolidated-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (consolidatedData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Aucune donnée disponible</td></tr>';
        return;
    }
    
    consolidatedData.forEach(item => {
        const row = document.createElement('tr');
        const ventesClass = item.ventesTheoriques >= 0 ? 'text-success' : 'text-danger';
        
        row.innerHTML = `
            <td>${item.date}</td>
            <td>${item.pointVente}</td>
            <td>${item.produit}</td>
            <td class="text-end">${item.stockMatin.toLocaleString('fr-FR')}</td>
            <td class="text-end">${item.stockSoir.toLocaleString('fr-FR')}</td>
            <td class="text-end">${item.transferts.toLocaleString('fr-FR')}</td>
            <td class="text-end ${ventesClass}">${item.ventesTheoriques.toLocaleString('fr-FR')}</td>
        `;
        tbody.appendChild(row);
    });
}

// Filtrer les données selon les critères
function filterData(data, pointVente, produit) {
    return data.filter(item => {
        const matchPointVente = !pointVente || item.pointVente === pointVente;
        const matchProduit = !produit || item.produit === produit;
        return matchPointVente && matchProduit;
    });
}

// Filtrer les données de transferts
function filterTransfertsData(data, pointVente, produit) {
    return data.filter(item => {
        const matchPointVente = !pointVente || item.pointVente === pointVente;
        const matchProduit = !produit || item.produit === produit;
        return matchPointVente && matchProduit;
    });
}

// Exporter les données en Excel
function exportToExcel() {
    if (typeof XLSX === 'undefined') {
        alert('Bibliothèque Excel non disponible');
        return;
    }
    
    const dateDebut = document.getElementById('date-debut')?.value;
    const dateFin = document.getElementById('date-fin')?.value;
    const pointVente = document.getElementById('point-vente-filter')?.value;
    const produit = document.getElementById('produit-filter')?.value;
    
    if (consolidatedData.length === 0) {
        alert('Aucune donnée à exporter');
        return;
    }
    
    // Créer un nouveau classeur
    const workbook = XLSX.utils.book_new();
    
    // Préparer les données pour Excel
    const excelData = consolidatedData.map(item => ({
        'Date': item.date,
        'Point de Vente': item.pointVente,
        'Produit': item.produit,
        'Stock Matin': item.stockMatin,
        'Stock Soir': item.stockSoir,
        'Transferts': item.transferts,
        'Ventes Théoriques': item.ventesTheoriques
    }));
    
    // Créer la feuille Excel
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Ajouter la feuille au classeur
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stocks et Ventes');
    
    // Générer le nom du fichier
    let filename = 'stocks_et_ventes_theoriques';
    if (dateDebut && dateFin) {
        filename += `_${dateDebut.replace(/\//g, '-')}_${dateFin.replace(/\//g, '-')}`;
    }
    if (pointVente) {
        filename += `_${pointVente.replace(/\s+/g, '_')}`;
    }
    if (produit) {
        filename += `_${produit}`;
    }
    filename += '.xlsx';
    
    // Télécharger le fichier
    XLSX.writeFile(workbook, filename);
    
    alert(`Export Excel réussi : ${filename}`);
}

// Utilitaires
function convertDateToISO(dateStr) {
    if (!dateStr) return '';
    
    // Si la date est déjà au format YYYY-MM-DD, la retourner telle quelle
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }
    
    // Convertir depuis le format DD/MM/YYYY
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
            return `${year}-${month}-${day}`;
        }
    }
    
    // Convertir depuis le format DD-MM-YYYY
    if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            // Si le premier élément a 4 chiffres, c'est déjà YYYY-MM-DD
            if (parts[0].length === 4) {
                return dateStr;
            }
            // Sinon c'est DD-MM-YYYY
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
            return `${year}-${month}-${day}`;
        }
    }
    
    console.error('Format de date non reconnu:', dateStr);
    return dateStr;
}

function generateDateRange(startDate, endDate) {
    const dates = [];
    const currentDate = new Date(startDate);
    const end = new Date(endDate);
    
    while (currentDate <= end) {
        dates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
}

function showLoading() {
    const tbody = document.getElementById('consolidated-tbody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center loading"><i class="fas fa-spinner fa-spin"></i> Chargement...</td></tr>';
    }
}

function hideLoading() {
    // Le loading est remplacé par les données ou le message "Aucune donnée"
}

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initialisation de la page...'); // Log de débogage
    
    // Initialiser les composants de base
    initLogoutButton();
    initDatePickers();
    initNavigation();
    
    checkAuth().then(isAuthenticated => {
        if (isAuthenticated) {
            console.log('Authentification vérifiée, chargement des données...'); // Log de débogage
            
            // Charger les données
            chargerPointsVente();
            chargerProduits();
            
            // Initialiser les event listeners
            initPointsVenteEventListeners();
            initPrixEventListeners();
            initCorrectionsEventListeners();
            
            // Initialiser la section stocks si elle existe
            const stocksSection = document.getElementById('stocks-section');
            if (stocksSection) {
                initStocksSection();
            }
        }
    });
}); 