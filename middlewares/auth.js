/**
 * Middlewares d'authentification
 */

/**
 * Middleware de vérification d'authentification
 * Vérifie si l'utilisateur est connecté
 */
const checkAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Non authentifié' });
    }
    req.user = req.session.user;
    next();
};

/**
 * Middleware de vérification des droits d'admin
 * Vérifie si l'utilisateur est un admin
 */
const checkAdmin = (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }
    next();
};

/**
 * Middleware de vérification des droits de lecture
 * Vérifie si l'utilisateur peut lire les données (lecteur, user, admin)
 */
const checkReadAccess = (req, res, next) => {
    if (!req.user.role || (req.user.role !== 'lecteur' && req.user.role !== 'user' && req.user.role !== 'admin')) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }
    next();
};

/**
 * Middleware de vérification des droits d'écriture
 * Vérifie si l'utilisateur peut modifier les données (user, admin)
 */
const checkWriteAccess = (req, res, next) => {
    if (!req.user.role || (req.user.role !== 'user' && req.user.role !== 'admin')) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé - Lecture seule' });
    }
    next();
};

/**
 * Middleware de vérification des droits de super admin
 * Vérifie si l'utilisateur est un super admin
 */
const checkSuperAdmin = (req, res, next) => {
    if (!req.user.isSuperAdmin) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }
    next();
};

module.exports = {
    checkAuth,
    checkAdmin,
    checkSuperAdmin,
    checkReadAccess,
    checkWriteAccess
}; 