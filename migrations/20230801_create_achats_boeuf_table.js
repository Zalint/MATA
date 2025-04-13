/**
 * Migration: Create achats_boeuf table
 * This migration creates the table for tracking beef purchases
 */

exports.up = async (pool) => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS achats_boeuf (
            id SERIAL PRIMARY KEY,
            mois VARCHAR(20),
            date DATE NOT NULL,
            bete VARCHAR(50) DEFAULT 'boeuf',
            prix NUMERIC(10, 2) DEFAULT 0,
            abats NUMERIC(10, 2) DEFAULT 0,
            frais_abattage NUMERIC(10, 2) DEFAULT 0,
            nbr_kg NUMERIC(10, 2) DEFAULT 0,
            prix_achat_kg NUMERIC(10, 2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create an index on the date column for faster queries
    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_achats_boeuf_date ON achats_boeuf(date)
    `);

    console.log('Created achats_boeuf table');
};

exports.down = async (pool) => {
    // Drop the index first
    await pool.query(`
        DROP INDEX IF EXISTS idx_achats_boeuf_date
    `);

    // Then drop the table
    await pool.query(`
        DROP TABLE IF EXISTS achats_boeuf
    `);

    console.log('Dropped achats_boeuf table');
}; 