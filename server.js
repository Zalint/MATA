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

// Créer le fichier CSV avec les en-têtes seulement s'il n'existe pas
if (!fs.existsSync(csvFilePath)) {
    const headers = 'ID;Mois;Date;Semaine;Point de Vente;Preparation;Catégorie;Produit;PU;Nombre;Montant\n';
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

// Fonction pour obtenir le chemin du fichier en fonction de la date
function getPathByDate(baseFile, date) {
    // Vérifier si une date est fournie
    if (!date) {
        return baseFile; // Retourne le chemin par défaut si pas de date
    }
    
    // Convertir la date au format YYYY-MM-DD pour le système de fichiers
    let formattedDate;
    if (date.includes('/')) {
        // Format DD/MM/YYYY
        const [day, month, year] = date.split('/');
        formattedDate = `${year}-${month}-${day}`;
    } else if (date.includes('-')) {
        // Format DD-MM-YY
        const [day, month, year] = date.split('-');
        // Convertir l'année à 2 chiffres en 4 chiffres
        const fullYear = year.length === 2 ? `20${year}` : year;
        formattedDate = `${fullYear}-${month}-${day}`;
    } else {
        // Format non reconnu, utiliser la date telle quelle
        formattedDate = date;
    }
    
    // Extraire le répertoire et le nom de fichier de base
    const dir = path.dirname(baseFile);
    const fileName = path.basename(baseFile);
    
    // Créer le chemin pour la date spécifique
    const dateDir = path.join(dir, 'by-date', formattedDate);
    
    // S'assurer que le répertoire existe
    if (!fs.existsSync(dateDir)) {
        fs.mkdirSync(dateDir, { recursive: true });
    }
    
    return path.join(dateDir, fileName);
}

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
        // S'assurer qu'il y a une nouvelle ligne avant et après chaque entrée
        csvContent += (csvContent ? '\n' : '') + ligne.join(';');
    });
    
    // Ajouter les nouvelles entrées au fichier CSV avec une nouvelle ligne à la fin
    fs.appendFileSync(csvFilePath, '\n' + csvContent + '\n');
    
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

        // Réécrire le fichier CSV avec les en-têtes
        const headers = 'ID;Mois;Date;Semaine;Point de Vente;Preparation;Catégorie;Produit;PU;Nombre;Montant';
        const csvContent = headers + '\n' + ventes.map(vente => {
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
                        // Gérer les deux formats de date (avec "/" et "-")
                        let jourVente, moisVente, anneeVente;
                        if (vente.Date.includes('/')) {
                            [jourVente, moisVente, anneeVente] = vente.Date.split('/');
                        } else if (vente.Date.includes('-')) {
                            [jourVente, moisVente, anneeVente] = vente.Date.split('-');
                        } else {
                            console.error(`Format de date invalide pour la vente: ${vente.Date}`);
                            return false;
                        }

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
                        // Gérer les deux formats de date (avec "/" et "-")
                        let jourVente, moisVente, anneeVente;
                        if (vente.Date.includes('/')) {
                            [jourVente, moisVente, anneeVente] = vente.Date.split('/');
                        } else if (vente.Date.includes('-')) {
                            [jourVente, moisVente, anneeVente] = vente.Date.split('-');
                        } else {
                            console.error(`Format de date invalide pour la vente: ${vente.Date}`);
                            return false;
                        }

                        // S'assurer que l'année est au format 4 chiffres
                        console.log('Date structure');
                        console.log(vente.Date);
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
                    // Gérer les deux formats de date (avec "/" et "-")
                    let jourA, moisA, anneeA, jourB, moisB, anneeB;
                    
                    if (a.Date.includes('/')) {
                        [jourA, moisA, anneeA] = a.Date.split('/');
                    } else if (a.Date.includes('-')) {
                        [jourA, moisA, anneeA] = a.Date.split('-');
                    } else {
                        console.error(`Format de date invalide pour la vente A: ${a.Date}`);
                        return 0;
                    }

                    if (b.Date.includes('/')) {
                        [jourB, moisB, anneeB] = b.Date.split('/');
                    } else if (b.Date.includes('-')) {
                        [jourB, moisB, anneeB] = b.Date.split('-');
                    } else {
                        console.error(`Format de date invalide pour la vente B: ${b.Date}`);
                        return 0;
                    }

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
        const date = req.query.date;
        const baseFilePath = type === 'matin' ? STOCK_MATIN_PATH : STOCK_SOIR_PATH;
        
        // Obtenir le chemin du fichier spécifique à la date
        const filePath = getPathByDate(baseFilePath, date);
        
        // Vérifier si le fichier existe
        if (!fs.existsSync(filePath)) {
            // Si le fichier spécifique à la date n'existe pas, vérifier le fichier par défaut
            if (date && fs.existsSync(baseFilePath)) {
                // Retourner les données du fichier par défaut comme fallback
                const defaultData = await fsPromises.readFile(baseFilePath, 'utf8');
                return res.json(JSON.parse(defaultData));
            }
            // Si aucun fichier n'existe, retourner un objet vide
            return res.json({});
        }
        
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
        const date = req.body && Object.values(req.body)[0] ? Object.values(req.body)[0].date : null;
        
        if (!date) {
            return res.status(400).json({ 
                success: false,
                error: 'La date est requise pour sauvegarder les données de stock' 
            });
        }
        
        const baseFilePath = type === 'matin' ? STOCK_MATIN_PATH : STOCK_SOIR_PATH;
        
        // Obtenir le chemin du fichier spécifique à la date
        const filePath = getPathByDate(baseFilePath, date);
        
        // Sauvegarder les données dans le fichier spécifique à la date
        await fsPromises.writeFile(filePath, JSON.stringify(req.body, null, 2));
        
        // Conserver également une copie dans le fichier principal pour la compatibilité
        await fsPromises.writeFile(baseFilePath, JSON.stringify(req.body, null, 2));
        
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
        
        // Vérifier si des transferts sont fournis
        if (!Array.isArray(transferts) || transferts.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Aucun transfert à sauvegarder' 
            });
        }
        
        // Grouper les transferts par date
        const transfertsByDate = {};
        
        transferts.forEach(transfert => {
            if (!transfert.date) {
                throw new Error('Date manquante pour un transfert');
            }
            
            if (!transfertsByDate[transfert.date]) {
                transfertsByDate[transfert.date] = [];
            }
            
            transfertsByDate[transfert.date].push(transfert);
        });
        
        // Sauvegarder chaque groupe de transferts dans un fichier spécifique à sa date
        for (const [date, dateTransferts] of Object.entries(transfertsByDate)) {
            const filePath = getPathByDate(TRANSFERTS_PATH, date);
            
            // Remplacer complètement les transferts existants pour cette date
            await fs.promises.writeFile(filePath, JSON.stringify(dateTransferts, null, 2));
            console.log(`Transferts sauvegardés pour la date ${date}: ${dateTransferts.length} transferts`);
        }
        
        // Mettre à jour le fichier principal avec tous les transferts
        // Lire tous les transferts de toutes les dates
        let allTransferts = [];
        
        // Parcourir tous les fichiers de transferts spécifiques à une date
        const dateDirs = await fsPromises.readdir(path.join(__dirname, 'data', 'by-date'), { withFileTypes: true });
        for (const dateDir of dateDirs) {
            if (dateDir.isDirectory()) {
                const datePath = path.join(__dirname, 'data', 'by-date', dateDir.name, 'transferts.json');
                if (fs.existsSync(datePath)) {
                    const content = await fsPromises.readFile(datePath, 'utf8');
                    const dateTransferts = JSON.parse(content || '[]');
                    allTransferts = [...allTransferts, ...dateTransferts];
                }
            }
        }
        
        // Sauvegarder dans le fichier principal
        await fs.promises.writeFile(TRANSFERTS_PATH, JSON.stringify(allTransferts, null, 2));
        console.log(`Fichier principal de transferts mis à jour: ${allTransferts.length} transferts au total`);
        
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
        
        if (date) {
            // Obtenir le chemin du fichier spécifique à la date
            const filePath = getPathByDate(TRANSFERTS_PATH, date);
            
            // Vérifier si le fichier spécifique existe
            if (fs.existsSync(filePath)) {
                const content = await fsPromises.readFile(filePath, 'utf8');
                const transferts = JSON.parse(content || '[]');
                return res.json({ success: true, transferts });
            }
            
            // Si le fichier spécifique n'existe pas, chercher dans le fichier principal
            if (fs.existsSync(TRANSFERTS_PATH)) {
                const content = await fsPromises.readFile(TRANSFERTS_PATH, 'utf8');
                const allTransferts = JSON.parse(content || '[]');
                // Filtrer les transferts par date
                const transferts = allTransferts.filter(t => t.date === date);
                return res.json({ success: true, transferts });
            }
            
            // Si aucun fichier n'existe, retourner un tableau vide
            return res.json({ success: true, transferts: [] });
        } else {
            // Retourner tous les transferts depuis le fichier principal
            if (fs.existsSync(TRANSFERTS_PATH)) {
                const content = await fsPromises.readFile(TRANSFERTS_PATH, 'utf8');
                const transferts = JSON.parse(content || '[]');
                return res.json({ success: true, transferts });
            }
            
            // Si le fichier n'existe pas, retourner un tableau vide
            return res.json({ success: true, transferts: [] });
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

        // Obtenir le chemin du fichier spécifique à la date
        const dateFilePath = getPathByDate(TRANSFERTS_PATH, transfertData.date);
        
        // Tableau pour stocker les transferts mis à jour
        let dateTransferts = [];
        let indexToRemove = -1;
        
        // Mise à jour du fichier spécifique à la date s'il existe
        if (fs.existsSync(dateFilePath)) {
            const content = await fsPromises.readFile(dateFilePath, 'utf8');
            dateTransferts = JSON.parse(content || '[]');
            
            // Rechercher l'index du transfert à supprimer
            indexToRemove = dateTransferts.findIndex(t => 
                t.pointVente === transfertData.pointVente && 
                t.produit === transfertData.produit &&
                t.impact === transfertData.impact &&
                parseFloat(t.quantite) === parseFloat(transfertData.quantite) &&
                parseFloat(t.prixUnitaire) === parseFloat(transfertData.prixUnitaire)
            );
            
            if (indexToRemove !== -1) {
                // Supprimer le transfert
                dateTransferts.splice(indexToRemove, 1);
                
                // Sauvegarder les transferts mis à jour
                await fsPromises.writeFile(dateFilePath, JSON.stringify(dateTransferts, null, 2));
            }
        }
        
        // Mettre également à jour le fichier principal
        let allTransferts = [];
        if (fs.existsSync(TRANSFERTS_PATH)) {
            const content = await fsPromises.readFile(TRANSFERTS_PATH, 'utf8');
            allTransferts = JSON.parse(content || '[]');
            
            // Rechercher l'index du transfert à supprimer
            indexToRemove = allTransferts.findIndex(t => 
                t.date === transfertData.date &&
                t.pointVente === transfertData.pointVente && 
                t.produit === transfertData.produit &&
                t.impact === transfertData.impact &&
                parseFloat(t.quantite) === parseFloat(transfertData.quantite) &&
                parseFloat(t.prixUnitaire) === parseFloat(transfertData.prixUnitaire)
            );
            
            if (indexToRemove !== -1) {
                // Supprimer le transfert
                allTransferts.splice(indexToRemove, 1);
                
                // Sauvegarder les transferts mis à jour
                await fsPromises.writeFile(TRANSFERTS_PATH, JSON.stringify(allTransferts, null, 2));
            } else {
                return res.status(404).json({
                    success: false,
                    message: 'Transfert non trouvé'
                });
            }
        } else {
            return res.status(404).json({
                success: false,
                message: 'Aucun transfert trouvé'
            });
        }

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