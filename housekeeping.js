const fs = require('fs').promises;
const path = require('path');

// Chemins des fichiers à nettoyer
const STOCK_MATIN_PATH = path.join(__dirname, 'data', 'stock-matin.json');
const STOCK_SOIR_PATH = path.join(__dirname, 'data', 'stock-soir.json');
const TRANSFERTS_PATH = path.join(__dirname, 'data', 'transferts.json');

// Fonction pour créer le dossier de sauvegarde avec la date et l'heure
function createBackupDir() {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const backupDir = path.join(__dirname, 'backups', `${dateStr}_${timeStr}`);
    
    // Créer le dossier de sauvegarde
    fs.mkdir(backupDir, { recursive: true });
    return backupDir;
}

async function backupAndCleanJsonFiles() {
    try {
        // Créer le dossier de sauvegarde
        const backupDir = await createBackupDir();
        console.log(`📁 Dossier de sauvegarde créé: ${backupDir}`);

        // Liste des fichiers à sauvegarder et nettoyer
        const files = [
            { path: STOCK_MATIN_PATH, name: 'stock-matin.json' },
            { path: STOCK_SOIR_PATH, name: 'stock-soir.json' },
            { path: TRANSFERTS_PATH, name: 'transferts.json' }
        ];

        for (const file of files) {
            try {
                // Vérifier si le fichier existe
                await fs.access(file.path);
                
                // Lire le contenu du fichier
                const content = await fs.readFile(file.path, 'utf8');
                
                // Sauvegarder le fichier
                const backupPath = path.join(backupDir, file.name);
                await fs.writeFile(backupPath, content);
                console.log(`💾 ${file.name} a été sauvegardé dans ${backupPath}`);
                
                // Nettoyer le fichier original
                await fs.writeFile(file.path, JSON.stringify({}, null, 2));
                console.log(`🧹 ${file.name} a été nettoyé avec succès`);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    console.log(`⚠️ ${file.name} n'existe pas, ignoré`);
                } else {
                    console.error(`❌ Erreur lors du traitement de ${file.name}:`, error.message);
                }
            }
        }

        console.log('\n🎉 Nettoyage et sauvegarde terminés avec succès !');
    } catch (error) {
        console.error('❌ Erreur lors du processus:', error);
        process.exit(1);
    }
}

// Exécuter le nettoyage et la sauvegarde
backupAndCleanJsonFiles(); 