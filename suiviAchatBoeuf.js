// Suivi Achat Boeuf Module

// Function to initialize the Suivi Achat Boeuf section
function initSuiviAchatBoeuf() {
    console.log("Initializing Suivi Achat Boeuf...");
    setupAchatBoeufEventListeners();
    loadAchatBoeufData();
}

// Function to set up event listeners for this section
function setupAchatBoeufEventListeners() {
    document.getElementById('add-achat-boeuf-row').addEventListener('click', addAchatBoeufRow);
    document.getElementById('save-achat-boeuf-data').addEventListener('click', saveAchatBoeufData);
    document.getElementById('import-achat-boeuf-btn').addEventListener('click', function() {
        document.getElementById('import-achat-boeuf-file').click();
    });
    document.getElementById('import-achat-boeuf-file').addEventListener('change', handleAchatBoeufImport);
}

// Function to load data from the backend
async function loadAchatBoeufData() {
    try {
        showLoader();
        const response = await fetch('/api/achats-boeuf', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token'),
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
            populateAchatBoeufTable(data.achats || []);
        } else {
            throw new Error(data.message || "Erreur lors du chargement des données");
        }
    } catch (error) {
        console.error("Erreur lors du chargement des données d'achat:", error);
        displayError("Impossible de charger les données d'achat: " + error.message);
    } finally {
        hideLoader();
    }
}

// Function to populate the table with data
function populateAchatBoeufTable(data) {
    const tableBody = document.getElementById('achat-boeuf-table-body');
    tableBody.innerHTML = '';

    if (data.length === 0) {
        addAchatBoeufRow(); // Add an empty row if no data
        return;
    }

    // Sort by date (newest first)
    data.sort((a, b) => {
        const dateA = a.Date.split('/').reverse().join('');
        const dateB = b.Date.split('/').reverse().join('');
        return dateB.localeCompare(dateA);
    });

    data.forEach(entry => {
        const row = createAchatBoeufRow(entry);
        tableBody.appendChild(row);
    });
}

// Function to create a single table row (editable)
function createAchatBoeufRow(data = {}) {
    const tr = document.createElement('tr');
    
    // Month select
    const moisCell = document.createElement('td');
    const moisSelect = document.createElement('select');
    moisSelect.className = 'form-control mois-input';
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                   'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    
    months.forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = month;
        moisSelect.appendChild(option);
    });
    
    if (data.Mois) {
        moisSelect.value = data.Mois;
    }
    moisCell.appendChild(moisSelect);
    tr.appendChild(moisCell);
    
    // Date input (with datepicker)
    const dateCell = document.createElement('td');
    const dateInput = document.createElement('input');
    dateInput.type = 'text';
    dateInput.className = 'form-control date-input datepicker';
    dateInput.placeholder = 'JJ/MM/AAAA';
    dateInput.value = data.Date || '';
    dateCell.appendChild(dateInput);
    tr.appendChild(dateCell);
    
    // Initialize datepicker
    $(dateInput).datepicker({
        format: 'dd/mm/yyyy',
        autoclose: true,
        language: 'fr'
    });
    
    // Bete select
    const beteCell = document.createElement('td');
    const beteSelect = document.createElement('select');
    beteSelect.className = 'form-control bete-input';
    ['boeuf', 'veau'].forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
        beteSelect.appendChild(option);
    });
    
    if (data.Bete) {
        beteSelect.value = data.Bete.toLowerCase();
    }
    beteCell.appendChild(beteSelect);
    tr.appendChild(beteCell);
    
    // Prix input
    const prixCell = document.createElement('td');
    const prixInput = document.createElement('input');
    prixInput.type = 'number';
    prixInput.className = 'form-control prix-input';
    prixInput.min = '0';
    prixInput.step = '0.01';
    prixInput.value = data.Prix || '';
    prixInput.addEventListener('change', function() {
        calculatePrixAchatKg(tr);
    });
    prixCell.appendChild(prixInput);
    tr.appendChild(prixCell);
    
    // Abats input
    const abatsCell = document.createElement('td');
    const abatsInput = document.createElement('input');
    abatsInput.type = 'number';
    abatsInput.className = 'form-control abats-input';
    abatsInput.min = '0';
    abatsInput.step = '0.01';
    abatsInput.value = data.Abats || '';
    abatsCell.appendChild(abatsInput);
    tr.appendChild(abatsCell);
    
    // Frais abattage input
    const fraisCell = document.createElement('td');
    const fraisInput = document.createElement('input');
    fraisInput.type = 'number';
    fraisInput.className = 'form-control frais-input';
    fraisInput.min = '0';
    fraisInput.step = '0.01';
    fraisInput.value = data.FraisAbattage || '';
    fraisCell.appendChild(fraisInput);
    tr.appendChild(fraisCell);
    
    // Nbr kg input
    const kgCell = document.createElement('td');
    const kgInput = document.createElement('input');
    kgInput.type = 'number';
    kgInput.className = 'form-control kg-input';
    kgInput.min = '0';
    kgInput.step = '0.01';
    kgInput.value = data.NbrKg || '';
    kgInput.addEventListener('change', function() {
        calculatePrixAchatKg(tr);
    });
    kgCell.appendChild(kgInput);
    tr.appendChild(kgCell);
    
    // Prix d'achat par kg (calculated)
    const prixKgCell = document.createElement('td');
    const prixKgInput = document.createElement('input');
    prixKgInput.type = 'number';
    prixKgInput.className = 'form-control prix-kg-input';
    prixKgInput.min = '0';
    prixKgInput.step = '0.01';
    prixKgInput.value = data.PrixAchatKg || '';
    
    // This allows the user to manually override the calculated value
    prixKgInput.dataset.isManuallySet = 'false';
    prixKgInput.addEventListener('focus', function() {
        this.dataset.originalValue = this.value;
    });
    prixKgInput.addEventListener('change', function() {
        if (this.value !== this.dataset.originalValue) {
            this.dataset.isManuallySet = 'true';
        }
    });
    
    prixKgCell.appendChild(prixKgInput);
    tr.appendChild(prixKgCell);
    
    // Delete button
    const actionCell = document.createElement('td');
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger btn-sm';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.addEventListener('click', function() {
        tr.remove();
    });
    actionCell.appendChild(deleteBtn);
    tr.appendChild(actionCell);
    
    // Calculate the price initially
    calculatePrixAchatKg(tr);
    
    return tr;
}

// Function to add a new blank row to the table
function addAchatBoeufRow() {
    const tableBody = document.getElementById('achat-boeuf-table-body');
    const emptyRow = createAchatBoeufRow();
    tableBody.appendChild(emptyRow);
    
    // Set today's date by default for new rows
    const dateInput = emptyRow.querySelector('.date-input');
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    dateInput.value = `${dd}/${mm}/${yyyy}`;
    
    // Set month by default based on current date
    const moisSelect = emptyRow.querySelector('.mois-input');
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    moisSelect.value = months[today.getMonth()];
}

// Function to calculate "Prix d'achat par kg"
function calculatePrixAchatKg(row) {
    const prixInput = row.querySelector('.prix-input');
    const kgInput = row.querySelector('.kg-input');
    const prixKgInput = row.querySelector('.prix-kg-input');
    
    // Only calculate if not manually set
    if (prixKgInput.dataset.isManuallySet !== 'true') {
        const prix = parseFloat(prixInput.value) || 0;
        const kg = parseFloat(kgInput.value) || 0;
        
        if (kg > 0) {
            const prixKg = (prix / kg).toFixed(2);
            prixKgInput.value = prixKg;
        } else {
            prixKgInput.value = '';
        }
    }
}

// Function to handle CSV import
function handleAchatBoeufImport(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const content = e.target.result;
            const rows = content.split(/\r?\n/);
            
            if (rows.length === 0) {
                throw new Error("Le fichier est vide");
            }
            
            // Determine separator
            let separator;
            if (rows[0].includes(';')) {
                separator = ';';
            } else if (rows[0].includes(',')) {
                separator = ',';
            } else {
                throw new Error("Format de fichier non reconnu. Utilisez des séparateurs ';' ou ','.");
            }
            
            // Parse header
            const expectedHeaders = ['Mois', 'Date', 'Bete', 'Prix', 'Abats', 'Frais abattage', 'Nbr kg', "Prix d'achat par kg"];
            const headers = rows[0].split(separator).map(h => h.trim());
            
            // Validate headers
            const missingHeaders = expectedHeaders.filter(h => {
                const normalizedHeader = h.toLowerCase().replace(/['\s]/g, '');
                return !headers.some(header => header.toLowerCase().replace(/['\s]/g, '') === normalizedHeader);
            });
            
            if (missingHeaders.length > 0) {
                throw new Error(`En-têtes manquants : ${missingHeaders.join(', ')}`);
            }
            
            // Parse data
            const data = [];
            for (let i = 1; i < rows.length; i++) {
                if (!rows[i].trim()) continue; // Skip empty rows
                
                const values = rows[i].split(separator).map(v => v.trim());
                
                if (values.length !== headers.length) {
                    console.warn(`La ligne ${i + 1} a un nombre incorrect de colonnes et sera ignorée`);
                    continue;
                }
                
                const entry = {};
                headers.forEach((header, index) => {
                    const normalizedHeader = header.toLowerCase().replace(/['\s]/g, '');
                    
                    if (normalizedHeader === 'mois') {
                        entry.Mois = values[index];
                    } else if (normalizedHeader === 'date') {
                        entry.Date = values[index];
                    } else if (normalizedHeader === 'bete') {
                        entry.Bete = values[index];
                    } else if (normalizedHeader === 'prix') {
                        entry.Prix = parseFloat(values[index].replace(',', '.')) || 0;
                    } else if (normalizedHeader === 'abats') {
                        entry.Abats = parseFloat(values[index].replace(',', '.')) || 0;
                    } else if (normalizedHeader === 'fraisabattage') {
                        entry.FraisAbattage = parseFloat(values[index].replace(',', '.')) || 0;
                    } else if (normalizedHeader === 'nbrkg') {
                        entry.NbrKg = parseFloat(values[index].replace(',', '.')) || 0;
                    } else if (normalizedHeader === 'prixdachatparkg') {
                        entry.PrixAchatKg = parseFloat(values[index].replace(',', '.')) || 0;
                    }
                });
                
                data.push(entry);
            }
            
            // Clear existing table
            document.getElementById('achat-boeuf-table-body').innerHTML = '';
            
            // Populate with imported data
            populateAchatBoeufTable(data);
            
            displaySuccess(`${data.length} entrées importées avec succès`);
            
            // Reset file input
            event.target.value = '';
            
        } catch (error) {
            console.error("Erreur lors de l'importation CSV:", error);
            displayError("Erreur lors de l'importation: " + error.message);
            event.target.value = '';
        }
    };
    
    reader.onerror = function() {
        displayError("Impossible de lire le fichier");
        event.target.value = '';
    };
    
    reader.readAsText(file);
}

// Function to save data to the backend
async function saveAchatBoeufData() {
    const tableBody = document.getElementById('achat-boeuf-table-body');
    const rows = tableBody.querySelectorAll('tr');
    
    if (rows.length === 0) {
        displayWarning("Aucune donnée à sauvegarder");
        return;
    }
    
    const data = [];
    let hasErrors = false;
    
    rows.forEach(row => {
        const mois = row.querySelector('.mois-input').value;
        const date = row.querySelector('.date-input').value;
        const bete = row.querySelector('.bete-input').value;
        const prix = row.querySelector('.prix-input').value;
        const abats = row.querySelector('.abats-input').value;
        const frais = row.querySelector('.frais-input').value;
        const kg = row.querySelector('.kg-input').value;
        const prixKg = row.querySelector('.prix-kg-input').value;
        
        // Skip empty rows
        if (!date && !prix && !kg) {
            return;
        }
        
        // Validate required fields
        if (!date) {
            displayError("La date est requise pour chaque entrée");
            row.querySelector('.date-input').classList.add('is-invalid');
            hasErrors = true;
            return;
        } else {
            row.querySelector('.date-input').classList.remove('is-invalid');
        }
        
        data.push({
            Mois: mois,
            Date: date,
            Bete: bete,
            Prix: parseFloat(prix) || 0,
            Abats: parseFloat(abats) || 0,
            FraisAbattage: parseFloat(frais) || 0,
            NbrKg: parseFloat(kg) || 0,
            PrixAchatKg: parseFloat(prixKg) || 0
        });
    });
    
    if (hasErrors) {
        return;
    }
    
    if (data.length === 0) {
        displayWarning("Aucune donnée valide à sauvegarder");
        return;
    }
    
    try {
        showLoader();
        
        const response = await fetch('/api/achats-boeuf', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Erreur HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            displaySuccess("Données sauvegardées avec succès");
            loadAchatBoeufData(); // Reload data to show any server-side changes
        } else {
            throw new Error(result.message || "Échec de la sauvegarde des données");
        }
    } catch (error) {
        console.error("Erreur lors de la sauvegarde des données:", error);
        displayError("Impossible de sauvegarder les données: " + error.message);
    } finally {
        hideLoader();
    }
}

// Helper functions for displaying messages
function displaySuccess(message) {
    const alertBox = document.createElement('div');
    alertBox.className = 'alert alert-success alert-dismissible fade show';
    alertBox.innerHTML = `${message} <button type="button" class="close" data-dismiss="alert">&times;</button>`;
    document.getElementById('suivi-achat-boeuf-alerts').innerHTML = '';
    document.getElementById('suivi-achat-boeuf-alerts').appendChild(alertBox);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        alertBox.classList.remove('show');
        setTimeout(() => alertBox.remove(), 150);
    }, 5000);
}

function displayError(message) {
    const alertBox = document.createElement('div');
    alertBox.className = 'alert alert-danger alert-dismissible fade show';
    alertBox.innerHTML = `${message} <button type="button" class="close" data-dismiss="alert">&times;</button>`;
    document.getElementById('suivi-achat-boeuf-alerts').innerHTML = '';
    document.getElementById('suivi-achat-boeuf-alerts').appendChild(alertBox);
}

function displayWarning(message) {
    const alertBox = document.createElement('div');
    alertBox.className = 'alert alert-warning alert-dismissible fade show';
    alertBox.innerHTML = `${message} <button type="button" class="close" data-dismiss="alert">&times;</button>`;
    document.getElementById('suivi-achat-boeuf-alerts').innerHTML = '';
    document.getElementById('suivi-achat-boeuf-alerts').appendChild(alertBox);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        alertBox.classList.remove('show');
        setTimeout(() => alertBox.remove(), 150);
    }, 5000);
} 