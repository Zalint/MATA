// ===== Fonctionnalités pour la section Cash Paiement =====

// Variables globales pour stocker les données
let allCashPaymentData = [];
let uniquePointsDeVente = new Set();

// Fonction pour formatter les valeurs monétaires
function formatMonetaire(valeur) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XOF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(valeur);
}

// Fonction pour charger les données de paiement en espèces
async function loadCashPaymentData() {
    try {
        document.getElementById('loading-indicator-cash-payment').style.display = 'block';
        document.getElementById('cash-payment-table-body').innerHTML = '';
        document.getElementById('no-cash-payment-data').style.display = 'none';
        
        const response = await fetch('http://localhost:3000/api/cash-payments/aggregated', {
            method: 'GET',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        document.getElementById('loading-indicator-cash-payment').style.display = 'none';
        
        if (result.success && result.data && result.data.length > 0) {
            // Stocker les données dans la variable globale
            allCashPaymentData = result.data;
            
            // Réinitialiser et remplir l'ensemble des points de vente uniques
            uniquePointsDeVente.clear();
            result.data.forEach(dateEntry => {
                dateEntry.points.forEach(pointData => {
                    uniquePointsDeVente.add(pointData.point);
                });
            });
            
            // Peupler le filtre de point de vente
            populatePointVenteFilter();
            
            // Afficher toutes les données (sans filtrage)
            displayCashPaymentData(result.data);
        } else {
            document.getElementById('no-cash-payment-data').style.display = 'block';
        }
    } catch (error) {
        console.error('Erreur lors du chargement des données de paiement:', error);
        document.getElementById('loading-indicator-cash-payment').style.display = 'none';
        document.getElementById('no-cash-payment-data').style.display = 'block';
        document.getElementById('no-cash-payment-data').textContent = 'Erreur lors du chargement des données: ' + error.message;
    }
}

// Fonction pour peupler le filtre de point de vente
function populatePointVenteFilter() {
    const filterSelect = document.getElementById('point-vente-filter-cash');
    if (!filterSelect) return;
    
    // Garder l'option "Tous les points de vente"
    filterSelect.innerHTML = '<option value="">Tous les points de vente</option>';
    
    // Ajouter une option pour chaque point de vente unique
    [...uniquePointsDeVente].sort().forEach(pointVente => {
        const option = document.createElement('option');
        option.value = pointVente;
        option.textContent = pointVente;
        filterSelect.appendChild(option);
    });
}

// Fonction pour appliquer les filtres
function applyFilters() {
    const dateFilter = document.getElementById('date-filter-cash').value;
    const pointVenteFilter = document.getElementById('point-vente-filter-cash').value;
    
    // Filtrer les données
    let filteredData = [...allCashPaymentData];
    
    // Si un filtre de date est spécifié
    if (dateFilter) {
        filteredData = filteredData.filter(dateEntry => {
            // Convertir la date SQL (YYYY-MM-DD) en format d'affichage (DD/MM/YYYY) pour la comparaison
            const parts = dateEntry.date.split('-');
            if (parts.length !== 3) return false;
            
            const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
            return formattedDate === dateFilter;
        });
    }
    
    // Si un filtre de point de vente est spécifié
    if (pointVenteFilter) {
        // Filtrer chaque entrée de date pour ne garder que les points de vente correspondants
        filteredData = filteredData.map(dateEntry => {
            const filteredPoints = dateEntry.points.filter(point => point.point === pointVenteFilter);
            return {
                ...dateEntry,
                points: filteredPoints
            };
        }).filter(dateEntry => dateEntry.points.length > 0); // Ne garder que les entrées qui ont encore des points
    }
    
    // Afficher les données filtrées
    if (filteredData.length > 0) {
        displayCashPaymentData(filteredData);
        document.getElementById('no-cash-payment-data').style.display = 'none';
    } else {
        document.getElementById('cash-payment-table-body').innerHTML = '';
        document.getElementById('no-cash-payment-data').style.display = 'block';
        document.getElementById('no-cash-payment-data').textContent = 'Aucune donnée ne correspond aux filtres sélectionnés.';
    }
}

// Fonction pour afficher les données de paiement agrégées
function displayCashPaymentData(data) {
    const tbody = document.getElementById('cash-payment-table-body');
    tbody.innerHTML = '';

    // Initialize totals
    let totalPositifPDVBreakdown = {}; // Store breakdown by Point de Vente
    let totalPositifAutres = 0;
    let totalNegatif = 0;

    // Ensure POINTS_VENTE_PHYSIQUES is available and initialize breakdown structure
    if (typeof POINTS_VENTE_PHYSIQUES !== 'undefined') {
        POINTS_VENTE_PHYSIQUES.forEach(pdv => {
            totalPositifPDVBreakdown[pdv] = 0;
        });
    }

    data.forEach(dateEntry => {
        const date = dateEntry.date;

        function formatDateForDisplay(sqlDate) {
            if (!sqlDate) return '';
            const parts = sqlDate.split('-');
            if (parts.length !== 3) return sqlDate;
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }

        const formattedDate = formatDateForDisplay(date);

        dateEntry.points.forEach(pointData => {
            const row = document.createElement('tr');

            const tdDate = document.createElement('td');
            tdDate.textContent = formattedDate;
            row.appendChild(tdDate);

            const tdPoint = document.createElement('td');
            tdPoint.textContent = pointData.point;
            row.appendChild(tdPoint);

            const tdTotal = document.createElement('td');
            tdTotal.textContent = formatMonetaire(pointData.total);
            tdTotal.classList.add('text-end');
            row.appendChild(tdTotal);

            tbody.appendChild(row);

            // --- Calculate totals --- 
            const montant = pointData.total;
            if (montant > 0) {
                // Check if it's a known physical point of sale
                if (typeof POINTS_VENTE_PHYSIQUES !== 'undefined' && POINTS_VENTE_PHYSIQUES.includes(pointData.point)) {
                    totalPositifPDVBreakdown[pointData.point] += montant;
                } else {
                    totalPositifAutres += montant;
                }
            } else if (montant < 0) {
                totalNegatif += montant; // Add the negative value
            }
            // --- End Calculate totals --- 
        });
    });

    // --- Update total display elements --- 
    const breakdownContainer = document.getElementById('total-positif-pdv-breakdown');
    breakdownContainer.innerHTML = ''; // Clear previous breakdown
    let totalPositifPDVCalculated = 0;

    // Calculate overall positive total first to use for percentages
    if (typeof POINTS_VENTE_PHYSIQUES !== 'undefined') {
        POINTS_VENTE_PHYSIQUES.forEach(pdv => {
            totalPositifPDVCalculated += totalPositifPDVBreakdown[pdv] || 0;
        });
    }
    const totalPositifGlobal = totalPositifPDVCalculated + totalPositifAutres;

    // Generate breakdown HTML with percentages
    if (typeof POINTS_VENTE_PHYSIQUES !== 'undefined') {
        POINTS_VENTE_PHYSIQUES.forEach(pdv => {
            const amount = totalPositifPDVBreakdown[pdv] || 0;
            if (amount > 0) { // Only show if there's a positive amount
                const percentage = totalPositifGlobal > 0 ? (amount / totalPositifGlobal * 100).toFixed(1) : 0;
                const p = document.createElement('p');
                p.classList.add('mb-1', 'small'); // Smaller font for breakdown
                p.innerHTML = `${pdv}: <strong class="float-end">${formatMonetaire(amount)} (${percentage}%)</strong>`;
                breakdownContainer.appendChild(p);
            }
        });
    }

    // Update "Autre(s)" with percentage
    const autresPercentage = totalPositifGlobal > 0 ? (totalPositifAutres / totalPositifGlobal * 100).toFixed(1) : 0;
    const autresElement = document.getElementById('total-positif-autres');
    if (autresElement) {
        // Find the parent <p> tag to update the whole line
        const parentP = autresElement.closest('p');
        if (parentP) {
             parentP.innerHTML = `Autre(s): <strong class="float-end"><span id="total-positif-autres">${formatMonetaire(totalPositifAutres)}</span> (${autresPercentage}%)</strong>`;
        }
    }
    
    // Update global total and negative total
    document.getElementById('total-positif-global').textContent = formatMonetaire(totalPositifGlobal);
    document.getElementById('total-negatif-retraits').textContent = formatMonetaire(totalNegatif);
    // --- End Update total display elements --- 
}

// Parser CSV pour la fonctionnalité Cash Paiement
function parseCSV(csvContent) {
    // Détecter le séparateur (virgule ou point-virgule)
    const separator = csvContent.includes(';') ? ';' : ',';
    
    // Diviser par lignes
    const lines = csvContent.split('\n');
    
    // Extraire les en-têtes (première ligne)
    const headers = lines[0].split(separator).map(header => 
        header.trim().toLowerCase().replace(/[\r\n"]/g, '')
    );
    
    // Vérifier si les en-têtes contiennent les champs requis
    const requiredHeaders = ['created_at', 'amount', 'payment_reference'];
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    
    if (missingHeaders.length > 0) {
        throw new Error(`En-têtes requis manquants: ${missingHeaders.join(', ')}`);
    }
    
    // Traiter les lignes de données (exclure la première ligne d'en-têtes)
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Ignorer les lignes vides
        
        // Analyser les valeurs en respectant les éventuelles quotes
        const values = [];
        let inQuotes = false;
        let currentValue = '';
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === separator && !inQuotes) {
                values.push(currentValue.trim().replace(/^"|"$/g, ''));
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        
        // Ajouter la dernière valeur
        values.push(currentValue.trim().replace(/^"|"$/g, ''));
        
        // Créer un objet avec les noms de colonne comme clés
        const rowData = {};
        headers.forEach((header, index) => {
            rowData[header] = index < values.length ? values[index] : '';
        });
        
        data.push(rowData);
    }
    
    return data;
}

// Initialisation des gestionnaires d'événements
document.addEventListener('DOMContentLoaded', function() {
    // Gestionnaire pour l'onglet Cash Paiement
    const cashPaymentTab = document.getElementById('cash-payment-tab');
    const cashPaymentSection = document.getElementById('cash-payment-section');
    
    if (cashPaymentTab) {
        cashPaymentTab.addEventListener('click', function(e) {
            e.preventDefault();
            // Cacher toutes les sections (appel à la fonction hideAllSections définie dans script.js)
            if (typeof hideAllSections === 'function') {
                hideAllSections();
            } else {
                // Fallback si hideAllSections n'est pas disponible
                document.querySelectorAll('.content-section, #saisie-section, #visualisation-section, #import-section, #stock-inventaire-section, #copier-stock-section, #reconciliation-section, #stock-alerte-section').forEach(section => {
                    section.style.display = 'none';
                });
            }
            
            // Afficher la section Cash Paiement
            cashPaymentSection.style.display = 'block';
            
            // Désactiver tous les onglets et activer celui-ci
            document.querySelectorAll('.nav-link').forEach(tab => tab.classList.remove('active'));
            cashPaymentTab.classList.add('active');
            
            // Charger les données de paiement
            loadCashPaymentData();
            
            // Initialiser le datepicker si ce n'est pas déjà fait
            initDatepicker();
        });
    }
    
    // Initialiser le datepicker pour le filtre de date
    function initDatepicker() {
        const dateFilterInput = document.getElementById('date-filter-cash');
        if (dateFilterInput && !dateFilterInput._flatpickr) {
            flatpickr(dateFilterInput, {
                dateFormat: 'd/m/Y',
                locale: 'fr',
                allowInput: true,
                onClose: function() {
                    // Appliquer automatiquement le filtre quand une date est sélectionnée
                    if (document.getElementById('auto-apply-filter').checked) {
                        applyFilters();
                    }
                },
                onChange: function(selectedDates, dateStr) {
                    // Si la date est effacée, réappliquer le filtre également
                    if (dateStr === '' && document.getElementById('auto-apply-filter').checked) {
                        applyFilters();
                    }
                }
            });
        }
    }
    
    // Gestionnaire pour le bouton d'application des filtres
    const applyFiltersBtn = document.getElementById('apply-filters-cash');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applyFilters);
    }
    
    // Gestionnaire pour le filtre de point de vente (changement automatique)
    const pointVenteFilter = document.getElementById('point-vente-filter-cash');
    if (pointVenteFilter) {
        pointVenteFilter.addEventListener('change', function() {
            if (document.getElementById('auto-apply-filter')?.checked) {
                applyFilters();
            }
        });
    }
    
    // Gestionnaire pour l'importation de fichier CSV
    const importButton = document.getElementById('import-cash-payment');
    const fileInput = document.getElementById('cash-payment-file');
    const loadingIndicator = document.getElementById('loading-indicator-cash-payment');
    
    if (importButton && fileInput) {
        importButton.addEventListener('click', async function() {
            if (!fileInput.files || fileInput.files.length === 0) {
                alert('Veuillez sélectionner un fichier CSV à importer.');
                return;
            }
            
            const file = fileInput.files[0];
            const reader = new FileReader();
            
            reader.onload = async function(e) {
                try {
                    loadingIndicator.style.display = 'block';
                    
                    const csvContent = e.target.result;
                    const data = parseCSV(csvContent);
                    
                    if (data.length === 0) {
                        throw new Error('Aucune donnée valide trouvée dans le fichier CSV.');
                    }
                    
                    // Envoyer les données au serveur
                    const response = await fetch('http://localhost:3000/api/cash-payments/import', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        credentials: 'include',
                        body: JSON.stringify({ data })
                    });
                    
                    const result = await response.json();
                    
                    loadingIndicator.style.display = 'none';
                    
                    if (result.success) {
                        alert(`Importation réussie: ${result.message}`);
                        fileInput.value = ''; // Réinitialiser l'input de fichier
                        loadCashPaymentData(); // Recharger les données
                    } else {
                        throw new Error(result.message || 'Erreur lors de l\'importation');
                    }
                } catch (error) {
                    console.error('Erreur lors de l\'importation:', error);
                    loadingIndicator.style.display = 'none';
                    alert('Erreur lors de l\'importation: ' + error.message);
                }
            };
            
            reader.readAsText(file);
        });
    }
    
    // Gestionnaire pour effacer les données
    const clearButton = document.getElementById('clear-cash-payment-data');
    if (clearButton) {
        clearButton.addEventListener('click', async function() {
            if (!confirm('Êtes-vous sûr de vouloir supprimer toutes les données de paiement? Cette action est irréversible.')) {
                return;
            }
            
            try {
                loadingIndicator.style.display = 'block';
                
                const response = await fetch('http://localhost:3000/api/cash-payments/clear', {
                    method: 'DELETE',
                    credentials: 'include'
                });
                
                const result = await response.json();
                
                loadingIndicator.style.display = 'none';
                
                if (result.success) {
                    alert('Toutes les données ont été supprimées avec succès.');
                    loadCashPaymentData(); // Recharger (ou plutôt vider) les données
                } else {
                    throw new Error(result.message || 'Erreur lors de la suppression');
                }
            } catch (error) {
                console.error('Erreur lors de la suppression des données:', error);
                loadingIndicator.style.display = 'none';
                alert('Erreur lors de la suppression: ' + error.message);
            }
        });
    }

    // Add event listener for the save button
    const saveButton = document.getElementById('save-cash-payment');
    if (saveButton) {
        saveButton.addEventListener('click', async function() {
            try {
                // Get the table data
                const tableBody = document.getElementById('cash-payment-table-body');
                
                if (!tableBody || tableBody.children.length === 0) {
                    alert('Aucune donnée à sauvegarder. Veuillez d\'abord importer des données.');
                    return;
                }
                
                // Disable the button during the operation
                this.disabled = true;
                this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sauvegarde...';
                
                // Create a CSV content with the aggregated data
                let csvContent = 'Date,Point de Vente,Montant Total\n';
                
                Array.from(tableBody.children).forEach(row => {
                    const date = row.cells[0].textContent.trim();
                    const pointVente = row.cells[1].textContent.trim();
                    const montant = row.cells[2].textContent.trim();
                    
                    csvContent += `"${date}","${pointVente}","${montant}"\n`;
                });
                
                // Create a Blob with the CSV content
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                
                // Create a link and trigger the download
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                
                link.setAttribute('href', url);
                link.setAttribute('download', `cash-payments-${new Date().toISOString().slice(0, 10)}.csv`);
                link.style.display = 'none';
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Re-enable the button
                this.disabled = false;
                this.textContent = 'Sauvegarder';
                
                alert('Les données ont été sauvegardées avec succès.');
                
            } catch (error) {
                console.error('Erreur lors de la sauvegarde des données :', error);
                alert(`Erreur lors de la sauvegarde : ${error.message}`);
                
                // Reset the button
                this.disabled = false;
                this.textContent = 'Sauvegarder';
            }
        });
    }
}); 