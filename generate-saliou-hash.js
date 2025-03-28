const bcrypt = require('bcrypt');

async function generateHash() {
    const password = 'SALIOU123';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('Hash généré pour SALIOU:', hashedPassword);
}

generateHash().catch(console.error); 