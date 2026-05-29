const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/auth'); // Zakładam, że tam masz middleware auth

// 1. POBRANIE WSZYSTKICH SZABLONÓW UŻYTKOWNIKA
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    // Agregujemy serie bezpośrednio w bazie za pomocą json_agg, oszczędzając pamięć RAM serwera
    const query = `
      SELECT wt.id, wt.name, wt.created_at,
             COALESCE(
               json_agg(
                 json_build_object(
                   'exerciseId', ts.exercise_id,
                   'weight', ts.weight,
                   'reps', ts.reps,
                   'order', ts.series_order
                 ) ORDER BY ts.series_order ASC
               ) FILTER (WHERE ts.id IS NOT NULL), '[]'
             ) as series
      FROM workout_templates wt
      LEFT JOIN template_series ts ON wt.id = ts.template_id
      WHERE wt.user_id = $1
      GROUP BY wt.id
      ORDER BY wt.name ASC
    `;
    const { rows } = await pool.query(query, [userId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Błąd pobierania szablonów", details: error.message });
  }
});

// 2. TWORZENIE NOWEGO SZABLONU (TRANSAKCYJNE)
router.post('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  let { name, series } = req.body;

  // Walidacja Fail-Fast
  if (!name || !name.trim() || !Array.isArray(series) || series.length === 0) {
    return res.status(400).json({ error: "Nazwa szablonu oraz zestaw serii są wymagane!" });
  }

  name = name.trim();
  if (name.length < 3 || name.length > 100) {
    return res.status(400).json({ error: "Nazwa szablonu musi mieć od 3 do 100 znaków!" });
  }

  try {
    await pool.query('BEGIN');

    // Wstawienie nagłówka szablonu
    const templateResult = await pool.query(
      "INSERT INTO workout_templates (user_id, name) VALUES ($1, $2) RETURNING id, name",
      [userId, name]
    );
    const templateId = templateResult.rows[0].id;

    // Masowe wstawianie serii w pętli
    for (let i = 0; i < series.length; i++) {
      const s = series[i];
      if (!s.exerciseId || s.weight === undefined || !s.reps) {
        throw new Error("Niekompletne dane serii w szablonie.");
      }

      await pool.query(
        `INSERT INTO template_series (template_id, exercise_id, weight, reps, series_order)
         VALUES ($1, $2, $3, $4, $5)`,
        [templateId, s.exerciseId, s.weight, s.reps, s.order || (i + 1)]
      );
    }

    await pool.query('COMMIT');
    res.status(201).json({ message: "Szablon treningowy został zapisany! 💾", templateId });
  } catch (error) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: "Błąd podczas zapisu szablonu", details: error.message });
  }
});

// 3. USUNIĘCIE SZABLONU (KASKADOWE PRZEZ BAZĘ)
router.delete('/:id', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM workout_templates WHERE id = $1 AND user_id = $2",
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Nie znaleziono szablonu lub brak uprawnień." });
    }

    res.json({ message: "Szablon usunięty pomyślnie. ✕" });
  } catch (error) {
    res.status(500).json({ error: "Błąd usuwania szablonu", details: error.message });
  }
});

module.exports = router;