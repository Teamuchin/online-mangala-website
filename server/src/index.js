const { Pool } = require('pg');
require('dotenv').config();

// Create a new pool instance using the connection string from your .env file
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// A helpful log to verify the connection works
pool.on('connect', () => {
  console.log('🐘 Connected to the PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  // We export this 'query' function so we can use it in other files
  query: (text, params) => pool.query(text, params),
};