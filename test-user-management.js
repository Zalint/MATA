const users = require('./users');

async function testUserManagement() {
    console.log('=== Test de la gestion des utilisateurs ===\n');
    
    try {
        // Test 1: Vérifier la récupération de tous les utilisateurs
        console.log('1. Test de récupération de tous les utilisateurs:');
        const allUsers = await users.getAllUsers();
        console.log(`   Nombre d'utilisateurs: ${allUsers.length}`);
        allUsers.forEach(user => {
            console.log(`   - ${user.username} (${user.role}) - ${user.pointVente} - ${user.active ? 'Actif' : 'Inactif'}`);
        });
        console.log('');
        
        // Test 2: Vérifier l'authentification d'un utilisateur actif
        console.log('2. Test d\'authentification d\'un utilisateur actif (ADMIN):');
        const adminAuth = await users.verifyCredentials('ADMIN', 'Mata2024A!');
        console.log(`   Résultat: ${adminAuth ? 'Succès' : 'Échec'}`);
        if (adminAuth) {
            console.log(`   Utilisateur: ${adminAuth.username}, Rôle: ${adminAuth.role}, Admin: ${adminAuth.isAdmin}`);
        }
        console.log('');
        
        // Test 3: Créer un nouvel utilisateur de test
        console.log('3. Test de création d\'un nouvel utilisateur:');
        const testUser = await users.createUser('TEST_USER', 'password123', 'user', 'Mbao', true);
        console.log(`   Utilisateur créé: ${testUser.username} (${testUser.role}) - ${testUser.pointVente} - ${testUser.active ? 'Actif' : 'Inactif'}`);
        console.log('');
        
        // Test 4: Vérifier que le nouvel utilisateur peut s'authentifier
        console.log('4. Test d\'authentification du nouvel utilisateur:');
        const testAuth = await users.verifyCredentials('TEST_USER', 'password123');
        console.log(`   Résultat: ${testAuth ? 'Succès' : 'Échec'}`);
        if (testAuth) {
            console.log(`   Utilisateur: ${testAuth.username}, Rôle: ${testAuth.role}, Admin: ${testAuth.isAdmin}`);
        }
        console.log('');
        
        // Test 5: Désactiver l'utilisateur de test
        console.log('5. Test de désactivation de l\'utilisateur:');
        const disabledUser = await users.toggleUserStatus('TEST_USER');
        console.log(`   Utilisateur désactivé: ${disabledUser.username} - ${disabledUser.active ? 'Actif' : 'Inactif'}`);
        console.log('');
        
        // Test 6: Vérifier que l'utilisateur désactivé ne peut plus s'authentifier
        console.log('6. Test d\'authentification d\'un utilisateur désactivé:');
        const disabledAuth = await users.verifyCredentials('TEST_USER', 'password123');
        console.log(`   Résultat: ${disabledAuth ? 'Succès' : 'Échec'} (devrait être un échec)`);
        console.log('');
        
        // Test 7: Réactiver l'utilisateur
        console.log('7. Test de réactivation de l\'utilisateur:');
        const reEnabledUser = await users.toggleUserStatus('TEST_USER');
        console.log(`   Utilisateur réactivé: ${reEnabledUser.username} - ${reEnabledUser.active ? 'Actif' : 'Inactif'}`);
        console.log('');
        
        // Test 8: Vérifier que l'utilisateur réactivé peut s'authentifier
        console.log('8. Test d\'authentification après réactivation:');
        const reEnabledAuth = await users.verifyCredentials('TEST_USER', 'password123');
        console.log(`   Résultat: ${reEnabledAuth ? 'Succès' : 'Échec'}`);
        console.log('');
        
        // Test 9: Supprimer l'utilisateur de test
        console.log('9. Test de suppression de l\'utilisateur:');
        await users.deleteUser('TEST_USER');
        console.log('   Utilisateur supprimé');
        console.log('');
        
        // Test 10: Vérifier que l'utilisateur supprimé n'existe plus
        console.log('10. Test de vérification après suppression:');
        const deletedAuth = await users.verifyCredentials('TEST_USER', 'password123');
        console.log(`   Résultat: ${deletedAuth ? 'Succès' : 'Échec'} (devrait être un échec)`);
        console.log('');
        
        // Test 11: Vérifier la liste finale des utilisateurs
        console.log('11. Liste finale des utilisateurs:');
        const finalUsers = await users.getAllUsers();
        console.log(`   Nombre d'utilisateurs: ${finalUsers.length}`);
        finalUsers.forEach(user => {
            console.log(`   - ${user.username} (${user.role}) - ${user.pointVente} - ${user.active ? 'Actif' : 'Inactif'}`);
        });
        
        console.log('\n=== Tous les tests sont terminés ===');
        
    } catch (error) {
        console.error('Erreur lors des tests:', error);
    }
}

// Exécuter les tests
testUserManagement(); 