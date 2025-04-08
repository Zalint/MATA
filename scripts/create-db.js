require('dotenv').config();
const { Client } = require('pg');

async function createDatabase() {
  // Connect to the default 'postgres' database to create our application database
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: 'postgres', // Connect to default postgres database
    ssl: process.env.DB_SSL === 'true' ? {
      rejectUnauthorized: false
    } : false
  });

  try {
    console.log('Connecting to PostgreSQL server...');
    await client.connect();
    console.log('Connection successful.');

    // Check if the database already exists
    const checkResult = await client.query(`
      SELECT 1 FROM pg_database WHERE datname = $1
    `, [process.env.DB_NAME]);

    if (checkResult.rows.length > 0) {
      console.log(`Database '${process.env.DB_NAME}' already exists.`);
    } else {
      // Create database
      console.log(`Creating database '${process.env.DB_NAME}'...`);
      await client.query(`CREATE DATABASE ${process.env.DB_NAME}`);
      console.log(`Database '${process.env.DB_NAME}' created successfully.`);
    }
  } catch (error) {
    console.error('Database creation error:', error);
    process.exit(1);
  } finally {
    // Close the connection
    await client.end();
    console.log('Connection closed.');
  }
}

// Run the function
createDatabase()
  .then(() => {
    console.log('Database creation script completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 