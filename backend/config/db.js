const { Pool } = require('pg');
require('dotenv').config();

// Budujemy konfigurację puli w zależności od obecności DATABASE_URL
const useSsl =
  process.env.DATABASE_URL &&
  !/localhost|127\.0\.0\.1/i.test(process.env.DATABASE_URL);

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ...(useSsl
        ? { ssl: { rejectUnauthorized: false } }
        : {}),
    }
  : {
      // DEWELOPMENT: Fallback na lokalny kontener Docker
      user: process.env.DB_USER || 'gymadmin',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'gympatico_dev',
      password: process.env.DB_PASSWORD || '',
      port: parseInt(process.env.DB_PORT || '5433', 10),
    };

const pool = new Pool(poolConfig);

module.exports = pool;