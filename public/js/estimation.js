// Estimation functions

// Remove any existing event listeners when the file loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== ESTIMATION.JS INITIALIZATION START ===');
    
    // Only initialize once
    if (window.estimationInitialized) {
        console.log('Estimation already initialized, skipping');
        return;
    }
    
    // Find the estimation form
    const form = document.getElementById('estimation-form');
    if (!form) {
        console.warn('Estimation form not found, will try again when section becomes visible');
        
        // Set up a mutation observer to detect when the form becomes available
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && 
                    mutation.attributeName === 'style' && 
                    mutation.target.id === 'estimation-section' &&
                    mutation.target.style.display !== 'none') {
                    
                    console.log('Estimation section became visible, initializing');
                    const form = document.getElementById('estimation-form');
                    if (form && !window.estimationInitialized) {
                        initializeEstimationForm(form);
                    }
                }
            });
        });
        
        // Start observing the estimation section
        const estimationSection = document.getElementById('estimation-section');
        if (estimationSection) {
            observer.observe(estimationSection, { attributes: true });
        }
        
        return;
    }
    
    // If form is found, initialize it
    initializeEstimationForm(form);
    
    console.log('=== ESTIMATION.JS INITIALIZATION END ===');
});

// Function to properly initialize the estimation form
function initializeEstimationForm(form) {
    console.log('Initializing estimation form');
    
    // Mark as initialized to prevent duplicate initialization
    window.estimationInitialized = true;
    
    // Get form elements
    const dateInput = document.getElementById('estimation-date');
    const pointVenteSelect = document.getElementById('estimation-point-vente');
    const categorieSelect = document.getElementById('estimation-categorie');
    
    // Initialize date input
    if (dateInput) {
        initializeDateInput(dateInput);
    }
    
    // Charge les catégories depuis produitsInventaire
    chargerProduits();
    
    // Set up form submission handler
    form.addEventListener('submit', handleFormSubmission);
    
    // Set up input handlers
    setupInputHandlers();
    
    // Initialize the threshold slider
    initThresholdSlider();
    
    // Load data based on current selections
    loadData();
    
    console.log('Estimation form initialized successfully');
}

// Function to load products from produitsInventaire
function chargerProduits() {
    try {
        const categorieSelect = document.getElementById('estimation-categorie');
        if (!categorieSelect) {
            console.error('Element estimation-categorie not found');
            return;
        }
        
        categorieSelect.innerHTML = '<option value="">Sélectionner une catégorie</option>';
        
        // Utiliser les clés de produitsInventaire pour les catégories
        if (window.produitsInventaire && typeof window.produitsInventaire.getTousLesProduits === 'function') {
            const categories = window.produitsInventaire.getTousLesProduits();
            
            categories.forEach(categorie => {
                const option = document.createElement('option');
                option.value = categorie;
                option.textContent = categorie;
                categorieSelect.appendChild(option);
            });
            
            console.log('Categories loaded successfully:', categories);
        } else {
            console.error('produitsInventaire non disponible ou fonction getTousLesProduits manquante');
            
            // Fallback: attendre que produitsInventaire soit chargé
            setTimeout(() => {
                if (window.produitsInventaire && typeof window.produitsInventaire.getTousLesProduits === 'function') {
                    chargerProduits();
                } else {
                    console.error('produitsInventaire still not available after delay');
                }
            }, 1000);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des produits:', error);
    }
}

// Function to initialize date input - handles flatpickr errors gracefully
function initializeDateInput(dateInput) {
    console.log('Initializing date input');
    
    // Get today's date in the correct format
    const today = new Date();
    const formattedDate = formatDateForInput(today);
    
    // Try to initialize flatpickr, but with fallbacks
    if (typeof flatpickr === 'function') {
        try {
            // Try with default locale
            flatpickr(dateInput, {
                dateFormat: 'd-m-Y',
                defaultDate: today,
                allowInput: true
            });
            console.log('Flatpickr initialized successfully');
        } catch (e) {
            console.warn('Error initializing flatpickr with default locale:', e);
            
            try {
                // Try again without locale
                flatpickr(dateInput, {
                    dateFormat: 'd-m-Y',
                    defaultDate: today,
                    allowInput: true,
                    locale: null
                });
                console.log('Flatpickr initialized without locale');
            } catch (e2) {
                console.error('Failed to initialize flatpickr:', e2);
                // Fallback: set date value directly
                dateInput.value = formattedDate;
                console.log('Using fallback date input');
            }
        }
    } else {
        // Flatpickr not available, set date directly
        dateInput.value = formattedDate;
        console.log('Flatpickr not available, using direct date input');
    }
    
    // Ensure the date is set correctly
    if (!dateInput.value) {
        dateInput.value = formattedDate;
    }
}

// Function to handle form submission
async function handleFormSubmission(e) {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (window.estimationSubmissionInProgress) {
        console.log('Form submission already in progress');
        return;
    }
    
    // Mark as in progress
    window.estimationSubmissionInProgress = true;
    
    // Disable the submit button
    const submitButton = this.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Enregistrement...';
    }
    
    try {
        await sauvegarderEstimation();
        console.log('Form submitted successfully');
    } catch (error) {
        console.error('Error during form submission:', error);
    } finally {
        // Re-enable the button
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Enregistrer';
        }
        
        // Clear the in-progress flag
        window.estimationSubmissionInProgress = false;
    }
}

// Function to set up input event handlers
function setupInputHandlers() {
    // Form selection fields
    const dateInput = document.getElementById('estimation-date');
    const pointVenteSelect = document.getElementById('estimation-point-vente');
    const categorieSelect = document.getElementById('estimation-categorie');
    
    // Input fields
    const stockMatinInput = document.getElementById('stock-matin-estimation');
    const transfertInput = document.getElementById('transfert-estimation');
    const stockSoirInput = document.getElementById('stock-soir');
    const precommandeInput = document.getElementById('precommande-kg');
    const previsionInput = document.getElementById('prevision-kg');
    
    // Function to update data when selections change
    const handleSelectionChange = () => {
        updateEstimationStockMatin();
        updateEstimationTransfert();
        updateEstimationStock();
        updateDifference();
        loadLatestEstimation();
    };
    
    // Add event listeners for selection fields
    if (dateInput) dateInput.addEventListener('change', handleSelectionChange);
    if (pointVenteSelect) pointVenteSelect.addEventListener('change', handleSelectionChange);
    if (categorieSelect) categorieSelect.addEventListener('change', handleSelectionChange);
    
    // Add event listeners for input fields that affect the difference calculation
    if (stockMatinInput) stockMatinInput.addEventListener('input', updateDifference);
    if (transfertInput) transfertInput.addEventListener('input', updateDifference);
    if (stockSoirInput) stockSoirInput.addEventListener('input', updateDifference);
    if (precommandeInput) precommandeInput.addEventListener('input', updateDifference);
    if (previsionInput) previsionInput.addEventListener('input', updateDifference);
    
    // Set up threshold slider
    initThresholdSlider();
}

// Function to initialize and set up the threshold slider
function initThresholdSlider() {
    const thresholdSlider = document.getElementById('performance-threshold');
    const thresholdValue = document.getElementById('threshold-value');
    const sliderFill = document.getElementById('performance-slider-fill');
    
    if (!thresholdSlider || !thresholdValue) {
        console.warn('Threshold slider elements not found');
        return;
    }
    
    // Function to update the fill effect
    function updateSliderFill() {
        if (sliderFill) {
            const percent = (thresholdSlider.value - thresholdSlider.min) / (thresholdSlider.max - thresholdSlider.min) * 100;
            sliderFill.style.width = percent + '%';
        }
        thresholdValue.textContent = `${thresholdSlider.value}%`;
    }
    
    // Initialize fill
    updateSliderFill();
    
    // Add event listeners for slider
    thresholdSlider.addEventListener('input', function() {
        updateSliderFill();
        // Debounce the chargerEstimations call to avoid too many requests
        if (window.thresholdUpdateTimeout) {
            clearTimeout(window.thresholdUpdateTimeout);
        }
        window.thresholdUpdateTimeout = setTimeout(() => {
            chargerEstimations();
        }, 300);
    });
    
    // Add a label that indicates the slider is draggable
    const handleIndicator = document.querySelector('.threshold-handle-indicator');
    if (handleIndicator) {
        // Show the indicator on hover
        thresholdSlider.addEventListener('mouseover', function() {
            handleIndicator.style.opacity = '1';
        });
        
        // Hide the indicator after a delay when not hovering
        thresholdSlider.addEventListener('mouseout', function() {
            setTimeout(() => {
                handleIndicator.style.opacity = '0.5';
            }, 1000);
        });
    }
}

// Function to load data based on current selections
function loadData() {
    // Load estimations table
    chargerEstimations().then(() => {
        // After table is loaded, load the form with latest values
        loadLatestEstimation();
        
        // Initialize table filters
        initializeTableFilters();
    });
}

async function updateEstimationStock() {
    console.log('=== UPDATE ESTIMATION STOCK START ===');
    
    const dateInput = document.getElementById('estimation-date');
    const pointVente = document.getElementById('estimation-point-vente').value;
    const produit = document.getElementById('estimation-produit').value;
    const stockSoirInput = document.getElementById('stock-soir');
    const stockSoirOriginal = document.getElementById('stock-soir-original');

    if (!dateInput || !pointVente || !categorie) {
        stockSoirInput.value = '';
        stockSoirOriginal.style.display = 'none';
        return;
    }

    try {
        const date = dateInput.value;
        const url = `/api/stock/${date}/soir/${pointVente}/${categorie}`;
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok && data.stock !== undefined) {
            // Store the original value as a data attribute
            stockSoirInput.dataset.originalValue = data.stock;
            stockSoirInput.value = data.stock;
            stockSoirInput.style.fontStyle = 'normal';
            stockSoirOriginal.style.display = 'none';
        } else {
            stockSoirInput.dataset.originalValue = '0';
            stockSoirInput.value = '0';
            stockSoirInput.style.fontStyle = 'italic';
            stockSoirOriginal.style.display = 'none';
        }
    } catch (error) {
        console.error('Error in updateEstimationStock:', error);
        stockSoirInput.dataset.originalValue = '0';
        stockSoirInput.value = '0';
        stockSoirInput.style.fontStyle = 'italic';
        stockSoirOriginal.style.display = 'none';
    }
}

async function updateEstimationStockMatin() {
    console.log('=== UPDATE ESTIMATION STOCK MATIN START ===');
    
    const dateInput = document.getElementById('estimation-date');
    const pointVente = document.getElementById('estimation-point-vente').value;
    const categorie = document.getElementById('estimation-categorie').value;
    
    // Use the new ID for the stock matin input in the estimation section
    const stockMatinInput = document.getElementById('stock-matin-estimation');
    const stockMatinOriginal = document.getElementById('stock-matin-original');
    
    console.log('Stock matin input element:', stockMatinInput);

    if (!dateInput || !pointVente || !categorie || !stockMatinInput) {
        console.error('Missing required elements for stock matin update');
        if (stockMatinOriginal) stockMatinOriginal.style.display = 'none';
        return;
    }

    try {
        const date = dateInput.value;
        const url = `/api/stock/${date}/matin/${pointVente}/${categorie}`;
        const response = await fetch(url);
        const data = await response.json();

        console.log('Stock matin API response:', data);

        if (response.ok && data.stock !== undefined) {
            // Store the original value as a data attribute
            stockMatinInput.dataset.originalValue = data.stock;
            stockMatinInput.value = data.stock;
            stockMatinInput.style.fontStyle = 'normal';
            stockMatinOriginal.style.display = 'none';
            console.log('Stock matin value updated:', data.stock);
        } else {
            stockMatinInput.dataset.originalValue = '0';
            stockMatinInput.value = '0';
            stockMatinInput.style.fontStyle = 'italic';
            stockMatinOriginal.style.display = 'none';
            console.log('No stock matin found, set to 0');
        }
    } catch (error) {
        console.error('Error in updateEstimationStockMatin:', error);
        stockMatinInput.dataset.originalValue = '0';
        stockMatinInput.value = '0';
        stockMatinInput.style.fontStyle = 'italic';
        stockMatinOriginal.style.display = 'none';
    }
}

async function updateEstimationTransfert() {
    console.log('=== UPDATE ESTIMATION TRANSFERT START ===');
    
    const dateInput = document.getElementById('estimation-date');
    const pointVente = document.getElementById('estimation-point-vente').value;
    const categorie = document.getElementById('estimation-categorie').value;
    const transfertInput = document.getElementById('transfert-estimation');
    const transfertOriginal = document.getElementById('transfert-original');

    if (!dateInput || !pointVente || !categorie) {
        transfertInput.value = '';
        transfertOriginal.style.display = 'none';
        return;
    }

    try {
        const date = dateInput.value;
        const url = `/api/stock/${date}/transfert/${pointVente}/${categorie}`;
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('Transfert API response:', data);

        if (response.ok && data.transfert !== undefined) {
            // Store the original value as a data attribute
            transfertInput.dataset.originalValue = data.transfert;
            transfertInput.value = data.transfert;
            transfertInput.style.fontStyle = 'normal';
            transfertOriginal.style.display = 'none';
            console.log('Transfert value updated:', data.transfert);
            
            // Add title attribute to show message if present
            if (data.message) {
                transfertInput.title = data.message;
            } else {
                transfertInput.removeAttribute('title');
            }
        } else {
            transfertInput.dataset.originalValue = '0';
            transfertInput.value = '0';
            transfertInput.style.fontStyle = 'italic';
            transfertOriginal.style.display = 'none';
            console.log('No transfert found, set to 0');
            
            // Set title with message if available
            if (data.message) {
                transfertInput.title = data.message;
            } else {
                transfertInput.title = 'Aucune donnée de transfert trouvée';
            }
        }
    } catch (error) {
        console.error('Error in updateEstimationTransfert:', error);
        transfertInput.dataset.originalValue = '0';
        transfertInput.value = '0';
        transfertInput.style.fontStyle = 'italic';
        transfertOriginal.style.display = 'none';
        transfertInput.title = 'Erreur lors de la récupération des données de transfert';
    }
}

// Function to check if a field has been modified from its original value
function checkFieldModified(input, originalDisplay) {
    // Check if originalDisplay element exists
    if (!originalDisplay) return;
    
    const originalValue = parseFloat(input.dataset.originalValue) || 0;
    const currentValue = parseFloat(input.value) || 0;
    
    // Only show original value if:
    // 1. The value has been modified from the original
    // 2. The original value is meaningful (not 0 or undefined)
    if (originalValue !== currentValue && input.dataset.originalValue !== undefined && input.dataset.originalValue !== '') {
        originalDisplay.textContent = `Valeur calculée: ${originalValue.toFixed(3)}`;
        originalDisplay.style.display = 'block';
    } else {
        originalDisplay.style.display = 'none';
    }
}

// Function to calculate and update the difference field
function updateDifference() {
    console.log('=== UPDATE DIFFERENCE START ===');
    
    const stockMatin = parseFloat(document.getElementById('stock-matin-estimation').value) || 0;
    const transfert = parseFloat(document.getElementById('transfert-estimation').value) || 0;
    const stockSoir = parseFloat(document.getElementById('stock-soir').value) || 0;
    const previsionKg = parseFloat(document.getElementById('prevision-kg').value) || 0;
    const precommandeKg = parseFloat(document.getElementById('precommande-kg').value) || 0;
    const differenceInput = document.getElementById('difference');
    
    // Formula: stock matin + transfert - stock soir - prévision (kg) - pré-commande (kg)
    const difference = stockMatin + transfert - stockSoir - previsionKg - precommandeKg;
    
    differenceInput.value = difference.toFixed(3);
    console.log('Difference calculated:', difference);
    
    // Apply visual styling based on the value
    if (difference < 0) {
        differenceInput.style.color = 'red';
    } else if (difference > 0) {
        differenceInput.style.color = 'green';
    } else {
        differenceInput.style.color = 'black';
    }
    
    // Check if fields have been modified and show original values if needed
    const stockMatinInput = document.getElementById('stock-matin-estimation');
    const transfertInput = document.getElementById('transfert-estimation');
    const stockSoirInput = document.getElementById('stock-soir');
    
    const stockMatinOriginal = document.getElementById('stock-matin-original');
    const transfertOriginal = document.getElementById('transfert-original');
    const stockSoirOriginal = document.getElementById('stock-soir-original');
    
    checkFieldModified(stockMatinInput, stockMatinOriginal);
    checkFieldModified(transfertInput, transfertOriginal);
    checkFieldModified(stockSoirInput, stockSoirOriginal);
}

// Helper function to format date for input field (DD-MM-YYYY)
function formatDateForInput(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

// Function to save estimation data
async function sauvegarderEstimation() {
    console.log('=== SAVE ESTIMATION START ===');
    
    // Check if save is already in progress
    if (window.saveEstimationInProgress) {
        console.log('Save already in progress, ignoring duplicate call');
        return;
    }
    
    // Set flag to prevent multiple simultaneous saves
    window.saveEstimationInProgress = true;
    
    const stockMatinInput = document.getElementById('stock-matin-estimation');
    const transfertInput = document.getElementById('transfert-estimation');
    const stockSoirInput = document.getElementById('stock-soir');
    
    const estimation = {
        date: document.getElementById('estimation-date').value,
        pointVente: document.getElementById('estimation-point-vente').value,
        categorie: document.getElementById('estimation-categorie').value,
        stockSoir: parseFloat(stockSoirInput.value) || 0,
        stockSoirOriginal: parseFloat(stockSoirInput.dataset.originalValue) || 0,
        stockMatin: parseFloat(stockMatinInput.value) || 0,
        stockMatinOriginal: parseFloat(stockMatinInput.dataset.originalValue) || 0,
        transfert: parseFloat(transfertInput.value) || 0,
        transfertOriginal: parseFloat(transfertInput.dataset.originalValue) || 0,
        preCommandeDemain: parseFloat(document.getElementById('precommande-kg').value) || 0,
        previsionVentes: parseFloat(document.getElementById('prevision-kg').value) || 0,
        difference: parseFloat(document.getElementById('difference').value) || 0,
        stockModified: isStockModified()
    };
    
    console.log('Saving estimation data:', estimation);

    try {
        const response = await fetch('/api/estimations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(estimation)
        });

        const data = await response.json();

        if (data.success) {
            alert('Estimation enregistrée avec succès');
            
            // Reset the form but keep the Point de Vente
            resetEstimationForm();
            
            // Reload estimations table if needed
            if (typeof chargerEstimations === 'function') {
                await chargerEstimations();
            } else {
                // Refresh the page as fallback
                window.location.reload();
            }
        } else {
            alert('Erreur lors de l\'enregistrement de l\'estimation: ' + (data.message || 'Erreur inconnue'));
        }
    } catch (error) {
        console.error('Erreur lors de la sauvegarde de l\'estimation:', error);
        alert('Erreur lors de la sauvegarde de l\'estimation');
    } finally {
        // Clear the flag regardless of success or failure
        window.saveEstimationInProgress = false;
        console.log('=== SAVE ESTIMATION END ===');
    }
}

// Function to check if any stock value has been modified
function isStockModified() {
    const stockMatinInput = document.getElementById('stock-matin-estimation');
    const transfertInput = document.getElementById('transfert-estimation');
    const stockSoirInput = document.getElementById('stock-soir');
    
    const stockMatinOriginal = parseFloat(stockMatinInput.dataset.originalValue) || 0;
    const stockMatinCurrent = parseFloat(stockMatinInput.value) || 0;
    
    const transfertOriginal = parseFloat(transfertInput.dataset.originalValue) || 0;
    const transfertCurrent = parseFloat(transfertInput.value) || 0;
    
    const stockSoirOriginal = parseFloat(stockSoirInput.dataset.originalValue) || 0;
    const stockSoirCurrent = parseFloat(stockSoirInput.value) || 0;
    
    return stockMatinOriginal !== stockMatinCurrent ||
           transfertOriginal !== transfertCurrent ||
           stockSoirOriginal !== stockSoirCurrent;
}

// Function to reset the estimation form while keeping the Point de Vente
function resetEstimationForm() {
    console.log('=== RESET ESTIMATION FORM START ===');
    
    // Get form elements
    const dateInput = document.getElementById('estimation-date');
    const pointVenteSelect = document.getElementById('estimation-point-vente');
    const categorieSelect = document.getElementById('estimation-categorie');
    const stockMatinInput = document.getElementById('stock-matin-estimation');
    const transfertInput = document.getElementById('transfert-estimation');
    const stockSoirInput = document.getElementById('stock-soir');
    const precommandeInput = document.getElementById('precommande-kg');
    const previsionInput = document.getElementById('prevision-kg');
    const differenceInput = document.getElementById('difference');
    
    // Store the current Point de Vente selection
    const currentPointVente = pointVenteSelect ? pointVenteSelect.value : '';
    
    // Reset date to today
    if (dateInput) {
        const today = new Date();
        const formattedDate = formatDateForInput(today);
        dateInput.value = formattedDate;
        
        // If using flatpickr, update it too
        if (dateInput._flatpickr) {
            dateInput._flatpickr.setDate(today);
        }
    }
    
    // Reset category selection
    if (categorieSelect) {
        categorieSelect.selectedIndex = 0; // Select the first option (usually "Sélectionner une catégorie")
    }
    
    // Clear all input fields
    if (stockMatinInput) {
        stockMatinInput.value = '';
        stockMatinInput.style.fontStyle = 'normal';
        delete stockMatinInput.dataset.originalValue;
    }
    
    if (transfertInput) {
        transfertInput.value = '';
        transfertInput.style.fontStyle = 'normal';
        delete transfertInput.dataset.originalValue;
    }
    
    if (stockSoirInput) {
        stockSoirInput.value = '';
        stockSoirInput.style.fontStyle = 'normal';
        delete stockSoirInput.dataset.originalValue;
    }
    
    if (precommandeInput) {
        precommandeInput.value = '';
    }
    
    if (previsionInput) {
        previsionInput.value = '';
    }
    
    if (differenceInput) {
        differenceInput.value = '';
        differenceInput.style.color = 'black';
    }
    
    // Restore the Point de Vente selection
    if (pointVenteSelect && currentPointVente) {
        pointVenteSelect.value = currentPointVente;
    }
    
    // Hide any original value indicators
    const stockMatinOriginal = document.getElementById('stock-matin-original');
    const transfertOriginal = document.getElementById('transfert-original');
    const stockSoirOriginal = document.getElementById('stock-soir-original');
    
    if (stockMatinOriginal) stockMatinOriginal.style.display = 'none';
    if (transfertOriginal) transfertOriginal.style.display = 'none';
    if (stockSoirOriginal) stockSoirOriginal.style.display = 'none';
    
    console.log('Form reset completed, Point de Vente preserved:', currentPointVente);
    console.log('=== RESET ESTIMATION FORM END ===');
}

// Function to load estimations from the server
async function chargerEstimations() {
    console.log('=== LOAD ESTIMATIONS START ===');
    
    try {
        const response = await fetch('/api/estimations');
        const data = await response.json();

        if (data.success) {
            afficherEstimations(data.estimations);
            console.log('Estimations loaded successfully');
        } else {
            console.error('Failed to load estimations:', data.message || 'Unknown error');
        }
    } catch (error) {
        console.error('Error loading estimations:', error);
    }
    
    console.log('=== LOAD ESTIMATIONS END ===');
}

// Function to determine status based on difference percentage and threshold
function getStatusIndicator(differencePercentage, threshold) {
    // Use absolute value for comparison
    const absPercentage = Math.abs(differencePercentage);
    const thresholdValue = parseFloat(threshold);
    const upperThreshold = thresholdValue + 10; // Threshold + 10%
    
    let colorClass, color, icon;
    
    if (absPercentage <= thresholdValue) {
        colorClass = 'green';
        color = 'success'; // Green
        icon = 'check-circle-fill';
    } else if (absPercentage <= upperThreshold) {
        colorClass = 'yellow';
        color = 'warning'; // Yellow
        icon = 'exclamation-triangle-fill';
    } else {
        colorClass = 'red';
        color = 'danger'; // Red
        icon = 'x-circle-fill';
    }
    
    return `<div class="status-indicator ${colorClass}" title="Écart: ${absPercentage.toFixed(2)}%, Seuil: ${thresholdValue}%">
              <i class="bi bi-${icon} text-${color}"></i>
            </div>`;
}

// Function to display estimations in the table
function afficherEstimations(estimations) {
    console.log('=== DISPLAY ESTIMATIONS START ===');
    
    const tbody = document.getElementById('estimations-table-body');
    if (!tbody) {
        console.error('Table body element not found');
        return;
    }
    
    // Get current threshold value
    const thresholdSlider = document.getElementById('performance-threshold');
    const thresholdValue = thresholdSlider ? thresholdSlider.value : 5; // Default to 5% if slider not found
    
    // Clear the table
    tbody.innerHTML = '';
    
    if (!estimations || estimations.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `<td colspan="13" class="text-center">Aucune donnée disponible</td>`;
        tbody.appendChild(emptyRow);
        console.log('No estimations to display');
        return;
    }
    
    console.log(`Displaying ${estimations.length} estimations with threshold ${thresholdValue}%`);
    
    // Display each estimation
    estimations.forEach(estimation => {
        const row = document.createElement('tr');
        
        // Determine if a stock value has been modified
        const stockMatinModified = estimation.stockMatin !== undefined && 
                                  estimation.stockMatinOriginal !== undefined && 
                                  estimation.stockMatin !== estimation.stockMatinOriginal;
                                  
        const transfertModified = estimation.transfert !== undefined && 
                                 estimation.transfertOriginal !== undefined && 
                                 estimation.transfert !== estimation.transfertOriginal;
                                 
        const stockSoirModified = estimation.stockSoir !== undefined && 
                                 estimation.stockSoirOriginal !== undefined && 
                                 estimation.stockSoir !== estimation.stockSoirOriginal;
        
        // Format stock values with italics if zero and show original values if modified
        const stockMatinValue = estimation.stockMatin !== undefined ? estimation.stockMatin : 0;
        const stockMatinFormatted = stockMatinValue === 0 ? 
            `<i>${stockMatinValue.toFixed(3)}</i>` : 
            stockMatinValue.toFixed(3);
            
        const stockMatinDisplay = stockMatinModified ? 
            `${stockMatinFormatted} <small class="text-muted d-block">(calc: ${estimation.stockMatinOriginal.toFixed(3)})</small>` : 
            stockMatinFormatted;
            
        const transfertValue = estimation.transfert !== undefined ? estimation.transfert : 0;
        const transfertFormatted = transfertValue === 0 ? 
            `<i>${transfertValue.toFixed(3)}</i>` : 
            transfertValue.toFixed(3);
            
        const transfertDisplay = transfertModified ? 
            `${transfertFormatted} <small class="text-muted d-block">(calc: ${estimation.transfertOriginal.toFixed(3)})</small>` : 
            transfertFormatted;
            
        // Format stock soir with italics if zero and show original if modified
        const stockSoirFormatted = estimation.stockSoir === 0 ? 
            `<i>${estimation.stockSoir.toFixed(3)}</i>` : 
            estimation.stockSoir.toFixed(3);
            
        const stockSoirDisplay = stockSoirModified ? 
            `${stockSoirFormatted} <small class="text-muted d-block">(calc: ${estimation.stockSoirOriginal.toFixed(3)})</small>` : 
            stockSoirFormatted;
        
        // Format other values with italics if zero
        const precommandeFormatted = estimation.preCommandeDemain === 0 ? 
            `<i>${estimation.preCommandeDemain.toFixed(3)}</i>` : 
            estimation.preCommandeDemain.toFixed(3);
            
        const previsionFormatted = estimation.previsionVentes === 0 ? 
            `<i>${estimation.previsionVentes.toFixed(3)}</i>` : 
            `<strong>${estimation.previsionVentes.toFixed(3)}</strong>`;
            
        // Calculate difference if not provided
        let difference = estimation.difference;
        if (difference === undefined) {
            // Recreate the calculation if needed
            const stockMatin = estimation.stockMatin || 0;
            const transfert = estimation.transfert || 0;
            const preCommandeDemain = estimation.preCommandeDemain || 0;
            difference = stockMatin + transfert - estimation.stockSoir - estimation.previsionVentes - preCommandeDemain;
        }
        
        // Format difference with color
        let differenceFormatted = difference.toFixed(3);
        let differenceColor = 'black';
        if (difference < 0) {
            differenceColor = 'red';
        } else if (difference > 0) {
            differenceColor = 'green';
        }
        
        // Calculate difference percentage
        let differencePercentage = 0;
        const total = stockMatinValue + transfertValue;
        if (total > 0) {
            differencePercentage = (difference / total) * 100;
        }
        
        // Format difference percentage with color
        let differencePercentageFormatted = differencePercentage.toFixed(2) + '%';
        let differencePercentageColor = differenceColor; // Use same color as difference
        
        // Calculate theoretical sales (ventes théoriques) = stockMatin + transfert - stockSoir
        const ventesTheo = stockMatinValue + transfertValue - estimation.stockSoir;
        const ventesTheoFormatted = ventesTheo === 0 ? 
            `<i>${ventesTheo.toFixed(3)}</i>` : 
            `<strong>${ventesTheo.toFixed(3)}</strong>`;
        
        // Get status indicator based on threshold
        const statusIndicator = getStatusIndicator(differencePercentage, thresholdValue);
        
        // Build the row HTML - update to include new columns
        row.innerHTML = `
            <td class="text-center">${formatDate(estimation.date)}</td>
            <td class="text-center">${estimation.pointVente}</td>
            <td class="text-center">${estimation.categorie}</td>
            <td class="text-center">${stockMatinDisplay}</td>
            <td class="text-center">${transfertDisplay}</td>
            <td class="text-center">${stockSoirDisplay}</td>
            <td class="text-center">${ventesTheoFormatted}</td>
            <td class="text-center">${precommandeFormatted}</td>
            <td class="text-center">${previsionFormatted}</td>
            <td class="text-center" style="color: ${differenceColor};">${differenceFormatted}</td>
            <td class="text-center" style="color: ${differencePercentageColor};">${differencePercentageFormatted}</td>
            <td class="text-center">${statusIndicator}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-danger" onclick="supprimerEstimation(${estimation.id})" aria-label="Supprimer l'estimation">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    console.log('=== DISPLAY ESTIMATIONS END ===');
    
    // Initialize table filters after the table is populated
    populateFilterOptions();
    
    // Apply any existing filters
    applyFilters();
}

// Helper function to format dates
function formatDate(dateString) {
    try {
        // Handle different date formats
        let date;
        if (dateString.includes('T')) {
            // ISO format
            date = new Date(dateString);
        } else if (dateString.includes('-')) {
            // DD-MM-YYYY format
            const parts = dateString.split('-');
            date = new Date(parts[2], parts[1] - 1, parts[0]);
        } else {
            // Fallback
            date = new Date(dateString);
        }
        
        // Force the format to be DD-MM-YYYY for consistency with filters
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}-${month}-${year}`;
    } catch (e) {
        console.error('Error formatting date:', e);
        return dateString; // Return original if error
    }
}

// Function to delete an estimation
async function supprimerEstimation(id) {
    console.log('=== DELETE ESTIMATION START ===');
    
    if (!confirm('Voulez-vous vraiment supprimer cette estimation ?')) {
        console.log('Deletion cancelled by user');
        return;
    }

    try {
        const response = await fetch(`/api/estimations/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            console.log('Estimation deleted successfully');
            await chargerEstimations(); // Reload the table
        } else {
            console.error('Failed to delete estimation:', data.message || 'Unknown error');
            alert('Erreur lors de la suppression: ' + (data.message || 'Erreur inconnue'));
        }
    } catch (error) {
        console.error('Error deleting estimation:', error);
        alert('Erreur lors de la suppression de l\'estimation');
    }
    
    console.log('=== DELETE ESTIMATION END ===');
}

// Load estimations when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the table if we're on the estimation page
    const estimationSection = document.getElementById('estimation-section');
    if (estimationSection && window.getComputedStyle(estimationSection).display !== 'none') {
        chargerEstimations().then(() => {
            // After loading estimations, load the latest estimation for the current point of sale and category
            loadLatestEstimation();
        });
    }
});

// Function to load the latest estimation into the form
async function loadLatestEstimation() {
    console.log('=== LOAD LATEST ESTIMATION START ===');
    
    try {
        // Get form elements
    const dateInput = document.getElementById('estimation-date');
    const pointVenteSelect = document.getElementById('estimation-point-vente');
    const categorieSelect = document.getElementById('estimation-categorie');

        // Check required elements
        if (!dateInput || !pointVenteSelect || !categorieSelect) {
            throw new Error('Required form elements not found');
        }
        
        // Ensure date is set to today if empty
        if (!dateInput.value) {
            dateInput.value = formatDateForInput(new Date());
            console.log('Set missing date to today:', dateInput.value);
        }
        
        // Get current form selections
        let pointVente = pointVenteSelect.value;
        let categorie = categorieSelect.value;
        const date = dateInput.value;
        
        // Try to auto-select point de vente and categorie if not selected
        if (!pointVente || !categorie) {
            const selectionResult = await autoSelectPointVenteAndCategorie(
                pointVenteSelect, 
                categorieSelect, 
                date
            );
            
            pointVente = selectionResult.pointVente;
            categorie = selectionResult.categorie;
            
            // If we still don't have valid selections, we can't continue
            if (!pointVente || !categorie) {
                console.log('Could not determine point de vente and categorie, aborting');
                return;
            }
        }
        
        // Fetch all estimations
        const estimations = await fetchEstimations();
        if (!estimations || estimations.length === 0) {
            console.log('No estimations available');
            return;
        }
        
        // Find the latest estimation for this point de vente and categorie
        const latestEstimation = findLatestEstimation(estimations, pointVente, categorie, date);
        if (!latestEstimation) {
            console.log('No matching estimation found');
            return;
        }
        
        // Populate the form with the found estimation data
        populateFormWithEstimation(latestEstimation);
        
        console.log('Form populated with latest estimation');
    } catch (error) {
        console.error('Error in loadLatestEstimation:', error);
    }
    
    console.log('=== LOAD LATEST ESTIMATION END ===');
}

// Helper function to auto-select point de vente and categorie if not selected
async function autoSelectPointVenteAndCategorie(pointVenteSelect, categorieSelect, date) {
    console.log('Auto-selecting point de vente and categorie');
    
    let pointVente = pointVenteSelect.value;
    let categorie = categorieSelect.value;
    
    // Try to select first non-empty option
    if (!pointVente && pointVenteSelect.options.length > 1) {
        for (let i = 0; i < pointVenteSelect.options.length; i++) {
            if (pointVenteSelect.options[i].value) {
                pointVenteSelect.selectedIndex = i;
                pointVente = pointVenteSelect.options[i].value;
                console.log('Auto-selected point de vente:', pointVente);
                break;
            }
        }
    }
    
    if (!categorie && categorieSelect.options.length > 1) {
        for (let i = 0; i < categorieSelect.options.length; i++) {
            if (categorieSelect.options[i].value) {
                categorieSelect.selectedIndex = i;
                categorie = categorieSelect.options[i].value;
                console.log('Auto-selected categorie:', categorie);
                break;
            }
        }
    }
    
    // If we still don't have valid selections, try to find values from existing estimations
    if (!pointVente || !categorie) {
        try {
            const estimations = await fetchEstimations();
            
            if (estimations && estimations.length > 0) {
                // Try to find an estimation for today
                const todayFormatted = formatDateForInput(new Date());
                const todayEstimations = estimations.filter(est => est.date === todayFormatted);
                
                if (todayEstimations.length > 0) {
                    const firstEstimation = todayEstimations[0];
                    
                    // Set point de vente if missing
                    if (!pointVente && firstEstimation.pointVente) {
                        for (let i = 0; i < pointVenteSelect.options.length; i++) {
                            if (pointVenteSelect.options[i].value === firstEstimation.pointVente) {
                                pointVenteSelect.selectedIndex = i;
                                pointVente = firstEstimation.pointVente;
                                console.log('Selected point de vente from today\'s estimation:', pointVente);
                                break;
                            }
                        }
                    }
                    
                    // Set categorie if missing
                    if (!categorie && firstEstimation.categorie) {
                        for (let i = 0; i < categorieSelect.options.length; i++) {
                            if (categorieSelect.options[i].value === firstEstimation.categorie) {
                                categorieSelect.selectedIndex = i;
                                categorie = firstEstimation.categorie;
                                console.log('Selected categorie from today\'s estimation:', categorie);
                                break;
                            }
                        }
                    }
                } else if (estimations.length > 0) {
                    // If no today's estimation, use the most recent one
                    const mostRecent = estimations.sort((a, b) => {
                        // Sort by date descending
                        const dateA = new Date(a.date.split('-').reverse().join('-'));
                        const dateB = new Date(b.date.split('-').reverse().join('-'));
                        return dateB - dateA;
                    })[0];
                    
                    // Set point de vente if missing
                    if (!pointVente && mostRecent.pointVente) {
                        for (let i = 0; i < pointVenteSelect.options.length; i++) {
                            if (pointVenteSelect.options[i].value === mostRecent.pointVente) {
                                pointVenteSelect.selectedIndex = i;
                                pointVente = mostRecent.pointVente;
                                console.log('Selected point de vente from most recent estimation:', pointVente);
                                break;
                            }
                        }
                    }
                    
                    // Set categorie if missing
                    if (!categorie && mostRecent.categorie) {
                        for (let i = 0; i < categorieSelect.options.length; i++) {
                            if (categorieSelect.options[i].value === mostRecent.categorie) {
                                categorieSelect.selectedIndex = i;
                                categorie = mostRecent.categorie;
                                console.log('Selected categorie from most recent estimation:', categorie);
                                break;
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error auto-selecting from estimations:', error);
        }
    }
    
    // Last resort: just select the first option
    if (!pointVente && pointVenteSelect.options.length > 1) {
        pointVenteSelect.selectedIndex = 1; // Skip the empty first option
        pointVente = pointVenteSelect.value;
        console.log('Selected first available point de vente:', pointVente);
    }
    
    if (!categorie && categorieSelect.options.length > 1) {
        categorieSelect.selectedIndex = 1; // Skip the empty first option
        categorie = categorieSelect.value;
        console.log('Selected first available categorie:', categorie);
    }
    
    return { pointVente, categorie };
}

// Function to fetch estimations from the server
async function fetchEstimations() {
    try {
        const response = await fetch('/api/estimations');
        const data = await response.json();
        
        if (!data.success) {
            console.error('API returned error:', data.message || 'Unknown error');
            return null;
        }
        
        return data.estimations || [];
    } catch (error) {
        console.error('Error fetching estimations:', error);
        return null;
    }
}

// Function to find the latest estimation matching the criteria
function findLatestEstimation(estimations, pointVente, categorie, date) {
    // First try exact match for date, point de vente, and categorie
    const exactMatches = estimations.filter(est => 
        est.date === date && 
        est.pointVente === pointVente && 
        est.categorie === categorie
    );
    
    if (exactMatches.length > 0) {
        console.log('Found exact match for estimation');
        return exactMatches[0];
    }
    
    // Then try match for point de vente and categorie, sorted by date
    const matchesByPointVenteAndCategorie = estimations
        .filter(est => est.pointVente === pointVente && est.categorie === categorie)
        .sort((a, b) => {
            // Sort by date descending
            const dateA = new Date(a.date.split('-').reverse().join('-'));
            const dateB = new Date(b.date.split('-').reverse().join('-'));
            return dateB - dateA;
        });
    
    if (matchesByPointVenteAndCategorie.length > 0) {
        console.log('Found match by point de vente and categorie');
        return matchesByPointVenteAndCategorie[0];
    }
    
    // Then try match for date
    const matchesByDate = estimations.filter(est => est.date === date);
    
    if (matchesByDate.length > 0) {
        console.log('Found match by date');
        return matchesByDate[0];
    }
    
    // Finally, return the most recent estimation
    const sortedByDate = [...estimations].sort((a, b) => {
        const dateA = new Date(a.date.split('-').reverse().join('-'));
        const dateB = new Date(b.date.split('-').reverse().join('-'));
        return dateB - dateA;
    });
    
    if (sortedByDate.length > 0) {
        console.log('Using most recent estimation as fallback');
        return sortedByDate[0];
    }
    
    return null;
}

// Function to populate the form with estimation data
function populateFormWithEstimation(estimation) {
    console.log('Populating form with estimation:', estimation);
    
    const stockMatinInput = document.getElementById('stock-matin-estimation');
    const transfertInput = document.getElementById('transfert-estimation');
    const stockSoirInput = document.getElementById('stock-soir');
    const precommandeInput = document.getElementById('precommande-kg');
    const previsionInput = document.getElementById('prevision-kg');
    const differenceInput = document.getElementById('difference');
    
    // Populate stock matin
    if (stockMatinInput) {
        stockMatinInput.value = estimation.stockMatin || 0;
        stockMatinInput.dataset.originalValue = estimation.stockMatinOriginal || 0;
    }
    
    // Populate transfert
    if (transfertInput) {
        transfertInput.value = estimation.transfert || 0;
        transfertInput.dataset.originalValue = estimation.transfertOriginal || 0;
    }
    
    // Populate stock soir
    if (stockSoirInput) {
        stockSoirInput.value = estimation.stockSoir || 0;
        stockSoirInput.dataset.originalValue = estimation.stockSoirOriginal || 0;
    }
    
    // Populate pre-commande
    if (precommandeInput) {
        precommandeInput.value = estimation.preCommandeDemain || 0;
    }
    
    // Populate prevision
    if (previsionInput) {
        previsionInput.value = estimation.previsionVentes || 0;
    }
    
    // Populate and style difference
    if (differenceInput) {
        differenceInput.value = estimation.difference || 0;
        
        // Apply visual styling
        const difference = parseFloat(differenceInput.value);
        if (difference < 0) {
            differenceInput.style.color = 'red';
        } else if (difference > 0) {
            differenceInput.style.color = 'green';
        } else {
            differenceInput.style.color = 'black';
        }
    }
    
    // Update the difference display
    updateDifference();
}

// Function to enhance the threshold slider with visual indicators
function enhanceThresholdSlider() {
    const thresholdSlider = document.getElementById('performance-threshold');
    const thresholdValue = document.getElementById('threshold-value');
    
    if (!thresholdSlider || !thresholdValue) {
        console.log('Threshold slider elements not found');
        return;
    }
    
    // Create a container to wrap the slider for better styling
    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'threshold-slider-container';
    sliderContainer.style.position = 'relative';
    sliderContainer.style.width = '100%';
    sliderContainer.style.padding = '10px 0';
    
    // Style the slider to make it more visible
    thresholdSlider.style.height = '10px';
    thresholdSlider.style.borderRadius = '5px';
    thresholdSlider.style.appearance = 'none';
    thresholdSlider.style.outline = 'none';
    thresholdSlider.style.opacity = '1';
    
    // Add custom draggable handle indicator
    const handle = document.createElement('div');
    handle.className = 'threshold-handle';
    handle.style.position = 'absolute';
    handle.style.width = '20px';
    handle.style.height = '20px';
    handle.style.backgroundColor = '#007bff';
    handle.style.borderRadius = '50%';
    handle.style.top = '5px';
    handle.style.marginLeft = '-10px';
    handle.style.cursor = 'grab';
    handle.style.boxShadow = '0 0 5px rgba(0,0,0,0.3)';
    handle.style.transition = 'transform 0.1s';
    handle.style.zIndex = '10';
    handle.style.border = '2px solid white';
    handle.innerHTML = '<span style="position:absolute;bottom:25px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:12px;background:white;padding:2px 5px;border-radius:3px;box-shadow:0 0 3px rgba(0,0,0,0.2);">Glisser</span>';
    
    // Add a label
    const sliderLabel = document.createElement('div');
    sliderLabel.style.position = 'absolute';
    sliderLabel.style.top = '-20px';
    sliderLabel.style.left = '0';
    sliderLabel.style.fontSize = '14px';
    sliderLabel.textContent = 'Faites glisser pour ajuster le seuil de performance:';
    
    // Insert elements into the container
    const parent = thresholdSlider.parentNode;
    sliderContainer.appendChild(sliderLabel);
    
    // Replace the slider with our container and re-add the slider to it
    parent.replaceChild(sliderContainer, thresholdSlider);
    sliderContainer.appendChild(thresholdSlider);
    sliderContainer.appendChild(handle);
    
    // Update handle position based on slider value
    function updateHandlePosition() {
        const percent = (thresholdSlider.value - thresholdSlider.min) / (thresholdSlider.max - thresholdSlider.min);
        const position = percent * (thresholdSlider.offsetWidth - 20) + 10;
        handle.style.left = position + 'px';
    }
    
    // Initial position
    updateHandlePosition();
    
    // Update on input
    thresholdSlider.addEventListener('input', function() {
        updateHandlePosition();
        thresholdValue.textContent = `${this.value}%`;
        chargerEstimations();
        
        // Animation effect
        handle.style.transform = 'scale(1.2)';
        setTimeout(() => { handle.style.transform = 'scale(1)'; }, 100);
    });
}

// Function to initialize and set up table filters
function initializeTableFilters() {
    const filterPointVente = document.getElementById('filter-point-vente');
    const filterCategorie = document.getElementById('filter-categorie');
    const filterDate = document.getElementById('filter-date');
    const resetFilterBtn = document.getElementById('reset-filters');
    
    if (!filterPointVente || !filterCategorie) {
        console.warn('Filter elements not found');
        return;
    }
    
    console.log('Initializing table filters');
    
    // Initialize date picker for date filter if available
    if (filterDate && typeof flatpickr === 'function') {
        try {
            // We need to use a format that matches how dates are displayed in the table
            const fp = flatpickr(filterDate, {
                dateFormat: 'd-m-Y', // This is what we input
                altFormat: 'd/m/Y',  // This is what might be displayed in the table
                allowInput: true,
                locale: null,
                onClose: function(selectedDates, dateStr) {
                    // This ensures the filter is applied immediately when a date is selected
                    applyFilters();
                }
            });
            
            // Try to detect if there's already a date in the input field (from browser cache/refresh)
            if (filterDate.value) {
                // Parse and reformat it to ensure consistency
                try {
                    const parts = filterDate.value.split(/[-\/]/);
                    if (parts.length === 3) {
                        // Normalize the date format
                        const day = parts[0].padStart(2, '0');
                        const month = parts[1].padStart(2, '0');
                        const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
                        filterDate.value = `${day}-${month}-${year}`;
                        
                        // Apply filter since we have a value
                        setTimeout(() => applyFilters(), 100);
                    }
                } catch (e) {
                    console.warn('Failed to parse existing date value:', e);
                }
            }
        } catch (error) {
            console.warn('Error initializing date filter:', error);
            // Add regular change event as fallback
            filterDate.addEventListener('change', applyFilters);
        }
    }
    
    // Populate filter dropdowns with unique values from table
    populateFilterOptions();
    
    // Add event listeners for filters
    filterPointVente.addEventListener('change', applyFilters);
    filterCategorie.addEventListener('change', applyFilters);
    
    // Reset filters button
    if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', function() {
            filterPointVente.value = '';
            filterCategorie.value = '';
            if (filterDate) {
                filterDate.value = '';
                if (filterDate._flatpickr) {
                    filterDate._flatpickr.clear();
                }
            }
            applyFilters();
        });
    }
}

// Function to populate filter select options from table data
function populateFilterOptions() {
    // Get filter selects
    const filterPointVente = document.getElementById('filter-point-vente');
    const filterCategorie = document.getElementById('filter-categorie');
    
    if (!filterPointVente || !filterCategorie) return;
    
    // Clear existing options (except first one)
    while (filterPointVente.options.length > 1) {
        filterPointVente.remove(1);
    }
    
    while (filterCategorie.options.length > 1) {
        filterCategorie.remove(1);
    }
    
    // Get all rows from table
    const tableRows = document.querySelectorAll('#estimations-table-body tr');
    
    // Extract unique values
    const pointVenteValues = new Set();
    const categorieValues = new Set();
    
    tableRows.forEach(row => {
        const pointVente = row.cells[1]?.textContent?.trim();
        const categorie = row.cells[2]?.textContent?.trim();
        
        if (pointVente) pointVenteValues.add(pointVente);
        if (categorie) categorieValues.add(categorie);
    });
    
    // Add options to point de vente filter
    pointVenteValues.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        filterPointVente.appendChild(option);
    });
    
    // Add options to categorie filter
    categorieValues.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        filterCategorie.appendChild(option);
    });
    
    console.log(`Populated filters with ${pointVenteValues.size} points de vente and ${categorieValues.size} categories`);
}

// Function to apply filters to the table
function applyFilters() {
    const filterPointVente = document.getElementById('filter-point-vente');
    const filterCategorie = document.getElementById('filter-categorie');
    const filterDate = document.getElementById('filter-date');
    const resetFilterBtn = document.getElementById('reset-filters');
    
    const pointVenteValue = filterPointVente?.value || '';
    const categorieValue = filterCategorie?.value || '';
    const dateValue = filterDate?.value || '';
    
    console.log('Applying filters:', { point_vente: pointVenteValue, categorie: categorieValue, date: dateValue });
    
    // Style active filters
    styleActiveFilter(filterPointVente, pointVenteValue !== '');
    styleActiveFilter(filterCategorie, categorieValue !== '');
    styleActiveFilter(filterDate, dateValue !== '');
    
    // Show/hide reset button based on if any filter is active
    const isAnyFilterActive = pointVenteValue !== '' || categorieValue !== '' || dateValue !== '';
    if (resetFilterBtn) {
        resetFilterBtn.classList.toggle('btn-outline-secondary', !isAnyFilterActive);
        resetFilterBtn.classList.toggle('btn-secondary', isAnyFilterActive);
    }
    
    // Get all rows
    const tableRows = document.querySelectorAll('#estimations-table-body tr');
    let visibleRows = 0;
    
    // Check each row against filters
    tableRows.forEach(row => {
        // Get cell values (these are displayed values)
        const rowDate = row.cells[0]?.textContent?.trim();
        const pointVente = row.cells[1]?.textContent?.trim();
        const categorie = row.cells[2]?.textContent?.trim();
        
        // Format the date filter value to match the table display format
        // Our filter uses DD-MM-YYYY but table shows DD/MM/YYYY
        let formattedDateFilter = dateValue;
        if (dateValue) {
            // Check if the date value contains dashes (which is what the date picker uses)
            if (dateValue.includes('-')) {
                // Split the date value by dashes
                const dateParts = dateValue.split('-');
                // If we have 3 parts, format it to match the table display format
                if (dateParts.length === 3) {
                    formattedDateFilter = `${dateParts[0]}/${dateParts[1]}/${dateParts[2]}`;
                }
            }
        }
        
        // Show/hide based on filters
        const pointVenteMatch = !pointVenteValue || pointVente === pointVenteValue;
        const categorieMatch = !categorieValue || categorie === categorieValue;
        
        // For date, compare either the formatted date or the original rowDate
        const dateMatch = !dateValue || 
                         rowDate === formattedDateFilter ||
                         // Also check the original format in case table format is different
                         rowDate === dateValue;
        
        if (pointVenteMatch && categorieMatch && dateMatch) {
            row.style.display = '';
            visibleRows++;
        } else {
            row.style.display = 'none';
        }
    });
    
    console.log(`Filter applied: ${visibleRows} rows visible`);
    
    // Show message if no results
    showNoResultsMessageIfNeeded(visibleRows);
    
    // Update filter label with count of active filters
    updateFilterLabel(isAnyFilterActive ? countActiveFilters(pointVenteValue, categorieValue, dateValue) : 0);
}

// Function to style an active filter
function styleActiveFilter(element, isActive) {
    if (!element) return;
    
    if (isActive) {
        element.classList.add('border-primary');
        element.classList.add('bg-light');
        
        // Add a subtle box shadow
        element.style.boxShadow = '0 0 0 1px rgba(13, 110, 253, 0.25)';
    } else {
        element.classList.remove('border-primary');
        element.classList.remove('bg-light');
        element.style.boxShadow = '';
    }
}

// Function to count active filters
function countActiveFilters(pointVente, categorie, date) {
    let count = 0;
    if (pointVente) count++;
    if (categorie) count++;
    if (date) count++;
    return count;
}

// Function to update the filter label with count of active filters
function updateFilterLabel(activeCount) {
    const filterLabel = document.querySelector('label.form-label strong');
    if (!filterLabel) return;
    
    if (activeCount > 0) {
        filterLabel.innerHTML = `Filtres: <span class="badge bg-primary ms-1">${activeCount}</span>`;
    } else {
        filterLabel.textContent = 'Filtres:';
    }
}

// Function to display a message when no results match the filter
function showNoResultsMessageIfNeeded(visibleRowCount) {
    const tbody = document.getElementById('estimations-table-body');
    
    // Remove existing no-results row if any
    const existingNoResults = document.getElementById('no-filter-results-row');
    if (existingNoResults) {
        tbody.removeChild(existingNoResults);
    }
    
    // If no visible rows, show message
    if (visibleRowCount === 0) {
        const noResultsRow = document.createElement('tr');
        noResultsRow.id = 'no-filter-results-row';
        noResultsRow.innerHTML = `<td colspan="13" class="text-center py-3">Aucun résultat ne correspond aux filtres sélectionnés</td>`;
        tbody.appendChild(noResultsRow);
    }
} 