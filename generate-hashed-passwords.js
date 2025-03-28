const bcrypt = require('bcrypt');

// Liste des utilisateurs originaux
const originalUsers = {
    "ADMIN": {
        username: "ADMIN",
        password: "ADMIN123",
        pointVente: "tous",
        isAdmin: true,
        isSuperAdmin: true
    },
    "MBA": {
        username: "MBA",
        password: "MBA123",
        pointVente: "Mbao",
        isAdmin: false
    },
    "OSF": {
        username: "OSF",
        password: "OSF123",
        pointVente: "O.Foire",
        isAdmin: false
    },
    "KMS": {
        username: "KMS",
        password: "KMS123",
        pointVente: "Keur Massar",
        isAdmin: false
    },
    "LNG": {
        username: "LNG",
        password: "LNG123",
        pointVente: "Linguere",
        isAdmin: false
    },
    "DHR": {
        username: "DHR",
        password: "DHR123",
        pointVente: "Dahra",
        isAdmin: false
    },
    "TBM": {
        username: "TBM",
        password: "TBM123",
        pointVente: "Touba",
        isAdmin: false
    },
    "NADOU": {
        username: "NADOU",
        password: "NADOU123",
        pointVente: "tous",
        isAdmin: false
    },
    "OUSMANE": {
        username: "OUSMANE",
        password: "OUSMANE123",
        pointVente: "tous",
        isAdmin: false
    },
    "PAPI": {
        username: "PAPI",
        password: "PAPI123",
        pointVente: "tous",
        isAdmin: false
    },
    "SALIOU": {
        username: "SALIOU",
        password: "SALIOU123",
        pointVente: "tous",
        isAdmin: false
    }
};

async function generateHashedPasswords() {
    const hashedUsers = [];
    
    for (const [username, user] of Object.entries(originalUsers)) {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(user.password, saltRounds);
        
        hashedUsers.push({
            username: user.username,
            password: hashedPassword,
            role: user.isAdmin ? 'admin' : 'user',
            pointVente: user.pointVente
        });
    }
    
    console.log('const users = [');
    hashedUsers.forEach(user => {
        console.log(`    {
        username: '${user.username}',
        password: '${user.password}',
        role: '${user.role}',
        pointVente: '${user.pointVente}'
    },`);
    });
    console.log('];');
}

generateHashedPasswords().catch(console.error); 