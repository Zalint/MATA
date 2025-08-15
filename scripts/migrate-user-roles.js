/**
 * Script de migration des rôles utilisateurs
 * Mise à jour vers la nouvelle hiérarchie de rôles
 */

const fs = require('fs').promises;
const path = require('path');

// Chemin vers le fichier des utilisateurs
const USERS_FILE_PATH = path.join(__dirname, '..', 'data', 'by-date', 'users.json');

// Mapping des nouveaux rôles
const ROLE_MIGRATION = {
    'SALIOU': 'superviseur',
    'OUSMANE': 'superviseur',
    'NADOU': 'superutilisateur',
    'PAPI': 'superutilisateur'
};

async function migrateUserRoles() {
    try {
        console.log('🚀 Début de la migration des rôles utilisateurs...');
        
        // Lecture du fichier des utilisateurs
        const data = await fs.readFile(USERS_FILE_PATH, 'utf8');
        const users = JSON.parse(data);
        
        console.log(`📋 ${users.length} utilisateurs trouvés`);
        
        // Sauvegarde avant migration
        const backupPath = `${USERS_FILE_PATH}.backup-${Date.now()}`;
        await fs.writeFile(backupPath, data, 'utf8');
        console.log(`💾 Sauvegarde créée: ${path.basename(backupPath)}`);
        
        let migratedCount = 0;
        
        // Migration des utilisateurs
        users.forEach(user => {
            if (ROLE_MIGRATION[user.username]) {
                const oldRole = user.role;
                const newRole = ROLE_MIGRATION[user.username];
                
                user.role = newRole;
                migratedCount++;
                
                console.log(`✅ ${user.username}: ${oldRole} → ${newRole}`);
            }
        });
        
        if (migratedCount === 0) {
            console.log('ℹ️  Aucun utilisateur à migrer trouvé');
            return;
        }
        
        // Sauvegarde des modifications
        await fs.writeFile(USERS_FILE_PATH, JSON.stringify(users, null, 2), 'utf8');
        
        console.log(`\n🎉 Migration terminée avec succès!`);
        console.log(`📊 ${migratedCount} utilisateur(s) migré(s)`);
        console.log(`💾 Sauvegarde disponible: ${path.basename(backupPath)}`);
        
        // Affichage du résumé des rôles
        console.log('\n📋 Résumé des rôles après migration:');
        const roleStats = {};
        users.forEach(user => {
            roleStats[user.role] = (roleStats[user.role] || 0) + 1;
        });
        
        Object.entries(roleStats).forEach(([role, count]) => {
            console.log(`   ${role}: ${count} utilisateur(s)`);
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de la migration:', error);
        process.exit(1);
    }
}

// Fonction pour afficher l'aide
function showHelp() {
    console.log(`
📖 Migration des rôles utilisateurs

Ce script met à jour les rôles des utilisateurs selon la nouvelle hiérarchie:

🎯 Migrations prévues:
   • SALIOU: user → superviseur
   • OUSMANE: user → superviseur  
   • NADOU: user → superutilisateur
   • PAPI: user → superutilisateur

🚀 Utilisation:
   node scripts/migrate-user-roles.js [OPTIONS]

🔧 Options:
   --help, -h     Afficher cette aide
   --dry-run      Simuler la migration sans appliquer les changements

💾 Sauvegardes:
   Une sauvegarde automatique est créée avant toute modification
    `);
}

// Fonction de simulation (dry-run)
async function dryRunMigration() {
    try {
        console.log('🧪 Mode simulation (dry-run) - Aucune modification ne sera appliquée\n');
        
        const data = await fs.readFile(USERS_FILE_PATH, 'utf8');
        const users = JSON.parse(data);
        
        console.log('📋 Migrations qui seraient appliquées:');
        
        let wouldMigrateCount = 0;
        users.forEach(user => {
            if (ROLE_MIGRATION[user.username]) {
                const oldRole = user.role;
                const newRole = ROLE_MIGRATION[user.username];
                wouldMigrateCount++;
                console.log(`   ${user.username}: ${oldRole} → ${newRole}`);
            }
        });
        
        if (wouldMigrateCount === 0) {
            console.log('   Aucune migration nécessaire');
        } else {
            console.log(`\n✨ ${wouldMigrateCount} utilisateur(s) seraient migrés`);
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de la simulation:', error);
        process.exit(1);
    }
}

// Traitement des arguments de ligne de commande
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
}

if (args.includes('--dry-run')) {
    dryRunMigration();
} else {
    migrateUserRoles();
}
