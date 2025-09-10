// Script pour initialiser la table payment_links en production
const { sequelize } = require('./db');
const PaymentLink = require('./db/models/PaymentLink');

async function initPaymentLinksTable() {
    try {
        console.log('🔧 Initialisation de la table payment_links...');
        
        // Synchroniser le modèle avec la base de données
        await PaymentLink.sync({ force: false });
        console.log('✅ Table payment_links synchronisée');
        
        // Vérifier que la table existe
        const [results] = await sequelize.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'payment_links';
        `);
        
        if (results.length > 0) {
            console.log('✅ Table payment_links existe');
            
            // Vérifier la structure
            const [columns] = await sequelize.query(`
                SELECT column_name, data_type, is_nullable, column_default 
                FROM information_schema.columns 
                WHERE table_name = 'payment_links' 
                ORDER BY ordinal_position;
            `);
            
            console.log('📋 Structure de la table:');
            columns.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
            });
            
            // Vérifier les données existantes
            const count = await PaymentLink.count();
            console.log(`📊 Nombre de liens de paiement: ${count}`);
            
        } else {
            console.log('❌ Table payment_links n\'existe pas');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        await sequelize.close();
    }
}

initPaymentLinksTable();
