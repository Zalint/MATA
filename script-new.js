// Fonction pour créer une nouvelle entrée de produit
function creerNouvelleEntree() {
    const div = document.createElement('div');
    div.className = 'produit-entry mb-3';
    div.innerHTML = `
        <div class="row align-items-end">
            <div class="col-md-2">
                <label class="form-label">Catégorie</label>
                <select class="form-select categorie-select" required>
                    <option value="">Sélectionner...</option>
                    <option value="Bovin">Bovin</option>
                    <option value="Ovin">Ovin</option>
                    <option value="Volaille">Volaille</option>
                    <option value="Pack">Pack</option>
                    <option value="Autres">Autres</option>
                </select>
            </div>
            <div class="col-md-3">
                <label class="form-label">Produit</label>
                <select class="form-select produit-select" required>
                    <option value="">Sélectionner...</option>
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
            <div class="col-md-1">
                <label class="form-label">&nbsp;</label>
                <button type="button" class="btn btn-danger btn-sm supprimer-produit">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="row mt-2">
            <div class="col-md-3">
                <label class="form-label">Nom Client</label>
                <input type="text" class="form-control nom-client">
            </div>
            <div class="col-md-3">
                <label class="form-label">Numéro Client</label>
                <input type="text" class="form-control numero-client">
            </div>
            <div class="col-md-3">
                <label class="form-label">Adresse Client</label>
                <input type="text" class="form-control adresse-client">
            </div>
            <div class="col-md-3">
                <label class="form-label">Créance</label>
                <select class="form-select creance-select">
                    <option value="false">Non</option>
                    <option value="true">Oui</option>
                </select>
            </div>
        </div>
    `;

    // Gestion dynamique des produits
    const categorieSelect = div.querySelector('.categorie-select');
    const produitSelect = div.querySelector('.produit-select');
    categorieSelect.addEventListener('change', function() {
        const categorie = this.value;
        produitSelect.innerHTML = '<option value="">Sélectionner...</option>'; // Vider les options précédentes
        
        // Utiliser produitsDB au lieu de produitsParCategorie
        if (categorie && typeof produits !== 'undefined' && produits[categorie]) {
            Object.keys(produits[categorie]).forEach(produit => {
                const option = document.createElement('option');
                option.value = produit;
                option.textContent = produit;
                produitSelect.appendChild(option);
            });
        } else if (categorie) {
            console.error(`Données produits non trouvées ou catégorie vide: ${categorie}`);
            // Vous pourriez vouloir afficher un message à l'utilisateur ici
        }
        
        // Déclencher manuellement l'événement change sur produitSelect pour mettre à jour le prix
        produitSelect.dispatchEvent(new Event('change')); 
    });

    // Mise à jour auto du prix unitaire
    const prixUnitInput = div.querySelector('.prix-unit');
    produitSelect.addEventListener('change', function() {
        const selectedProduit = this.value;
        const categorie = categorieSelect.value;
        const pointVente = document.getElementById('point-vente').value;
        
        // Utiliser le prix depuis produitsDB
        if (categorie && selectedProduit && produits[categorie] && produits[categorie][selectedProduit]) {
            // Prendre le prix spécifique au point de vente ou le prix par défaut
            prixUnitInput.value = produits.getPrixDefaut(categorie, selectedProduit, pointVente) || '';
        } else {
            console.warn(`Prix non trouvé pour ${categorie} > ${selectedProduit}`);
            prixUnitInput.value = '';
        }
        
        calculerTotal(div); // Recalculer le total ligne quand produit change
    });

    // Calcul auto du total
    const quantiteInput = div.querySelector('.quantite');
    prixUnitInput.addEventListener('input', () => calculerTotal(div));
    quantiteInput.addEventListener('input', () => calculerTotal(div));

    // Logique de suppression
    const deleteButton = div.querySelector('.supprimer-produit');
    deleteButton.addEventListener('click', function() {
        div.remove();
        calculerTotalGeneral(); // Recalculer le total général après suppression
    });

    return div;
} 