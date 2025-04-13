const produits = {
    "Bovin": {
        "Boeuf en détail": { 
            default: 3600, 
            alternatives: [3600, 3700] 
        },
        "Boeuf en gros": { 
            default: 3400, 
            alternatives: [3400] 
        },
        "Dechet": { 
            default: 1000, 
            alternatives: [1000] 
        },
        "Foie": { 
            default: 4000, 
            alternatives: [4000] 
        },
        "Yell": { 
            default: 2000, 
            alternatives: [2000, 2500] 
        },
        "Jarret": { 
            default: 250, 
            alternatives: [250] 
        },
        "Abats": { 
            default: 1000, 
            alternatives: [1000, 1500] 
        },
        "Faux Filet": { 
            default: 3500, 
            alternatives: [3500] 
        },
        "Filet": { 
            default: 5000, 
            alternatives: [5000, 4000, 7000] 
        },
        "Sans Os": { 
            default: 4500, 
            alternatives: [4500, 4000] 
        },
        "Viande Hachée": { 
            default: 5000, 
            alternatives: [5000] 
        },
        "Veau en détail": { 
            default: 3800, 
            alternatives: [3800, 3800] 
        },
        "Veau en gros": { 
            default: 3600, 
            alternatives: [3600, 3600] 
        },
        "Veau sur pied": { 
            default: 0, 
            alternatives: [] 
        },
        "Merguez": { 
            default: 4500, 
            alternatives: [4500] 
        },
        "Boeuf sur pied": { 
            default: 0, 
            alternatives: [] 
        },
        "Tete de Boeuf": { 
            default: 10000, 
            alternatives: [10000] 
        }
    },
    "Ovin": {
        "Agneau": { 
            default: 4000, 
            alternatives: [4500] 
        },
        "Tete Agneau": { 
            default: 1000, 
            alternatives: [1000, 1500] 
        }
    },
    "Volaille": {
        "Poulet en détail": { 
            default: 3500, 
            alternatives: [3500, 3000, 3700] 
        },
        "Poulet en gros": { 
            default: 3000, 
            alternatives: [3000, 3300] 
        },
        "Oeuf": { 
            default: 2800, 
            alternatives: [2800, 2800, 2900] 
        },
        "Pack Pigeon": { 
            default: 2500, 
            alternatives: [2500, 2000] 
        },
        "Pilon": { 
            default: 3500, 
            alternatives: [3500] 
        },
        "Merguez poulet": { 
            default: 5500, 
            alternatives: [5500] 
        }
    },
    "Pack": {
        "Pack25000": { 
            default: 25000, 
            alternatives: [25000] 
        },
        "Pack30000": { 
            default: 30000, 
            alternatives: [30000] 
        },
        "Pack35000": { 
            default: 35000, 
            alternatives: [35000] 
        },
        "Pack50000": { 
            default: 50000, 
            alternatives: [50000] 
        },
        "Pack75000": { 
            default: 75000, 
            alternatives: [75000] 
        },
        "Pack100000": { 
            default: 100000, 
            alternatives: [100000] 
        },
        "Pack20000": { 
            default: 20000, 
            alternatives: [20000] 
        }
    },
    "Autres": {
        "Produit divers": { 
            default: 0, 
            alternatives: [0] 
        },
        "Autre viande": { 
            default: 3000, 
            alternatives: [3000, 4000, 5000] 
        },
        "Service": { 
            default: 1000, 
            alternatives: [1000, 2000, 5000, 10000] 
        }
    }
};

// Fonctions utilitaires pour manipuler les produits
produits.getPrixDefaut = function(categorie, produit) {
    if (this[categorie] && this[categorie][produit]) {
        return this[categorie][produit].default;
    }
    return 0;
};

produits.getPrixAlternatifs = function(categorie, produit) {
    if (this[categorie] && this[categorie][produit]) {
        return this[categorie][produit].alternatives;
    }
    return [];
};

produits.getPrixPreferePour = function(categorie, produit) {
    if (this[categorie] && this[categorie][produit]) {
        // Préfère le prix alternatif le plus récent s'il existe, sinon le prix par défaut
        const alternatives = this[categorie][produit].alternatives;
        return alternatives.length > 0 ? alternatives[0] : this[categorie][produit].default;
    }
    return 0;
};

// Pour la compatibilité avec le code existant
produits.getSimpleValue = function(categorie, produit) {
    return this.getPrixDefaut(categorie, produit);
};

// En environnement navigateur
if (typeof window !== 'undefined') {
    window.produits = produits;
}
// En environnement Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = produits;
} 