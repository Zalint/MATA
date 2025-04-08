/**
 * Migration script to transfer data from SQLite to PostgreSQL
 * 
 * This script:
 * 1. Creates a new connection to SQLite database
 * 2. Creates a new connection to PostgreSQL database
 * 3. Transfers all data from SQLite to PostgreSQL
 */
require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Path to SQLite database
const sqliteDbPath = path.join(__dirname, '..', 'db', 'database.sqlite');

// Check if SQLite database exists
if (!fs.existsSync(sqliteDbPath)) {
  console.error(`SQLite database not found at: ${sqliteDbPath}`);
  process.exit(1);
}

// SQLite connection
const sqliteSequelize = new Sequelize({
  dialect: 'sqlite',
  storage: sqliteDbPath,
  logging: false
});

// PostgreSQL connection
const pgSequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'ventes_db',
  logging: true,
  dialectOptions: {
    ssl: process.env.DB_SSL === 'true' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  }
});

// Define models for SQLite
const SqliteVente = sqliteSequelize.define('Vente', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  mois: {
    type: DataTypes.STRING,
    allowNull: false
  },
  date: {
    type: DataTypes.STRING,
    allowNull: false
  },
  semaine: {
    type: DataTypes.STRING,
    allowNull: true
  },
  pointVente: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'point_vente'
  },
  preparation: {
    type: DataTypes.STRING,
    allowNull: true
  },
  categorie: {
    type: DataTypes.STRING,
    allowNull: false
  },
  produit: {
    type: DataTypes.STRING,
    allowNull: false
  },
  prixUnit: {
    type: DataTypes.FLOAT,
    allowNull: false,
    field: 'prix_unit'
  },
  nombre: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  montant: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'ventes',
  timestamps: true
});

const SqliteStock = sqliteSequelize.define('Stock', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  date: {
    type: DataTypes.STRING,
    allowNull: false
  },
  typeStock: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'type_stock'
  },
  pointVente: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'point_vente'
  },
  produit: {
    type: DataTypes.STRING,
    allowNull: false
  },
  quantite: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  prixUnitaire: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    field: 'prix_unitaire'
  },
  total: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  commentaire: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'stocks',
  timestamps: true
});

const SqliteTransfert = sqliteSequelize.define('Transfert', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  date: {
    type: DataTypes.STRING,
    allowNull: false
  },
  pointVente: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'point_vente'
  },
  produit: {
    type: DataTypes.STRING,
    allowNull: false
  },
  quantite: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  prixUnitaire: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    field: 'prix_unitaire'
  },
  total: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  impact: {
    type: DataTypes.STRING,
    allowNull: false
  },
  commentaire: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'transferts',
  timestamps: true
});

// Define models for PostgreSQL 
const PgVente = pgSequelize.define('Vente', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  mois: {
    type: DataTypes.STRING,
    allowNull: false
  },
  date: {
    type: DataTypes.STRING,
    allowNull: false
  },
  semaine: {
    type: DataTypes.STRING,
    allowNull: true
  },
  pointVente: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'point_vente'
  },
  preparation: {
    type: DataTypes.STRING,
    allowNull: true
  },
  categorie: {
    type: DataTypes.STRING,
    allowNull: false
  },
  produit: {
    type: DataTypes.STRING,
    allowNull: false
  },
  prixUnit: {
    type: DataTypes.FLOAT,
    allowNull: false,
    field: 'prix_unit'
  },
  nombre: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  montant: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'ventes',
  timestamps: true
});

const PgStock = pgSequelize.define('Stock', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  date: {
    type: DataTypes.STRING,
    allowNull: false
  },
  typeStock: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'type_stock'
  },
  pointVente: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'point_vente'
  },
  produit: {
    type: DataTypes.STRING,
    allowNull: false
  },
  quantite: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  prixUnitaire: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    field: 'prix_unitaire'
  },
  total: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  commentaire: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'stocks',
  timestamps: true
});

const PgTransfert = pgSequelize.define('Transfert', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  date: {
    type: DataTypes.STRING,
    allowNull: false
  },
  pointVente: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'point_vente'
  },
  produit: {
    type: DataTypes.STRING,
    allowNull: false
  },
  quantite: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  prixUnitaire: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    field: 'prix_unitaire'
  },
  total: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  impact: {
    type: DataTypes.STRING,
    allowNull: false
  },
  commentaire: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'transferts',
  timestamps: true
});

// Main migration function
async function migrateSqliteToPostgres() {
  try {
    console.log('Starting migration from SQLite to PostgreSQL...');
    
    // Test connections
    console.log('Testing SQLite connection...');
    await sqliteSequelize.authenticate();
    console.log('SQLite connection has been established successfully.');
    
    console.log('Testing PostgreSQL connection...');
    await pgSequelize.authenticate();
    console.log('PostgreSQL connection has been established successfully.');
    
    // Sync PostgreSQL models (create tables)
    console.log('Creating tables in PostgreSQL...');
    await pgSequelize.sync({ force: true });
    console.log('PostgreSQL tables created successfully.');
    
    // Migrate Ventes
    console.log('Migrating Ventes...');
    const sqliteVentes = await SqliteVente.findAll();
    console.log(`Found ${sqliteVentes.length} ventes in SQLite.`);
    
    if (sqliteVentes.length > 0) {
      // Convert to plain objects
      const ventesData = sqliteVentes.map(vente => vente.get({ plain: true }));
      
      // Insert in batches of 100 to avoid overloading the database
      const batchSize = 100;
      for (let i = 0; i < ventesData.length; i += batchSize) {
        const batch = ventesData.slice(i, i + batchSize);
        await PgVente.bulkCreate(batch);
        console.log(`Migrated ventes: ${Math.min(i + batchSize, ventesData.length)}/${ventesData.length}`);
      }
      
      console.log('Ventes migration completed.');
    }
    
    // Migrate Stocks
    console.log('Migrating Stocks...');
    const sqliteStocks = await SqliteStock.findAll();
    console.log(`Found ${sqliteStocks.length} stock entries in SQLite.`);
    
    if (sqliteStocks.length > 0) {
      // Convert to plain objects
      const stocksData = sqliteStocks.map(stock => stock.get({ plain: true }));
      
      // Insert in batches
      const batchSize = 100;
      for (let i = 0; i < stocksData.length; i += batchSize) {
        const batch = stocksData.slice(i, i + batchSize);
        await PgStock.bulkCreate(batch);
        console.log(`Migrated stocks: ${Math.min(i + batchSize, stocksData.length)}/${stocksData.length}`);
      }
      
      console.log('Stocks migration completed.');
    }
    
    // Migrate Transferts
    console.log('Migrating Transferts...');
    const sqliteTransferts = await SqliteTransfert.findAll();
    console.log(`Found ${sqliteTransferts.length} transferts in SQLite.`);
    
    if (sqliteTransferts.length > 0) {
      // Convert to plain objects
      const transfertsData = sqliteTransferts.map(transfert => transfert.get({ plain: true }));
      
      // Insert in batches
      const batchSize = 100;
      for (let i = 0; i < transfertsData.length; i += batchSize) {
        const batch = transfertsData.slice(i, i + batchSize);
        await PgTransfert.bulkCreate(batch);
        console.log(`Migrated transferts: ${Math.min(i + batchSize, transfertsData.length)}/${transfertsData.length}`);
      }
      
      console.log('Transferts migration completed.');
    }
    
    console.log('Migration from SQLite to PostgreSQL completed successfully!');
    
    // Get counts to verify
    const pgVentesCount = await PgVente.count();
    const pgStocksCount = await PgStock.count();
    const pgTransfertsCount = await PgTransfert.count();
    
    console.log('\nMigration Summary:');
    console.log(`Ventes: ${sqliteVentes.length} in SQLite → ${pgVentesCount} in PostgreSQL`);
    console.log(`Stocks: ${sqliteStocks.length} in SQLite → ${pgStocksCount} in PostgreSQL`);
    console.log(`Transferts: ${sqliteTransferts.length} in SQLite → ${pgTransfertsCount} in PostgreSQL`);
    
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    // Close connections
    await sqliteSequelize.close();
    await pgSequelize.close();
    console.log('Database connections closed.');
  }
}

// Run the migration
migrateSqliteToPostgres()
  .then(() => {
    console.log('Migration script completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 