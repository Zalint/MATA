/**
 * Routes pour l'authentification
 */

const express = require('express');
const router = express.Router();
const users = require('../users');
const { checkAuth } = require('../middlewares/auth');

/**
 * Route pour la connexion
 * POST /api/login
 */
router.post('/login', async (req, res) => {
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

/**
 * Route pour la déconnexion
 * POST /api/logout
 */
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Erreur lors de la déconnexion:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la déconnexion' });
        }
        res.json({ success: true });
    });
});

/**
 * Route pour vérifier la session
 * GET /api/check-session
 */
router.get('/check-session', (req, res) => {
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

module.exports = router; 