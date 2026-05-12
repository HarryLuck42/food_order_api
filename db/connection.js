require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || process.env.PGHOST     || 'localhost',
  port:     process.env.DB_PORT     || process.env.PGPORT     || 5432,
  database: process.env.DB_NAME     || process.env.PGDATABASE || 'order_food_db',
  user:     process.env.DB_USER     || process.env.PGUSER     || 'postgres',
  password: process.env.DB_PASSWORD || process.env.PGPASSWORD,
});

module.exports = pool;
