// backend/routes/templates.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/auth');
const checkLimits = require('../middleware/checkLimits');

// 1. POBRANIE WSZYSTKICH SZABLONÓW
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const query = `
      SELECT wt.id, wt.name, wt.created_at,
             COALESCE(
               json_agg(
                 json_build_object(
                   'exerciseId', ts.exercise_id,
                   'weight', ts.weight,
                   'reps', ts.reps,
                   'order', ts.series_order,
                   'seriesType', ts.series_type -- 🔴 POPRAWKA: Zwracanie typu serii
                 ) ORDER BY ts.series_order ASC
               ) FILTER (WHERE ts.id IS NOT NULL), '[]'
             ) as series
      FROM workout_templates wt
      LEFT JOIN template_series ts ON wt.id = ts.template_id
      WHERE wt.user_id = $1::uuid
      GROUP BY wt.id
      ORDER BY wt.name ASC
    `;
    const { rows } = await pool.query(query, [userId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Błąd pobierania szablonów", details: error.message });
  }
});

// 2. TWORZENIE NOWEGO SZABLONU
router.post('/', authenticateToken, checkLimits('templates'), async (req, res) => {
  const userId = req.user.userId;
  let { name, series } = req.body;

  if (!name || !name.trim() || !Array.isArray(series) || series.length === 0) {
    return res.status(400).json({ error: "Nazwa szablonu oraz zestaw serii są wymagane!" });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const templateResult = await client.query(
      "INSERT INTO workout_templates (user_id, name) VALUES ($1::uuid, $2) RETURNING id",
      [userId, name.trim()]
    );
    const templateId = templateResult.rows[0].id;

    const exerciseIds = [];
    const weights = [];
    const reps = [];
    const orders = [];
    const seriesTypes = []; // 🔴 POPRAWKA: Inicjalizacja tablicy dla typów

    for (let i = 0; i < series.length; i++) {
      const s = series[i];
      exerciseIds.push(s.exerciseId);
      weights.push(s.weight);
      reps.push(s.reps);
      orders.push(s.order || (i + 1));
      seriesTypes.push(s.seriesType || 'NORMAL'); // 🔴 Wychwycenie z frontu
    }

    // 🔴 Zapis do bazy 
    const bulkInsertQuery = `
      INSERT INTO template_series (template_id, exercise_id, weight, reps, series_order, series_type)
      SELECT $1::uuid, * FROM UNNEST($2::uuid[], $3::numeric[], $4::int[], $5::int[], $6::varchar[])
    `;
    
    await client.query(bulkInsertQuery, [templateId, exerciseIds, weights, reps, orders, seriesTypes]);
    await client.query('COMMIT');
    
    res.status(201).json({ message: "Szablon treningowy został zapisany! 💾", templateId });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: "Błąd podczas zapisu szablonu", details: error.message });
  } finally {
    client.release();
  }
});

// 3. USUNIĘCIE SZABLONU (Odporne na 500)
router.delete('/:id', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM workout_templates WHERE id = $1::uuid AND user_id = $2::uuid",
      [id, userId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Nie znaleziono szablonu." });
    res.json({ message: "Szablon usunięty pomyślnie. ✕" });
  } catch (error) {
    res.status(500).json({ error: "Błąd usuwania szablonu", details: error.message });
  }
});

module.exports = router;