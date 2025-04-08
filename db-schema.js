const { sequelize } = require('./db');
const { Vente, Stock, Transfert } = require('./db/models');
const { testConnection } = require('./db');

// Fonction pour récupérer les informations de schéma d'un modèle
function getModelSchema(model) {
  const attributes = model.rawAttributes;
  const modelInfo = {
    tableName: model.tableName,
    fields: []
  };

  // Parcourir tous les attributs du modèle
  Object.keys(attributes).forEach(key => {
    const attribute = attributes[key];
    
    // Récupérer les informations sur le champ
    const fieldInfo = {
      name: key,
      type: attribute.type.toString(),
      allowNull: !!attribute.allowNull,
      defaultValue: attribute.defaultValue,
      primaryKey: !!attribute.primaryKey,
      unique: !!attribute.unique,
      autoIncrement: !!attribute.autoIncrement
    };
    
    // Ajouter les informations sur le champ au modèle
    modelInfo.fields.push(fieldInfo);
  });

  return modelInfo;
}

// Fonction principale
async function viewDatabaseSchema() {
  try {
    // Vérifier la connexion à la base de données
    const connected = await testConnection();
    if (!connected) {
      console.error('Impossible de se connecter à la base de données');
      return;
    }

    console.log('=== SCHÉMA DE LA BASE DE DONNÉES ===\n');
    
    // Récupérer et afficher le schéma des modèles
    const models = [
      { name: 'Vente', model: Vente },
      { name: 'Stock', model: Stock },
      { name: 'Transfert', model: Transfert }
    ];
    
    for (const { name, model } of models) {
      const schema = getModelSchema(model);
      
      console.log(`Table: ${schema.tableName} (Modèle: ${name})`);
      console.log('Champs:');
      
      schema.fields.forEach(field => {
        console.log(`  - ${field.name}:`);
        console.log(`      Type: ${field.type}`);
        console.log(`      Nullable: ${field.allowNull}`);
        
        if (field.primaryKey) {
          console.log('      Primary Key: Oui');
        }
        
        if (field.autoIncrement) {
          console.log('      Auto Increment: Oui');
        }
        
        if (field.unique) {
          console.log('      Unique: Oui');
        }
        
        if (field.defaultValue !== undefined) {
          console.log(`      Valeur par défaut: ${field.defaultValue}`);
        }
      });
      
      console.log('\n');
    }
    
    // Récupérer les statistiques de la base de données
    const venteCount = await Vente.count();
    const stockCount = await Stock.count();
    const transfertCount = await Transfert.count();
    
    console.log('=== STATISTIQUES DE LA BASE DE DONNÉES ===\n');
    console.log(`Nombre d'enregistrements dans la table ventes: ${venteCount}`);
    console.log(`Nombre d'enregistrements dans la table stocks: ${stockCount}`);
    console.log(`Nombre d'enregistrements dans la table transferts: ${transfertCount}`);
    console.log(`Nombre total d'enregistrements: ${venteCount + stockCount + transfertCount}`);
    
    // Afficher le chemin du fichier de base de données
    console.log('\n=== INFORMATION SUR LE STOCKAGE ===\n');
    console.log(`Type de base de données: ${sequelize.options.dialect}`);
    console.log(`Chemin du fichier: ${sequelize.options.storage}`);
    
    console.log('\n=== FIN DU RAPPORT ===');
  } catch (error) {
    console.error('Erreur lors de l\'affichage du schéma de la base de données:', error);
  }
}

// Exécuter la fonction principale
viewDatabaseSchema()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Erreur non gérée:', error);
    process.exit(1);
  }); 