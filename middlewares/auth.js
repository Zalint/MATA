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
    if (!req.user.canRead) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }
    next();
};

/**
 * Middleware de vérification des droits d'écriture
 * Vérifie si l'utilisateur peut modifier les données (user, admin)
 */
const checkWriteAccess = (req, res, next) => {
    if (!req.user.canWrite) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé - Lecture seule' });
    }
    next();
};

/**
 * Middleware de vérification des droits de super admin
 * Vérifie si l'utilisateur est un super admin
 */
const checkSuperAdmin = (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }
    next();
};

/**
 * Middleware de vérification des droits de superviseur
 * Vérifie si l'utilisateur a les droits de superviseur
 */
const checkSupervisorAccess = (req, res, next) => {
    if (!req.user.canSupervise) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé - Niveau superviseur requis' });
    }
    next();
};

/**
 * Middleware de vérification des droits avancés
 * Vérifie si l'utilisateur a les droits superutilisateur
 */
const checkAdvancedAccess = (req, res, next) => {
    if (!req.user.canManageAdvanced) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé - Niveau superutilisateur requis' });
    }
    next();
};

/**
 * Middleware de vérification des droits de copie de stock
 */
const checkCopyStockAccess = (req, res, next) => {
    if (!req.user.canCopyStock) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé - Fonction réservée aux superutilisateurs' });
    }
    next();
};

/**
 * Middleware de vérification des droits d'estimation
 */
const checkEstimationAccess = (req, res, next) => {
    if (!req.user.canManageEstimation) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé - Fonction réservée aux superutilisateurs' });
    }
    next();
};

/**
 * Middleware de vérification des droits de réconciliation
 */
const checkReconciliationAccess = (req, res, next) => {
    if (!req.user.canManageReconciliation) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé - Niveau superviseur requis' });
    }
    next();
};

module.exports = {
    checkAuth,
    checkAdmin,
    checkSuperAdmin,
    checkReadAccess,
    checkWriteAccess,
    checkSupervisorAccess,
    checkAdvancedAccess,
    checkCopyStockAccess,
    checkEstimationAccess,
    checkReconciliationAccess
}; 