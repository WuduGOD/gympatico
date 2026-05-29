const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/auth');

// Zapisanie treningu + wyliczenie streaka
router.post('/', authenticateToken, async (req, res) => {
  const { name, comment, series } = req.body;
  const userId = req.user.userId;

  if (!name || !series || !Array.isArray(series) || series.length === 0) {
    return res.status(400).json({ error: "Nazwa treningu oraz serie są wymagane!" });
  }

  try {
    await pool.query('BEGIN');

    const sessionResult = await pool.query(
      "INSERT INTO workout_sessions (user_id, name, comment, started_at, ended_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id",
      [userId, name, comment || null]
    );
    const sessionId = sessionResult.rows[0].id;

    for (let i = 0; i < series.length; i++) {
      const s = series[i];
      let estimatedOneRM = null;
      if (s.reps >= 1 && s.reps <= 12) {
        estimatedOneRM = s.weight * (1 + s.reps / 30);
      }

      await pool.query(
        `INSERT INTO log_series (workout_session_id, exercise_id, weight, reps, series_order, estimated_one_rm, is_alternative, comment)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [sessionId, s.exerciseId, s.weight, s.reps, s.order || (i + 1), estimatedOneRM, s.isAlternative || false, s.comment || null]
      );
    }

    const userResult = await pool.query('SELECT current_streak, weekly_target_workouts FROM users WHERE id = $1', [userId]);
    const { current_streak, weekly_target_workouts } = userResult.rows[0];

    // Definiujemy bezpieczny cel (fallback na 3, jeśli w bazie siedzi NULL)
    const target = weekly_target_workouts ?? 3;

    // 1. Pobieramy liczbę treningów z BIEŻĄCEGO tygodnia (wliczając ten właśnie zapisany)
    const thisWeekResult = await pool.query(
      `SELECT COUNT(*) FROM workout_sessions WHERE user_id = $1 AND started_at >= date_trunc('week', NOW())`, [userId]
    );
    const workoutsThisWeek = parseInt(thisWeekResult.rows[0].count);

    // 2. Pobieramy liczbę treningów z POPRZEDNIEGO tygodnia
    const lastWeekResult = await pool.query(
      `SELECT COUNT(*) FROM workout_sessions WHERE user_id = $1 
      AND started_at >= date_trunc('week', NOW() - INTERVAL '1 week') 
      AND started_at < date_trunc('week', NOW())`, [userId]
    );
    const workoutsLastWeek = parseInt(lastWeekResult.rows[0].count);

    let newStreak = current_streak;
    const didMeetGoalLastWeek = workoutsLastWeek >= target;

    // LOGIKA AKTUALIZACJI Z WYKORZYSTANIEM ZMIENNEJ TARGET:
    if (workoutsThisWeek === target) {
      // Użytkownik właśnie domknął cel w tym tygodniu!
      if (didMeetGoalLastWeek || current_streak === 0) {
        // Jeśli poprzedni tydzień był zaliczony (lub dopiero zaczyna od zera), podbijamy streak
        newStreak = current_streak + 1;
      } else {
        // Jeśli poprzedni tydzień zawalił, ale w tym właśnie zrobił cel – jego nowy streak to 1
        newStreak = 1;
      }
    } else if (workoutsThisWeek > target) {
      // Każdy kolejny trening ponad cel w tym samym tygodniu tylko utrzymuje obecny (już podbity) streak
      newStreak = current_streak;
    } else {
      // Użytkownik jest w trakcie robienia celu (workoutsThisWeek < target)
      if (didMeetGoalLastWeek) {
        // Poprzedni tydzień był zielony, więc w trakcie tego tygodnia wciąż utrzymujemy jego dotychczasowy streak
        newStreak = current_streak;
      } else {
        // Poprzedni tydzień był czerwony i w tym jeszcze nie osiągnął celu -> streak leci na 0
        newStreak = 0;
      }
    }

    await pool.query(
      'UPDATE users SET current_streak = $1, last_workout_at = NOW(), max_streak = GREATEST(max_streak, $1) WHERE id = $2',
      [newStreak, userId]
    );
    await pool.query('COMMIT');

    res.status(201).json({ message: "Trening zapisany! 🔥", sessionId, currentStreak: newStreak });
  } catch (error) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: "Błąd transakcji", details: error.message });
  }
});

// Pobranie historii treningów
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  
  // Pobieramy parametry z query stringa, ustawiając bezpieczne wartości domyślne
  const limit = parseInt(req.query.limit) || 20;
  const offset = parseInt(req.query.offset) || 0;

  try {
    // Krok A: Pobieramy tylko określone sesje treningowe dla danej strony
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

    // Krok B: Wyciągamy ID pobranych sesji, aby pobrać do nich serie
    const sessionIds = sessions.map(s => s.id);

    const seriesQuery = `
      SELECT 
        ls.id, 
        ls.workout_session_id, 
        ls.exercise_id, 
        ls.weight, 
        ls.reps, 
        ls.series_order as "order", -- <--- TUTAJ: mapujemy series_order na alias "order"
        ls.estimated_one_rm,
        ex.name as "exerciseName"
      FROM log_series ls
      JOIN exercises ex ON ls.exercise_id = ex.id
      WHERE ls.workout_session_id = ANY($1)
      ORDER BY ls.workout_session_id, ls.series_order ASC
    `;
    const seriesResult = await pool.query(seriesQuery, [sessionIds]);
    const allSeries = seriesResult.rows;

    // Krok C: Mapujemy serie do odpowiadających im sesji treningowych
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

router.get('/progression/:exerciseId', authenticateToken, async (req, res) => {
  const { exerciseId } = req.params;
  const userId = req.user.userId;

  try {
    const query = `
      SELECT 
        TO_CHAR(ws.started_at, 'YYYY-MM-DD') as date,
        MAX(ls.estimated_one_rm) as max_1rm
      FROM log_series ls
      JOIN workout_sessions ws ON ls.workout_session_id = ws.id
      WHERE ls.exercise_id = $1 
        AND ws.user_id = $2 
        AND ls.estimated_one_rm IS NOT NULL
      GROUP BY TO_CHAR(ws.started_at, 'YYYY-MM-DD') -- Grupowanie TYLKO po sformatowanym dniu
      ORDER BY date ASC -- Sortowanie tekstowe YYYY-MM-DD działa perfekcyjnie chronologicznie
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

router.delete('/:sessionId', authenticateToken, async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.userId;

  try {
    // Sprawdzamy, czy sesja istnieje i należy do zalogowanego użytkownika
    const checkQuery = 'SELECT * FROM workout_sessions WHERE id = $1 AND user_id = $2';
    const checkResult = await pool.query(checkQuery, [sessionId, userId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Nie znaleziono treningu lub nie masz uprawnień do jego usunięcia." });
    }

    // Usuwamy trening. Kaskada (ON DELETE CASCADE) na poziomie bazy danych automatycznie usunie serie z log_series.
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
  const { name, comment } = req.body;

  // Walidacja obecności nazwy (nie pozwalamy na wyczyszczenie nazwy sesji)
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Nazwa treningu jest wymagana!" });
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

module.exports = router;