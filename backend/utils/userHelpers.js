// backend/utils/userHelpers.js
const pool = require('../config/db');

/**
 * Pobiera aktualny plan oraz rolę użytkownika bezpośrednio z bazy danych.
 * @param {string} userId - UUID użytkownika.
 * @param {object} [dbClient=pool] - Opcjonalny klient bazy danych (przydatne podczas transakcji).
 * @returns {Promise<{is_premium: boolean, role: string}|null>}
 */
const getUserPlan = async (userId, dbClient = pool) => {
  const result = await dbClient.query(
    'SELECT is_premium, role FROM users WHERE id = $1',
    [userId]
  );
  
  if (result.rowCount === 0) return null;
  return result.rows[0];
};

module.exports = { getUserPlan };