const { Sequelize } = require('sequelize');
const path = require('path');

let sequelize;
const commonOptions = {
  dialect: 'postgres',
  // logging: console.log, // Use simpler logging for Render
  logging: false, // Disable detailed SQL logging in production
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: {
    ssl: { // Assume SSL is needed if DATABASE_URL is present (common for Render)
      require: true,
      rejectUnauthorized: false
    }
  }
};

// Print configuration details before initializing Sequelize
console.log('--- Database Environment Variables ---');
console.log(`DATABASE_URL Exists: ${!!process.env.DATABASE_URL}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`DB_HOST: ${process.env.DB_HOST}`);
console.log(`DB_USER: ${process.env.DB_USER}`);
console.log(`DB_NAME: ${process.env.DB_NAME}`);
console.log(`DB_SSL: ${process.env.DB_SSL}`);
console.log('------------------------------------');


if (process.env.DATABASE_URL) {
  console.log('Initializing Sequelize with DATABASE_URL...');
  sequelize = new Sequelize(process.env.DATABASE_URL, commonOptions);
} else {
  console.log('Initializing Sequelize with individual variables...');
  // Configuration for individual variables (e.g., from .env.local)
  const useSSL = process.env.DB_SSL === 'true';
  sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST, // No fallback - rely on dotenv
    port: process.env.DB_PORT || 5432,
    username: process.env.DB_USER, // No fallback - rely on dotenv
    password: process.env.DB_PASSWORD, // No fallback - rely on dotenv
    database: process.env.DB_NAME || 'ventes_db', // Keep fallback for DB name maybe?
    logging: false, // Disable detailed SQL logging locally too unless debugging
    dialectOptions: {
      ssl: useSSL ? {
        require: true,
        rejectUnauthorized: false
      } : false
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
}


// Tester la connexion
async function testConnection() {
  try {
    // Log the final config Sequelize is ACTUALLY using (if possible, often internal)
    // console.log("Sequelize effective configuration:", sequelize.config); // Might not be available depending on version
    await sequelize.authenticate();
    console.log('Connexion à la base de données établie avec succès.');
    return true;
  } catch (error) {
    console.error('Impossible de se connecter à la base de données:', error);
    // Log the specific configuration that failed if using individual vars
    if (!process.env.DATABASE_URL) {
        console.error('Failed configuration details:');
        console.error(`  Host: ${process.env.DB_HOST}`);
        console.error(`  Port: ${process.env.DB_PORT || 5432}`);
        console.error(`  User: ${process.env.DB_USER}`);
        console.error(`  Database: ${process.env.DB_NAME || 'ventes_db'}`);
        console.error(`  SSL Used: ${process.env.DB_SSL === 'true'}`);
    }
    return false;
  }
}

// Removed the previous direct console.logs for config

module.exports = {
  sequelize,
  testConnection
}; 