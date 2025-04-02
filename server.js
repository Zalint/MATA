const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { parse } = require('csv-parse');
const { stringify } = require('csv-stringify');
const path = require('path');
const session = require('express-session');
const users = require('./users');
const pointsVente = require('./points-vente');
const produits = require('./produits');
const bcrypt = require('bcrypt');
const fsPromises = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname))); // Servir les fichiers statiques (HTML, CSS, JS)

// Configuration des sessions
app.use(session({
    secret: 'votre_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax'
    }
}));

// Middleware de vérification d'authentification
const checkAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Non authentifié' });
    }
    req.user = req.session.user;
    next();
};

// Middleware de vérification des droits d'admin
const checkAdmin = (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }
    next();
};

// Middleware de vérification des droits de super admin
const checkSuperAdmin = (req, res, next) => {
    if (!req.user.isSuperAdmin) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }
    next();
};

// Chemin du fichier CSV
const csvFilePath = path.join(__dirname, 'ventes.csv');

// Créer le fichier CSV s'il n'existe pas
if (!fs.existsSync(csvFilePath)) {
    const headers = 'Mois;Date;Semaine;Point de Vente;Preparation;Catégorie;Produit;PU;Nombre;Montant\n';
    fs.writeFileSync(csvFilePath, headers);
}

// Chemin du fichier CSV pour le stock
const stockCsvPath = path.join(__dirname, 'stock.csv');

// Créer le fichier CSV de stock s'il n'existe pas
if (!fs.existsSync(stockCsvPath)) {
    const headers = 'Date;Type Stock;Point de Vente;Produit;Quantité;Prix Unitaire;Total;Commentaire\n';
    fs.writeFileSync(stockCsvPath, headers);
}

// Chemins des fichiers JSON pour le stock
const STOCK_MATIN_PATH = path.join(__dirname, 'data', 'stock-matin.json');
const STOCK_SOIR_PATH = path.join(__dirname, 'data', 'stock-soir.json');
const TRANSFERTS_PATH = path.join(__dirname, 'data', 'transferts.json');

// Route pour la connexion
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    console.log('Tentative de connexion reçue:', { username, password: '***' });
    
    try {
        const user = await users.verifyCredentials(username, password);
        if (!user) {
            console.log('Échec de l\'authentification pour:', username);
            return res.status(401).json({ success: false, message: 'Identifiants invalides' });
        }

        console.log('Authentification réussie pour:', username);
        req.session.user = user;
        res.json({ 
            success: true, 
            user: {
                username: user.username,
                role: user.role,
                pointVente: user.pointVente
            }
        });
    } catch (error) {
        console.error('Erreur de connexion:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la connexion' });
    }
});

// Route pour la déconnexion
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Erreur lors de la déconnexion:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la déconnexion' });
        }
        res.json({ success: true });
    });
});

// Route pour vérifier la session
app.get('/api/check-session', (req, res) => {
    console.log('Vérification de la session');
    console.log('Session actuelle:', req.session);
    
    if (req.session.user) {
        console.log('Utilisateur authentifié:', req.session.user);
        res.json({ 
            success: true, 
            user: req.session.user
        });
    } else {
        console.log('Aucun utilisateur authentifié');
        res.status(401).json({ 
            success: false, 
            message: 'Non authentifié' 
        });
    }
});

// Routes pour l'administration
app.post('/api/admin/points-vente', checkAuth, checkAdmin, (req, res) => {
    const { nom, action } = req.body;
    
    if (action === 'add') {
        if (pointsVente[nom]) {
            return res.status(400).json({ success: false, message: 'Ce point de vente existe déjà' });
        }
        pointsVente[nom] = { active: true };
    } else if (action === 'toggle') {
        if (!pointsVente[nom]) {
            return res.status(400).json({ success: false, message: 'Point de vente non trouvé' });
        }
        pointsVente[nom].active = !pointsVente[nom].active;
    }
    
    console.log('Points de vente mis à jour:', pointsVente); // Ajout d'un log pour le débogage
    res.json({ success: true, pointsVente });
});

app.post('/api/admin/prix', checkAuth, checkSuperAdmin, (req, res) => {
    const { categorie, produit, nouveauPrix } = req.body;
    
    if (!produits[categorie] || !produits[categorie][produit]) {
        return res.status(400).json({ success: false, message: 'Produit non trouvé' });
    }
    
    produits[categorie][produit] = nouveauPrix;
    res.json({ success: true, produits });
});

app.post('/api/admin/corriger-total', checkAuth, checkSuperAdmin, (req, res) => {
    const { date, pointVente, categorie, produit, nouveauTotal } = req.body;
    
    // Lire le fichier CSV
    const ventes = fs.readFileSync(csvFilePath, 'utf-8').split('\n');
    
    // Trouver et modifier la ligne correspondante
    const ligneIndex = ventes.findIndex(ligne => {
        const [ligneDate, lignePointVente, ligneCategorie, ligneProduit] = ligne.split(',');
        return ligneDate === date && 
               lignePointVente === pointVente && 
               ligneCategorie === categorie && 
               ligneProduit === produit;
    });
    
    if (ligneIndex === -1) {
        return res.status(400).json({ success: false, message: 'Vente non trouvée' });
    }
    
    const colonnes = ventes[ligneIndex].split(',');
    colonnes[4] = nouveauTotal; // Le total est dans la 5ème colonne
    ventes[ligneIndex] = colonnes.join(',');
    
    // Écrire le fichier CSV mis à jour
    fs.writeFileSync(csvFilePath, ventes.join('\n'));
    
    res.json({ success: true });
});

// Route pour obtenir les points de vente
app.get('/api/admin/points-vente', checkAuth, checkAdmin, (req, res) => {
    console.log('Points de vente demandés:', pointsVente); // Ajout d'un log pour le débogage
    res.json({ success: true, pointsVente });
});

// Route pour obtenir la base de données des produits
app.get('/api/admin/produits', checkAuth, checkAdmin, (req, res) => {
    res.json({ success: true, produits });
});

// Route pour ajouter des ventes
app.post('/api/ventes', checkAuth, (req, res) => {
    const entries = req.body;
    
    // Vérifier si le point de vente est actif
    entries.forEach(entry => {
        if (!pointsVente[entry.pointVente]?.active) {
            return res.status(400).json({ 
                success: false, 
                message: `Le point de vente ${entry.pointVente} est désactivé` 
            });
        }
    });
    
    // Lire le fichier existant pour obtenir le dernier ID
    let lastId = 0;
    if (fs.existsSync(csvFilePath)) {
        const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
        const lines = fileContent.split('\n').filter(line => line.trim());
        if (lines.length > 1) { // Si le fichier contient des données
            const lastLine = lines[lines.length - 1];
            const lastIdStr = lastLine.split(';')[0];
            lastId = parseInt(lastIdStr) || 0;
        }
    }
    
    // Créer le contenu CSV
    let csvContent = '';
    entries.forEach(entry => {
        lastId++; // Incrémenter l'ID pour chaque nouvelle entrée
        const ligne = [
            lastId,
            entry.mois,
            entry.date,
            entry.semaine,
            entry.pointVente,
            entry.preparation || entry.pointVente,
            entry.categorie,
            entry.produit,
            entry.prixUnit,
            entry.quantite,
            entry.total
        ];
        csvContent += ligne.join(';') + '\n';
    });
    
    // Ajouter les nouvelles entrées au fichier CSV
    fs.appendFileSync(csvFilePath, csvContent);
    
    // Retourner les dernières ventes
    const results = [];
    fs.createReadStream(csvFilePath)
        .pipe(parse({ 
            delimiter: ';', 
            columns: true, 
            skip_empty_lines: true,
            relaxColumnCount: true
        }))
        .on('data', (row) => {
            const normalizedRow = {
                id: row.ID,
                Mois: row.Mois,
                Date: row.Date,
                Semaine: row.Semaine,
                'Point de Vente': row['Point de Vente'],
                Preparation: row.Preparation || row['Point de Vente'],
                Catégorie: row.Catégorie,
                Produit: row.Produit,
                PU: row.PU,
                Nombre: row.Nombre || '0',
                Montant: row.Montant || row.Total || '0'
            };
            results.push(normalizedRow);
        })
        .on('end', () => {
            const dernieresVentes = results.slice(-10);
            res.json({ success: true, dernieresVentes });
        })
        .on('error', (error) => {
            console.error('Erreur lors de la lecture du CSV:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Erreur lors de la lecture des ventes' 
            });
        });
});

// Route pour mettre à jour une vente
app.put('/api/ventes/:id', checkAuth, async (req, res) => {
    try {
        const venteId = req.params.id;
        const updatedVente = req.body;
        
        // Vérifier si le point de vente est actif
        if (!pointsVente[updatedVente.pointVente]?.active) {
            return res.status(400).json({ 
                success: false, 
                message: `Le point de vente ${updatedVente.pointVente} est désactivé` 
            });
        }

        // Lire tout le fichier CSV
        const ventes = [];
        let venteIndex = -1;

        await new Promise((resolve, reject) => {
            fs.createReadStream(csvFilePath)
                .pipe(parse({ 
                    delimiter: ';', 
                    columns: true, 
                    skip_empty_lines: true,
                    relaxColumnCount: true
                }))
                .on('data', (row) => {
                    if (row.ID === venteId) {
                        venteIndex = ventes.length;
                    }
                    ventes.push(row);
                })
                .on('end', resolve)
                .on('error', reject);
        });

        if (venteIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'Vente non trouvée' 
            });
        }

        // Mettre à jour la vente
        ventes[venteIndex] = {
            ID: venteId,
            Mois: updatedVente.mois,
            Date: updatedVente.date,
            Semaine: updatedVente.semaine,
            'Point de Vente': updatedVente.pointVente,
            Preparation: updatedVente.preparation || updatedVente.pointVente,
            Catégorie: updatedVente.categorie,
            Produit: updatedVente.produit,
            PU: updatedVente.prixUnit,
            Nombre: updatedVente.quantite,
            Montant: updatedVente.total
        };

        // Réécrire le fichier CSV
        const csvContent = ventes.map(vente => {
            return [
                vente.ID,
                vente.Mois,
                vente.Date,
                vente.Semaine,
                vente['Point de Vente'],
                vente.Preparation,
                vente.Catégorie,
                vente.Produit,
                vente.PU,
                vente.Nombre,
                vente.Montant
            ].join(';');
        }).join('\n') + '\n';

        fs.writeFileSync(csvFilePath, csvContent);

        // Retourner les 10 dernières ventes pour mise à jour de l'affichage
        const dernieresVentes = ventes.slice(-10).map(vente => ({
            id: vente.ID,
            Mois: vente.Mois,
            Date: vente.Date,
            Semaine: vente.Semaine,
            'Point de Vente': vente['Point de Vente'],
            Preparation: vente.Preparation,
            Catégorie: vente.Catégorie,
            Produit: vente.Produit,
            PU: vente.PU,
            Nombre: vente.Nombre,
            Montant: vente.Montant
        }));

        res.json({ 
            success: true, 
            message: 'Vente mise à jour avec succès',
            dernieresVentes 
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour de la vente:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la mise à jour de la vente' 
        });
    }
});

// Route pour obtenir les ventes avec filtres
app.get('/api/ventes', checkAuth, (req, res) => {
    try {
        const { dateDebut, dateFin, pointVente } = req.query;
        
        console.log('Paramètres reçus:', { dateDebut, dateFin, pointVente });
        
        // Lire le fichier CSV avec le parser CSV
        const results = [];
        fs.createReadStream('ventes.csv')
            .pipe(parse({ 
                delimiter: ';', 
                columns: true, 
                skip_empty_lines: true,
                relaxColumnCount: true
            }))
            .on('data', (row) => {
                // Normaliser les données
                const normalizedRow = {
                    Mois: row.Mois,
                    Date: row.Date,
                    Semaine: row.Semaine,
                    'Point de Vente': row['Point de Vente'],
                    Preparation: row.Preparation || row['Point de Vente'],
                    Catégorie: row.Catégorie,
                    Produit: row.Produit,
                    PU: row.PU,
                    Nombre: row.Nombre || '0',
                    Montant: row.Montant || row.Total || '0'
                };
                results.push(normalizedRow);
            })
            .on('end', () => {
                console.log('Nombre total de ventes lues:', results.length);
                console.log('Premières ventes:', results.slice(0, 3));
                
                // Filtrer les ventes selon les critères
                let ventesFiltrees = results;
                
                if (dateDebut) {
                    console.log('Filtrage par date de début:', dateDebut);
                    const debut = new Date(dateDebut);
                    console.log('Date de début convertie:', debut);
                    
                    ventesFiltrees = ventesFiltrees.filter(vente => {
                        const [jourVente, moisVente, anneeVente] = vente.Date.split('-');
                        // S'assurer que l'année est au format 4 chiffres
                        console.log('Date structure');
                        console.log(vente.Date);
                        const annee = anneeVente.length === 2 ? '20' + anneeVente : anneeVente;
                        const dateVente = new Date(annee, moisVente - 1, jourVente);
                        console.log('Comparaison:', {
                            dateVente: dateVente.toISOString(),
                            debut: debut.toISOString(),
                            estInclus: dateVente >= debut
                        });
                        return dateVente >= debut;
                    });
                }
                
                if (dateFin) {
                    console.log('Filtrage par date de fin:', dateFin);
                    const fin = new Date(dateFin);
                    console.log('Date de fin convertie:', fin);
                    
                    ventesFiltrees = ventesFiltrees.filter(vente => {
                        const [jourVente, moisVente, anneeVente] = vente.Date.split('-');
                        console.log('Date structure');
                        console.log(vente.Date);
                        // S'assurer que l'année est au format 4 chiffres
                        const annee = anneeVente.length === 2 ? '20' + anneeVente : anneeVente;
                        const dateVente = new Date(annee, moisVente - 1, jourVente);
                        console.log('Comparaison:', {
                            dateVente: dateVente.toISOString(),
                            fin: fin.toISOString(),
                            estInclus: dateVente <= fin
                        });
                        return dateVente <= fin;
                    });
                }
                
                // Filtrer selon le point de vente si l'utilisateur n'a pas accès à tous
                if (req.session.user.pointVente !== "tous") {
                    ventesFiltrees = ventesFiltrees.filter(vente => 
                        vente['Point de Vente'] === req.session.user.pointVente
                    );
                } else if (pointVente && pointVente !== 'tous') {
                    ventesFiltrees = ventesFiltrees.filter(vente => 
                        vente['Point de Vente'] === pointVente
                    );
                }
                
                // Trier par date décroissante
                ventesFiltrees.sort((a, b) => {
                    const [jourA, moisA, anneeA] = a.Date.split('-');
                    const [jourB, moisB, anneeB] = b.Date.split('-');
                    // S'assurer que les années sont au format 4 chiffres
                    const anneeA4 = anneeA.length === 2 ? '20' + anneeA : anneeA;
                    const anneeB4 = anneeB.length === 2 ? '20' + anneeB : anneeB;
                    const dateA = new Date(anneeA4, moisA - 1, jourA);
                    const dateB = new Date(anneeB4, moisB - 1, jourB);
                    return dateB - dateA;
                });
                
                console.log('Nombre de ventes filtrées:', ventesFiltrees.length);
                console.log('Dates des ventes filtrées:', ventesFiltrees.map(v => v.Date));
                
                res.json({ success: true, ventes: ventesFiltrees });
            })
            .on('error', (error) => {
                console.error('Erreur lors de la lecture du CSV:', error);
                res.status(500).json({ success: false, message: 'Erreur lors de la lecture des ventes' });
            });
    } catch (error) {
        console.error('Erreur lors de la lecture des ventes:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la lecture des ventes' });
    }
});

// Route pour récupérer les dernières ventes
app.get('/api/dernieres-ventes', checkAuth, (req, res) => {
    const results = [];
    let lineCount = 0;
    
    fs.createReadStream(csvFilePath)
        .pipe(parse({ 
            delimiter: ';', 
            columns: true, 
            skip_empty_lines: true,
            relaxColumnCount: true // Permet des différences dans le nombre de colonnes
        }))
        .on('data', (row) => {
            lineCount++;
            // Normaliser les données
            const normalizedRow = {
                id: lineCount, // Ajouter l'ID basé sur le numéro de ligne
                Mois: row.Mois,
                Date: row.Date,
                Semaine: row.Semaine,
                'Point de Vente': row['Point de Vente'],
                Preparation: row.Preparation || row['Point de Vente'], // Utiliser Point de Vente si Preparation n'existe pas
                Catégorie: row.Catégorie,
                Produit: row.Produit,
                PU: row.PU,
                Nombre: row.Nombre || '0',
                Montant: row.Montant || row.Total || '0' // Utiliser Total si Montant n'existe pas
            };
            results.push(normalizedRow);
        })
        .on('end', () => {
            // Retourner les 10 dernières entrées
            const dernieresVentes = results.slice(-10);
            res.json({ success: true, dernieresVentes });
        })
        .on('error', (error) => {
            console.error('Erreur lors de la lecture du CSV:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Erreur lors de la lecture des ventes' 
            });
        });
});

// Route pour la redirection après connexion
app.get('/redirect', (req, res) => {
    console.log('Redirection demandée, session:', req.session);
    if (req.session.user) {
        if (req.session.user.isSuperAdmin) {
            res.sendFile(path.join(__dirname, 'admin.html'));
        } else {
            res.sendFile(path.join(__dirname, 'index.html'));
        }
    } else {
        console.log('Pas de session utilisateur, redirection vers login');
        res.redirect('/login.html');
    }
});

// Route pour la page de connexion
app.get('/login.html', (req, res) => {
    console.log('Accès à login.html, session:', req.session);
    if (req.session.user) {
        res.redirect('/redirect');
    } else {
        res.sendFile(path.join(__dirname, 'login.html'));
    }
});

// Route pour l'importation des ventes
app.post('/api/import-ventes', checkAuth, (req, res) => {
    // Vérifier les droits d'accès
    if (req.user.username !== 'SALIOU' && !req.user.isSuperAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Accès non autorisé à l\'importation'
        });
    }

    const entries = req.body;
    
    // Vérifier que les données sont valides
    if (!Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Données invalides'
        });
    }

    try {
        // Lire le contenu actuel du fichier
        let existingContent = '';
        if (fs.existsSync(csvFilePath)) {
            existingContent = fs.readFileSync(csvFilePath, 'utf-8');
            
            // Si le fichier existe mais est vide ou n'a pas d'en-têtes
            if (!existingContent.trim()) {
                existingContent = 'Mois;Date;Semaine;Point de Vente;Preparation;Catégorie;Produit;PU;Nombre;Montant\n';
            }
            // Si l'ancien format est utilisé (9 colonnes), migrer vers le nouveau format
            else if (!existingContent.includes('Preparation')) {
                const lines = existingContent.split('\n');
                const newLines = lines.map((line, index) => {
                    if (index === 0) {
                        // Remplacer l'en-tête
                        return 'Mois;Date;Semaine;Point de Vente;Preparation;Catégorie;Produit;PU;Nombre;Montant';
                    }
                    if (line.trim()) {
                        // Pour les lignes de données, insérer la colonne Preparation
                        const cols = line.split(';');
                        cols.splice(4, 0, cols[3]); // Copier Point de Vente comme valeur de Preparation
                        return cols.join(';');
                    }
                    return line;
                });
                existingContent = newLines.join('\n') + '\n';
                fs.writeFileSync(csvFilePath, existingContent);
            }
        } else {
            existingContent = 'Mois;Date;Semaine;Point de Vente;Preparation;Catégorie;Produit;PU;Nombre;Montant\n';
            fs.writeFileSync(csvFilePath, existingContent);
        }

        // Créer le contenu CSV pour les nouvelles entrées
        let csvContent = '';
        entries.forEach(entry => {
            // Vérifier que toutes les propriétés requises sont présentes
            if (!entry.mois || !entry.date || !entry.pointVente || !entry.categorie || !entry.produit) {
                throw new Error('Données manquantes dans une ou plusieurs lignes');
            }

            // Vérifier que le point de vente existe
            if (!pointsVente[entry.pointVente]) {
                throw new Error(`Le point de vente "${entry.pointVente}" n'existe pas`);
            }

            // S'assurer que toutes les valeurs sont définies, même si vides
            const ligne = [
                entry.mois || '',
                entry.date || '',
                entry.semaine || '',
                entry.pointVente || '',
                entry.preparation || entry.pointVente || '', // Utiliser le point de vente si preparation n'est pas défini
                entry.categorie || '',
                entry.produit || '',
                entry.prixUnit || '0',
                entry.quantite || '0',
                entry.total || '0'
            ];

            csvContent += ligne.join(';') + '\n';
        });

        // Ajouter les nouvelles entrées au fichier CSV
        fs.appendFileSync(csvFilePath, csvContent);

        // Retourner les dernières ventes pour mise à jour de l'affichage
        const results = [];
        fs.createReadStream(csvFilePath)
            .pipe(parse({ 
                delimiter: ';', 
                columns: true, 
                skip_empty_lines: true,
                relaxColumnCount: true
            }))
            .on('data', (row) => {
                results.push(row);
            })
            .on('end', () => {
                // Retourner les 10 dernières entrées
                const dernieresVentes = results.slice(-10);
                res.json({ 
                    success: true, 
                    message: 'Données importées avec succès',
                    dernieresVentes
                });
            })
            .on('error', (error) => {
                console.error('Erreur lors de la lecture du CSV:', error);
                throw error;
            });
    } catch (error) {
        console.error('Erreur lors de l\'importation:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur lors de l\'importation des données'
        });
    }
});

// Route pour vider la base de données des ventes
app.post('/api/vider-base', (req, res) => {
    try {
        // Vérifier si l'utilisateur est SALIOU
        if (!req.session.user || req.session.user.username !== 'SALIOU') {
            return res.status(403).json({ success: false, message: 'Accès non autorisé' });
        }

        // Écrire uniquement l'en-tête dans le fichier CSV
        const headers = 'ID;Mois;Date;Semaine;Point de Vente;Preparation;Catégorie;Produit;PU;Nombre;Montant\n';
        fs.writeFileSync('ventes.csv', headers);
        
        res.json({ success: true, message: 'Base de données vidée avec succès' });
    } catch (error) {
        console.error('Erreur lors du vidage de la base:', error);
        res.status(500).json({ success: false, message: 'Erreur lors du vidage de la base de données' });
    }
});

// Route pour charger les données de stock
app.get('/api/stock/:type', async (req, res) => {
    try {
        const type = req.params.type;
        const filePath = type === 'matin' ? STOCK_MATIN_PATH : STOCK_SOIR_PATH;
        
        const data = await fsPromises.readFile(filePath, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        res.status(500).json({ error: 'Erreur lors du chargement des données' });
    }
});

// Route pour sauvegarder les données de stock
app.post('/api/stock/:type', async (req, res) => {
    try {
        const type = req.params.type;
        const filePath = type === 'matin' ? STOCK_MATIN_PATH : STOCK_SOIR_PATH;
        
        await fsPromises.writeFile(filePath, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des données:', error);
        res.status(500).json({ error: 'Erreur lors de la sauvegarde des données' });
    }
});

// Route pour sauvegarder les transferts
app.post('/api/transferts', async (req, res) => {
    try {
        const transferts = req.body;
        await fs.promises.writeFile(TRANSFERTS_PATH, JSON.stringify(transferts, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des transferts:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la sauvegarde des transferts' });
    }
});

// Route pour récupérer les transferts
app.get('/api/transferts', checkAuth, async (req, res) => {
    try {
        const { date } = req.query;
        
        // Charger les transferts
        let transferts = {};
        if (fs.existsSync(TRANSFERTS_PATH)) {
            const content = await fsPromises.readFile(TRANSFERTS_PATH, 'utf8');
            transferts = JSON.parse(content || '{}');
        }
        
        // Si une date est spécifiée, retourner uniquement les transferts de cette date
        if (date) {
            res.json({ 
                success: true, 
                transferts: transferts[date] || [] 
            });
        } else {
            // Sinon retourner tous les transferts
            res.json({ 
                success: true, 
                transferts: transferts 
            });
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des transferts:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la récupération des transferts',
            error: error.message 
        });
    }
});

// Route pour supprimer un transfert
app.delete('/api/transferts', checkAuth, async (req, res) => {
    try {
        const transfertData = req.body;
        console.log('Données de suppression du transfert reçues:', transfertData);
        
        // Vérifier que toutes les données nécessaires sont présentes
        if (!transfertData.date || !transfertData.pointVente || !transfertData.produit) {
            return res.status(400).json({
                success: false,
                message: 'Données insuffisantes pour identifier le transfert à supprimer'
            });
        }

        // Charger les transferts existants
        let transferts = [];
        if (fs.existsSync(TRANSFERTS_PATH)) {
            const content = await fsPromises.readFile(TRANSFERTS_PATH, 'utf8');
            transferts = JSON.parse(content || '[]');
        }

        // Rechercher l'index du transfert à supprimer
        const indexToRemove = transferts.findIndex(t => 
            t.date === transfertData.date && 
            t.pointVente === transfertData.pointVente && 
            t.produit === transfertData.produit &&
            t.impact === transfertData.impact &&
            t.quantite === transfertData.quantite &&
            t.prixUnitaire === transfertData.prixUnitaire
        );

        if (indexToRemove === -1) {
            return res.status(404).json({
                success: false,
                message: 'Transfert non trouvé'
            });
        }

        // Supprimer le transfert
        transferts.splice(indexToRemove, 1);

        // Sauvegarder les transferts mis à jour
        await fsPromises.writeFile(TRANSFERTS_PATH, JSON.stringify(transferts, null, 2));

        res.json({
            success: true,
            message: 'Transfert supprimé avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression du transfert:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression du transfert',
            error: error.message
        });
    }
});

// Route pour supprimer une vente
app.delete('/api/ventes/:id', checkAuth, async (req, res) => {
    try {
        const venteId = req.params.id;
        const pointVente = req.query.pointVente;

        console.log(`Tentative de suppression de la vente ID: ${venteId}, Point de vente: ${pointVente}`);

        // Vérifier si l'utilisateur a accès au point de vente
        if (req.session.user.pointVente !== "tous" && req.session.user.pointVente !== pointVente) {
            return res.status(403).json({ 
                success: false, 
                message: "Accès non autorisé à ce point de vente" 
            });
        }

        // Lire le fichier CSV
        const fileContent = await fsPromises.readFile(csvFilePath, 'utf-8');
        const lines = fileContent.split('\n');
        
        // Conserver l'en-tête
        const header = lines[0];
        let found = false;
        
        // Filtrer les lignes pour supprimer celle avec l'ID correspondant
        const newLines = [header];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Extraire l'ID de la ligne
            const lineId = line.split(';')[0];
            
            // Si ce n'est pas la ligne à supprimer, la conserver
            if (lineId !== venteId) {
                newLines.push(line);
            } else {
                found = true;
                console.log(`Ligne avec ID ${venteId} supprimée`);
            }
        }

        if (!found) {
            return res.status(404).json({ 
                success: false, 
                message: "Vente non trouvée" 
            });
        }

        // Écrire le fichier mis à jour
        await fsPromises.writeFile(csvFilePath, newLines.join('\n'));

        console.log(`Vente ID: ${venteId} supprimée avec succès`);
        
        res.json({ 
            success: true, 
            message: "Vente supprimée avec succès" 
        });
    } catch (error) {
        console.error('Erreur lors de la suppression de la vente:', error);
        res.status(500).json({ 
            success: false, 
            message: "Erreur lors de la suppression de la vente: " + error.message 
        });
    }
});

// Fonction d'aide pour traiter les lignes CSV et attribuer des IDs uniques aux ventes
async function loadVentesWithIds() {
  try {
    const fileContent = await fsPromises.readFile(csvFilePath, 'utf-8');
    const lines = fileContent.split('\n');
    
    // Ignorer l'en-tête et les lignes vides
    const dataLines = lines.slice(1).filter(line => line.trim());
    
    // Convertir chaque ligne en objet avec un ID correspondant à sa position
    const ventes = dataLines.map((line, index) => {
      const columns = line.split(';');
      
      // S'assurer que toutes les colonnes existent
      while (columns.length < 10) {
        columns.push('');
      }
      
      return {
        id: index + 1, // L'ID correspond à la position (ligne 1 = ID 1)
        Mois: columns[0],
        Date: columns[1],
        Semaine: columns[2],
        'Point de Vente': columns[3],
        Preparation: columns[4],
        Catégorie: columns[5],
        Produit: columns[6],
        PU: columns[7],
        Nombre: columns[8] || '0',
        Montant: columns[9] || '0'
      };
    });
    
    return ventes;
  } catch (error) {
    console.error('Erreur lors du chargement des ventes:', error);
    throw error;
  }
}

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});