/**
 * Tests for utility functions
 */

// Mock de la variable globale PRIX_DEFAUT
global.PRIX_DEFAUT = {
  'Boeuf': 3600,
  'Veau': 3800,
  'Agneau': 4500,
  'Poulet': 3500,
  'Yell': 2500
};

// Fonctions utilitaires à tester
function calculTotal(quantite, prixUnitaire) {
  return parseFloat(quantite) * parseFloat(prixUnitaire);
}

function formatDate(date) {
  const d = new Date(date);
  const jour = String(d.getDate()).padStart(2, '0');
  const mois = String(d.getMonth() + 1).padStart(2, '0');
  const annee = d.getFullYear();
  return `${jour}/${mois}/${annee}`;
}

function parseDate(dateStr) {
  // Accepte les formats: jj/mm/aaaa, jj-mm-aa
  if (!dateStr) return null;
  
  let jour, mois, annee;
  
  if (dateStr.includes('/')) {
    // Format jj/mm/aaaa
    const parts = dateStr.split('/');
    jour = parts[0];
    mois = parts[1];
    annee = parts[2];
  } else if (dateStr.includes('-')) {
    // Format jj-mm-aa
    const parts = dateStr.split('-');
    jour = parts[0];
    mois = parts[1];
    
    // Si l'année est sur 2 chiffres, la convertir en 4 chiffres
    if (parts[2].length === 2) {
      annee = '20' + parts[2];
    } else {
      annee = parts[2];
    }
  } else {
    return null;
  }
  
  // Validation des parties
  if (isNaN(parseInt(jour)) || isNaN(parseInt(mois)) || isNaN(parseInt(annee))) {
    return null;
  }
  
  return new Date(annee, parseInt(mois) - 1, parseInt(jour));
}

function validateTransfert(transfert) {
  if (!transfert) return false;
  if (!transfert.pointVente) return false;
  if (!transfert.produit) return false;
  if (!transfert.quantite || isNaN(parseFloat(transfert.quantite)) || parseFloat(transfert.quantite) < 0) return false;
  if (!transfert.prixUnitaire || isNaN(parseFloat(transfert.prixUnitaire)) || parseFloat(transfert.prixUnitaire) < 0) return false;
  
  return true;
}

// Tests
describe('Tests des utilitaires', () => {
  describe('calculTotal', () => {
    test('Calcule le total correctement avec des nombres valides', () => {
      expect(calculTotal(10, 100)).toBe(1000);
      expect(calculTotal('10', '100')).toBe(1000);
      expect(calculTotal(3.5, 200)).toBe(700);
    });
    
    test('Gère les entrées non numériques', () => {
      expect(calculTotal('abc', 100)).toBeNaN();
      expect(calculTotal(10, 'abc')).toBeNaN();
    });
  });
  
  describe('formatDate', () => {
    test('Formate correctement les dates', () => {
      const date = new Date(2025, 3, 15); // 15 avril 2025
      expect(formatDate(date)).toBe('15/04/2025');
    });
    
    test('Ajoute des zéros pour les jours et mois < 10', () => {
      const date = new Date(2025, 0, 5); // 5 janvier 2025
      expect(formatDate(date)).toBe('05/01/2025');
    });
  });
  
  describe('parseDate', () => {
    test('Parse correctement le format jj/mm/aaaa', () => {
      const dateStr = '15/04/2025';
      const parsedDate = parseDate(dateStr);
      expect(parsedDate).toBeInstanceOf(Date);
      expect(parsedDate.getDate()).toBe(15);
      expect(parsedDate.getMonth()).toBe(3); // Avril = 3 (0-indexé)
      expect(parsedDate.getFullYear()).toBe(2025);
    });
    
    test('Parse correctement le format jj-mm-aa', () => {
      const dateStr = '15-04-25';
      const parsedDate = parseDate(dateStr);
      expect(parsedDate).toBeInstanceOf(Date);
      expect(parsedDate.getDate()).toBe(15);
      expect(parsedDate.getMonth()).toBe(3); // Avril = 3 (0-indexé)
      expect(parsedDate.getFullYear()).toBe(2025);
    });
    
    test('Retourne null pour des entrées non valides', () => {
      expect(parseDate('15.04.2025')).toBeNull();
      expect(parseDate('aa/bb/cccc')).toBeNull();
      expect(parseDate('')).toBeNull();
      expect(parseDate(null)).toBeNull();
    });
  });
  
  describe('validateTransfert', () => {
    test('Valide les transferts corrects', () => {
      const transfertValide = {
        pointVente: 'Mbao',
        produit: 'Boeuf',
        quantite: 10,
        prixUnitaire: 3600,
        commentaire: 'Test'
      };
      
      expect(validateTransfert(transfertValide)).toBe(true);
    });
    
    test('Rejette les transferts avec des données manquantes', () => {
      expect(validateTransfert(null)).toBe(false);
      expect(validateTransfert({})).toBe(false);
      expect(validateTransfert({ pointVente: 'Mbao' })).toBe(false);
      
      const sansPointVente = {
        produit: 'Boeuf',
        quantite: 10,
        prixUnitaire: 3600
      };
      expect(validateTransfert(sansPointVente)).toBe(false);
      
      const sansProduit = {
        pointVente: 'Mbao',
        quantite: 10,
        prixUnitaire: 3600
      };
      expect(validateTransfert(sansProduit)).toBe(false);
    });
    
    test('Rejette les transferts avec des quantités ou prix invalides', () => {
      const quantiteNegative = {
        pointVente: 'Mbao',
        produit: 'Boeuf',
        quantite: -10,
        prixUnitaire: 3600
      };
      expect(validateTransfert(quantiteNegative)).toBe(false);
      
      const prixNegatif = {
        pointVente: 'Mbao',
        produit: 'Boeuf',
        quantite: 10,
        prixUnitaire: -3600
      };
      expect(validateTransfert(prixNegatif)).toBe(false);
      
      const quantiteNaN = {
        pointVente: 'Mbao',
        produit: 'Boeuf',
        quantite: 'abc',
        prixUnitaire: 3600
      };
      expect(validateTransfert(quantiteNaN)).toBe(false);
    });
  });
}); 