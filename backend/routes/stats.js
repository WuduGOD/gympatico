const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    // 1. Łączna liczba treningów (liczba sesji)
    const workoutsCountQuery = 'SELECT COUNT(*) as "totalWorkouts" FROM workout_sessions WHERE user_id = $1';
    
    // 2. Łączny tonaż (suma: ciężar * powtórzenia dla wszystkich serii użytkownika)
    const tonnageQuery = `
      SELECT COALESCE(SUM(ls.weight * ls.reps), 0) as "totalTonnage"
      FROM log_series ls
      JOIN workout_sessions ws ON ls.workout_session_id = ws.id
      WHERE ws.user_id = $1
    `;

    // 3. Najlepszy streak ever oraz obecny (pobierany bezpośrednio z tabeli użytkownika)
    const streakQuery = 'SELECT current_streak as "currentStreak", max_streak as "maxStreak" FROM users WHERE id = $1';

    // 4. Ulubione ćwiczenie (najczęściej logowane w seriach)
    const favoriteExerciseQuery = `
      SELECT ex.name, COUNT(*) as "count", ex.muscle_group as "muscleGroup"
      FROM log_series ls
      JOIN workout_sessions ws ON ls.workout_session_id = ws.id
      JOIN exercises ex ON ls.exercise_id = ex.id
      WHERE ws.user_id = $1
      GROUP BY ex.name, ex.muscle_group
      ORDER BY "count" DESC
      LIMIT 1
    `;

    // Odpalamy wszystkie zapytania równolegle przez Promise.all dla maksymalnej wydajności
    const [workoutsRes, tonnageRes, streakRes, favRes] = await Promise.all([
      pool.query(workoutsCountQuery, [userId]),
      pool.query(tonnageQuery, [userId]),
      pool.query(streakQuery, [userId]),
      pool.query(favoriteExerciseQuery, [userId])
    ]);

    // Formatujemy paczkę zwrotną
    const totalWorkouts = parseInt(workoutsRes.rows[0].totalWorkouts || 0);
    const totalTonnage = parseFloat(tonnageRes.rows[0].totalTonnage || 0);
    const currentStreak = streakRes.rows[0]?.currentStreak || 0;
    const maxStreak = streakRes.rows[0]?.maxStreak || 0;
    const favorite = favRes.rows[0] || null;

    res.json({
      totalWorkouts,
      totalTonnage,
      currentStreak,
      maxStreak,
      favorite: favorite ? {
        name: favorite.name,
        muscleGroup: favorite.muscleGroup,
        count: parseInt(favorite.count)
      } : null
    });

  } catch (error) {
    res.status(500).json({ error: "Błąd serwera podczas kompilacji statystyk", details: error.message });
  }
});

module.exports = router;