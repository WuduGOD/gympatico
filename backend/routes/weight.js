// backend/routes/weight.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/auth');
const { getUserPlan } = require('../utils/userHelpers');

// 1. Pobieranie historii wagi (Z uwzględnieniem limitów planu darmowego)
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  
  try {
    const plan = await getUserPlan(userId);

    if (!plan) {
      return res.status(404).json({ error: "Użytkownik nie istnieje." });
    }

    // Twardy sufit dla planu darmowego (Max 7 pomiarów)
    let sqlLimitFilter = '';
    if (!plan.is_premium && plan.role !== 'TRAINER') {
      sqlLimitFilter = 'LIMIT 7';
    }

    const query = `
      SELECT id, user_id, weight, date 
      FROM weight_logs 
      WHERE user_id = $1 
      ORDER BY date DESC 
      ${sqlLimitFilter}
    `;
    
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Błąd pobierania wagi", details: error.message });
  }
});

// 🔴 NOWOŚĆ: 2. Dodawanie nowego pomiaru wagi
router.post('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { weight } = req.body;

  // Defensywna walidacja danych wejściowych po stronie serwera
  if (!weight || isNaN(parseFloat(weight)) || parseFloat(weight) <= 0) {
    return res.status(400).json({ error: "Niepoprawna wartość wagi! Podaj liczbę dodatnią." });
  }

  try {
    const insertQuery = `
      INSERT INTO weight_logs (user_id, weight)
      VALUES ($1, $2)
      RETURNING id, user_id, weight, date
    `;
    const result = await pool.query(insertQuery, [userId, parseFloat(weight)]);
    
    // Klucz 'log' jest krytyczny — dokładnie pod destrukcję: setWeightLogs([data.log, ...weightLogs])
    res.status(201).json({ log: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Błąd serwera podczas zapisywania pomiaru wagi", details: error.message });
  }
});

// 🔴 NOWOŚĆ: 3. Usuwanie pomiaru wagi z historii
router.delete('/:logId', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { logId } = req.params;

  try {
    // Klauzula WHERE chroni przed usunięciem pomiaru należącego do innego użytkownika
    const deleteQuery = `
      DELETE FROM weight_logs 
      WHERE id = $1::uuid AND user_id = $2::uuid 
      RETURNING *
    `;
    const result = await pool.query(deleteQuery, [logId, userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Nie znaleziono pomiaru wagi lub brak uprawnień do jego usunięcia." });
    }

    res.json({ message: "Pomiar wagi został pomyślnie usunięty z profilu. ✕" });
  } catch (error) {
    res.status(500).json({ error: "Błąd serwera podczas usuwania pomiaru wagi", details: error.message });
  }
});

module.exports = router;