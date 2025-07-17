const bcrypt = require('bcrypt');

// Liste des utilisateurs avec leurs mots de passe hachés
const users = [
    {
        username: 'ADMIN',
        password: '$2b$10$0gnk9xZ774hXJoLR0rQNyOpgT4ujywPi9VBkSnfctnAVy1btuZrBK',
        role: 'admin',
        pointVente: 'tous'
    },
    {
        username: 'MBA',
        password: '$2b$10$SGgkVN9qBf.nChuQYfWs5OFfu9yduQ5YAp4YhFPwLySW1naAXywmK',
        role: 'user',
        pointVente: 'Mbao'
    },
    {
        username: 'OSF',
        password: '$2b$10$sZr41Lpfz3dFM3UBdl38deaWSWB6lYzZw0uTJEIxtWXD3oEBMLJq6',
        role: 'user',
        pointVente: 'O.Foire'
    },
    {
        username: 'KMS',
        password: '$2b$10$fM8r6G5YXoQbMweovFX4dewL4h3YiIKkGAdRgXXthVaKoVzhaf68W',
        role: 'user',
        pointVente: 'Keur Massar'
    },
    {
        username: 'LNG',
        password: '$2b$10$5/Ufo00FlSk2vq9.Smuoh.ub4XpiuqiJLya1HrvvuSwl5vcAtYOoK',
        role: 'user',
        pointVente: 'Linguere'
    },
    {
        username: 'DHR',
        password: '$2b$10$Pc4VgsIWK7BXyw2mcWa5/OMDydUgBHR3HkCaSWaqNWSCZ1gOp6jgC',
        role: 'user',
        pointVente: 'Dahra'
    },
    {
        username: 'TBM',
        password: '$2b$10$3lnpwyz.WNC3Ac3LDIIHfOWnQUuglBDHlk4sHB4nB/VV6ZD9fLLZ.',
        role: 'user',
        pointVente: 'Touba'
    },
    {
        username: 'NADOU',
        password: '$2b$10$K7k5RmHjo.z52EWo8UdQBufVmFS65BS1by85QVzNk8x2w8faFoluW',
        role: 'user',
        pointVente: 'tous'
    },
    {
        username: 'OUSMANE',
        password: '$2b$10$C7/yS945tfuFFe8VoaL8E.YyzakG5HqmHh9D79spRiVcq8/ASI./6',
        role: 'user',
        pointVente: 'tous'
    },
    {
        username: 'PAPI',
        password: '$2b$10$mo1zaS1mo/GAl3jOR3f4ZuxwpVjr28nISR4jviHUpCY2GetfWE2Ve',
        role: 'user',
        pointVente: 'tous'
    },
    {
        username: 'SALIOU',
        password: '$2b$10$XM0wQV5kI0lJqld3aMwlmuNSmTivlFAEKXDwZEg0ePIcG6o9/jVmu',
        role: 'user',
        pointVente: 'tous'
    },
    {
        username: 'SCR',
        password: '$2b$10$fGNRB1.MSl4JT5EkMwYpT.RKDuCc4RmpXXZvz/OKpn3sm3ozNTLUe',
        role: 'user',
        pointVente: 'Sacre Coeur'
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