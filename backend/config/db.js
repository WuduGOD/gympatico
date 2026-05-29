const { Pool } = require('pg');
require('dotenv').config();

// Budujemy konfigurację puli w zależności od obecności DATABASE_URL
const poolConfig = process.env.DATABASE_URL
  ? {
      // PRODUKCJA: Pełny Connection String z Supabase + wymuszony SSL
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Pozwala na autoryzację certyfikatów Supabase w chmurze
      }
    }
  : {
      // DEWELOPMENT: Fallback na lokalny kontener Docker
      user: process.env.DB_USER || 'gymadmin',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'gympatico_dev',
      password: process.env.DB_PASSWORD || 'mysecretpassword',
      port: parseInt(process.env.DB_PORT || '5433', 10),
    };

const pool = new Pool(poolConfig);

module.exports = pool;