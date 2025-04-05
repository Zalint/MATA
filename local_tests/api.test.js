/**
 * Tests pour les appels API
 */

// Mock de fetch globalement pour tous les tests
global.fetch = jest.fn();

// Mocks pour les réponses API
const mockStockResponse = {
  "Mbao": {
    "Boeuf": { quantite: 42.5, prix: 3600, total: 153000, commentaire: "Stock initial" }
  },
  "O.Foire": {
    "Veau": { quantite: 15, prix: 3800, total: 57000, commentaire: "" }
  }
};

const mockTransfertsResponse = [
  {
    id: "t1234",
    pointVente: "Mbao",
    produit: "Boeuf",
    impact: 1, // positif
    quantite: 10,
    prix: 3600,
    total: 36000,
    commentaire: "Réception stock",
    date: "12/05/2023"
  },
  {
    id: "t5678",
    pointVente: "O.Foire",
    produit: "Veau",
    impact: -1, // négatif
    quantite: 5,
    prix: 3800,
    total: 19000,
    commentaire: "Transfert sortant",
    date: "15/05/2023"
  }
];

// Fonction pour récupérer le stock
async function chargerStock(type = 'matin', date = null) {
  try {
    let url = `/api/stock/${type}`;
    if (date) {
      url += `?date=${date}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors du chargement du stock:', error);
    throw error;
  }
}

// Fonction pour sauvegarder le stock
async function sauvegarderStock(type, data, date = null) {
  try {
    let url = `/api/stock/${type}`;
    if (date) {
      url += `?date=${date}`;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du stock:', error);
    throw error;
  }
}

// Fonction pour récupérer les transferts
async function chargerTransferts(date = null) {
  try {
    let url = '/api/transferts';
    if (date) {
      url += `?date=${date}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors du chargement des transferts:', error);
    throw error;
  }
}

// Fonction pour sauvegarder un transfert
async function sauvegarderTransfert(transfert) {
  try {
    const response = await fetch('/api/transferts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transfert)
    });
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du transfert:', error);
    throw error;
  }
}

// Fonction pour supprimer un transfert
async function supprimerTransfert(id) {
  try {
    const response = await fetch(`/api/transferts/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erreur lors de la suppression du transfert:', error);
    throw error;
  }
}

// Tests
describe('Tests des appels API', () => {
  // Réinitialiser les mocks avant chaque test
  beforeEach(() => {
    fetch.mockClear();
  });
  
  describe('API de gestion du stock', () => {
    test('chargerStock récupère les données du stock correctement', async () => {
      // Configurer le mock pour retourner les données de test
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStockResponse
      });
      
      // Appeler la fonction
      const result = await chargerStock('matin');
      
      // Vérifier que fetch a été appelé avec les bons paramètres
      expect(fetch).toHaveBeenCalledWith('/api/stock/matin');
      
      // Vérifier le résultat
      expect(result).toEqual(mockStockResponse);
    });
    
    test('chargerStock gère correctement les paramètres de date', async () => {
      // Configurer le mock pour retourner les données de test
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStockResponse
      });
      
      // Appeler la fonction avec une date
      const date = '2023-05-15';
      const result = await chargerStock('soir', date);
      
      // Vérifier que fetch a été appelé avec les bons paramètres
      expect(fetch).toHaveBeenCalledWith(`/api/stock/soir?date=${date}`);
      
      // Vérifier le résultat
      expect(result).toEqual(mockStockResponse);
    });
    
    test('chargerStock gère correctement les erreurs HTTP', async () => {
      // Configurer le mock pour simuler une erreur
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });
      
      // Vérifier que l'erreur est bien levée
      await expect(chargerStock('matin')).rejects.toThrow('Erreur HTTP 404');
    });
    
    test('sauvegarderStock envoie correctement les données', async () => {
      // Données à sauvegarder
      const stockData = {
        "Mbao": {
          "Boeuf": { quantite: 45, prix: 3600, total: 162000, commentaire: "Stock mis à jour" }
        }
      };
      
      // Configurer le mock pour retourner une réponse de succès
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });
      
      // Appeler la fonction
      const result = await sauvegarderStock('matin', stockData);
      
      // Vérifier que fetch a été appelé avec les bons paramètres
      expect(fetch).toHaveBeenCalledWith('/api/stock/matin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(stockData)
      });
      
      // Vérifier le résultat
      expect(result).toEqual({ success: true });
    });
    
    test('sauvegarderStock gère correctement les paramètres de date', async () => {
      // Données à sauvegarder
      const stockData = {
        "O.Foire": {
          "Veau": { quantite: 20, prix: 3800, total: 76000, commentaire: "" }
        }
      };
      
      // Date à utiliser
      const date = '2023-05-15';
      
      // Configurer le mock pour retourner une réponse de succès
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });
      
      // Appeler la fonction
      const result = await sauvegarderStock('soir', stockData, date);
      
      // Vérifier que fetch a été appelé avec les bons paramètres
      expect(fetch).toHaveBeenCalledWith(`/api/stock/soir?date=${date}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(stockData)
      });
      
      // Vérifier le résultat
      expect(result).toEqual({ success: true });
    });
  });
  
  describe('API de gestion des transferts', () => {
    test('chargerTransferts récupère les données des transferts correctement', async () => {
      // Configurer le mock pour retourner les données de test
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTransfertsResponse
      });
      
      // Appeler la fonction
      const result = await chargerTransferts();
      
      // Vérifier que fetch a été appelé avec les bons paramètres
      expect(fetch).toHaveBeenCalledWith('/api/transferts');
      
      // Vérifier le résultat
      expect(result).toEqual(mockTransfertsResponse);
    });
    
    test('chargerTransferts gère correctement les paramètres de date', async () => {
      // Configurer le mock pour retourner les données de test
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTransfertsResponse
      });
      
      // Appeler la fonction avec une date
      const date = '2023-05-15';
      const result = await chargerTransferts(date);
      
      // Vérifier que fetch a été appelé avec les bons paramètres
      expect(fetch).toHaveBeenCalledWith(`/api/transferts?date=${date}`);
      
      // Vérifier le résultat
      expect(result).toEqual(mockTransfertsResponse);
    });
    
    test('sauvegarderTransfert envoie correctement les données', async () => {
      // Transfert à sauvegarder
      const transfert = {
        pointVente: "Dahra",
        produit: "Agneau",
        impact: 1,
        quantite: 8,
        prix: 4500,
        total: 36000,
        commentaire: "Nouveau transfert",
        date: "20/05/2023"
      };
      
      // Configurer le mock pour retourner une réponse de succès
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true, 
          id: "t9999", 
          message: "Transfert enregistré avec succès"
        })
      });
      
      // Appeler la fonction
      const result = await sauvegarderTransfert(transfert);
      
      // Vérifier que fetch a été appelé avec les bons paramètres
      expect(fetch).toHaveBeenCalledWith('/api/transferts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transfert)
      });
      
      // Vérifier le résultat
      expect(result).toEqual({ 
        success: true, 
        id: "t9999", 
        message: "Transfert enregistré avec succès"
      });
    });
    
    test('supprimerTransfert fonctionne correctement', async () => {
      // ID du transfert à supprimer
      const transfertId = 't5678';
      
      // Configurer le mock pour retourner une réponse de succès
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true, 
          message: "Transfert supprimé avec succès"
        })
      });
      
      // Appeler la fonction
      const result = await supprimerTransfert(transfertId);
      
      // Vérifier que fetch a été appelé avec les bons paramètres
      expect(fetch).toHaveBeenCalledWith(`/api/transferts/${transfertId}`, {
        method: 'DELETE'
      });
      
      // Vérifier le résultat
      expect(result).toEqual({ 
        success: true, 
        message: "Transfert supprimé avec succès"
      });
    });
    
    test('Les fonctions gèrent correctement les erreurs réseau', async () => {
      // Configurer le mock pour simuler une erreur réseau
      fetch.mockRejectedValueOnce(new Error('Erreur réseau'));
      
      // Vérifier que l'erreur est bien levée
      await expect(chargerTransferts()).rejects.toThrow('Erreur réseau');
    });
  });
}); 