const { Sequelize } = require('sequelize');
const path = require('path');

// Configuration for PostgreSQL database
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'mata2024',
  database: process.env.DB_NAME || 'ventes_db',
  logging: console.log, // Force logging to the console for debugging
  dialectOptions: {
    ssl: process.env.DB_SSL === 'true' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  },
  pool: {
    max: 5, // Maximum connections in pool
    min: 0, // Minimum connections in pool
    acquire: 30000, // Maximum time (ms) to acquire connection
    idle: 10000 // Maximum time (ms) connection can be idle
  }
});

// SQLite configuration (commented out but kept for reference)
/*
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: false
});
*/

// Tester la connexion
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Connexion à la base de données établie avec succès.');
    return true;
  } catch (error) {
    console.error('Impossible de se connecter à la base de données:', error);
    return false;
  }
}

module.exports = {
  sequelize,
  testConnection
}; 