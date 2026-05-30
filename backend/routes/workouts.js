// backend/routes/workouts.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/auth');
const checkLimits = require('../middleware/checkLimits');

// Zapisanie treningu + wyliczenie streaka (Zoptymalizowany UNNEST Batch Insert)
router.post('/', authenticateToken, checkLimits('workouts'), async (req, res) => {
  const { name, comment, series } = req.body;
  const userId = req.user.userId;

  if (!name || !series || !Array.isArray(series) || series.length === 0) {
    return res.status(400).json({ error: "Nazwa treningu oraz serie są wymagane!" });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const sessionResult = await client.query(
      "INSERT INTO workout_sessions (user_id, name, comment, started_at, ended_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id",
      [userId, name, comment || null]
    );
    const sessionId = sessionResult.rows[0].id;

    // Inicjalizacja tablic dla mechanizmu masowego wstawiania UNNEST
    const exerciseIds = [];
    const weights = [];
    const reps = [];
    const orders = [];
    const estimatedOneRMs = [];
    const isAlternatives = [];
    const seriesComments = [];

    // Mapowanie obiektów JS na płaskie tablice kolumn bazodanowych
    for (let i = 0; i < series.length; i++) {
      const s = series[i];
      let estimatedOneRM = null;
      if (s.reps >= 1 && s.reps <= 12) {
        estimatedOneRM = s.weight * (1 + s.reps / 30);
      }

      exerciseIds.push(s.exerciseId);
      weights.push(s.weight);
      reps.push(s.reps);
      orders.push(s.order || (i + 1));
      estimatedOneRMs.push(estimatedOneRM);
      isAlternatives.push(s.isAlternative || false);
      seriesComments.push(s.comment || null);
    }

    // JEDNO ZAPYTANIE ZAMIAST PĘTLI SIECIOWEJ (Batch Insertion)
    const bulkInsertSeriesQuery = `
      INSERT INTO log_series (workout_session_id, exercise_id, weight, reps, series_order, estimated_one_rm, is_alternative, comment)
      SELECT $1, * FROM UNNEST($2::uuid[], $3::numeric[], $4::int[], $5::int[], $6::numeric[], $7::boolean[], $8::text[])
    `;

    await client.query(bulkInsertSeriesQuery, [
      sessionId, exerciseIds, weights, reps, orders, estimatedOneRMs, isAlternatives, seriesComments
    ]);

    // Pobranie parametrów użytkownika do wyliczenia streaka
    const userResult = await client.query('SELECT current_streak, weekly_target_workouts, last_workout_at FROM users WHERE id = $1', [userId]);
    const { current_streak, weekly_target_workouts, last_workout_at } = userResult.rows[0];

    const target = weekly_target_workouts ?? 3;

    const lastWeekResult = await client.query(
      `SELECT COUNT(*) FROM workout_sessions WHERE user_id = $1 
      AND started_at >= date_trunc('week', NOW() - INTERVAL '1 week') 
      AND started_at < date_trunc('week', NOW())`, [userId]
    );
    const workoutsLastWeek = parseInt(lastWeekResult.rows[0].count);

    let effectiveStreak = current_streak;

    if (last_workout_at) {
      const startOfThisWeekResult = await client.query(`SELECT date_trunc('week', NOW()) as start_of_week`);
      const startOfThisWeek = new Date(startOfThisWeekResult.rows[0].start_of_week);
      const lastWorkoutDate = new Date(last_workout_at);

      if (lastWorkoutDate < startOfThisWeek) {
        if (workoutsLastWeek < target) {
          effectiveStreak = 0; 
        }
      }
    }

    const thisWeekResult = await client.query(
      `SELECT COUNT(*) FROM workout_sessions WHERE user_id = $1 AND started_at >= date_trunc('week', NOW())`, [userId]
    );
    const workoutsThisWeek = parseInt(thisWeekResult.rows[0].count);

    let newStreak = effectiveStreak;
    if (workoutsThisWeek === target) {
      newStreak = effectiveStreak + 1;
    } else {
      newStreak = effectiveStreak;
    }

    await client.query(
      'UPDATE users SET current_streak = $1, last_workout_at = NOW(), max_streak = GREATEST(max_streak, $1) WHERE id = $2',
      [newStreak, userId]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: "Trening zapisany! 🔥", sessionId, currentStreak: newStreak });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: "Błąd transakcji", details: error.message });
  } finally {
    client.release();
  }
});

// Pobranie historii treningów (Zabezpieczone stronicowanie)
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  
  let limit = parseInt(req.query.limit, 10);
  let offset = parseInt(req.query.offset, 10);

  if (isNaN(limit) || limit <= 0) limit = 20;
  limit = Math.min(limit, 100); 

  if (isNaN(offset) || offset < 0) offset = 0; 

  try {
    const sessionsQuery = `
      SELECT id, name, comment, started_at as "startedAt"
      FROM workout_sessions
      WHERE user_id = $1
      ORDER BY started_at DESC
      LIMIT $2 OFFSET $3
    `;
    const sessionsResult = await pool.query(sessionsQuery, [userId, limit, offset]);
    const sessions = sessionsResult.rows;

    if (sessions.length === 0) {
      return res.json([]);
    }

    const sessionIds = sessions.map(s => s.id);

    const seriesQuery = `
      SELECT 
        ls.id, 
        ls.workout_session_id, 
        ls.exercise_id, 
        ls.weight, 
        ls.reps, 
        ls.series_order as "order",
        ls.estimated_one_rm,
        ex.name as "exerciseName"
      FROM log_series ls
      JOIN exercises ex ON ls.exercise_id = ex.id
      WHERE ls.workout_session_id = ANY($1)
      ORDER BY ls.workout_session_id, ls.series_order ASC
    `;
    const seriesResult = await pool.query(seriesQuery, [sessionIds]);
    const allSeries = seriesResult.rows;

    const historyData = sessions.map(session => {
      return {
        ...session,
        series: allSeries.filter(s => s.workout_session_id === session.id)
      };
    });

    res.json(historyData);
  } catch (error) {
    res.status(500).json({ error: "Błąd serwera podczas pobierania historii", details: error.message });
  }
});

// Pobranie progresji 1RM ćwiczenia
router.get('/progression/:exerciseId', authenticateToken, async (req, res) => {
  const { exerciseId } = req.params;
  const userId = req.user.userId;

  try {
    const userCheck = await pool.query(
      'SELECT is_premium as "isPremium", role FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rowCount === 0) {
      return res.status(404).json({ error: "Użytkownik nie istnieje." });
    }

    const { isPremium, role } = userCheck.rows[0];

    let timeBoundaryFilter = '';
    if (!isPremium && role !== 'TRAINER') {
      timeBoundaryFilter = "AND ws.started_at >= NOW() - INTERVAL '30 days'";
    }

    const query = `
      SELECT 
        TO_CHAR(ws.started_at, 'YYYY-MM-DD') as date,
        MAX(ls.estimated_one_rm) as max_1rm
      FROM log_series ls
      JOIN workout_sessions ws ON ls.workout_session_id = ws.id
      WHERE ls.exercise_id = $1 
        AND ws.user_id = $2 
        AND ls.estimated_one_rm IS NOT NULL
        ${timeBoundaryFilter}
      GROUP BY TO_CHAR(ws.started_at, 'YYYY-MM-DD')
      ORDER BY date ASC
    `;
    
    const result = await pool.query(query, [exerciseId, userId]);
    
    const progressionData = result.rows.map(row => ({
      date: row.date,
      oneRm: parseFloat(row.max_1rm)
    }));

    res.json(progressionData);
  } catch (error) {
    res.status(500).json({ error: "Błąd podczas pobierania progresji 1RM", details: error.message });
  }
});

// Usunięcie treningu
router.delete('/:sessionId', authenticateToken, async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.userId;

  try {
    const checkQuery = 'SELECT * FROM workout_sessions WHERE id = $1 AND user_id = $2';
    const checkResult = await pool.query(checkQuery, [sessionId, userId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Nie znaleziono treningu lub nie masz uprawnień do jego usunięcia." });
    }

    await pool.query('DELETE FROM workout_sessions WHERE id = $1', [sessionId]);
    res.json({ message: "Trening został pomyślnie usunięty z historii. ✕" });
  } catch (error) {
    res.status(500).json({ error: "Błąd serwera podczas usuwania treningu", details: error.message });
  }
});

// Edycja metadanych treningu (Nazwa i Komentarz)
router.patch('/:sessionId', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { sessionId } = req.params;
  let { name, comment } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Nazwa treningu jest wymagana!" });
  }

  name = name.trim();
  comment = comment ? comment.trim() : null;

  if (name.length < 3 || name.length > 100) {
    return res.status(400).json({ error: "Nazwa treningu musi mieć od 3 do 100 znaków!" });
  }

  if (comment && comment.length > 500) {
    return res.status(400).json({ error: "Komentarz może mieć maksymalnie 500 znaków!" });
  }

  try {
    const updateQuery = `
      UPDATE workout_sessions 
      SET name = $1, comment = $2 
      WHERE id = $3 AND user_id = $4 
      RETURNING id, name, comment
    `;
    const result = await pool.query(updateQuery, [name.trim(), comment ? comment.trim() : null, sessionId, userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Nie znaleziono sesji treningowej lub brak uprawnień." });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Błąd serwera podczas edycji parametrów treningu", details: error.message });
  }
});

// Eksport historii do formatu CSV (Tylko PREMIUM / TRAINER)
router.get('/export', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const userCheck = await pool.query(
      'SELECT is_premium as "isPremium", role FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rowCount === 0) {
      return res.status(404).json({ error: "Użytkownik nie istnieje." });
    }

    const { isPremium, role } = userCheck.rows[0];

    if (!isPremium && role !== 'TRAINER') {
      return res.status(403).json({ 
        error: "Funkcja eksportu historii do pliku CSV jest dostępna wyłącznie dla użytkowników planu PREMIUM! 🦾" 
      });
    }

    const query = `
      SELECT 
        TO_CHAR(ws.started_at, 'YYYY-MM-DD HH24:MI') as "Data",
        ws.name as "Nazwa treningu",
        COALESCE(ws.comment, '') as "Komentarz do treningu",
        ex.name as "Ćwiczenie",
        ex.muscle_group as "Grupa mięśniowa",
        ls.series_order as "Numer serii",
        ls.weight as "Ciężar (kg)",
        ls.reps as "Powtórzenia",
        COALESCE(ROUND(ls.estimated_one_rm, 1), 0) as "Estymowane 1RM"
      FROM workout_sessions ws
      JOIN log_series ls ON ws.id = ls.workout_session_id
      JOIN exercises ex ON ls.exercise_id = ex.id
      WHERE ws.user_id = $1
      ORDER BY ws.started_at DESC, ls.series_order ASC
    `;
    const { rows } = await pool.query(query, [userId]);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=gympatico_historia_treningow.csv');
    res.write('\uFEFF');

    const headers = ["Data", "Nazwa treningu", "Komentarz do treningu", "Ćwiczenie", "Grupa mięśniowa", "Numer serii", "Ciężar (kg)", "Powtórzenia", "Estymowane 1RM"];
    res.write(headers.join(';') + '\n');

    for (const row of rows) {
      const line = headers.map(header => {
        const value = row[header];
        if (typeof value === 'string' && (value.includes(';') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      res.write(line.join(';') + '\n');
    }

    res.end();
  } catch (error) {
    res.status(500).json({ error: "Błąd serwera podczas generowania pliku eksportu", details: error.message });
  }
});

module.exports = router;