const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

let sequelize;

// Read environment variables from file (local) or system environment (production)
let envVars = {};

if (process.env.NODE_ENV === 'production') {
  // In production, use system environment variables
  envVars = {
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_NAME: process.env.DB_NAME,
    DB_SSL: process.env.DB_SSL
  };
} else {
  // In local development, read from .env.local file
  try {
    const envPath = path.resolve(__dirname, '..', '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8')
      .replace(/^\uFEFF/, '')  // Remove BOM if present
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\r/g, '\n');   // Normalize line endings

    // Parse environment variables
    envContent.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split('=');
        if (key && value) {
          envVars[key.trim()] = value.trim();
        }
      }
    });
  } catch (error) {
    console.log('No .env.local file found, using system environment variables');
    envVars = {
      DB_HOST: process.env.DB_HOST,
      DB_PORT: process.env.DB_PORT,
      DB_USER: process.env.DB_USER,
      DB_PASSWORD: process.env.DB_PASSWORD,
      DB_NAME: process.env.DB_NAME,
      DB_SSL: process.env.DB_SSL
    };
  }
}

// Environment variables parsed successfully (sensitive data not logged for security)

const commonOptions = {
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

if (process.env.DATABASE_URL) {
  console.log('Initializing Sequelize with DATABASE_URL...');
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    ...commonOptions,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  });
} else {
  console.log('Initializing Sequelize with individual variables...');
  const useSSL = envVars.DB_SSL === 'true';
  
  sequelize = new Sequelize({
    ...commonOptions,
    host: envVars.DB_HOST,
    port: envVars.DB_PORT || 5432,
    username: envVars.DB_USER,
    password: envVars.DB_PASSWORD,
    database: envVars.DB_NAME,
    dialectOptions: useSSL ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    } : {}
  });
}

// Test connection function
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error.message);
    console.error('Please verify database configuration and connectivity');
    return false;
  }
}

module.exports = {
  sequelize,
  testConnection
}; 