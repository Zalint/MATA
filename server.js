// Load environment variables
require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env' : '.env.local'
});

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
const produitsInventaire = require('./produitsInventaire');
const bcrypt = require('bcrypt');
const fsPromises = require('fs').promises;
const { Vente, Stock, Transfert, Reconciliation, CashPayment, AchatBoeuf } = require('./db/models');
const { testConnection, sequelize } = require('./db');
const { Op, fn, col, literal } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const Estimation = require('./db/models/Estimation');

// Import the schema update scripts
const { updateSchema } = require('./db/update-schema');
const { updateVenteSchema } = require('./db/update-vente-schema');

const app = express();
const PORT = process.env.PORT || 3000;

// Make sure Estimation is properly initialized
console.log('Initializing models...');
console.log('Estimation model:', !!Estimation);
console.log('Estimation.create:', typeof Estimation.create === 'function' ? 'function available' : 'NOT AVAILABLE');

// Run the schema update scripts when the server starts
(async function() {
  try {
    console.log('Running database schema updates...');
    await updateSchema();
    await updateVenteSchema();
    console.log('Database schema updates completed successfully');
  } catch (error) {
    console.error('Error during schema updates:', error);
  }
})();

// Middleware
// Allow all origins in production for Render
app.use(cors({
    origin: true, // Allow any origin
    credentials: true
}));
app.use(express.json({ limit: '50mb' })); // Increase JSON payload limit
app.use(express.urlencoded({ limit: '50mb', extended: true })); // Increase URL-encoded payload limit
app.use(express.static(path.join(__dirname))); // Servir les fichiers statiques (HTML, CSS, JS)

// Trust the first proxy (needed for secure cookies in environments like Render)
app.set('trust proxy', 1);

// Configuration des sessions
app.use(session({
    secret: process.env.SESSION_SECRET || 'votre_secret_key_par_defaut', // Use environment variable for secret
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax'
    }
}));

app.get('/api/points-vente', (req, res) => {
    try {
        // The `pointsVente` object is already required at the top of server.js
        const activePointsVente = Object.entries(pointsVente)
            .filter(([_, properties]) => properties.active)
            .map(([name, _]) => name);
        res.json(activePointsVente);
    } catch (error) {
        console.error("Erreur lors de la lecture des points de vente :", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});

// Route pour obtenir tous les points de vente (physiques + virtuels) pour les transferts
app.get('/api/points-vente/transferts', (req, res) => {
    try {
        // The `pointsVente` object is already required at the top of server.js
        const activePointsVente = Object.entries(pointsVente)
            .filter(([_, properties]) => properties.active)
            .map(([name, _]) => name);
        
        // Ajouter les points de vente virtuels pour les transferts
        const tousPointsVente = [
            ...activePointsVente,
            'Abattage', 'Depot', 'Gros Client'
        ];
        
        res.json(tousPointsVente);
    } catch (error) {
        console.error("Erreur lors de la lecture des points de vente pour transferts :", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});

// Importer les middlewares d'authentification
const { checkAuth, checkAdmin, checkSuperAdmin, checkReadAccess, checkWriteAccess } = require('./middlewares/auth');

// Middleware d'authentification par API key pour services externes comme Relevance AI
const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    // Vérifier l'API key (en production, utilisez une variable d'environnement)
    // À remplacer par votre propre API key
    const validApiKey = process.env.EXTERNAL_API_KEY || 'your-secure-api-key-for-relevance';
    
    if (!apiKey || apiKey !== validApiKey) {
        return res.status(401).json({ 
            success: false, 
            message: 'API key invalide ou manquante' 
        });
    }
    
    // Simuler un utilisateur avec des droits complets pour les requêtes API externes
    req.user = {
        username: 'api-client',
        role: 'api',
        pointVente: 'tous'
    };
    
    next();
};



// Chemin du fichier CSV
const csvFilePath = path.join(__dirname, 'ventes.csv');

// Créer le fichier CSV avec les en-têtes seulement s'il n'existe pas
if (!fs.existsSync(csvFilePath)) {
    const headers = 'ID;Mois;Date;Semaine;Point de Vente;Preparation;Catégorie;Produit;PU;Nombre;Montant;Nom Client;Numéro Client;Tél. Client;Adresse Client;Créance\n'; // Updated headers
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

// Constantes pour le mappage des références de paiement aux points de vente
const PAYMENT_REF_TO_PDV = {
  'V_TB': 'Touba',
  'V_DHR': 'Dahra',
  'V_ALS': 'Aliou Sow',
  'V_LGR': 'Linguere',
  'V_MBA': 'Mbao',
  'V_KM': 'Keur Massar',
  'V_OSF': 'O.Foire',
  'V_SAC': 'Sacre Coeur',
  'V_ABATS': 'Abattage'
};

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

// Fonction pour standardiser une date au format DD-MM-YYYY
function standardiserDateFormat(dateStr) {
    if (!dateStr) return '';
    
    let jour, mois, annee;
    
    // Essayer de parser différents formats
    if (dateStr.includes('/')) {
        // Format DD/MM/YYYY ou DD/MM/YY
        [jour, mois, annee] = dateStr.split('/');
    } else if (dateStr.includes('-')) {
        // Format DD-MM-YYYY, YYYY-MM-DD, ou DD-MM-YY
        const parts = dateStr.split('-');
        if (parts[0].length === 4) {
            // Format YYYY-MM-DD
            [annee, mois, jour] = parts;
        } else {
            // Format DD-MM-YYYY ou DD-MM-YY
            [jour, mois, annee] = parts;
        }
    } else {
        console.warn('Format de date non reconnu:', dateStr);
        return dateStr; // Format non reconnu, retourner tel quel
    }
    
    // S'assurer que jour et mois sont bien définis et ont 2 chiffres
    jour = jour ? jour.padStart(2, '0') : '01';
    mois = mois ? mois.padStart(2, '0') : '01';
    
    // Convertir l'année à 4 chiffres si elle est à 2 chiffres
    if (annee && annee.length === 2) {
        annee = '20' + annee;
    } else if (!annee) {
        annee = new Date().getFullYear().toString(); // Année actuelle par défaut
    }
    
    // Vérifier la validité des composants
    if (isNaN(parseInt(jour)) || isNaN(parseInt(mois)) || isNaN(parseInt(annee))) {
        console.error('Composants de date invalides après parsing:', {jour, mois, annee});
        return dateStr; // Retourner l'original si invalide
    }

    // Retourner la date au format standardisé DD-MM-YYYY
    return `${jour}-${mois}-${annee}`;
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
                pointVente: user.pointVente,
                isAdmin: user.role === 'admin',
                isLecteur: user.role === 'lecteur',
                canRead: ['lecteur', 'user', 'admin'].includes(user.role),
                canWrite: ['user', 'admin'].includes(user.role)
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
        res.json({
            success: true,
            user: {
                username: req.session.user.username,
                role: req.session.user.role,
                pointVente: req.session.user.pointVente,
                isAdmin: req.session.user.role === 'admin',
                isLecteur: req.session.user.role === 'lecteur',
                canRead: ['lecteur', 'user', 'admin'].includes(req.session.user.role),
                canWrite: ['user', 'admin'].includes(req.session.user.role)
            }
        });
    } else {
        res.json({ success: false });
    }
});

// Route pour vérifier la connexion à la base de données
app.get('/api/check-db-connection', async (req, res) => {
    try {
        console.log('Vérification de la connexion à la base de données...');
        const connected = await testConnection();
        if (connected) {
            res.json({ 
                success: true, 
                message: 'Connexion à la base de données PostgreSQL établie avec succès' 
            });
        } else {
            res.status(500).json({ 
                success: false, 
                message: 'Échec de la connexion à la base de données PostgreSQL' 
            });
        }
    } catch (error) {
        console.error('Erreur lors de la vérification de la connexion:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la vérification de la connexion à la base de données',
            error: error.message
        });
    }
});

// Route pour vérifier la santé de l'application
app.get('/api/check-health', (req, res) => {
    res.json({ success: true, message: 'Application en cours d\'exécution' });
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

// Routes pour la gestion des utilisateurs
// Obtenir tous les utilisateurs
app.get('/api/admin/users', checkAuth, checkAdmin, async (req, res) => {
    try {
        const usersList = await users.getAllUsers();
        res.json({ success: true, users: usersList });
    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération des utilisateurs' });
    }
});

// Créer un nouvel utilisateur
app.post('/api/admin/users', checkAuth, checkAdmin, async (req, res) => {
    try {
        const { username, password, role, pointVente, active } = req.body;
        
        if (!username || !password || !role || !pointVente) {
            return res.status(400).json({ success: false, message: 'Tous les champs sont obligatoires' });
        }
        
        // Vérifier que le nom d'utilisateur n'existe pas déjà
        const existingUsers = await users.getAllUsers();
        if (existingUsers.some(u => u.username === username)) {
            return res.status(400).json({ success: false, message: 'Ce nom d\'utilisateur existe déjà' });
        }
        
        const newUser = await users.createUser(username, password, role, pointVente, active);
        res.json({ success: true, user: { username: newUser.username, role: newUser.role, pointVente: newUser.pointVente, active: newUser.active } });
    } catch (error) {
        console.error('Erreur lors de la création de l\'utilisateur:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Activer/désactiver un utilisateur
app.post('/api/admin/users/:username/toggle-status', checkAuth, checkAdmin, async (req, res) => {
    try {
        const { username } = req.params;
        
        // Empêcher la désactivation de l'utilisateur ADMIN
        if (username === 'ADMIN') {
            return res.status(400).json({ success: false, message: 'Impossible de modifier le statut de l\'administrateur principal' });
        }
        
        const updatedUser = await users.toggleUserStatus(username);
        res.json({ success: true, user: { username: updatedUser.username, role: updatedUser.role, pointVente: updatedUser.pointVente, active: updatedUser.active } });
    } catch (error) {
        console.error('Erreur lors de la modification du statut:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Supprimer un utilisateur
app.delete('/api/admin/users/:username', checkAuth, checkAdmin, async (req, res) => {
    try {
        const { username } = req.params;
        
        // Empêcher la suppression de l'utilisateur ADMIN
        if (username === 'ADMIN') {
            return res.status(400).json({ success: false, message: 'Impossible de supprimer l\'administrateur principal' });
        }
        
        await users.deleteUser(username);
        res.json({ success: true, message: 'Utilisateur supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Modifier un utilisateur
app.put('/api/admin/users/:username', checkAuth, checkAdmin, async (req, res) => {
    try {
        const { username } = req.params;
        const { username: newUsername, password, role, pointVente, active } = req.body;
        
        // Empêcher la modification de l'utilisateur ADMIN
        if (username === 'ADMIN') {
            return res.status(400).json({ success: false, message: 'Impossible de modifier l\'administrateur principal' });
        }
        
        if (!newUsername || !role || !pointVente) {
            return res.status(400).json({ success: false, message: 'Tous les champs sont obligatoires' });
        }
        
        // Vérifier que le nouveau nom d'utilisateur n'existe pas déjà (sauf pour l'utilisateur actuel)
        const existingUsers = await users.getAllUsers();
        if (newUsername !== username && existingUsers.some(u => u.username === newUsername)) {
            return res.status(400).json({ success: false, message: 'Ce nom d\'utilisateur existe déjà' });
        }
        
        const updates = {
            username: newUsername,
            role,
            pointVente,
            active
        };
        
        // Ajouter le mot de passe seulement s'il est fourni
        if (password && password.trim() !== '') {
            updates.password = password;
        }
        
        await users.updateUser(username, updates);
        res.json({ success: true, message: 'Utilisateur modifié avec succès' });
    } catch (error) {
        console.error('Erreur lors de la modification:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Route pour ajouter des ventes
app.post('/api/ventes', checkAuth, checkWriteAccess, async (req, res) => {
    const entries = req.body;
    
    console.log('Tentative d\'ajout de ventes:', JSON.stringify(entries));
    
    // Vérifier si le point de vente est actif
    for (const entry of entries) {
        if (!pointsVente[entry.pointVente]?.active) {
            return res.status(400).json({ 
                success: false, 
                message: `Le point de vente ${entry.pointVente} est désactivé` 
            });
        }
        
        // Vérifier si le produit existe dans la catégorie
        if (entry.categorie && entry.produit) {
            const categorieExists = produits[entry.categorie];
            if (!categorieExists) {
                return res.status(400).json({
                    success: false,
                    message: `La catégorie "${entry.categorie}" n'existe pas`
                });
            }
            
            const produitExists = produits[entry.categorie][entry.produit] !== undefined;
            if (!produitExists) {
                return res.status(400).json({
                    success: false,
                    message: `Le produit "${entry.produit}" n'existe pas dans la catégorie "${entry.categorie}"`
                });
            }
        }
    }
    
    try {
        // Préparer les données pour l'insertion
        const ventesToInsert = entries.map(entry => {
            // Standardiser la date au format dd-mm-yyyy
            const dateStandardisee = standardiserDateFormat(entry.date);
            
            // Convertir les valeurs numériques en nombre avec une précision fixe
            const nombre = parseFloat(parseFloat(entry.quantite).toFixed(2)) || 0;
            const prixUnit = parseFloat(parseFloat(entry.prixUnit).toFixed(2)) || 0;
            const montant = parseFloat(parseFloat(entry.total).toFixed(2)) || 0;
            
            return {
                mois: entry.mois,
                date: dateStandardisee,
                semaine: entry.semaine,
                pointVente: entry.pointVente,
                preparation: entry.preparation || entry.pointVente,
                categorie: entry.categorie,
                produit: entry.produit,
                prixUnit: prixUnit,
                nombre: nombre,
                montant: montant,
                nomClient: entry.nomClient || null,
                numeroClient: entry.numeroClient || null,
                adresseClient: entry.adresseClient || null,
                creance: entry.creance || false
            };
        });
        
        console.log('Données préparées pour insertion:', JSON.stringify(ventesToInsert));
        
        // Insérer les ventes dans la base de données
        await Vente.bulkCreate(ventesToInsert);
        
        // Récupérer les 10 dernières ventes pour l'affichage
        const dernieresVentes = await Vente.findAll({
            order: [['createdAt', 'DESC']],
            limit: 10
        });
        
        // Formater les données pour la réponse
        const formattedVentes = dernieresVentes.map(vente => ({
            id: vente.id,
            Mois: vente.mois,
            Date: vente.date,
            Semaine: vente.semaine,
            'Point de Vente': vente.pointVente,
            Preparation: vente.preparation,
            Catégorie: vente.categorie,
            Produit: vente.produit,
            PU: vente.prixUnit,
            Nombre: vente.nombre,
            Montant: vente.montant,
            nomClient: vente.nomClient,
            numeroClient: vente.numeroClient,
            adresseClient: vente.adresseClient,
            creance: vente.creance
        }));
        
        res.json({ success: true, dernieresVentes: formattedVentes });
    } catch (error) {
        console.error('Erreur lors de l\'ajout des ventes:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de l\'ajout des ventes',
            error: error.message
        });
    }
});

// Route pour mettre à jour une vente
app.put('/api/ventes/:id', checkAuth, checkWriteAccess, async (req, res) => {
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

        // Standardiser la date au format dd-mm-yyyy
        const dateStandardisee = standardiserDateFormat(updatedVente.date);
        
        // Rechercher la vente à mettre à jour
        const vente = await Vente.findByPk(venteId);
        
        if (!vente) {
            return res.status(404).json({ 
                success: false, 
                message: 'Vente non trouvée' 
            });
        }
        
        // Mettre à jour la vente
        await vente.update({
            mois: updatedVente.mois,
            date: dateStandardisee,
            semaine: updatedVente.semaine,
            pointVente: updatedVente.pointVente,
            preparation: updatedVente.preparation || updatedVente.pointVente,
            categorie: updatedVente.categorie,
            produit: updatedVente.produit,
            prixUnit: updatedVente.prixUnit,
            nombre: updatedVente.quantite,
            montant: updatedVente.total,
            nomClient: updatedVente.nomClient || null,
            numeroClient: updatedVente.numeroClient || null,
            adresseClient: updatedVente.adresseClient || null,
            creance: updatedVente.creance || false
        });
        
        // Récupérer les 10 dernières ventes pour mise à jour de l'affichage
        const dernieresVentes = await Vente.findAll({
            order: [['createdAt', 'DESC']],
            limit: 10
        });
        
        // Formater les données pour la réponse
        const formattedVentes = dernieresVentes.map(v => ({
            id: v.id,
            Mois: v.mois,
            Date: v.date,
            Semaine: v.semaine,
            'Point de Vente': v.pointVente,
            Preparation: v.preparation,
            Catégorie: v.categorie,
            Produit: v.produit,
            PU: v.prixUnit,
            Nombre: v.nombre,
            Montant: v.montant,
            nomClient: v.nomClient,
            numeroClient: v.numeroClient,
            adresseClient: v.adresseClient,
            creance: v.creance
        }));

        res.json({ 
            success: true, 
            message: 'Vente mise à jour avec succès',
            dernieresVentes: formattedVentes
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la vente:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la mise à jour de la vente',
            error: error.message
        });
    }
});

// Route pour obtenir les ventes avec filtres
app.get('/api/ventes', checkAuth, checkReadAccess, async (req, res) => {
    try {
        const { dateDebut, dateFin, pointVente } = req.query;
        
        console.log('Paramètres reçus:', { dateDebut, dateFin, pointVente });
        
        // Préparer les conditions de filtrage
        const whereConditions = {};
        
        if (dateDebut || dateFin) {
            // Fonction pour convertir une date ISO (YYYY-MM-DD) en format DD-MM-YYYY
            const convertISOToAppFormat = (isoDate) => {
                const date = new Date(isoDate);
                const jour = date.getDate().toString().padStart(2, '0');
                const mois = (date.getMonth() + 1).toString().padStart(2, '0');
                const annee = date.getFullYear();
                return `${jour}-${mois}-${annee}`;
            };
            
            // Fonction pour comparer des dates au format DD-MM-YYYY
            const isDateInRange = (dateToCheck, startDate, endDate) => {
                // Convertir les dates au format comparable (YYYY-MM-DD)
                const convertToComparable = (dateStr) => {
                    if (!dateStr) return '';
                    const [day, month, year] = dateStr.split('-');
                    return `${year}-${month}-${day}`;
                };
                
                const comparableDate = convertToComparable(dateToCheck);
                const comparableStart = startDate ? convertToComparable(startDate) : '';
                const comparableEnd = endDate ? convertToComparable(endDate) : '';
                
                let isInRange = true;
                
                if (comparableStart && comparableDate) {
                    isInRange = isInRange && (comparableDate >= comparableStart);
                }
                
                if (comparableEnd && comparableDate) {
                    isInRange = isInRange && (comparableDate <= comparableEnd);
                }
                
                return isInRange;
            };
            
            // Convertir les dates d'entrée au format de l'application (DD-MM-YYYY)
            const debutFormatted = dateDebut ? convertISOToAppFormat(dateDebut) : null;
            const finFormatted = dateFin ? convertISOToAppFormat(dateFin) : null;
            
            console.log('Dates converties:', { debutFormatted, finFormatted });
            
            // Récupérer toutes les ventes et filtrer manuellement pour les dates
            const allVentes = await Vente.findAll({
                where: pointVente && pointVente !== 'tous' ? { pointVente } : {},
                order: [['date', 'DESC']]
            });
            
            // Filtrer les ventes selon la date
            const filteredVentes = allVentes.filter(vente => 
                isDateInRange(vente.date, debutFormatted, finFormatted)
            );
            
            // Formater les données pour la réponse
            const formattedVentes = filteredVentes.map(vente => ({
                Mois: vente.mois,
                Date: vente.date,
                Semaine: vente.semaine,
                'Point de Vente': vente.pointVente,
                Preparation: vente.preparation,
                Catégorie: vente.categorie,
                Produit: vente.produit,
                PU: vente.prixUnit,
                Nombre: vente.nombre,
                Montant: vente.montant,
                nomClient: vente.nomClient,
                numeroClient: vente.numeroClient,
                adresseClient: vente.adresseClient,
                creance: vente.creance
            }));
            
            console.log('Nombre de ventes filtrées:', formattedVentes.length);
            
            return res.json({ success: true, ventes: formattedVentes });
        }
        
        // Si pas de filtrage par date, utiliser la méthode standard avec les conditions Sequelize
        if (req.session.user.pointVente !== "tous") {
            whereConditions.pointVente = req.session.user.pointVente;
        } else if (pointVente && pointVente !== 'tous') {
            whereConditions.pointVente = pointVente;
        }
        
        // Récupérer les ventes depuis la base de données
        const ventes = await Vente.findAll({
            where: whereConditions,
            order: [['date', 'DESC']]
        });
        
        // Formater les données pour la réponse
        const formattedVentes = ventes.map(vente => ({
            Mois: vente.mois,
            Date: vente.date,
            Semaine: vente.semaine,
            'Point de Vente': vente.pointVente,
            Preparation: vente.preparation,
            Catégorie: vente.categorie,
            Produit: vente.produit,
            PU: vente.prixUnit,
            Nombre: vente.nombre,
            Montant: vente.montant,
            nomClient: vente.nomClient,
            numeroClient: vente.numeroClient,
            adresseClient: vente.adresseClient,
            creance: vente.creance
        }));
        
        console.log('Nombre de ventes filtrées:', formattedVentes.length);
        
        res.json({ success: true, ventes: formattedVentes });
    } catch (error) {
        console.error('Erreur lors de la récupération des ventes:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la récupération des ventes',
            error: error.message
        });
    }
});

// Route pour récupérer les dernières ventes
app.get('/api/dernieres-ventes', checkAuth, checkReadAccess, async (req, res) => {
    try {
        // Récupérer toutes les ventes depuis la base de données
        const ventes = await Vente.findAll({
            order: [['createdAt', 'DESC']]
        });
        
        // Formater les données pour la réponse
        const formattedVentes = ventes.map(vente => ({
            id: vente.id,
            Mois: vente.mois,
            Date: vente.date,
            Semaine: vente.semaine,
            'Point de Vente': vente.pointVente,
            Preparation: vente.preparation,
            Catégorie: vente.categorie,
            Produit: vente.produit,
            PU: vente.prixUnit,
            Nombre: vente.nombre,
            Montant: vente.montant,
            nomClient: vente.nomClient,
            numeroClient: vente.numeroClient,
            adresseClient: vente.adresseClient,
            creance: vente.creance
        }));
        
        res.json({ success: true, dernieresVentes: formattedVentes });
    } catch (error) {
        console.error('Erreur lors de la récupération des dernières ventes:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la récupération des ventes',
            error: error.message
        });
    }
});

// Route pour la redirection après connexion
app.get('/redirect', (req, res) => {
    console.log('Redirection demandée, session:', req.session);
    if (req.session.user) {
        if (req.session.user.username === 'ADMIN') {
            // L'utilisateur ADMIN va directement à la gestion des utilisateurs
            res.sendFile(path.join(__dirname, 'user-management.html'));
        } else if (req.session.user.isSuperAdmin) {
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
app.post('/api/import-ventes', checkAuth, checkWriteAccess, (req, res) => {
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
app.post('/api/vider-base', async (req, res) => {
    try {
        // Vérifier si l'utilisateur est SALIOU
        if (!req.session.user || req.session.user.username !== 'SALIOU') {
            return res.status(403).json({ success: false, message: 'Accès non autorisé' });
        }

        // Vider la table des ventes
        await Vente.destroy({ where: {}, truncate: true });
        
        res.json({ success: true, message: 'Base de données vidée avec succès' });
    } catch (error) {
        console.error('Erreur lors du vidage de la base:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors du vidage de la base de données',
            error: error.message
        });
    }
});

// Route pour charger les données de stock
app.get('/api/stock/:type', checkAuth, checkReadAccess, async (req, res) => {
    try {
        const type = req.params.type;
        const date = req.query.date;
        const baseFilePath = type === 'matin' ? STOCK_MATIN_PATH : STOCK_SOIR_PATH;
        
        // Obtenir le chemin du fichier spécifique à la date
        const filePath = getPathByDate(baseFilePath, date);
        
        // Vérifier si le fichier existe
        if (!fs.existsSync(filePath)) {
            // Si le fichier n'existe pas, retourner un objet vide
            console.log(`Fichier de stock ${type} pour la date ${date} non trouvé, retour d'un objet vide`);
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
app.post('/api/stock/:type', checkAuth, checkWriteAccess, async (req, res) => {
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
app.get('/api/transferts', checkAuth, checkReadAccess, async (req, res) => {
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
app.delete('/api/transferts', checkAuth, checkWriteAccess, async (req, res) => {
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
app.delete('/api/ventes/:id', checkAuth, checkWriteAccess, async (req, res) => {
    try {
        const venteId = req.params.id;
        const pointVente = req.query.pointVente;

        console.log(`Tentative de suppression de la vente ID: ${venteId}, Point de vente: ${pointVente}`);

        // Trouver la vente à supprimer
        const vente = await Vente.findByPk(venteId);
        
        if (!vente) {
            return res.status(404).json({ 
                success: false, 
                message: "Vente non trouvée" 
            });
        }
        
        // Vérifier si l'utilisateur a accès au point de vente
        if (req.session.user.pointVente !== "tous" && req.session.user.pointVente !== vente.pointVente) {
            return res.status(403).json({ 
                success: false, 
                message: "Accès non autorisé à ce point de vente" 
            });
        }

        // Supprimer la vente
        await vente.destroy();

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

// Route pour récupérer les ventes d'une date spécifique pour un point de vente
app.get('/api/ventes-date', checkAuth, async (req, res) => {
    try {
        const { date, pointVente } = req.query;
        
        if (!date) {
            return res.status(400).json({ 
                success: false, 
                message: 'La date est requise' 
            });
        }
        
        console.log('==== DEBUG VENTES-DATE ====');
        console.log('Recherche des ventes pour date:', date, 'et point de vente:', pointVente);
        
        const dateStandardisee = standardiserDateFormat(date);
        console.log('Date standardisée:', dateStandardisee);
        
        // Préparer les conditions de filtrage
        const whereConditions = { date: dateStandardisee };
        
        if (pointVente) {
            whereConditions.pointVente = pointVente;
        }
        
        // Récupérer les ventes depuis la base de données
        const ventes = await Vente.findAll({
            where: whereConditions
        });
        
        console.log(`Nombre de ventes trouvées: ${ventes.length}`);
        if (ventes.length > 0) {
            console.log('Premier échantillon de vente:', {
                id: ventes[0].id,
                date: ventes[0].date,
                pointVente: ventes[0].pointVente,
                produit: ventes[0].produit,
                nombre: ventes[0].nombre,
                prixUnit: ventes[0].prixUnit,
                montant: ventes[0].montant,
                montantType: typeof ventes[0].montant
            });
        }
        
        // Formater les données pour la réponse
        const formattedVentes = ventes.map(vente => {
            // Conversion explicite en nombres
            const prixUnit = parseFloat(vente.prixUnit) || 0;
            const nombre = parseFloat(vente.nombre) || 0;
            const montant = parseFloat(vente.montant) || 0;
            
            return {
                id: vente.id,
                Date: vente.date,
                'Point de Vente': vente.pointVente,
                Catégorie: vente.categorie,
                Produit: vente.produit,
                PU: prixUnit,
                Nombre: nombre,
                Montant: montant,
                nomClient: vente.nomClient,
                numeroClient: vente.numeroClient,
                adresseClient: vente.adresseClient,
                creance: vente.creance
            };
        });
        
        // Calculer le total par point de vente
        const totauxParPointVente = {};
        
        formattedVentes.forEach(vente => {
            const pv = vente['Point de Vente'];
            if (!totauxParPointVente[pv]) {
                totauxParPointVente[pv] = 0;
            }
            // S'assurer que le montant est un nombre
            const montant = parseFloat(vente.Montant) || 0;
            totauxParPointVente[pv] += montant;
        });
        
        console.log('Totaux des ventes par point de vente:', totauxParPointVente);
        
        // Vérification supplémentaire pour s'assurer que les totaux sont bien des nombres
        Object.keys(totauxParPointVente).forEach(pv => {
            console.log(`Total pour ${pv}: ${totauxParPointVente[pv]} (type: ${typeof totauxParPointVente[pv]})`);
        });
        
        console.log('==== FIN DEBUG VENTES-DATE ====');
        
        res.json({ 
            success: true, 
            ventes: formattedVentes,
            totaux: totauxParPointVente
        });
    } catch (error) {
        console.error('Erreur lors de la recherche des ventes:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la recherche des ventes',
            error: error.message
        });
    }
});

// Endpoint pour utiliser DeepSeek (local)
app.post('/api/analyse-deepseek', (req, res) => {
    try {
        // Vérifier que les données nécessaires sont présentes
        const { donnees } = req.body;
        if (!donnees) {
            return res.status(400).json({ success: false, message: 'Données manquantes pour l\'analyse' });
        }

        // Dans une version réelle, ici nous appellerions le modèle DeepSeek
        // pour analyser les données. Pour l'instant, nous simulons cela
        // en renvoyant la même réponse que le code frontend.
        
        // Structurer notre prompt pour DeepSeek
        console.log("Préparation de l'analyse DeepSeek pour", donnees.pointVente);
        
        // Simuler une réponse après un délai
        setTimeout(() => {
            const ecart = donnees.ecart;
            const isEcartPositif = ecart > 0;
            const isEcartNegatif = ecart < 0;
            const isEcartZero = ecart === 0;
            
            // Créer une réponse similaire à celle du frontend
            let analysis = `**Analyse DeepSeek des résultats de réconciliation**\n\n`;
            
            analysis += `**Point de vente:** ${donnees.pointVente}\n`;
            analysis += `**Date:** ${donnees.date}\n\n`;
            
            analysis += `**Résumé des données financières:**\n`;
            analysis += `- Stock Matin: ${donnees.stockMatin} FCFA\n`;
            analysis += `- Stock Soir: ${donnees.stockSoir} FCFA\n`;
            analysis += `- Transferts: ${donnees.transferts} FCFA\n`;
            analysis += `- Ventes Théoriques: ${donnees.ventesTheoriques} FCFA\n`;
            analysis += `- Ventes Saisies: ${donnees.ventesSaisies} FCFA\n`;
            analysis += `- Écart: ${donnees.ecart} FCFA\n\n`;
            
            // Envoyer la réponse
            res.json({ 
                success: true, 
                analysis: analysis,
                model: "DeepSeek-Lite (Local)"
            });
        }, 1000);
        
    } catch (error) {
        console.error('Erreur lors de l\'analyse DeepSeek:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de l\'analyse avec DeepSeek: ' + error.message 
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

// Routes pour la réconciliation
app.post('/api/reconciliation/save', checkAuth, checkWriteAccess, async (req, res) => {
    try {
        const { date, reconciliation, cashPaymentData, comments } = req.body;
        
        if (!date || !reconciliation) {
            return res.status(400).json({ success: false, message: 'Date et données de réconciliation requises' });
        }
        
        // Vérifier si une réconciliation existe déjà pour cette date
        let existingReconciliation = await Reconciliation.findOne({ where: { date } });
        
        // Préparer les données à sauvegarder
        const dataToSave = {
            date,
            data: JSON.stringify(reconciliation),
            cashPaymentData: cashPaymentData ? JSON.stringify(cashPaymentData) : null,
            comments: comments ? JSON.stringify(comments) : null,
            version: 1
        };
        
        // Mettre à jour ou créer l'enregistrement
        if (existingReconciliation) {
            await existingReconciliation.update(dataToSave);
            console.log(`Réconciliation mise à jour pour la date ${date}`);
        } else {
            await Reconciliation.create(dataToSave);
            console.log(`Nouvelle réconciliation créée pour la date ${date}`);
        }
        
        res.json({ success: true, message: 'Réconciliation sauvegardée avec succès' });
    } catch (error) {
        console.error('Erreur lors de la sauvegarde de la réconciliation:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la sauvegarde de la réconciliation',
            error: error.message
        });
    }
});

app.get('/api/reconciliation/load', checkAuth, checkReadAccess, async (req, res) => {
    try {
        const { date } = req.query;
        
        if (!date) {
            return res.status(400).json({ success: false, message: 'Date requise' });
        }
        
        const reconciliation = await Reconciliation.findOne({ where: { date } });
        
        if (!reconciliation) {
            return res.json({ 
                success: true, 
                message: 'Aucune réconciliation trouvée pour cette date',
                data: null
            });
        }
        
        // Préparer la réponse avec toutes les données
        const response = {
            id: reconciliation.id,
            date: reconciliation.date,
            createdAt: reconciliation.createdAt,
            updatedAt: reconciliation.updatedAt
        };
        
        // Données de réconciliation principales
        try {
            response.data = JSON.parse(reconciliation.data);
        } catch (e) {
            console.error('Erreur lors du parsing des données de réconciliation:', e);
            response.data = reconciliation.data;
        }
        
        // Format de compatibilité avec l'ancien système
        response.reconciliation = response.data;
        
        // Données de paiement en espèces
        if (reconciliation.cashPaymentData) {
            try {
                response.cashPaymentData = JSON.parse(reconciliation.cashPaymentData);
            } catch (e) {
                console.error('Erreur lors du parsing des données de paiement:', e);
                response.cashPaymentData = null;
            }
        }
        
        // Commentaires
        if (reconciliation.comments) {
            try {
                response.comments = JSON.parse(reconciliation.comments);
            } catch (e) {
                console.error('Erreur lors du parsing des commentaires:', e);
                response.comments = null;
            }
        }
        
        // Métadonnées
        response.version = reconciliation.version || 1;
        response.calculated = reconciliation.calculated !== false;
        
        res.json({ success: true, data: response });
    } catch (error) {
        console.error('Erreur lors du chargement de la réconciliation:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors du chargement de la réconciliation',
            error: error.message
        });
    }
});

// Route pour importer des données de paiement en espèces
app.post('/api/cash-payments/import', checkAuth, checkWriteAccess, async (req, res) => {
    try {
        const { data } = req.body;
        
        if (!data || !Array.isArray(data) || data.length === 0) {
            return res.status(400).json({ success: false, message: 'Données invalides' });
        }
        
        // Mapping des références de paiement aux points de vente
        const paymentRefToPointDeVente = {
            'V_TB': 'Touba',
            'V_DHR': 'Dahra',
            'V_ALS': 'Aliou Sow',
            'V_LGR': 'Linguere',
            'V_MBA': 'Mbao',
            'V_KM': 'Keur Massar',
            'V_OSF': 'O.Foire',
            'V_SAC': 'Sacre Coeur',
            'V_ABATS': 'Abattage'
        };
        
        // Convertir les dates du format "1 avr. 2025, 16:18" en format standard
        const processedData = data.map(item => {
            // Conversion de la date française en format ISO
            let createdAt = item.created_at;
            if (createdAt) {
                // Extraire juste la partie date (avant la virgule)
                const dateParts = createdAt.split(',');
                if (dateParts.length > 0) {
                    const dateStr = dateParts[0].trim();
                    const timePart = dateParts.length > 1 ? dateParts[1].trim() : '';
                    
                    // Remplacer les noms de mois français par leurs numéros
                    const monthMap = {
                        'janv.': '01', 'févr.': '02', 'mars': '03', 'avr.': '04',
                        'mai': '05', 'juin': '06', 'juil.': '07', 'août': '08',
                        'sept.': '09', 'oct.': '10', 'nov.': '11', 'déc.': '12'
                    };
                    
                    let day, month, year;
                    
                    // Format: "1 avr. 2025"
                    const dateMatch = dateStr.match(/(\d+)\s+([a-zéû.]+)\s+(\d{4})/i);
                    if (dateMatch) {
                        day = dateMatch[1].padStart(2, '0');
                        const monthName = dateMatch[2].toLowerCase();
                        month = monthMap[monthName] || '01'; // default to January if not found
                        year = dateMatch[3];
                        
                        // Créer la date ISO
                        createdAt = `${year}-${month}-${day}`;
                        
                        // Ajouter l'heure si disponible
                        if (timePart) {
                            createdAt += `T${timePart}:00`;
                        }
                    }
                }
            }
            
            // Mapper le payment_reference au point de vente
            // Normaliser la référence AVANT la recherche
            const rawRef = item.payment_reference;
            const normalizedRef = rawRef ? rawRef.toUpperCase().replace(/^G_/, 'V_') : null;
            const pointDeVente = normalizedRef ? (paymentRefToPointDeVente[normalizedRef] || 'Non spécifié') : 'Non spécifié';
            
            // Extraire juste la date (sans l'heure) pour le champ date
            const dateOnly = createdAt ? createdAt.split('T')[0] : null;
            
            return {
                ...item,
                created_at: createdAt,
                point_de_vente: pointDeVente,
                date: dateOnly
            };
        });
        
        // S'assurer que la table existe
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS cash_payments (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                created_at TIMESTAMP NOT NULL,
                amount FLOAT NOT NULL,
                merchant_fee FLOAT,
                customer_fee FLOAT,
                customer_name VARCHAR(255),
                customer_phone VARCHAR(255),
                entete_trans_type VARCHAR(255),
                psp_name VARCHAR(255),
                payment_category VARCHAR(255),
                payment_means VARCHAR(255),
                payment_reference VARCHAR(255),
                merchant_reference VARCHAR(255),
                trn_status VARCHAR(255),
                tr_id VARCHAR(255),
                cust_country VARCHAR(255),
                aggregation_mt VARCHAR(255),
                total_nom_marchand VARCHAR(255),
                total_marchand VARCHAR(255),
                merchant_id VARCHAR(255),
                name_first VARCHAR(255),
                point_de_vente VARCHAR(255),
                date DATE,
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Insérer les données dans la base de données
        const insertedRecords = await CashPayment.bulkCreate(processedData);
        
        res.json({ 
            success: true, 
            message: `${insertedRecords.length} paiements importés avec succès` 
        });
    } catch (error) {
        console.error('Erreur lors de l\'importation des paiements en espèces:', error);
        res.status(500).json({ 
            success: false, 
            message: `Erreur lors de l'importation des paiements en espèces: ${error.message}` 
        });
    }
});

app.get('/api/cash-payments/aggregated', checkAuth, checkReadAccess, async (req, res) => {
    try {
        // S'assurer que la table existe
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS cash_payments (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                created_at TIMESTAMP NOT NULL,
                amount FLOAT NOT NULL,
                merchant_fee FLOAT,
                customer_fee FLOAT,
                customer_name VARCHAR(255),
                customer_phone VARCHAR(255),
                entete_trans_type VARCHAR(255),
                psp_name VARCHAR(255),
                payment_category VARCHAR(255),
                payment_means VARCHAR(255),
                payment_reference VARCHAR(255),
                merchant_reference VARCHAR(255),
                trn_status VARCHAR(255),
                tr_id VARCHAR(255),
                cust_country VARCHAR(255),
                aggregation_mt VARCHAR(255),
                total_nom_marchand VARCHAR(255),
                total_marchand VARCHAR(255),
                merchant_id VARCHAR(255),
                name_first VARCHAR(255),
                point_de_vente VARCHAR(255),
                date DATE,
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Obtenir les données agrégées par date et point de vente
        const result = await sequelize.query(`
            SELECT date, point_de_vente, SUM(amount) as total
            FROM cash_payments
            GROUP BY date, point_de_vente
            ORDER BY date DESC, point_de_vente
        `, { type: sequelize.QueryTypes.SELECT });
        
        // Restructurer les données pour le format attendu par le frontend
        const aggregatedData = [];
        const dateMap = new Map();
        
        result.forEach(row => {
            if (!dateMap.has(row.date)) {
                dateMap.set(row.date, {
                    date: row.date,
                    points: []
                });
                aggregatedData.push(dateMap.get(row.date));
            }
            
            dateMap.get(row.date).points.push({
                point: row.point_de_vente,
                total: row.total
            });
        });
        
        res.json({
            success: true,
            data: aggregatedData
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des données de paiement agrégées:', error);
        res.status(500).json({ 
            success: false, 
            message: `Erreur lors de la récupération des données: ${error.message}` 
        });
    }
});

app.delete('/api/cash-payments/clear', checkAuth, checkWriteAccess, async (req, res) => {
    try {
        // S'assurer que la table existe
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS cash_payments (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                created_at TIMESTAMP NOT NULL,
                amount FLOAT NOT NULL,
                merchant_fee FLOAT,
                customer_fee FLOAT,
                customer_name VARCHAR(255),
                customer_phone VARCHAR(255),
                entete_trans_type VARCHAR(255),
                psp_name VARCHAR(255),
                payment_category VARCHAR(255),
                payment_means VARCHAR(255),
                payment_reference VARCHAR(255),
                merchant_reference VARCHAR(255),
                trn_status VARCHAR(255),
                tr_id VARCHAR(255),
                cust_country VARCHAR(255),
                aggregation_mt VARCHAR(255),
                total_nom_marchand VARCHAR(255),
                total_marchand VARCHAR(255),
                merchant_id VARCHAR(255),
                name_first VARCHAR(255),
                point_de_vente VARCHAR(255),
                date DATE,
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Supprimer toutes les données de la table
        await CashPayment.destroy({ where: {} });
        
        res.json({
            success: true,
            message: 'Toutes les données de paiement ont été supprimées'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression des données de paiement:', error);
        res.status(500).json({ 
            success: false, 
            message: `Erreur lors de la suppression des données: ${error.message}` 
        });
    }
});

// Route pour mettre à jour le total agrégé d'un paiement cash
app.put('/api/cash-payments/update-aggregated', checkAuth, checkWriteAccess, async (req, res) => {
    const { date, point_de_vente, newTotal } = req.body;
    
    console.log(`Requête reçue pour mettre à jour le total agrégé:`, { date, point_de_vente, newTotal });

    if (date === undefined || point_de_vente === undefined || newTotal === undefined) {
        return res.status(400).json({ 
            success: false, 
            message: 'Les champs date, point_de_vente et newTotal sont requis.' 
        });
    }
    
    // Convertir newTotal en nombre
    const totalAmount = parseFloat(newTotal);
    if (isNaN(totalAmount)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Le champ newTotal doit être un nombre valide.' 
        });
    }

    // Convertir la date reçue (format DD/MM/YYYY) au format SQL (YYYY-MM-DD)
    let sqlDate;
    try {
        const parts = date.split('/');
        if (parts.length !== 3) throw new Error('Format de date invalide.');
        sqlDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        // Valider la date convertie
        if (isNaN(new Date(sqlDate).getTime())) {
            throw new Error('Date invalide après conversion.');
        }
    } catch (e) {
        console.error("Erreur de format de date:", e);
        return res.status(400).json({ 
            success: false, 
            message: `Format de date invalide: ${date}. Utilisez DD/MM/YYYY.` 
        });
    }

    const transaction = await sequelize.transaction();
    try {
        // Trouver tous les paiements existants pour cette date et ce point de vente
        const existingPayments = await CashPayment.findAll({
            where: {
                date: sqlDate,
                point_de_vente: point_de_vente
            },
            order: [['created_at', 'ASC']], // Important pour identifier le "premier"
            transaction
        });

        if (existingPayments.length === 0) {
            await transaction.rollback();
            console.warn(`Aucun paiement trouvé pour date=${sqlDate}, pdv=${point_de_vente}. Impossible de mettre à jour.`);
            return res.status(404).json({ 
                success: false, 
                message: 'Aucun paiement existant trouvé pour cette date et ce point de vente.' 
            });
        }

        // Mettre à jour le premier enregistrement avec le nouveau total
        // et les autres à 0
        for (let i = 0; i < existingPayments.length; i++) {
            const payment = existingPayments[i];
            const updateAmount = (i === 0) ? totalAmount : 0;
            
            await payment.update({ amount: updateAmount }, { transaction });
            console.log(`Mise à jour du paiement ID ${payment.id} à ${updateAmount}`);
        }

        await transaction.commit();
        console.log(`Total agrégé mis à jour avec succès pour date=${sqlDate}, pdv=${point_de_vente}`);
        res.json({ 
            success: true, 
            message: 'Total agrégé mis à jour avec succès.' 
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Erreur lors de la mise à jour du total agrégé:', error);
        res.status(500).json({ 
            success: false, 
            message: `Erreur lors de la mise à jour du total: ${error.message}` 
        });
    }
});

// Route pour mettre à jour le point de vente d'un paiement cash
app.put('/api/cash-payments/update-point-vente', checkAuth, checkWriteAccess, async (req, res) => {
    const { date, old_point_de_vente, new_point_de_vente } = req.body;
    
    console.log(`Requête reçue pour mettre à jour le point de vente:`, { date, old_point_de_vente, new_point_de_vente });

    if (date === undefined || old_point_de_vente === undefined || new_point_de_vente === undefined) {
        return res.status(400).json({ 
            success: false, 
            message: 'Les champs date, old_point_de_vente et new_point_de_vente sont requis.' 
        });
    }

    // Convertir la date reçue (format DD/MM/YYYY) au format SQL (YYYY-MM-DD)
    let sqlDate;
    try {
        const parts = date.split('/');
        if (parts.length !== 3) throw new Error('Format de date invalide.');
        sqlDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        // Valider la date convertie
        if (isNaN(new Date(sqlDate).getTime())) {
            throw new Error('Date invalide après conversion.');
        }
    } catch (e) {
        console.error("Erreur de format de date:", e);
        return res.status(400).json({ 
            success: false, 
            message: `Format de date invalide: ${date}. Utilisez DD/MM/YYYY.` 
        });
    }

    const transaction = await sequelize.transaction();
    try {
        // Trouver tous les paiements existants pour cette date et cet ancien point de vente
        const existingPayments = await CashPayment.findAll({
            where: {
                date: sqlDate,
                point_de_vente: old_point_de_vente
            },
            transaction
        });

        if (existingPayments.length === 0) {
            await transaction.rollback();
            console.warn(`Aucun paiement trouvé pour date=${sqlDate}, pdv=${old_point_de_vente}. Impossible de mettre à jour.`);
            return res.status(404).json({ 
                success: false, 
                message: 'Aucun paiement existant trouvé pour cette date et ce point de vente.' 
            });
        }

        // Mettre à jour tous les paiements avec le nouveau point de vente
        for (const payment of existingPayments) {
            await payment.update({ point_de_vente: new_point_de_vente }, { transaction });
            console.log(`Point de vente mis à jour pour le paiement ID ${payment.id}: ${old_point_de_vente} -> ${new_point_de_vente}`);
        }

        await transaction.commit();
        console.log(`Point de vente mis à jour avec succès pour date=${sqlDate}, pdv=${old_point_de_vente} -> ${new_point_de_vente}`);
        res.json({ 
            success: true, 
            message: 'Point de vente mis à jour avec succès.' 
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Erreur lors de la mise à jour du point de vente:', error);
        res.status(500).json({ 
            success: false, 
            message: `Erreur lors de la mise à jour du point de vente: ${error.message}` 
        });
    }
});

// Route pour importer des données de paiement en espèces depuis une source externe
app.post('/api/external/cash-payment/import', validateApiKey, async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const data = req.body;
        
        if (!data || !Array.isArray(data) || data.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Données invalides - un tableau de paiements est requis' });
        }
        
        // Mapping des références de paiement aux points de vente (cohérent avec l'endpoint existant)
        const paymentRefToPointDeVente = {
            'V_TB': 'Touba',
            'V_DHR': 'Dahra',
            'V_ALS': 'Aliou Sow', // Réajouté pour cohérence
            'V_LGR': 'Linguere',
            'V_MBA': 'Mbao',
            'V_KM': 'Keur Massar',
            'V_OSF': 'O.Foire',
            'V_SAC': 'Sacre Coeur',
            'V_ABATS': 'Abattage'
        };
        
        // Vérifier les doublons par tr_id (ID externe)
        const externalIds = data.map(item => item.id).filter(Boolean);
        const existingPayments = await CashPayment.findAll({
            where: {
                tr_id: {
                    [Op.in]: externalIds
                }
            },
            attributes: ['tr_id'],
            transaction
        });
        
        const existingIds = new Set(existingPayments.map(p => p.tr_id));
        const newData = data.filter(item => !existingIds.has(item.id));
        
        if (newData.length === 0) {
            await transaction.rollback();
            return res.json({ 
                success: true, 
                message: `Aucun nouveau paiement à importer (${existingIds.size} doublons détectés)`,
                importedCount: 0,
                duplicatesCount: existingIds.size
            });
        }
        
        // Traitement des données pour mapper le format externe vers le format interne
        const processedData = newData.map(item => {
            // Conversion du timestamp vers created_at
            let createdAt = item.timestamp;
            let dateOnly = null;
            
            if (createdAt) {
                try {
                    // Le timestamp est au format "2025-05-28 22:11:18.98574"
                    const dateObj = new Date(createdAt);
                    createdAt = dateObj.toISOString();
                    dateOnly = dateObj.toISOString().split('T')[0]; // Format YYYY-MM-DD
                } catch (error) {
                    console.warn('Erreur de conversion de date pour:', createdAt);
                    createdAt = new Date().toISOString();
                    dateOnly = new Date().toISOString().split('T')[0];
                }
            } else {
                createdAt = new Date().toISOString();
                dateOnly = new Date().toISOString().split('T')[0];
            }
            
            // Mapper le paymentReference au point de vente (cohérent avec l'endpoint existant)
            // Normaliser la référence en majuscules ET gérer la conversion G_ -> V_
            const paymentRef = item.paymentReference;
            const normalizedRef = paymentRef ? paymentRef.toUpperCase().replace(/^G_/, 'V_') : null;
            const pointDeVente = normalizedRef ? (paymentRefToPointDeVente[normalizedRef] || 'Non spécifié') : 'Non spécifié';
            
            return {
                // Champs mappés du format externe vers le format interne
                name: item.customerObject?.name || null,
                created_at: createdAt,
                amount: parseFloat(item.amount) || 0,
                merchant_fee: parseFloat(item.merchantFees) || 0,
                customer_fee: parseFloat(item.customerFees) || 0,
                customer_name: item.customerObject?.name || null,
                customer_phone: item.customerObject?.phone || item.paymentMeans || null,
                entete_trans_type: item.type || null,
                psp_name: item.pspName || null,
                payment_category: item.orderType || null,
                payment_means: item.paymentMeans || null,
                payment_reference: item.paymentReference || null,
                merchant_reference: item.merchantReference || null,
                trn_status: item.status || null,
                tr_id: item.id || null, // Utilisé pour détecter les doublons
                cust_country: item.customerObject?.country || null,
                aggregation_mt: null,
                total_nom_marchand: null,
                total_marchand: null,
                merchant_id: item.merchantId || null,
                name_first: item.customerObject?.name ? item.customerObject.name.split(' ')[0] : null,
                point_de_vente: pointDeVente,
                date: dateOnly
            };
        });
        
        // S'assurer que la table existe
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS cash_payments (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                created_at TIMESTAMP NOT NULL,
                amount FLOAT NOT NULL,
                merchant_fee FLOAT,
                customer_fee FLOAT,
                customer_name VARCHAR(255),
                customer_phone VARCHAR(255),
                entete_trans_type VARCHAR(255),
                psp_name VARCHAR(255),
                payment_category VARCHAR(255),
                payment_means VARCHAR(255),
                payment_reference VARCHAR(255),
                merchant_reference VARCHAR(255),
                trn_status VARCHAR(255),
                tr_id VARCHAR(255),
                cust_country VARCHAR(255),
                aggregation_mt VARCHAR(255),
                total_nom_marchand VARCHAR(255),
                total_marchand VARCHAR(255),
                merchant_id VARCHAR(255),
                name_first VARCHAR(255),
                point_de_vente VARCHAR(255),
                date DATE,
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `, { transaction });
        
        // Insérer les données dans la base de données
        const insertedRecords = await CashPayment.bulkCreate(processedData, { transaction });
        
        await transaction.commit();
        
        res.json({ 
            success: true, 
            message: `${insertedRecords.length} paiements importés avec succès depuis la source externe (${existingIds.size} doublons ignorés)`,
            importedCount: insertedRecords.length,
            duplicatesCount: existingIds.size
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Erreur lors de l\'importation des paiements externes:', error);
        res.status(500).json({ 
            success: false, 
            message: `Erreur lors de l'importation des paiements externes: ${error.message}` 
        });
    }
});

// ===========================================================================
// SUIVI ACHAT BOEUF - PostgreSQL Implementation
// ===========================================================================

// GET endpoint to retrieve beef purchase data
app.get('/api/achats-boeuf', checkAuth, checkReadAccess, async (req, res) => {
    try {
        const achats = await AchatBoeuf.findAll({
            order: [['date', 'DESC']],
        });
        res.json(achats);
    } catch (err) {
        console.error('Error fetching beef purchases:', err);
        res.status(500).json({ error: 'Failed to fetch beef purchases' });
    }
});

// POST endpoint to save purchase data
app.post('/api/achats-boeuf', checkAuth, checkWriteAccess, async (req, res) => {
    try {
        // Use original field names matching the updated model
        const { mois, date, bete, prix, abats, frais_abattage, nbr_kg, prix_achat_kg, commentaire } = req.body;
        
        // Basic validation
        if (!date || !bete) { // Adjust validation as needed
            return res.status(400).json({ error: 'Champs requis manquants (date, bete)' });
        }

        // Format date (keep YYYY-MM-DD)
        let formattedDate;
        let yearInt;
        try {
            const dateObj = new Date(date);
            formattedDate = dateObj.toISOString().split('T')[0]; 
            yearInt = dateObj.getFullYear(); // Still useful to store year separately
        } catch (dateError) {
            console.error("Invalid date format received:", date);
            return res.status(400).json({ error: 'Format de date invalide' });
        }
        
        // Create using the updated model structure
        const newAchat = await AchatBoeuf.create({
            mois: mois || null,              // Keep mois as provided (string)
            annee: yearInt,                 // Store extracted year
            date: formattedDate,            
            bete: bete,                    // Use bete directly
            prix: prix || 0,                // Use prix directly
            abats: abats || 0,            
            frais_abattage: frais_abattage || 0, // Use frais_abattage
            nbr_kg: nbr_kg || 0,           // Use nbr_kg directly
            prix_achat_kg: prix_achat_kg || 0, // Use prix_achat_kg directly
            commentaire: commentaire || null 
        });
        
        res.status(201).json({ 
            success: true, 
            message: 'Données d\'achat de bétail enregistrées avec succès',
            id: newAchat.id
        });
    } catch (err) {
        console.error('Error saving beef purchase data:', err);
        if (err.name === 'SequelizeValidationError') {
            return res.status(400).json({ error: err.errors.map(e => e.message).join(', ') });
        }
        res.status(500).json({ error: 'Échec de l\'enregistrement des données d\'achat de bétail' });
    }
});

// DELETE endpoint to remove purchase data
app.delete('/api/achats-boeuf/:id', checkAuth, checkWriteAccess, async (req, res) => {
    try {
        const id = req.params.id;
        const numDeleted = await AchatBoeuf.destroy({
            where: { id: id }
        });

        if (numDeleted === 1) {
            res.json({ success: true, message: 'Entry deleted successfully' });
        } else {
            res.status(404).json({ error: 'Entry not found' });
        }
    } catch (err) {
        console.error('Error deleting beef purchase data:', err);
        res.status(500).json({ error: 'Failed to delete beef purchase data' });
    }
});

// GET endpoint for monthly statistics
app.get('/api/achats-boeuf/stats/monthly', checkAuth, async (req, res) => {
    try {
        const stats = await AchatBoeuf.findAll({
            attributes: [
                [fn('EXTRACT', literal('YEAR FROM date')), 'year'],
                [fn('EXTRACT', literal('MONTH FROM date')), 'month'],
                [fn('TO_CHAR', col('date'), 'Mon YYYY'), 'month_name'],
                [fn('SUM', col('prix')), 'total_prix'],
                [fn('SUM', col('abats')), 'total_abats'],
                [fn('SUM', col('frais_abattage')), 'total_frais_abattage'],
                [fn('SUM', col('nbr_kg')), 'total_kg'],
                [literal(`CASE WHEN SUM(nbr_kg) > 0 THEN SUM(prix) / SUM(nbr_kg) ELSE 0 END`), 'avg_prix_kg']
            ],
            group: ['year', 'month', 'month_name'],
            order: [
                [literal('year'), 'DESC'],
                [literal('month'), 'DESC']
            ],
            raw: true // Get plain objects instead of Sequelize instances
        });
        
        res.json(stats);
    } catch (err) {
        console.error('Error fetching monthly stats:', err);
        res.status(500).json({ error: 'Failed to fetch monthly statistics' });
    }
});

// Route pour récupérer les catégories
app.get('/api/categories', checkAuth, checkReadAccess, async (req, res) => {
    try {
        const categories = await Vente.findAll({
            attributes: [[fn('DISTINCT', fn('col', 'categorie')), 'categorie']],
            raw: true
        });
        
        const categoriesList = categories.map(c => c.categorie).filter(Boolean);
        res.json({ success: true, categories: categoriesList });
    } catch (error) {
        console.error('Erreur lors de la récupération des catégories:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la récupération des catégories' 
        });
    }
});

// Route pour calculer le stock du soir
app.get('/api/stock-soir', checkAuth, checkReadAccess, async (req, res) => {
    try {
        const { date, pointVente, categorie } = req.query;
        
        if (!date || !pointVente || !categorie) {
            return res.status(400).json({ 
                success: false, 
                message: 'Date, point de vente et catégorie sont requis' 
            });
        }

        const dateStandardisee = standardiserDateFormat(date);
        
        // Calculer le stock du soir pour la date et le point de vente donnés
        const stock = await Stock.findAll({
            where: {
                date: dateStandardisee,
                pointVente,
                typeStock: 'soir'
            }
        });

        // Calculer la somme du stock pour la catégorie donnée
        let stockSoir = 0;
        stock.forEach(s => {
            if (s.categorie === categorie) {
                stockSoir += parseFloat(s.quantite) || 0;
            }
        });

        res.json({ success: true, stockSoir });
    } catch (error) {
        console.error('Erreur lors du calcul du stock du soir:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors du calcul du stock du soir' 
        });
    }
});

// Route pour calculer les ventes effectuées
app.get('/api/ventes-effectuees', checkAuth, async (req, res) => {
    try {
        const { date, pointVente, categorie } = req.query;
        
        if (!date || !pointVente || !categorie) {
            return res.status(400).json({ 
                success: false, 
                message: 'Date, point de vente et catégorie sont requis' 
            });
        }

        const dateStandardisee = standardiserDateFormat(date);
        
        // Calculer les ventes effectuées pour la date et le point de vente donnés
        const ventes = await Vente.findAll({
            where: {
                date: dateStandardisee,
                pointVente,
                categorie
            }
        });

        // Calculer la somme des ventes
        let ventesEffectuees = 0;
        ventes.forEach(v => {
            ventesEffectuees += parseFloat(v.nombre) || 0;
        });

        res.json({ success: true, ventesEffectuees });
    } catch (error) {
        console.error('Erreur lors du calcul des ventes effectuées:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors du calcul des ventes effectuées' 
        });
    }
});

// Route pour créer une estimation
app.post('/api/estimations', checkAuth, checkWriteAccess, async (req, res) => {
    try {
        const estimation = req.body;
        
        // Standardiser la date
        estimation.date = standardiserDateFormat(estimation.date);
        
        // Créer l'estimation
        await Estimation.create(estimation);
        
        // Récupérer toutes les estimations pour mise à jour de l'affichage
        const estimations = await Estimation.findAll({
            order: [['date', 'DESC']]
        });
        
        res.json({ 
            success: true, 
            message: 'Estimation créée avec succès',
            estimations 
        });
    } catch (error) {
        console.error('Erreur lors de la création de l\'estimation:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la création de l\'estimation' 
        });
    }
});

// Route pour récupérer les estimations
app.get('/api/estimations', checkAuth, checkReadAccess, async (req, res) => {
    try {
        const estimations = await Estimation.findAll({
            order: [['date', 'DESC']]
        });
        
        res.json({ success: true, estimations });
    } catch (error) {
        console.error('Erreur lors de la récupération des estimations:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la récupération des estimations' 
        });
    }
});

// Route pour supprimer une estimation
app.delete('/api/estimations/:id', checkAuth, checkWriteAccess, async (req, res) => {
    try {
        const id = req.params.id;
        
        await Estimation.destroy({
            where: { id }
        });
        
        res.json({ success: true, message: 'Estimation supprimée avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'estimation:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la suppression de l\'estimation' 
        });
    }
});

// Routes pour les estimations
app.get('/api/stock/:date/:type/:pointVente/:categorie', async (req, res) => {
    console.log('=== ESTIMATION STOCK API REQUEST START ===');
    console.log('Request params:', req.params);
    
    try {
        const { date, type, pointVente, categorie } = req.params;
        
        if (!date || !type || !pointVente || !categorie) {
            console.warn('Missing required parameters:', { date, type, pointVente, categorie });
            return res.status(400).json({ 
                success: false,
                stock: 0,
                error: 'Missing required parameters'
            });
        }

        // Convertir la date du format DD-MM-YYYY vers YYYY-MM-DD pour le chemin
        let formattedDate = date;
        if (date.includes('-') && date.split('-')[0].length === 2) {
            // Format DD-MM-YYYY vers YYYY-MM-DD
            const parts = date.split('-');
            formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        
        if (type === 'transfert') {
            // Logique spéciale pour les transferts
            const filePath = path.join(__dirname, 'data', 'by-date', formattedDate, 'transferts.json');
            console.log('Looking for transfert file:', filePath);

            if (!fs.existsSync(filePath)) {
                console.log(`Transfert file not found: ${filePath}`);
                return res.json({ 
                    success: true,
                    transfert: 0,
                    message: 'No transfert data found for this date'
                });
            }

            const fileContent = await fsPromises.readFile(filePath, 'utf8');
            const transferts = JSON.parse(fileContent);
            
            // Calculer la somme des transferts pour ce produit et ce point de vente
            let totalTransfert = 0;
            transferts.forEach(transfert => {
                if (transfert.pointVente === pointVente && transfert.produit === categorie) {
                    const impact = parseInt(transfert.impact) || 1;
                    const quantite = parseFloat(transfert.quantite || 0);
                    totalTransfert += quantite * impact;
                }
            });

            console.log(`Total transfert for ${pointVente}-${categorie}:`, totalTransfert);
            res.json({ 
                success: true,
                transfert: totalTransfert
            });
        } else {
            // Logique pour stock matin et soir
            const filePath = path.join(__dirname, 'data', 'by-date', formattedDate, `stock-${type}.json`);
        console.log('Looking for stock file:', filePath);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.log(`Stock file not found: ${filePath}`);
            return res.json({ 
                success: true,
                stock: 0,
                message: 'No stock data found for this date'
            });
        }

        // Read and parse the JSON file
        const fileContent = await fsPromises.readFile(filePath, 'utf8');
        const data = JSON.parse(fileContent);
        
        // Look for the entry with the matching key format: pointVente-categorie
        const key = `${pointVente}-${categorie}`;
        console.log('Looking for stock entry with key:', key);
        
        const entry = data[key];
        console.log('Found stock entry:', entry);

        if (entry && entry.Nombre !== undefined) {
            const stockValue = parseFloat(entry.Nombre) || 0;
            console.log(`Stock value found for ${key}:`, stockValue);
            res.json({ 
                success: true,
                stock: stockValue
            });
        } else {
            console.log(`No stock value found for ${key}`);
            res.json({ 
                success: true,
                stock: 0,
                message: 'No stock value found'
            });
            }
        }
    } catch (error) {
        console.error('Error reading stock data:', error);
        res.status(500).json({ 
            success: false,
            stock: 0,
            error: error.message
        });
    }
    console.log('=== ESTIMATION STOCK API REQUEST END ===');
});

// Route pour calculer le stock du matin par produit
app.get('/api/stock/:date/matin/:pointVente/:produit', async (req, res) => {
    try {
        const { date, pointVente, produit } = req.params;
        
        if (!date || !pointVente || !produit) {
            return res.status(400).json({ 
                success: false, 
                message: 'Date, point de vente et produit sont requis' 
            });
        }

        // Convertir la date du format DD-MM-YYYY vers YYYY-MM-DD pour le chemin
        let formattedDate = date;
        if (date.includes('-') && date.split('-')[0].length === 2) {
            // Format DD-MM-YYYY vers YYYY-MM-DD
            const parts = date.split('-');
            formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        
        console.log(`[API Stock Matin] Date reçue: ${date}, Date formatée: ${formattedDate}`);
        
        // Lire les données depuis le fichier JSON
        const datePath = path.join(__dirname, 'data', 'by-date', formattedDate, 'stock-matin.json');
        console.log(`[API Stock Matin] Chemin du fichier: ${datePath}`);
        
        if (!fs.existsSync(datePath)) {
            console.log(`[API Stock Matin] Fichier non trouvé: ${datePath}`);
            return res.json({ 
                success: true, 
                stock: 0,
                message: 'No stock data found for this date'
            });
        }
        
        console.log(`[API Stock Matin] Fichier trouvé, lecture en cours...`);

        const fileContent = await fsPromises.readFile(datePath, 'utf8');
        const stockData = JSON.parse(fileContent);
        
        // Chercher directement la clé produit
        const key = `${pointVente}-${produit}`;
        let stockMatin = 0;
        
        if (stockData[key]) {
            stockMatin = parseFloat(stockData[key].Nombre || stockData[key].quantite || 0);
            }

        res.json({ success: true, stock: stockMatin });
    } catch (error) {
        console.error('Erreur lors du calcul du stock du matin:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors du calcul du stock du matin' 
        });
    }
});

// Route pour calculer le stock du soir par produit
app.get('/api/stock/:date/soir/:pointVente/:produit', async (req, res) => {
    try {
        const { date, pointVente, produit } = req.params;
        
        if (!date || !pointVente || !produit) {
            return res.status(400).json({ 
                success: false, 
                message: 'Date, point de vente et produit sont requis' 
            });
        }

        // Convertir la date du format DD-MM-YYYY vers YYYY-MM-DD pour le chemin
        let formattedDate = date;
        if (date.includes('-') && date.split('-')[0].length === 2) {
            // Format DD-MM-YYYY vers YYYY-MM-DD
            const parts = date.split('-');
            formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }

        // Lire les données depuis le fichier JSON
        const datePath = path.join(__dirname, 'data', 'by-date', formattedDate, 'stock-soir.json');
        
        if (!fs.existsSync(datePath)) {
            return res.json({ 
                success: true, 
                stock: 0,
                message: 'Aucune donnée de stock soir trouvée pour cette date'
            });
        }

        const fileContent = await fsPromises.readFile(datePath, 'utf8');
        const stockData = JSON.parse(fileContent);
        
        // Chercher directement la clé produit
        const key = `${pointVente}-${produit}`;
        let stockSoir = 0;
        
        if (stockData[key]) {
            stockSoir = parseFloat(stockData[key].Nombre || stockData[key].quantite || 0);
        }

        res.json({ 
            success: true, 
            stock: stockSoir
        });
    } catch (error) {
        console.error('Erreur lors du calcul du stock soir:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors du calcul du stock soir' 
        });
    }
});
        
// Route pour calculer les transferts par produit
app.get('/api/stock/:date/transfert/:pointVente/:produit', async (req, res) => {
    try {
        const { date, pointVente, produit } = req.params;
        
        if (!date || !pointVente || !produit) {
            return res.status(400).json({ 
                success: false, 
                message: 'Date, point de vente et produit sont requis pour les transferts' 
            });
        }

        // Convertir la date du format DD-MM-YYYY vers YYYY-MM-DD pour le chemin
        let formattedDate = date;
        if (date.includes('-') && date.split('-')[0].length === 2) {
            // Format DD-MM-YYYY vers YYYY-MM-DD
            const parts = date.split('-');
            formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        
        // Lire les données depuis le fichier JSON
        const datePath = path.join(__dirname, 'data', 'by-date', formattedDate, 'transferts.json');
        
        if (!fs.existsSync(datePath)) {
            return res.json({ 
                success: true, 
                transfert: 0,
                message: 'Aucune donnée de transfert trouvée pour cette date'
            });
        }

        const fileContent = await fsPromises.readFile(datePath, 'utf8');
        const transfertsData = JSON.parse(fileContent);

        // Calculer la somme des transferts pour ce produit spécifique et ce point de vente
        let totalTransfert = 0;
        transfertsData.forEach(transfert => {
            if (transfert.pointVente === pointVente && transfert.produit === produit) {
                const impact = parseInt(transfert.impact) || 1;
                const quantite = parseFloat(transfert.quantite || 0);
                totalTransfert += quantite * impact;
            }
        });

        res.json({ 
            success: true, 
            transfert: totalTransfert,
            message: transfertsData.length === 0 ? "Aucune donnée de transfert trouvée pour cette date" : ""
        });
    } catch (error) {
        console.error('Erreur lors du calcul des transferts:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors du calcul des transferts' 
        });
    }
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});

// API endpoint for showing estimation section
app.get('/api/show-estimation', checkAuth, checkReadAccess, async (req, res) => {
  console.log('Request to show estimation section received');
  res.json({ success: true, message: 'Estimation section should be shown' });
});

// =================== EXTERNAL API ENDPOINTS FOR RELEVANCE AI ===================

// External API version for ventes saisie by date
app.get('/api/external/ventes-date', validateApiKey, async (req, res) => {
    try {
        const { date, pointVente } = req.query;
        
        if (!date) {
            return res.status(400).json({ 
                success: false, 
                message: 'La date est requise' 
            });
        }
        
        console.log('==== EXTERNAL API - VENTES DATE ====');
        console.log('Recherche des ventes pour date:', date, 'et point de vente:', pointVente);
        
        const dateStandardisee = standardiserDateFormat(date);
        
        // Préparer les conditions de filtrage
        const whereConditions = { date: dateStandardisee };
        
        if (pointVente) {
            whereConditions.pointVente = pointVente;
        }
        
        // Récupérer les ventes depuis la base de données
        const ventes = await Vente.findAll({
            where: whereConditions
        });
        
        // Formater les données pour la réponse
        const formattedVentes = ventes.map(vente => {
            // Conversion explicite en nombres
            const prixUnit = parseFloat(vente.prixUnit) || 0;
            const nombre = parseFloat(vente.nombre) || 0;
            const montant = parseFloat(vente.montant) || 0;
            
            return {
                id: vente.id,
                date: vente.date,
                pointVente: vente.pointVente,
                categorie: vente.categorie,
                produit: vente.produit,
                prixUnit: prixUnit,
                nombre: nombre,
                montant: montant
            };
        });
        
        // Calculer le total par point de vente
        const totauxParPointVente = {};
        
        formattedVentes.forEach(vente => {
            const pv = vente.pointVente;
            if (!totauxParPointVente[pv]) {
                totauxParPointVente[pv] = 0;
            }
            // S'assurer que le montant est un nombre
            const montant = parseFloat(vente.montant) || 0;
            totauxParPointVente[pv] += montant;
        });
        
        console.log('==== FIN EXTERNAL API - VENTES DATE ====');
        
        res.json({ 
            success: true, 
            ventes: formattedVentes,
            totaux: totauxParPointVente
        });
    } catch (error) {
        console.error('Erreur lors de la recherche des ventes (API externe):', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la recherche des ventes',
            error: error.message
        });
    }
});

// External API version for stock information
app.get('/api/external/stock/:type', validateApiKey, async (req, res) => {
    try {
        const type = req.params.type;
        const date = req.query.date;
        const baseFilePath = type === 'matin' ? STOCK_MATIN_PATH : STOCK_SOIR_PATH;
        
        // Obtenir le chemin du fichier spécifique à la date
        const filePath = getPathByDate(baseFilePath, date);
        
        // Vérifier si le fichier existe
        if (!fs.existsSync(filePath)) {
            // Si le fichier n'existe pas, retourner un objet vide
            console.log(`Fichier de stock ${type} pour la date ${date} non trouvé, retour d'un objet vide`);
            return res.json({});
        }
        
        const data = await fsPromises.readFile(filePath, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        res.status(500).json({ error: 'Erreur lors du chargement des données' });
    }
});

// External API version for detailed stock information
app.get('/api/external/stock/:date/:type/:pointVente/:categorie', validateApiKey, async (req, res) => {
    try {
        const { date, type, pointVente, categorie } = req.params;
        
        if (!date || !type || !pointVente || !categorie) {
            console.warn('Missing required parameters:', { date, type, pointVente, categorie });
            return res.status(400).json({ 
                success: false,
                stock: 0,
                error: 'Paramètres requis manquants'
            });
        }

        // Obtenir le chemin du fichier
        const filePath = path.join(__dirname, 'data', 'by-date', date, `stock-${type}.json`);

        // Vérifier si le fichier existe
        if (!fs.existsSync(filePath)) {
            console.log(`Fichier stock non trouvé: ${filePath}`);
            return res.json({ 
                success: true,
                stock: 0,
                message: 'Aucune donnée de stock trouvée pour cette date'
            });
        }

        // Lire et parser le fichier JSON
        const fileContent = await fsPromises.readFile(filePath, 'utf8');
        const data = JSON.parse(fileContent);
        
        // Chercher l'entrée avec la clé correspondante: pointVente-categorie
        const key = `${pointVente}-${categorie}`;
        const entry = data[key];

        if (entry && entry.Nombre !== undefined) {
            const stockValue = parseFloat(entry.Nombre) || 0;
            res.json({ 
                success: true,
                stock: stockValue
            });
        } else {
            res.json({ 
                success: true,
                stock: 0,
                message: 'Aucune valeur de stock trouvée'
            });
        }
    } catch (error) {
        console.error('Erreur lors de la lecture des données de stock:', error);
        res.status(500).json({ 
            success: false,
            stock: 0,
            error: error.message
        });
    }
});

// External API version for transfer information
app.get('/api/external/transferts', validateApiKey, async (req, res) => {
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

// External API version for specific transfer information
app.get('/api/external/stock/:date/transfert/:pointVente/:categorie', validateApiKey, async (req, res) => {
    try {
        const { date, pointVente, categorie } = req.params;
        
        if (!date || !pointVente || !categorie) {
            return res.status(400).json({ 
                success: false, 
                message: 'Date, point de vente et catégorie sont requis pour les transferts' 
            });
        }

        const dateStandardisee = standardiserDateFormat(date);
        
        // Calculer les transferts pour la date et le point de vente donnés
        const transferts = await Transfert.findAll({
            where: {
                date: dateStandardisee,
                pointVente
            }
        });

        // Calculer la somme des transferts pour la catégorie donnée
        let totalTransfert = 0;
        transferts.forEach(t => {
            if (t.categorie === categorie) {
                totalTransfert += parseFloat(t.quantite) || 0;
            }
        });

        res.json({ 
            success: true, 
            transfert: totalTransfert,
            message: transferts.length === 0 ? "Aucune donnée de transfert trouvée pour cette date" : ""
        });
    } catch (error) {
        console.error('Erreur lors du calcul des transferts:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors du calcul des transferts' 
        });
    }
});

// External API version for cash payments
app.get('/api/external/cash-payments', validateApiKey, async (req, res) => {
    try {
        const { date } = req.query;
        
        // Validate input
        if (!date) {
            return res.status(400).json({ 
                success: false, 
                message: 'Date parameter is required (format: dd-mm-yyyy)' 
            });
        }
        
        console.log('==== EXTERNAL API - CASH PAYMENTS ====');
        console.log('Querying cash payments for date:', date);
        
        // Convert date from dd-mm-yyyy to yyyy-mm-dd for database query
        let sqlDate;
        try {
            const parts = date.split(/[-\/]/); // Handle both dash and slash formats
            if (parts.length !== 3) throw new Error('Invalid date format.');
            sqlDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
            
            // Validate the converted date
            if (isNaN(new Date(sqlDate).getTime())) {
                throw new Error('Invalid date after conversion.');
            }
        } catch (e) {
            console.error("Date format error:", e);
            return res.status(400).json({ 
                success: false, 
                message: `Invalid date format: ${date}. Use DD-MM-YYYY or DD/MM/YYYY.` 
            });
        }
        
        // Ensure the table exists
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS cash_payments (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                created_at TIMESTAMP NOT NULL,
                amount FLOAT NOT NULL,
                merchant_fee FLOAT,
                customer_fee FLOAT,
                customer_name VARCHAR(255),
                customer_phone VARCHAR(255),
                entete_trans_type VARCHAR(255),
                psp_name VARCHAR(255),
                payment_category VARCHAR(255),
                payment_means VARCHAR(255),
                payment_reference VARCHAR(255),
                merchant_reference VARCHAR(255),
                trn_status VARCHAR(255),
                tr_id VARCHAR(255),
                cust_country VARCHAR(255),
                aggregation_mt VARCHAR(255),
                total_nom_marchand VARCHAR(255),
                total_marchand VARCHAR(255),
                merchant_id VARCHAR(255),
                name_first VARCHAR(255),
                point_de_vente VARCHAR(255),
                date DATE,
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Query the database for the specified date
        const result = await sequelize.query(`
            SELECT point_de_vente, SUM(amount) as total
            FROM cash_payments
            WHERE date = :date
            GROUP BY point_de_vente
            ORDER BY point_de_vente
        `, {
            replacements: { date: sqlDate },
            type: sequelize.QueryTypes.SELECT
        });
        
        // Format response to match the internal API structure
        const formattedResponse = {
            date: sqlDate,
            points: result.map(item => ({
                point: item.point_de_vente,
                total: parseFloat(item.total) || 0
            }))
        };
        
        console.log(`Found ${formattedResponse.points.length} cash payment entries for date ${sqlDate}`);
        console.log('==== END EXTERNAL API - CASH PAYMENTS ====');
        
        res.json({
            success: true,
            data: formattedResponse
        });
    } catch (error) {
        console.error('Error retrieving cash payment data (External API):', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error retrieving cash payment data',
            error: error.message
        });
    }
});

// External API version for reconciliation
app.get('/api/external/reconciliation', validateApiKey, async (req, res) => {
    try {
        const { date } = req.query;
        
        // Validate input
        if (!date) {
            return res.status(400).json({ 
                success: false, 
                message: 'Date parameter is required (format: dd-mm-yyyy or dd/mm/yyyy)' 
            });
        }
        
        console.log('==== EXTERNAL API - RECONCILIATION ====');
        console.log('Computing reconciliation for date:', date);
        
        // Get stock type parameter value for stock endpoints
        const typeParam = { type: 'matin' };
        const typeParamSoir = { type: 'soir' };
        
        // Use a safer approach with proper HTTP requests
        const axiosInstance = require('axios').create({
            baseURL: `http://localhost:${PORT}`,
            headers: {
                'X-API-Key': req.headers['x-api-key']
            }
        });
        
        // Function to safely make HTTP requests to our own API endpoints
        const fetchData = async (endpoint, params = {}) => {
            try {
                console.log(`Fetching data from ${endpoint} with params:`, params);
                const response = await axiosInstance.get(endpoint, { params });
                return response.data;
            } catch (error) {
                console.error(`Error fetching ${endpoint}:`, error.message);
                throw new Error(`Failed to fetch data from ${endpoint}: ${error.message}`);
            }
        };
        
        // Fetch all necessary data in parallel
        const [ventesData, stockMatinData, stockSoirData, cashData, transfertsData] = await Promise.all([
            fetchData('/api/external/ventes-date', { date }),
            fetchData('/api/external/stock/matin', { date }),  
            fetchData('/api/external/stock/soir', { date }),   
            fetchData('/api/external/cash-payments', { date }),
            fetchData('/api/external/transferts', { date })
        ]);
        
        // Debug logging
        console.log('Successfully fetched all necessary data');
        console.log('Stock Matin Data Structure:', JSON.stringify(stockMatinData).substring(0, 200) + '...');
        console.log('Stock Soir Data Structure:', JSON.stringify(stockSoirData).substring(0, 200) + '...');
        console.log('Transferts Data Structure:', JSON.stringify(transfertsData).substring(0, 200) + '...');
        
        // Fonction de mapping centralisée pour uniformiser les catégories
        function mapToCanonicalCategory(rawCategory) {
            if (!rawCategory || typeof rawCategory !== 'string') {
                return 'Non spécifié';
            }
            const normalized = rawCategory.trim().toLowerCase();

            if (normalized.includes('boeuf')) return 'Boeuf';
            if (normalized.includes('veau')) return 'Veau';
            if (normalized.includes('poulet')) return 'Poulet';
            if (normalized.includes('volaille')) return 'Volaille';
            if (normalized.includes('bovin')) return 'Bovin';

            // Comportement par défaut : nettoie la chaîne (Majuscule au début)
            return rawCategory.trim().charAt(0).toUpperCase() + rawCategory.trim().slice(1).toLowerCase();
        }
        
        // Prepare structures for aggregation
        const reconciliationByPDV = {};
        const detailsByPDV = {};
        
        // Dynamically get all categories and points of sale
        const allCategories = produitsInventaire.getTousLesProduits();
        const allPDVs = Object.keys(pointsVente).filter(pdv => pointsVente[pdv].active);

        allPDVs.forEach(pdv => {
            detailsByPDV[pdv] = {};
            allCategories.forEach(cat => {
                detailsByPDV[pdv][cat] = {
                    stockMatin: 0,
                    stockSoir: 0,
                    transferts: 0,
                    ventesTheoriques: 0,
                    ventesSaisies: 0
                };
            });
        });
        
        // Processing sales data for each point de vente
        if (ventesData.success && ventesData.ventes) {
            // Group sales by point de vente and category
            ventesData.ventes.forEach(vente => {
                const pdv = vente.pointVente;
                const category = mapToCanonicalCategory(vente.categorie);
                const montant = parseFloat(vente.montant) || 0;
                
                // Initialize point de vente if not exists
                if (!reconciliationByPDV[pdv]) {
                    reconciliationByPDV[pdv] = {
                        pointVente: pdv,
                        stockMatin: 0,
                        stockSoir: 0,
                        transferts: 0,
                        ventesTheoriques: 0,
                        ventesSaisies: 0,
                        cashPayments: 0,
                        ecart: 0,
                        ecartPct: 0,
                        ecartCash: 0,
                        ecartCashPct: 0
                    };
                }
                
                // Initialize details if not exists
                if (!detailsByPDV[pdv]) {
                    detailsByPDV[pdv] = {};
                }
                
                // Initialize category if not exists
                if (!detailsByPDV[pdv][category]) {
                    detailsByPDV[pdv][category] = {
                        stockMatin: 0,
                        stockSoir: 0,
                        transferts: 0,
                        ventesTheoriques: 0,
                        ventesSaisies: 0
                    };
                }
                
                // Add sales amount
                reconciliationByPDV[pdv].ventesSaisies += montant;
                detailsByPDV[pdv][category].ventesSaisies += montant;
            });
        }
        
        console.log("After Ventes:", JSON.stringify(detailsByPDV['Sacre Coeur']?.['Boeuf']));
        
        // Processing stock-matin data - handles the format from stock API
        if (stockMatinData && typeof stockMatinData === 'object') {
            // Log a sample of keys to help debug
            const sampleKeys = Object.keys(stockMatinData).slice(0, 3);
            console.log('Sample stock matin keys:', sampleKeys);
            
            Object.entries(stockMatinData).forEach(([key, entry]) => {
                // Try different approaches to identify PDV and category
                let pdv, category;
                
                if (key.includes('-')) {
                    [pdv, category] = key.split('-');
                } else if (entry && entry.pointVente && entry.categorie) {
                    pdv = entry.pointVente;
                    category = entry.categorie;
                } else {
                    console.log('Skipping unknown stock entry format:', key);
                    return; // Skip this entry
                }
                
                // Appliquer le mapping de catégorie
                category = mapToCanonicalCategory(category);
                
                // Try different approaches to get stock value and price
                let stockValue = 0;
                let prixUnit = 0;
                
                if (entry.Nombre !== undefined) {
                    stockValue = parseFloat(entry.Nombre) || 0;
                    prixUnit = parseFloat(entry['Prix unitaire'] || entry.PU) || 0;
                } else if (entry.nombre !== undefined) {
                    stockValue = parseFloat(entry.nombre) || 0;
                    prixUnit = parseFloat(entry.prixUnit || entry.prixUnitaire || entry.prix || entry.PU) || 0;
                } else if (entry.quantite !== undefined) {
                    stockValue = parseFloat(entry.quantite) || 0;
                    prixUnit = parseFloat(entry.prixUnit || entry.prixUnitaire || entry.prix || entry.PU) || 0;
                }
                
                // If we have the Montant directly, that's even better
                let montant = 0;
                if (entry.Montant !== undefined) {
                    montant = parseFloat(entry.Montant) || 0;
                } else if (entry.montant !== undefined) {
                    montant = parseFloat(entry.montant) || 0;
                } else {
                    // Calculate from stock value and price
                    montant = stockValue * prixUnit;
                }
                
                // Log to debug
                if (montant > 0) {
                    console.log(`Adding stock matin for ${pdv}/${category}: ${stockValue} * ${prixUnit} = ${montant}`);
                }
                
                // Initialize point de vente if not exists
                if (!reconciliationByPDV[pdv]) {
                    reconciliationByPDV[pdv] = {
                        pointVente: pdv,
                        stockMatin: 0,
                        stockSoir: 0,
                        transferts: 0,
                        ventesTheoriques: 0,
                        ventesSaisies: 0,
                        cashPayments: 0,
                        ecart: 0,
                        ecartPct: 0,
                        ecartCash: 0,
                        ecartCashPct: 0
                    };
                }
                
                // Initialize details if not exists
                if (!detailsByPDV[pdv]) {
                    detailsByPDV[pdv] = {};
                }
                
                // Initialize category if not exists
                if (!detailsByPDV[pdv][category]) {
                    detailsByPDV[pdv][category] = {
                        stockMatin: 0,
                        stockSoir: 0,
                        transferts: 0,
                        ventesTheoriques: 0,
                        ventesSaisies: 0
                    };
                }
                
                // Add stock-matin value
                reconciliationByPDV[pdv].stockMatin += montant;
                detailsByPDV[pdv][category].stockMatin += montant;
            });
        }
        
        console.log("After Stock Matin:", JSON.stringify(detailsByPDV['Sacre Coeur']?.['Boeuf']));
        
        // Processing stock-soir data - handles the format from stock API
        if (stockSoirData && typeof stockSoirData === 'object') {
            // Log a sample of keys to help debug
            const sampleKeys = Object.keys(stockSoirData).slice(0, 3);
            console.log('Sample stock soir keys:', sampleKeys);
            
            Object.entries(stockSoirData).forEach(([key, entry]) => {
                // Try different approaches to identify PDV and category
                let pdv, category;
                
                if (key.includes('-')) {
                    [pdv, category] = key.split('-');
                } else if (entry && entry.pointVente && entry.categorie) {
                    pdv = entry.pointVente;
                    category = entry.categorie;
                } else {
                    console.log('Skipping unknown stock entry format:', key);
                    return; // Skip this entry
                }
                
                // Appliquer le mapping de catégorie
                category = mapToCanonicalCategory(category);
                
                // Try different approaches to get stock value and price
                let stockValue = 0;
                let prixUnit = 0;
                
                if (entry.Nombre !== undefined) {
                    stockValue = parseFloat(entry.Nombre) || 0;
                    prixUnit = parseFloat(entry['Prix unitaire']) || 0;
                } else if (entry.nombre !== undefined) {
                    stockValue = parseFloat(entry.nombre) || 0;
                    prixUnit = parseFloat(entry.prixUnit || entry.prixUnitaire || entry.prix || entry.PU) || 0;
                } else if (entry.quantite !== undefined) {
                    stockValue = parseFloat(entry.quantite) || 0;
                    prixUnit = parseFloat(entry.prixUnit || entry.prixUnitaire || entry.prix || entry.PU) || 0;
                }
                
                // If we have the Montant directly, that's even better
                let montant = 0;
                if (entry.Montant !== undefined) {
                    montant = parseFloat(entry.Montant) || 0;
                } else if (entry.montant !== undefined) {
                    montant = parseFloat(entry.montant) || 0;
                } else {
                    // Calculate from stock value and price
                    montant = stockValue * prixUnit;
                }
                
                // Log to debug
                if (montant > 0) {
                    console.log(`Adding stock soir for ${pdv}/${category}: ${stockValue} * ${prixUnit} = ${montant}`);
                }
                
                // Initialize point de vente if not exists
                if (!reconciliationByPDV[pdv]) {
                    reconciliationByPDV[pdv] = {
                        pointVente: pdv,
                        stockMatin: 0,
                        stockSoir: 0,
                        transferts: 0,
                        ventesTheoriques: 0,
                        ventesSaisies: 0,
                        cashPayments: 0,
                        ecart: 0,
                        ecartPct: 0,
                        ecartCash: 0,
                        ecartCashPct: 0
                    };
                }
                
                // Initialize details if not exists
                if (!detailsByPDV[pdv]) {
                    detailsByPDV[pdv] = {};
                }
                
                // Initialize category if not exists
                if (!detailsByPDV[pdv][category]) {
                    detailsByPDV[pdv][category] = {
                        stockMatin: 0,
                        stockSoir: 0,
                        transferts: 0,
                        ventesTheoriques: 0,
                        ventesSaisies: 0
                    };
                }
                
                // Add stock-soir value
                reconciliationByPDV[pdv].stockSoir += montant;
                detailsByPDV[pdv][category].stockSoir += montant;
            });
        }
        
        console.log("After Stock Soir:", JSON.stringify(detailsByPDV['Sacre Coeur']?.['Boeuf']));
        
        // Processing transfers data
        // Ajout d'une fonction utilitaire pour mapper les catégories de transferts
        function mapTransfertCategory(rawCategory) {
            if (!rawCategory) return 'Non spécifié';
            const normalized = rawCategory.trim().toLowerCase();
            if (normalized === 'boeuf' || normalized.includes('boeuf')) return 'Boeuf';
            if (normalized === 'poulet' || normalized.includes('poulet')) return 'Poulet';
            if (normalized === 'volaille' || normalized.includes('volaille')) return 'Volaille';
            if (normalized === 'bovin' || normalized.includes('bovin')) return 'Bovin';
            // Par défaut, retourne la première lettre en majuscule, le reste en minuscule
            return rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1).toLowerCase();
        }
        if (transfertsData.success && transfertsData.transferts) {
            console.log('Processing transfers:', transfertsData.transferts.length);
            
            transfertsData.transferts.forEach(transfert => {
                // =============== FINAL DEBUG LOG ===============
                console.log('Inspecting transfert object:', JSON.stringify(transfert));
                // ===============================================

                const pdv = transfert.pointVente;
                const category = mapToCanonicalCategory(transfert.produit);
                
                // Get the total directly from the transfer object
                let montant = 0;
                if (transfert.total !== undefined) {
                    montant = parseFloat(transfert.total) || 0;
                    console.log(`Using total field for ${pdv}: ${montant}`);
                } else if (transfert.montant !== undefined) {
                    montant = parseFloat(transfert.montant) || 0;
                } else if (transfert.quantite !== undefined && transfert.prixUnitaire !== undefined) {
                    const quantite = parseFloat(transfert.quantite) || 0;
                    const prixUnitaire = parseFloat(transfert.prixUnitaire) || 0;
                    montant = quantite * prixUnitaire;
                }
                
                // Skip if we couldn't determine a montant
                if (montant === 0) {
                    console.log('Skipping transfer with zero montant:', transfert);
                    return;
                }
                
                // Log to debug
                console.log(`Processing transfer for ${pdv}/${category}: ${montant} (impact: ${transfert.impact || 'undefined'})`);
                
                // Initialize point de vente if not exists
                if (!reconciliationByPDV[pdv]) {
                    reconciliationByPDV[pdv] = {
                        pointVente: pdv,
                        stockMatin: 0,
                        stockSoir: 0,
                        transferts: 0,
                        ventesTheoriques: 0,
                        ventesSaisies: 0,
                        cashPayments: 0,
                        ecart: 0,
                        ecartPct: 0,
                        ecartCash: 0,
                        ecartCashPct: 0
                    };
                }
                
                // Initialize details if not exists
                if (!detailsByPDV[pdv]) {
                    detailsByPDV[pdv] = {};
                }
                
                // Initialize category if not exists
                if (!detailsByPDV[pdv][category]) {
                    detailsByPDV[pdv][category] = {
                        stockMatin: 0,
                        stockSoir: 0,
                        transferts: 0,
                        ventesTheoriques: 0,
                        ventesSaisies: 0
                    };
                }
                
                // Add transfer value - consider the impact direction
                // Transfers should be positive for Mbao and O.Foire (receiving points)
                // For Abattage (source point), transfers should be negative
               /* Not needed anymore
               let impactValue;
                
                // Special logic for specific points de vente
                if (pdv === 'Mbao' || pdv === 'O.Foire') {
                    // For these PDVs, transfers should be positive values as they are receiving
                    impactValue = Math.abs(montant);
                } else if (pdv === 'Abattage') {
                    // For Abattage (source), transfers should be negative
                    impactValue = -Math.abs(montant);
                } else {
                    // For other PDVs, follow the impact indicator
                    impactValue = (transfert.impact === 'positif' || transfert.impact === true || transfert.impact === 1) ? 
                                 montant : -montant;
                }
                
                console.log(`Adding transfer for ${pdv}: ${impactValue} (final value after impact logic)`);*/
                
                reconciliationByPDV[pdv].transferts += montant;
                if(detailsByPDV[pdv] && detailsByPDV[pdv][category]) {
                detailsByPDV[pdv][category].transferts += montant;
                }
            });
        }
        
        console.log("After Transferts:", JSON.stringify(detailsByPDV['Sacre Coeur']?.['Boeuf']));
        
        // Processing cash payments data
        if (cashData.success && cashData.data && cashData.data.points) {
            console.log('Processing cash payments:', cashData.data.points.length);
            
            cashData.data.points.forEach(payment => {
                const pdv = payment.point;
                const montant = parseFloat(payment.total) || 0;
                
                // Log to debug
                console.log(`Adding cash payment for ${pdv}: ${montant}`);
                
                // Initialize point de vente if not exists
                if (!reconciliationByPDV[pdv]) {
                    reconciliationByPDV[pdv] = {
                        pointVente: pdv,
                        stockMatin: 0,
                        stockSoir: 0,
                        transferts: 0,
                        ventesTheoriques: 0,
                        ventesSaisies: 0,
                        cashPayments: 0,
                        ecart: 0,
                        ecartPct: 0,
                        ecartCash: 0,
                        ecartCashPct: 0
                    };
                }
                
                // Add cash payment value
                reconciliationByPDV[pdv].cashPayments += montant;
            });
        }
        
        // Calculate derived values for each point de vente
        Object.values(reconciliationByPDV).forEach(pdvData => {
            // Calculate theoretical sales
            pdvData.ventesTheoriques = pdvData.stockMatin - pdvData.stockSoir + pdvData.transferts;
            
            // Calculate gaps
            pdvData.ecart = pdvData.ventesTheoriques - pdvData.ventesSaisies;
            pdvData.ecartCash = pdvData.cashPayments - pdvData.ventesSaisies;
            
            // Calculate percentages
            const stockVariation = Math.abs(pdvData.ventesTheoriques);
            pdvData.ecartPct = stockVariation > 0 ? (Math.abs(pdvData.ecart) / stockVariation * 100).toFixed(2) : 0;
            
            const cashTotal = Math.abs(pdvData.cashPayments);
            pdvData.ecartCashPct = cashTotal > 0 ? (Math.abs(pdvData.ecartCash) / cashTotal * 100).toFixed(2) : 0;
            
            // Log summary for this PDV
            console.log(`Summary for ${pdvData.pointVente}: Stock Matin=${pdvData.stockMatin}, Stock Soir=${pdvData.stockSoir}, Transferts=${pdvData.transferts}, VentesTheoriques=${pdvData.ventesTheoriques}, VentesSaisies=${pdvData.ventesSaisies}, Cash=${pdvData.cashPayments}`);
        });
        
        // Calculate derived values for detail categories
        Object.entries(detailsByPDV).forEach(([pdv, categories]) => {
            Object.entries(categories).forEach(([category, data]) => {
                // Calculate theoretical sales for each category
                data.ventesTheoriques = data.stockMatin - data.stockSoir + data.transferts;
            });
        });
        
        // Format the response
        const formattedResponse = {
            date: date,
            resume: Object.values(reconciliationByPDV),
            details: detailsByPDV
        };
        
        console.log(`Completed reconciliation for ${date} with ${formattedResponse.resume.length} points de vente`);
        console.log('==== END EXTERNAL API - RECONCILIATION ====');
        
        res.json({
            success: true,
            data: formattedResponse
        });
    } catch (error) {
        console.error('Error computing reconciliation (External API):', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error computing reconciliation data',
            error: error.message
        });
    }
});

// External API version for beef purchases
app.get('/api/external/achats-boeuf', validateApiKey, async (req, res) => {
    try {
        const { startDate, endDate, date } = req.query;
        
        console.log('==== EXTERNAL API - ACHATS BOEUF ====');
        
        let whereConditions = {};
        
        // If a specific date is provided, use it
        if (date) {
            const formattedDate = standardiserDateFormat(date);
            console.log('Querying beef purchases for date:', formattedDate);
            whereConditions.date = formattedDate;
        } 
        // If date range is provided
        else if (startDate && endDate) {
            const formattedStartDate = standardiserDateFormat(startDate);
            const formattedEndDate = standardiserDateFormat(endDate);
            console.log('Querying beef purchases for date range:', formattedStartDate, 'to', formattedEndDate);
            whereConditions.date = {
                [Op.between]: [formattedStartDate, formattedEndDate]
            };
        }
        
        // Get all beef purchases matching the conditions
        const achats = await AchatBoeuf.findAll({
            where: whereConditions,
            order: [['date', 'DESC']],
        });
        
        // Format the data for response
        const formattedAchats = achats.map(achat => ({
            id: achat.id,
            date: achat.date,
            mois: achat.mois,
            annee: achat.annee,
            bete: achat.bete,
            prix: parseFloat(achat.prix) || 0,
            abats: parseFloat(achat.abats) || 0,
            frais_abattage: parseFloat(achat.frais_abattage) || 0,
            nbr_kg: parseFloat(achat.nbr_kg) || 0,
            prix_achat_kg: parseFloat(achat.prix_achat_kg) || 0,
            commentaire: achat.commentaire,
            nomClient: achat.nomClient,           // Add new field
            numeroClient: achat.numeroClient,        // Add new field
            telephoneClient: achat.telephoneClient,     // Add new field
            adresseClient: achat.adresseClient,       // Add new field
            creance: achat.creance              // Add new field
        }));
        
        // Calculate totals
        const totals = {
            totalPrix: formattedAchats.reduce((sum, achat) => sum + achat.prix, 0),
            totalAbats: formattedAchats.reduce((sum, achat) => sum + achat.abats, 0),
            totalFraisAbattage: formattedAchats.reduce((sum, achat) => sum + achat.frais_abattage, 0),
            totalKg: formattedAchats.reduce((sum, achat) => sum + achat.nbr_kg, 0),
        };
        
        // Calculate average price per kg if there are kgs
        if (totals.totalKg > 0) {
            totals.avgPrixKg = totals.totalPrix / totals.totalKg;
        } else {
            totals.avgPrixKg = 0;
        }
        
        console.log(`Found ${formattedAchats.length} beef purchase entries`);
        console.log('==== END EXTERNAL API - ACHATS BOEUF ====');
        
        res.json({
            success: true,
            data: {
                achats: formattedAchats,
                totals: totals
            }
        });
    } catch (error) {
        console.error('Error retrieving beef purchase data (External API):', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error retrieving beef purchase data',
            error: error.message
        });
    }
});

// External API version for reconciliation
// ... existing code ...

// Route pour obtenir le prix moyen pondéré des ventes
app.get('/api/prix-moyen', async (req, res) => {
    try {
        const { type, date, pointVente } = req.query;

        // Validation des paramètres obligatoires
        if (!type || !date) {
            return res.status(400).json({
                success: false,
                message: 'Le type (boeuf/veau) et la date sont obligatoires'
            });
        }

        // Standardiser la date au format utilisé dans la base de données
        const dateStandardisee = standardiserDateFormat(date);

        // Définir les produits à rechercher selon le type
        const produits = type.toLowerCase() === 'boeuf' 
            ? ['Boeuf en détail', 'Boeuf en gros']
            : ['Veau en détail', 'Veau en gros'];

        // Construire la requête de base
        let query = {
            attributes: [
                'date',
                [sequelize.literal(`
                    ROUND(
                        COALESCE(
                            (SUM("nombre" * "prix_unit") / NULLIF(SUM("nombre"), 0))::numeric,
                            0
                        ),
                    2)
                `), 'prix_moyen_pondere']
            ],
            where: {
                produit: {
                    [Op.in]: produits
                },
                date: dateStandardisee
            },
            group: ['date'],
            order: [['date', 'ASC']]
        };

        // Ajouter le filtre par point de vente si spécifié
        if (pointVente) {
            query.where.point_vente = pointVente;
            query.attributes.push('point_vente');
            query.group.push('point_vente');
            query.order.push(['point_vente', 'ASC']);
        }

        const result = await Vente.findAll(query);

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Erreur lors du calcul du prix moyen:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du calcul du prix moyen',
            error: error.message
        });
    }
});

// ... existing code ...

// Test endpoint for price calculation
app.get('/api/test-prix-moyen', checkAuth, async (req, res) => {
    try {
        // Sample data for testing
        const sampleData = {
            success: true,
            data: [
                {
                    date: "2025-03-27",
                    prix_moyen_pondere: 1250.75,
                    point_vente: "O.Foire"
                },
                {
                    date: "2025-03-27",
                    prix_moyen_pondere: 1300.25,
                    point_vente: "Mbao"
                }
            ],
            test_info: {
                endpoint: "/api/prix-moyen",
                parameters: {
                    type: "boeuf ou veau",
                    date: "YYYY-MM-DD",
                    pointVente: "optionnel"
                },
                example_requests: [
                    "/api/prix-moyen?type=boeuf&date=2025-03-27",
                    "/api/prix-moyen?type=veau&date=2025-03-27&pointVente=O.Foire"
                ]
            }
        };

        res.json(sampleData);
    } catch (error) {
        console.error('Erreur lors du test du prix moyen:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du test du prix moyen',
            error: error.message
        });
    }
});

// ... existing code ...

app.get('/api/points-vente', (req, res) => {
    try {
        const activePointsVente = Object.entries(pointsVente)
            .filter(([_, properties]) => properties.active)
            .map(([name, _]) => name);
        res.json(activePointsVente);
    } catch (error) {
        console.error("Erreur lors de la lecture des points de vente :", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});