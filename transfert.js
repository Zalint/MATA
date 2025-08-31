// Gestionnaire des transferts
class TransfertManager {
    constructor() {
        this.initializeEventListeners();
        this.populateProductFilter();
    }

    initializeEventListeners() {
        // Gestionnaire pour les filtres
        document.getElementById('filtre-point-vente-transfert').addEventListener('change', () => this.appliquerFiltres());
        document.getElementById('filtre-produit-transfert').addEventListener('change', () => this.appliquerFiltres());

        // Gestionnaire pour la sélection de produit
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('produit-select')) {
                this.handleProduitChange(e.target);
            }
        });

        // Gestionnaire pour le calcul du total
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('quantite-input') || e.target.classList.contains('prix-unitaire-input')) {
                this.calculerTotal(e.target.closest('tr'));
            }
        });
    }

    populateProductFilter() {
        const filterSelect = document.getElementById('filtre-produit-transfert');
        // Ensure the default "Tous les produits" option remains
        if (filterSelect.options.length === 1 && filterSelect.options[0].value === "") {
             // Default option already exists, do nothing extra here or clear if needed first
             // For now, let's assume we just append to the existing static list in HTML
        } else {
             // Clear existing options if they were dynamically added previously or if HTML is empty
             // filterSelect.innerHTML = '<option value="">Tous les produits</option>'; // Uncomment if needed
        }

        // Define the specific list of products for the transfer filter
        const allowedProducts = [
            "Boeuf",
            "Veau",
            "Poulet",
            "Tete De Mouton", // Use the value from HTML which is "Tete De Mouton"
            "Tablette",
            "Foie",
            "Yell",
            "Agneau",
            "Autres" // Add the new option
        ];

        // Add the allowed products to the select
        allowedProducts.sort().forEach(produit => {
             // Check if the option already exists from the static HTML
             let exists = false;
             for (let i = 0; i < filterSelect.options.length; i++) {
                 if (filterSelect.options[i].value === produit) {
                     exists = true;
                     break;
                 }
             }
             // Add only if it doesn't exist (prevents duplicates if HTML is correct)
             if (!exists) {
                const option = document.createElement('option');
                option.value = produit;
                // Use specific display text if needed, e.g., "Tête de Mouton"
                option.textContent = (produit === "Tete De Mouton") ? "Tête de Mouton" : produit;
                filterSelect.appendChild(option);
             }
        });

        // Remove any options that are NOT in the allowed list + the default "" option
        for (let i = filterSelect.options.length - 1; i >= 0; i--) {
            const option = filterSelect.options[i];
            if (option.value !== "" && !allowedProducts.includes(option.value)) {
                filterSelect.remove(i);
            }
        }
    }

    handleProduitChange(selectElement) {
        const row = selectElement.closest('tr');
        if (!row) {
            console.warn('Row not found for select element:', selectElement);
            return;
        }
        
        const produitSelected = selectElement.value;
        const prixUnitaireInput = row.querySelector('.prix-unitaire-input');

        if (produitSelected && prixUnitaireInput) {
            // Utiliser le prix par défaut de produitsInventaire
            const prixDefaut = produitsInventaire.getPrixDefaut(produitSelected) || 0;

            // Mettre à jour le prix unitaire
            prixUnitaireInput.value = prixDefaut;
            this.calculerTotal(row);
        } else if (produitSelected && !prixUnitaireInput) {
            console.warn('Prix unitaire input not found in row for product:', produitSelected);
        }
    }

    calculerTotal(row) {
        const quantite = parseFloat(row.querySelector('.quantite-input').value) || 0;
        const prixUnit = parseFloat(row.querySelector('.prix-unitaire-input').value) || 0;
        const impact = parseInt(row.querySelector('.impact-select').value) || 1;
        const total = quantite * prixUnit * impact;
        
        const tdTotal = row.querySelector('.total-cell');
        if (tdTotal) {
            tdTotal.textContent = total.toLocaleString('fr-FR');
        }
    }

    appliquerFiltres() {
        const pointVenteFiltre = document.getElementById('filtre-point-vente-transfert').value;
        const produitFiltre = document.getElementById('filtre-produit-transfert').value;
        
        const rows = document.querySelectorAll('#transfertTable tbody tr');
        
        rows.forEach(row => {
            const pointVente = row.querySelector('.point-vente-select').value;
            const produit = row.querySelector('.produit-select').value;
            
            const matchPointVente = !pointVenteFiltre || pointVente === pointVenteFiltre;
            const matchProduit = !produitFiltre || produit === produitFiltre;
            
            row.style.display = (matchPointVente && matchProduit) ? '' : 'none';
        });
    }
}

// Initialiser le gestionnaire de transferts quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    window.transfertManager = new TransfertManager();
}); 