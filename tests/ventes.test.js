const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { spawn } = require('child_process');

// Ensure proper PostgreSQL environment for tests
process.env.DB_PASSWORD = 'mata2024'; // Set the correct PostgreSQL password
process.env.NODE_ENV = 'test';

const API_URL = 'http://localhost:3000/api';
let authCookie = '';
let serverProcess = null;

// Fonction pour démarrer le serveur Express
const startServer = () => {
    return new Promise((resolve) => {
        const env = { 
            ...process.env, 
            NODE_ENV: 'test',
            DB_PASSWORD: 'mata2024',
            DB_USER: 'postgres',
            DB_HOST: 'localhost',
            DB_PORT: '5432',
            DB_NAME: 'ventes_db'
        };
        
        console.log('Starting server with environment:', JSON.stringify(env, null, 2));
        
        serverProcess = spawn('node', ['-r', 'dotenv/config', 'server.js'], {
            stdio: 'pipe',
            detached: false,
            env: env
        });

        // Capturer les logs du serveur
        serverProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`Server output: ${output}`);
            
            // Résoudre la promesse une fois que le serveur est prêt
            if (output.includes('Serveur démarré sur le port')) {
                console.log('Server is ready!');
                // On attend 1 seconde supplémentaire pour être sûr que le serveur est bien initialisé
                setTimeout(resolve, 1000);
            }
        });

        serverProcess.stderr.on('data', (data) => {
            console.error(`Server error: ${data.toString()}`);
        });

        // Définir un timeout au cas où le serveur ne démarre pas correctement
        setTimeout(() => {
            console.log('Server start timeout - proceeding anyway');
            resolve();
        }, 10000);
    });
};

// Fonction pour arrêter le serveur Express
const stopServer = () => {
    return new Promise((resolve) => {
        if (serverProcess) {
            serverProcess.on('close', () => {
                console.log('Server stopped');
                resolve();
            });
            
            // Envoyer un signal pour arrêter le processus
            serverProcess.kill('SIGTERM');
            
            // Au cas où le processus ne se termine pas correctement
            setTimeout(() => {
                console.log('Force stopping server');
                serverProcess.kill('SIGKILL');
                resolve();
            }, 5000);
        } else {
            resolve();
        }
    });
};

// Fonction pour se connecter et obtenir un cookie d'authentification
const login = async () => {
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
        try {
            console.log(`Tentative de connexion ${attempts + 1}/${maxAttempts}...`);
            
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: 'SALIOU',
                    password: 'SALIOU123'
                })
            });
            
            if (response.ok) {
                const cookies = response.headers.get('set-cookie');
                if (cookies) {
                    authCookie = cookies.split(';')[0];
                    console.log('Connexion réussie !');
                    return true;
                }
            } else {
                const errorData = await response.text();
                console.log(`Échec de la connexion (${response.status}):`, errorData);
            }
        } catch (error) {
            console.log(`Erreur de connexion (tentative ${attempts + 1}):`, error.message);
        }
        
        attempts++;
        // Attendre avant de réessayer
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return false;
};

// Fonction pour vérifier la connexion à la base de données
const checkDatabaseConnection = async () => {
    try {
        console.log('Checking database connection...');
        const response = await fetch(`${API_URL}/check-db-connection`, {
            method: 'GET'
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`DB connection check failed: ${errorText}`);
            return false;
        }
        
        const data = await response.json();
        if (data.success) {
            console.log('Database connection successful');
            return true;
        } else {
            console.error(`DB connection check failed: ${data.message}`);
            return false;
        }
    } catch (error) {
        console.error('Error checking database connection:', error.message);
        return false;
    }
};

// Tests
describe('Tests des opérations de ventes avec PostgreSQL', () => {
    // Avant tous les tests
    beforeAll(async () => {
        // Démarrer le serveur
        await startServer();
        
        // Vérifier la connexion à la base de données
        let dbConnected = false;
        for (let attempt = 0; attempt < 3; attempt++) {
            console.log(`Attempting database connection (attempt ${attempt + 1}/3)...`);
            dbConnected = await checkDatabaseConnection();
            if (dbConnected) break;
            
            // Attendre avant de réessayer
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        if (!dbConnected) {
            console.warn('Failed to verify database connection after multiple attempts. Tests may fail.');
        }
        
        // Se connecter pour obtenir le cookie d'authentification
        const isLoggedIn = await login();
        if (!isLoggedIn) {
            throw new Error('Impossible de se connecter après plusieurs tentatives');
        }
    }, 40000); // Timeout de 40 secondes

    // Avant chaque test
    beforeEach(async () => {
        // Vérifier la connexion à la base de données avant chaque test
        try {
            const response = await fetch(`${API_URL}/check-health`, {
                headers: { 'Cookie': authCookie }
            });
            
            if (!response.ok) {
                console.warn('Health check failed, retrying login');
                const isLoggedIn = await login();
                if (!isLoggedIn) {
                    throw new Error('Impossible de se reconnecter');
                }
            }
        } catch (error) {
            console.warn('Health check error:', error.message);
        }
    }, 5000); // Timeout de 5 secondes

    // Après tous les tests
    afterAll(async () => {
        // Déconnexion
        try {
            await fetch(`${API_URL}/logout`, {
                method: 'POST',
                headers: { 'Cookie': authCookie }
            });
        } catch (error) {
            console.log('Erreur lors de la déconnexion:', error);
        }
        
        // Arrêter le serveur
        await stopServer();
    }, 10000); // Timeout de 10 secondes

    // Définir les cas de test
    const casTests = [
        {
            description: "Ajouter et supprimer Boeuf en détail",
            vente: {
                mois: "avril",
                date: "03-04-25",
                semaine: "S1",
                pointVente: "Mbao",
                preparation: "Mbao",
                categorie: "Bovin",
                produit: "Boeuf en détail",
                prixUnit: 3600,
                quantite: 2,
                total: 7200
            }
        },
        {
            description: "Ajouter et supprimer Boeuf en gros",
            vente: {
                mois: "avril",
                date: "03-04-25",
                semaine: "S1",
                pointVente: "Mbao",
                preparation: "Mbao",
                categorie: "Bovin",
                produit: "Boeuf en gros",
                prixUnit: 3400,
                quantite: 20,
                total: 68000
            }
        },
        {
            description: "Ajouter et supprimer Agneau",
            vente: {
                mois: "avril",
                date: "03-04-25",
                semaine: "S1",
                pointVente: "Mbao",
                preparation: "Mbao",
                categorie: "Ovin",
                produit: "Agneau",
                prixUnit: 4000,
                quantite: 2.3,
                total: 9200
            }
        },
        {
            description: "Ajouter et supprimer Poulet en détail",
            vente: {
                mois: "avril",
                date: "03-04-25",
                semaine: "S1",
                pointVente: "Mbao",
                preparation: "Mbao",
                categorie: "Volaille",
                produit: "Poulet en détail",
                prixUnit: 3500,
                quantite: 100,
                total: 350000
            }
        },
        {
            description: "Ajouter et supprimer Pack100000",
            vente: {
                mois: "avril",
                date: "03-04-25",
                semaine: "S1",
                pointVente: "Mbao",
                preparation: "Mbao",
                categorie: "Pack",
                produit: "Pack100000",
                prixUnit: 100000,
                quantite: 1,
                total: 100000
            }
        },
        {
            description: "Ajouter et supprimer Veau en détail",
            vente: {
                mois: "avril",
                date: "03-04-25",
                semaine: "S1",
                pointVente: "Mbao",
                preparation: "Mbao",
                categorie: "Bovin",
                produit: "Veau en détail",
                prixUnit: 4000,
                quantite: 5,
                total: 20000
            }
        }
    ];

    // Exécuter chaque cas de test
    casTests.forEach(({ description, vente }) => {
        test(`${description} - Ajout et Suppression`, async () => {
            let newSaleId = null;
            const maxRetries = 2;
            let retryCount = 0;
            
            // Function to handle the retry logic
            const testWithRetry = async () => {
                try {
                    console.log(`Test d'ajout pour: ${description} (tentative ${retryCount + 1}/${maxRetries + 1})`);
                    
                    // 1. Ajouter une nouvelle vente
                    const responseAjout = await fetch(`${API_URL}/ventes`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Cookie': authCookie
                        },
                        body: JSON.stringify([vente])
                    });
                    
                    // Log the response status for debugging
                    console.log(`Add status code: ${responseAjout.status}`);
                    
                    // Try to get the response text first to see what's happening
                    const ajoutText = await responseAjout.text();
                    console.log(`Raw add response: ${ajoutText}`);
                    
                    // Parse the JSON if possible
                    let dataAjout;
                    try {
                        dataAjout = JSON.parse(ajoutText);
                    } catch (e) {
                        console.error('Error parsing JSON add response:', e);
                        throw new Error(`Failed to parse add response: ${ajoutText}`);
                    }
                    
                    console.log(`Réponse de l'ajout:`, dataAjout);
                    
                    if (!responseAjout.ok || !dataAjout.success) {
                        throw new Error(`Échec de l'ajout: ${dataAjout.message || 'Unknown error'}`);
                    }
                    
                    expect(responseAjout.ok).toBe(true);
                    expect(dataAjout.success).toBe(true);
                    expect(dataAjout.dernieresVentes).toBeDefined();
                    
                    // Get the ID of the newly added sale
                    newSaleId = dataAjout.dernieresVentes[0].id;
                    console.log(`ID de la nouvelle vente: ${newSaleId}`);
                    
                    // Attendre un peu pour s'assurer que la vente est bien enregistrée
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // 2. Supprimer la nouvelle vente
                    console.log(`Test de suppression pour: ${description} (ID: ${newSaleId})`);
                    const responseSuppression = await fetch(
                        `${API_URL}/ventes/${newSaleId}?pointVente=Mbao`,
                        {
                            method: 'DELETE',
                            headers: {
                                'Cookie': authCookie
                            }
                        }
                    );
                    
                    // Log the response status for debugging
                    console.log(`Delete status code: ${responseSuppression.status}`);
                    
                    // Try to get the response text first to see what's happening
                    const suppressionText = await responseSuppression.text();
                    console.log(`Raw delete response: ${suppressionText}`);
                    
                    // Parse the JSON if possible
                    let dataSuppression;
                    try {
                        dataSuppression = JSON.parse(suppressionText);
                    } catch (e) {
                        console.error('Error parsing JSON delete response:', e);
                        throw new Error(`Failed to parse delete response: ${suppressionText}`);
                    }
                    
                    console.log(`Réponse de la suppression:`, dataSuppression);
                    
                    if (!responseSuppression.ok || !dataSuppression.success) {
                        throw new Error(`Échec de la suppression: ${dataSuppression.message || 'Unknown error'}`);
                    }
                    
                    expect(responseSuppression.ok).toBe(true);
                    expect(dataSuppression.success).toBe(true);
                    expect(dataSuppression.message).toBe("Vente supprimée avec succès");
                } catch (error) {
                    if (retryCount < maxRetries) {
                        console.warn(`Retry attempt ${retryCount + 1} due to error: ${error.message}`);
                        retryCount++;
                        
                        // If we have a sale ID but failed to delete, try to clean up
                        if (newSaleId !== null) {
                            try {
                                await fetch(
                                    `${API_URL}/ventes/${newSaleId}?pointVente=Mbao`,
                                    {
                                        method: 'DELETE',
                                        headers: {
                                            'Cookie': authCookie
                                        }
                                    }
                                );
                                console.log(`Cleanup: Deleted sale ID ${newSaleId}`);
                            } catch (cleanupError) {
                                console.warn(`Failed to clean up sale ID ${newSaleId}: ${cleanupError.message}`);
                            }
                        }
                        
                        // Wait before retrying
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        return testWithRetry();
                    }
                    throw error;
                }
            };
            
            await testWithRetry();
        }, 30000); // Increase timeout to 30 seconds per test to allow for retries
    });
}); 