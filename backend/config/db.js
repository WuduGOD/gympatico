const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'gymadmin',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'gympatico_dev',
  password: process.env.DB_PASSWORD || 'mysecretpassword',
  port: process.env.DB_PORT || 5433,
});

module.exports = pool;