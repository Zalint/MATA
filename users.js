const bcrypt = require('bcrypt');

// Liste des utilisateurs avec leurs mots de passe hachés
const users = [
    {
        username: 'ADMIN',
        password: '$2b$10$4W650UJUiyI5tN5bOUJc5eQGZQktwHwIlXQ3N8e0L0CaBhd6vPnLO',
        role: 'admin',
        pointVente: 'tous'
    },
    {
        username: 'MBA',
        password: '$2b$10$U2qh70byuyCmn4Ri/eqk9.htN7feiHBPLRbrRqE3HGn8NVXmPn.va',
        role: 'user',
        pointVente: 'Mbao'
    },
    {
        username: 'OSF',
        password: '$2b$10$1Krqxz/lvZ5xshqpCMLD6O2umeNiRcNdqXZQXEDgrHVQbqbDRSdzG',
        role: 'user',
        pointVente: 'O.Foire'
    },
    {
        username: 'KMS',
        password: '$2b$10$duAuWxvCYTuwWb8dW.1puuCyoY8bXdcCKGNxM14T4FnDe3cYMJcXu',
        role: 'user',
        pointVente: 'Keur Massar'
    },
    {
        username: 'LNG',
        password: '$2b$10$QIugefA9E4.WPH72CHzCu.UIpadTiixovkZZcDCTUdr53pfZUgUkO',
        role: 'user',
        pointVente: 'Linguere'
    },
    {
        username: 'DHR',
        password: '$2b$10$KJnH3tzfT50B5PiynAZzfuSmihrTRjnhTgphYQlXoDEnKB4EHHfnG',
        role: 'user',
        pointVente: 'Dahra'
    },
    {
        username: 'TBM',
        password: '$2b$10$x4HAGjhGDWblBU61bxJ0iuoM7ZCysSH6Rksyyr7zcGTwAWfmMDmeu',
        role: 'user',
        pointVente: 'Touba'
    },
    {
        username: 'NADOU',
        password: '$2b$10$fyISzXljT.if6mkzvlYeveRCs6pwFrqRGUkkb/NcPju5Lx3ddC3D6',
        role: 'user',
        pointVente: 'tous'
    },
    {
        username: 'OUSMANE',
        password: '$2b$10$NlPen1rg0FeM37xou4kv9.pzp6wbwr8xTaRyqtW1rF1sJ3tP8O7fO',
        role: 'user',
        pointVente: 'tous'
    },
    {
        username: 'PAPI',
        password: '$2b$10$V.pagWV0K0fDRSydwUh97OYx7eyBYUjtHEwRLv6h6tGWmN7GZoSdG',
        role: 'user',
        pointVente: 'tous'
    },
    {
        username: 'SALIOU',
        password: '$2b$10$xGpg.vOKpuP5zS3KO60bXOf.xvmwkDb4d.qmzi.m4zIHeuuix42/e',
        role: 'user',
        pointVente: 'tous'
    }
];

// Fonction pour vérifier les identifiants
async function verifyCredentials(username, password) {
    console.log('Tentative de vérification pour:', username);
    
    const user = users.find(u => u.username === username);
    if (!user) {
        console.log('Utilisateur non trouvé:', username);
        return null;
    }
    console.log('Utilisateur trouvé:', user.username);

    const isValid = await bcrypt.compare(password, user.password);
    console.log('Mot de passe valide:', isValid);
    
    if (!isValid) {
        console.log('Mot de passe invalide pour:', username);
        return null;
    }

    console.log('Authentification réussie pour:', username);
    return {
        username: user.username,
        role: user.role,
        pointVente: user.pointVente
    };
}

// Fonction pour créer un nouvel utilisateur
async function createUser(username, password, role, pointVente) {
    if (users.some(u => u.username === username)) {
        throw new Error('Username already exists');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = {
        username,
        password: hashedPassword,
        role,
        pointVente
    };

    users.push(newUser);
    return newUser;
}

// Fonction pour mettre à jour un utilisateur
async function updateUser(username, updates) {
    const userIndex = users.findIndex(u => u.username === username);
    if (userIndex === -1) {
        throw new Error('User not found');
    }

    if (updates.password) {
        const saltRounds = 10;
        updates.password = await bcrypt.hash(updates.password, saltRounds);
    }

    users[userIndex] = { ...users[userIndex], ...updates };
    return users[userIndex];
}

// Fonction pour supprimer un utilisateur
function deleteUser(username) {
    const userIndex = users.findIndex(u => u.username === username);
    if (userIndex === -1) {
        throw new Error('User not found');
    }

    users.splice(userIndex, 1);
}

// Fonction pour obtenir tous les utilisateurs (sans les mots de passe)
function getAllUsers() {
    return users.map(user => ({
        username: user.username,
        role: user.role,
        pointVente: user.pointVente
    }));
}

module.exports = {
    verifyCredentials,
    createUser,
    updateUser,
    deleteUser,
    getAllUsers
}; 