const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { spawn } = require('child_process');

const API_URL = 'http://localhost:3000/api';
const TEST_DATA_FILE = path.join(__dirname, 'ventes_test.csv');
let authCookie = '';
let serverProcess = null;

// Fonction pour créer le fichier de test avec des données de base
const createTestFile = () => {
    const testData = `ID;Mois;Date;Semaine;Point de Vente;Preparation;Catégorie;Produit;PU;Nombre;Montant
4390;avril;03-04-25;S1;Mbao;Mbao;Bovin;Boeuf en details;3600;2;7200
4391;avril;03-04-25;S1;Mbao;Mbao;Bovin;Boeuf en gros;3400;20;68000
4392;avril;03-04-25;S1;Mbao;Mbao;Ovin;Agneau;4000;2.3;9200
4393;avril;03-04-25;S1;Mbao;Mbao;Volaille;Poulet en detail;3500;100;350000
4394;avril;03-04-25;S1;Mbao;Mbao;Pack;Pack100000;100000;1;100000
4395;avril;03-04-25;S1;Mbao;Mbao;Bovin;Veau en details;4000;5;20000`;
    fs.writeFileSync(TEST_DATA_FILE, testData);
};

// Fonction pour démarrer le serveur Express
const startServer = () => {
    return new Promise((resolve) => {
        serverProcess = spawn('node', ['server.js'], {
            stdio: 'pipe',
            detached: false
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

// Tests
describe('Tests des opérations de ventes', () => {
    // Avant tous les tests
    beforeAll(async () => {
        // Créer le fichier de test
        createTestFile();
        
        // Démarrer le serveur
        await startServer();
        
        // Se connecter pour obtenir le cookie d'authentification
        const isLoggedIn = await login();
        if (!isLoggedIn) {
            throw new Error('Impossible de se connecter après plusieurs tentatives');
        }
    }, 30000); // Timeout de 30 secondes

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

    // Avant chaque test
    beforeEach(async () => {
        // Recréer le fichier de test avant chaque test
        createTestFile();
        // Pause pour s'assurer que le fichier est bien écrit
        await new Promise(resolve => setTimeout(resolve, 500));
    });

    // Définir les cas de test
    const casTests = [
        {
            description: "Ajouter et supprimer Boeuf en details",
            vente: {
                mois: "avril",
                date: "03-04-25",
                semaine: "S1",
                pointVente: "Mbao",
                preparation: "Mbao",
                categorie: "Bovin",
                produit: "Boeuf en details",
                prixUnit: "3600",
                quantite: "2",
                total: "7200"
            },
            venteId: "4390"
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
                prixUnit: "3400",
                quantite: "20",
                total: "68000"
            },
            venteId: "4391"
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
                prixUnit: "4000",
                quantite: "2.3",
                total: "9200"
            },
            venteId: "4392"
        },
        {
            description: "Ajouter et supprimer Poulet en detail",
            vente: {
                mois: "avril",
                date: "03-04-25",
                semaine: "S1",
                pointVente: "Mbao",
                preparation: "Mbao",
                categorie: "Volaille",
                produit: "Poulet en detail",
                prixUnit: "3500",
                quantite: "100",
                total: "350000"
            },
            venteId: "4393"
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
                prixUnit: "100000",
                quantite: "1",
                total: "100000"
            },
            venteId: "4394"
        },
        {
            description: "Ajouter et supprimer Veau en details",
            vente: {
                mois: "avril",
                date: "03-04-25",
                semaine: "S1",
                pointVente: "Mbao",
                preparation: "Mbao",
                categorie: "Bovin",
                produit: "Veau en details",
                prixUnit: "4000",
                quantite: "5",
                total: "20000"
            },
            venteId: "4395"
        }
    ];

    // Exécuter chaque cas de test
    casTests.forEach(({ description, vente, venteId }) => {
        test(`${description} - Ajout et Suppression`, async () => {
            try {
                console.log(`Test d'ajout pour: ${description}`);
                
                // 1. Ajouter une nouvelle vente
                const responseAjout = await fetch(`${API_URL}/ventes`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cookie': authCookie
                    },
                    body: JSON.stringify([vente])
                });

                const dataAjout = await responseAjout.json();
                console.log(`Réponse de l'ajout:`, dataAjout);
                
                expect(responseAjout.ok).toBe(true);
                expect(dataAjout.success).toBe(true);
                expect(dataAjout.dernieresVentes).toBeDefined();

                // Get the ID of the newly added sale (it will be the last one in dernieresVentes)
                const newSaleId = dataAjout.dernieresVentes[dataAjout.dernieresVentes.length - 1].id;

                // Attendre un peu pour s'assurer que la vente est bien enregistrée
                await new Promise(resolve => setTimeout(resolve, 1000));

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

                const dataSuppression = await responseSuppression.json();
                console.log(`Réponse de la suppression:`, dataSuppression);
                
                expect(responseSuppression.ok).toBe(true);
                expect(dataSuppression.success).toBe(true);
                expect(dataSuppression.message).toBe("Vente supprimée avec succès");
            } catch (error) {
                console.error(`Erreur lors du test de ${description}:`, error);
                throw error;
            }
        }, 15000); // Timeout de 15 secondes par test
    });
}); 