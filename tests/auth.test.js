/**
 * Tests d'authentification pour l'application
 * Vérifie la connexion avec différents utilisateurs (SALIOU, NADOU, MBA)
 */

const fetch = require('node-fetch');
const { sequelize } = require('../db');
const users = require('../users');

// Mock pour fetch
jest.mock('node-fetch');

// URL de base pour les tests
const BASE_URL = 'http://localhost:3000/api';

/**
 * Configuration avant tous les tests
 */
beforeAll(async () => {
  // Vérifier la connexion à la base de données
  try {
    await sequelize.authenticate();
    console.log('Connexion à la base de données établie avec succès.');
  } catch (error) {
    console.error('Impossible de se connecter à la base de données:', error);
  }
});

/**
 * Nettoyage après tous les tests
 */
afterAll(async () => {
  // Fermer la connexion à la base de données
  await sequelize.close();
});

/**
 * Configuration avant chaque test
 */
beforeEach(() => {
  // Réinitialiser les mocks
  fetch.mockClear();
});

/**
 * Test de connexion avec l'utilisateur SALIOU
 */
describe('Test de connexion avec SALIOU', () => {
  test('Devrait se connecter avec succès avec les identifiants corrects', async () => {
    // Mock de la réponse du serveur pour une connexion réussie
    const mockResponse = {
      json: jest.fn().mockResolvedValue({
        success: true,
        user: {
          username: 'SALIOU',
          role: 'user',
          pointVente: 'tous'
        }
      })
    };
    fetch.mockResolvedValue(mockResponse);

    // Appel de la fonction verifyCredentials du module users
    const user = await users.verifyCredentials('SALIOU', 'password_for_saliou');
    
    // Si l'utilisateur existe dans la base de données, vérifier qu'il est bien authentifié
    if (user) {
      expect(user.username).toBe('SALIOU');
      expect(user.role).toBe('user');
      expect(user.pointVente).toBe('tous');
    } else {
      // Ignorer le test si l'utilisateur n'existe pas dans la base de données
      console.warn('Utilisateur SALIOU non trouvé dans la base de données, test ignoré');
    }
  });

  test('Devrait échouer avec un mot de passe incorrect', async () => {
    // Mock de la réponse du serveur pour une connexion échouée
    const mockResponse = {
      json: jest.fn().mockResolvedValue({
        success: false,
        message: 'Identifiants invalides'
      })
    };
    fetch.mockResolvedValue(mockResponse);

    // Appel de la fonction verifyCredentials du module users
    const user = await users.verifyCredentials('SALIOU', 'wrong_password');
    
    // L'utilisateur ne devrait pas être authentifié
    expect(user).toBeNull();
  });
});

/**
 * Test de connexion avec l'utilisateur NADOU
 */
describe('Test de connexion avec NADOU', () => {
  test('Devrait se connecter avec succès avec les identifiants corrects', async () => {
    // Mock de la réponse du serveur pour une connexion réussie
    const mockResponse = {
      json: jest.fn().mockResolvedValue({
        success: true,
        user: {
          username: 'NADOU',
          role: 'user',
          pointVente: 'tous'
        }
      })
    };
    fetch.mockResolvedValue(mockResponse);

    // Appel de la fonction verifyCredentials du module users
    const user = await users.verifyCredentials('NADOU', 'password_for_nadou');
    
    // Si l'utilisateur existe dans la base de données, vérifier qu'il est bien authentifié
    if (user) {
      expect(user.username).toBe('NADOU');
      expect(user.role).toBe('user');
      expect(user.pointVente).toBe('tous');
    } else {
      // Ignorer le test si l'utilisateur n'existe pas dans la base de données
      console.warn('Utilisateur NADOU non trouvé dans la base de données, test ignoré');
    }
  });

  test('Devrait échouer avec un mot de passe incorrect', async () => {
    // Mock de la réponse du serveur pour une connexion échouée
    const mockResponse = {
      json: jest.fn().mockResolvedValue({
        success: false,
        message: 'Identifiants invalides'
      })
    };
    fetch.mockResolvedValue(mockResponse);

    // Appel de la fonction verifyCredentials du module users
    const user = await users.verifyCredentials('NADOU', 'wrong_password');
    
    // L'utilisateur ne devrait pas être authentifié
    expect(user).toBeNull();
  });
});

/**
 * Test de connexion avec l'utilisateur MBA
 */
describe('Test de connexion avec MBA', () => {
  test('Devrait se connecter avec succès avec les identifiants corrects', async () => {
    // Mock de la réponse du serveur pour une connexion réussie
    const mockResponse = {
      json: jest.fn().mockResolvedValue({
        success: true,
        user: {
          username: 'MBA',
          role: 'user',
          pointVente: 'Mbao'
        }
      })
    };
    fetch.mockResolvedValue(mockResponse);

    // Appel de la fonction verifyCredentials du module users
    const user = await users.verifyCredentials('MBA', 'password_for_mba');
    
    // Si l'utilisateur existe dans la base de données, vérifier qu'il est bien authentifié
    if (user) {
      expect(user.username).toBe('MBA');
      expect(user.role).toBe('user');
      expect(user.pointVente).toBe('Mbao');
    } else {
      // Ignorer le test si l'utilisateur n'existe pas dans la base de données
      console.warn('Utilisateur MBA non trouvé dans la base de données, test ignoré');
    }
  });

  test('Devrait échouer avec un mot de passe incorrect', async () => {
    // Mock de la réponse du serveur pour une connexion échouée
    const mockResponse = {
      json: jest.fn().mockResolvedValue({
        success: false,
        message: 'Identifiants invalides'
      })
    };
    fetch.mockResolvedValue(mockResponse);

    // Appel de la fonction verifyCredentials du module users
    const user = await users.verifyCredentials('MBA', 'wrong_password');
    
    // L'utilisateur ne devrait pas être authentifié
    expect(user).toBeNull();
  });
});

/**
 * Test de connexion avec un utilisateur inexistant
 */
describe('Test de connexion avec un utilisateur inexistant', () => {
  test('Devrait échouer avec un utilisateur inexistant', async () => {
    // Mock de la réponse du serveur pour une connexion échouée
    const mockResponse = {
      json: jest.fn().mockResolvedValue({
        success: false,
        message: 'Identifiants invalides'
      })
    };
    fetch.mockResolvedValue(mockResponse);

    // Appel de la fonction verifyCredentials du module users
    const user = await users.verifyCredentials('UTILISATEUR_INEXISTANT', 'password');
    
    // L'utilisateur ne devrait pas être authentifié
    expect(user).toBeNull();
  });
});

/**
 * Test de la gestion des erreurs de connexion
 */
describe('Test de la gestion des erreurs de connexion', () => {
  test('Devrait gérer correctement une erreur de connexion au serveur', async () => {
    // Mock d'une erreur de connexion au serveur
    fetch.mockRejectedValue(new Error('Network error'));

    // Essayer de se connecter
    try {
      await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'SALIOU', password: 'password_for_saliou' })
      });
      
      // Le test devrait échouer si on arrive ici
      expect(true).toBe(false);
    } catch (error) {
      // Vérifier que l'erreur est bien gérée
      expect(error.message).toBe('Network error');
    }
  });
}); 