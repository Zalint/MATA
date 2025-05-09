const { sequelize } = require('./index');

/**
 * Met à jour le schéma de la table ventes pour ajouter les colonnes client
 * sans perdre les données existantes
 */
async function updateVenteSchema() {
    try {
        console.log('Début de la mise à jour du schéma de la table ventes...');
        
        // Vérifier si les colonnes client existent déjà
        const columnsExist = await checkColumnsExist('ventes', [
            'nom_client', 'numero_client', 'adresse_client', 'creance'
        ]);
        
        if (!columnsExist) {
            console.log('Ajout des colonnes client à la table ventes...');
            
            // Ajouter les colonnes client
            await sequelize.query(`
                ALTER TABLE ventes
                ADD COLUMN IF NOT EXISTS "nom_client" TEXT,
                ADD COLUMN IF NOT EXISTS "numero_client" TEXT,
                ADD COLUMN IF NOT EXISTS "adresse_client" TEXT,
                ADD COLUMN IF NOT EXISTS "creance" BOOLEAN DEFAULT FALSE
            `);
            
            console.log('Colonnes client ajoutées avec succès');
        } else {
            console.log('Les colonnes client existent déjà');
        }
        
        // Supprimer la colonne telephone_client si elle existe
        const telColumnExists = await checkColumnsExist('ventes', ['tel_client']);
        const telephoneColumnExists = await checkColumnsExist('ventes', ['telephone_client']);
        
        if (telColumnExists) {
            console.log('Suppression de la colonne tel_client...');
            await sequelize.query(`
                ALTER TABLE ventes
                DROP COLUMN IF EXISTS "tel_client"
            `);
            console.log('Colonne tel_client supprimée avec succès');
        }
        
        if (telephoneColumnExists) {
            console.log('Suppression de la colonne telephone_client...');
            await sequelize.query(`
                ALTER TABLE ventes
                DROP COLUMN IF EXISTS "telephone_client"
            `);
            console.log('Colonne telephone_client supprimée avec succès');
        }

        console.log('Mise à jour du schéma de la table ventes terminée avec succès');
        return true;
    } catch (error) {
        console.error('Erreur lors de la mise à jour du schéma de la table ventes:', error);
        throw error;
    }
}

/**
 * Vérifie si les colonnes spécifiées existent dans la table
 */
async function checkColumnsExist(tableName, columnNames) {
    try {
        // Construire une requête qui compte combien de colonnes existent
        const placeholders = columnNames.map((col, idx) => `:col${idx}`).join(', ');
        const replacements = {};
        columnNames.forEach((col, idx) => {
            replacements[`col${idx}`] = col;
        });
        replacements.tableName = tableName;
        
        const query = `
            SELECT COUNT(*) as count
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = :tableName
            AND column_name IN (${placeholders})
        `;
        
        const result = await sequelize.query(query, {
            replacements,
            type: sequelize.QueryTypes.SELECT,
            plain: true
        });
        
        // Si toutes les colonnes existent, count sera égal à la longueur de columnNames
        return parseInt(result.count) === columnNames.length;
    } catch (error) {
        console.error(`Erreur lors de la vérification des colonnes dans la table ${tableName}:`, error);
        throw error;
    }
}

// Exécuter la mise à jour si le script est appelé directement
if (require.main === module) {
    updateVenteSchema()
        .then(() => {
            console.log('Mise à jour du schéma de la table ventes terminée avec succès');
            process.exit(0);
        })
        .catch(error => {
            console.error('Erreur lors de la mise à jour du schéma de la table ventes:', error);
            process.exit(1);
        });
}

module.exports = { updateVenteSchema }; 