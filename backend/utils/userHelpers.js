// backend/utils/userHelpers.js
const pool = require('../config/db');

/**
 * Pobiera aktualny plan oraz rolę użytkownika bezpośrednio z bazy danych.
 */
const getUserPlan = async (userId, dbClient = pool) => {
  // 🔴 POPRAWKA: Jawne rzutowanie $1::uuid. Brak tego elementu powodował błąd 500
  // podczas wywoływania tej funkcji wewnątrz aktywnych transakcji (np. w friends.js)
  const result = await dbClient.query(
    'SELECT is_premium, role FROM users WHERE id = $1::uuid',
    [userId]
  );
  
  if (result.rowCount === 0) return null;
  return result.rows[0];
};

module.exports = { getUserPlan };