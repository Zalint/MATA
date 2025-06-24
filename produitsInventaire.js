const produitsInventaire = {
    "Boeuf": {
        "prixDefault": 3700,
        "alternatives": [3700]
    },
    "Veau": {
        "prixDefault": 3900,
        "alternatives": [3900]
    },
    "Poulet": {
        "prixDefault": 3500,
        "alternatives": [3500]
    },
    "Tete De Mouton": {
        "prixDefault": 1000,
        "alternatives": [1000]
    },
    "Tablette": {
        "prixDefault": 2800,
        "alternatives": [2800]
    },
    "Foie": {
        "prixDefault": 4000,
        "alternatives": [4000]
    },
    "Yell": {
        "prixDefault": 2500,
        "alternatives": [2500]
    },
    "Agneau": {
        "prixDefault": 4500,
        "alternatives": [4500]
    },
    "Déchet 400": {
        "prixDefault": 400,
        "alternatives": [400]
    },
    "Autres": {
        "prixDefault": 1,
        "alternatives": [1]
    },
    "Mergez": {
        "prixDefault": 5000,
        "alternatives": [5000]
    },
    "Déchet 2000": {
        "prixDefault": 2000,
        "alternatives": [2000]
    },
    "Abats": {
        "prixDefault": 1000,
        "alternatives": [1000]
    },
    // Nouveaux produits « sur pieds »
    "Boeuf sur pieds": {
        "prixDefault": 0,
        "alternatives": [0]
    },
    "Veau sur pieds": {
        "prixDefault": 0,
        "alternatives": [0]
    },
    "Mouton sur pieds": {
        "prixDefault": 0,
        "alternatives": [0]
    },
    "Chevre sur pieds": {
        "prixDefault": 0,
        "alternatives": [0]
    }
};

// Fonctions utilitaires pour manipuler les produits d'inventaire
produitsInventaire.getPrixDefaut = function(produit) {
    if (this[produit]) {
        return this[produit].prixDefault;
    }
    return 0;
};

produitsInventaire.getPrixAlternatifs = function(produit) {
    if (this[produit]) {
        return this[produit].alternatives;
    }
    return [];
};

produitsInventaire.getPrixPreferePour = function(produit) {
    if (this[produit]) {
        // Préfère le prix alternatif le plus récent s'il existe, sinon le prix par défaut
        const alternatives = this[produit].alternatives;
        return alternatives.length > 0 ? alternatives[0] : this[produit].prixDefault;
    }
    return 0;
};

// Fonction pour obtenir tous les noms de produits
produitsInventaire.getTousLesProduits = function() {
    return Object.keys(this).filter(key => typeof this[key] === 'object' && this[key] !== null && this[key].prixDefault !== undefined);
};

// Fonction pour vérifier si un produit existe
produitsInventaire.produitExiste = function(produit) {
    return this[produit] && typeof this[produit] === 'object' && this[produit].prixDefault !== undefined;
};

// Pour la compatibilité avec le code existant
produitsInventaire.getSimpleValue = function(produit) {
    return this.getPrixDefaut(produit);
};

// En environnement navigateur
if (typeof window !== 'undefined') {
    window.produitsInventaire = produitsInventaire;
}
// En environnement Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = produitsInventaire;
} 