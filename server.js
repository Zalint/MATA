﻿// Load environment variables
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
const bcrypt = require('bcrypt');
const fsPromises = require('fs').promises;
const { Vente, Stock, Transfert, Reconciliation, CashPayment, AchatBoeuf } = require('./db/models');
const { testConnection, sequelize } = require('./db');
const { Op, fn, col, literal } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const Estimation = require('./db/models/Estimation');

const app = express();
const PORT = process.env.PORT || 3000;

// Make sure Estimation is properly initialized
console.log('Initializing models...');
console.log('Estimation model:', !!Estimation);
console.log('Estimation.create:', typeof Estimation.create === 'function' ? 'function available' : 'NOT AVAILABLE');

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

// Constantes pour le mappage des références de paiement aux points de vente
const PAYMENT_REF_TO_PDV = {
  'V_TB': 'Touba',
  'V_DHR': 'Dahra',
  'V_ALS': 'Aliou Sow',
  'V_LGR': 'Linguere',
  'V_MBA': 'Mbao',
  'V_KM': 'Keur Massar',
  'V_OSF': 'O.Foire'
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
        res.json({
            success: true,
            user: {
                username: req.session.user.username,
                role: req.session.user.role,
                pointVente: req.session.user.pointVente
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

// Route pour ajouter des ventes
app.post('/api/ventes', checkAuth, async (req, res) => {
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
                montant: montant
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
            Montant: vente.montant
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
            montant: updatedVente.total
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
            Montant: v.montant
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
app.get('/api/ventes', checkAuth, async (req, res) => {
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
                Montant: vente.montant
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
            Montant: vente.montant
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
app.get('/api/dernieres-ventes', checkAuth, async (req, res) => {
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
            Montant: vente.montant
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
app.get('/api/stock/:type', async (req, res) => {
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
                Montant: montant
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
app.post('/api/reconciliation/save', checkAuth, async (req, res) => {
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

app.get('/api/reconciliation/load', checkAuth, async (req, res) => {
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
app.post('/api/cash-payments/import', checkAuth, async (req, res) => {
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
            'V_ABATS': 'Autres'
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
            const pointDeVente = paymentRefToPointDeVente[item.payment_reference] || 'Non spécifié';
            
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

app.get('/api/cash-payments/aggregated', checkAuth, async (req, res) => {
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

app.delete('/api/cash-payments/clear', checkAuth, async (req, res) => {
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

// ===========================================================================
// SUIVI ACHAT BOEUF - PostgreSQL Implementation
// ===========================================================================

// GET endpoint to retrieve beef purchase data
app.get('/api/achats-boeuf', checkAuth, async (req, res) => {
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
app.post('/api/achats-boeuf', checkAuth, async (req, res) => {
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
app.delete('/api/achats-boeuf/:id', checkAuth, async (req, res) => {
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
app.get('/api/categories', checkAuth, async (req, res) => {
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
app.get('/api/stock-soir', checkAuth, async (req, res) => {
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
app.post('/api/estimations', checkAuth, async (req, res) => {
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
app.get('/api/estimations', checkAuth, async (req, res) => {
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
app.delete('/api/estimations/:id', checkAuth, async (req, res) => {
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
app.get('/api/stock/:date/:type/:pointVente/:categorie', checkAuth, async (req, res) => {
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

        // Get the file path
        const filePath = path.join(__dirname, 'data', 'by-date', date, `stock-${type}.json`);
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

// Route pour calculer le stock du matin
app.get('/api/stock/:date/matin/:pointVente/:categorie', checkAuth, async (req, res) => {
    try {
        const { date, pointVente, categorie } = req.params;
        
        if (!date || !pointVente || !categorie) {
            return res.status(400).json({ 
                success: false, 
                message: 'Date, point de vente et catégorie sont requis' 
            });
        }

        const dateStandardisee = standardiserDateFormat(date);
        
        // Calculer le stock du matin pour la date et le point de vente donnés
        const stock = await Stock.findAll({
            where: {
                date: dateStandardisee,
                pointVente,
                typeStock: 'matin'
            }
        });

        // Calculer la somme du stock pour la catégorie donnée
        let stockMatin = 0;
        stock.forEach(s => {
            if (s.categorie === categorie) {
                stockMatin += parseFloat(s.quantite) || 0;
            }
        });

        res.json({ success: true, stock: stockMatin });
    } catch (error) {
        console.error('Erreur lors du calcul du stock du matin:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors du calcul du stock du matin' 
        });
    }
});

// Route pour calculer les transferts
app.get('/api/stock/:date/transfert/:pointVente/:categorie', checkAuth, async (req, res) => {
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

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});

// API endpoint for showing estimation section
app.get('/api/show-estimation', (req, res) => {
  console.log('Request to show estimation section received');
  res.json({ success: true, message: 'Estimation section should be shown' });
});