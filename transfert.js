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
        const allProducts = new Set();

        // Parcourir toutes les catégories et produits
        Object.keys(produits).forEach(categorie => {
            Object.keys(produits[categorie]).forEach(produit => {
                allProducts.add(produit);
            });
        });

        // Ajouter les options au select
        Array.from(allProducts).sort().forEach(produit => {
            const option = document.createElement('option');
            option.value = produit;
            option.textContent = produit;
            filterSelect.appendChild(option);
        });
    }

    handleProduitChange(selectElement) {
        const row = selectElement.closest('tr');
        const produitSelected = selectElement.value;
        const prixUnitaireInput = row.querySelector('.prix-unitaire-input');

        if (produitSelected) {
            // Trouver la catégorie du produit
            let prixDefaut = 0;
            Object.keys(produits).forEach(categorie => {
                if (produits[categorie][produitSelected]) {
                    prixDefaut = produits.getPrixPreferePour(categorie, produitSelected);
                }
            });

            // Mettre à jour le prix unitaire
            prixUnitaireInput.value = prixDefaut;
            this.calculerTotal(row);
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