const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/auth');

// Dodanie wagi
router.post('/', authenticateToken, async (req, res) => {
  const { weight } = req.body;
  const userId = req.user.userId;

  if (!weight) {
    return res.status(400).json({ error: "Wartość wagi jest wymagana!" });
  }

  // Walidacja i konwersja na typ zmiennoprzecinkowy przed wysłaniem do PostgreSQL
  const numericWeight = parseFloat(weight);
  if (isNaN(numericWeight)) {
    return res.status(400).json({ error: "Waga musi być poprawną liczbą!" });
  }

  try {
    const query = 'INSERT INTO weight_logs (user_id, weight) VALUES ($1, $2) RETURNING *';
    // Przekazujemy czystą liczbę zamiast .toString()
    const result = await pool.query(query, [userId, numericWeight]); 
    res.status(201).json({ message: "Waga zapisana! 📉", log: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "Błąd zapisu wagi", details: error.message });
  }
});

// Pobranie historii wagi
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const result = await pool.query('SELECT * FROM weight_logs WHERE user_id = $1 ORDER BY date DESC', [userId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Błąd pobierania wagi", details: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const logId = req.params.id;

  try {
    // Usuwamy wpis tylko, jeśli należy do zalogowanego użytkownika
    const deleteQuery = 'DELETE FROM weight_logs WHERE id = $1 AND user_id = $2 RETURNING *';
    const result = await pool.query(deleteQuery, [logId, userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Nie znaleziono wpisu wagi lub brak uprawnień do jego usunięcia." });
    }

    res.json({ message: "Pomiar wagi został pomyślnie usunięty." });
  } catch (error) {
    res.status(500).json({ error: "Błąd serwera podczas usuwania wpisu wagi", details: error.message });
  }
});

module.exports = router;