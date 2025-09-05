const { sequelize } = require('./index');

/**
 * Crée la table precommandes dans la base de données
 * sans affecter les données existantes
 */
async function createPrecommandeTable() {
    try {
        console.log('Début de la création de la table precommandes...');
        
        // Vérifier si la table existe déjà
        const [results] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'precommandes'
            );
        `);
        
        if (results[0].exists) {
            console.log('La table precommandes existe déjà');
            return;
        }
        
        // Créer la table precommandes
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "precommandes" (
                "id" SERIAL PRIMARY KEY,
                "mois" VARCHAR(255) NOT NULL,
                "date_enregistrement" VARCHAR(255) NOT NULL,
                "date_reception" VARCHAR(255) NOT NULL,
                "semaine" VARCHAR(255),
                "point_vente" VARCHAR(255) NOT NULL,
                "preparation" VARCHAR(255),
                "categorie" VARCHAR(255) NOT NULL,
                "produit" VARCHAR(255) NOT NULL,
                "prix_unit" FLOAT NOT NULL,
                "nombre" FLOAT NOT NULL DEFAULT 0,
                "montant" FLOAT NOT NULL DEFAULT 0,
                "nom_client" TEXT,
                "numero_client" TEXT,
                "adresse_client" TEXT,
                "commentaire" TEXT,
                "label" VARCHAR(255),
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );
        `);
        
        console.log('Table precommandes créée avec succès');
        
        // Créer les indexes pour améliorer les performances
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS "precommandes_date_enregistrement_idx" ON "precommandes" ("date_enregistrement");
        `);
        
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS "precommandes_date_reception_idx" ON "precommandes" ("date_reception");
        `);
        
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS "precommandes_point_vente_idx" ON "precommandes" ("point_vente");
        `);
        
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS "precommandes_label_idx" ON "precommandes" ("label");
        `);
        
        console.log('Indexes créés avec succès');
        
    } catch (error) {
        console.error('Erreur lors de la création de la table precommandes:', error);
        throw error;
    }
}

/**
 * Fonction utilitaire pour vérifier si des colonnes existent dans une table
 */
async function checkColumnsExist(tableName, columnNames) {
    try {
        const placeholders = columnNames.map((_, index) => `$${index + 2}`).join(',');
        const [results] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = $1 
            AND column_name IN (${placeholders})
        `, {
            bind: [tableName, ...columnNames]
        });
        
        return results.length === columnNames.length;
    } catch (error) {
        console.error('Erreur lors de la vérification des colonnes:', error);
        return false;
    }
}

module.exports = {
    createPrecommandeTable,
    checkColumnsExist
};

// Exécuter le script si appelé directement
if (require.main === module) {
    createPrecommandeTable()
        .then(() => {
            console.log('Migration terminée avec succès');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Erreur lors de la migration:', error);
            process.exit(1);
        });
}
