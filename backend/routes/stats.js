// backend/routes/stats.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    // 1. Łączna liczba treningów (liczba sesji)
    const workoutsCountQuery = 'SELECT COUNT(*)::int as "totalWorkouts" FROM workout_sessions WHERE user_id = $1';
    
    // 2. Łączny tonaż (suma: ciężar * powtórzenia dla wszystkich serii użytkownika)
    const tonnageQuery = `
      SELECT COALESCE(SUM(ls.weight * ls.reps), 0)::float as "totalTonnage"
      FROM log_series ls
      JOIN workout_sessions ws ON ls.workout_session_id = ws.id
      WHERE ws.user_id = $1
    `;

    // 3. Najlepszy streak ever oraz obecny (pobierany bezpośrednio z tabeli użytkownika)
    const streakQuery = 'SELECT current_streak as "currentStreak", max_streak as "maxStreak" FROM users WHERE id = $1';

    // 4. Ulubiona grupa mięśniowa (najczęściej trenowana partia na bazie liczby serii)
    const favoriteMuscleQuery = `
      SELECT ex.muscle_group as "muscleGroup"
      FROM log_series ls
      JOIN workout_sessions ws ON ls.workout_session_id = ws.id
      JOIN exercises ex ON ls.exercise_id = ex.id
      WHERE ws.user_id = $1
      GROUP BY ex.muscle_group
      ORDER BY COUNT(*) DESC
      LIMIT 1
    `;

    // 5. Rozkład serii na grupy mięśniowe (potrzebny do wykresów proporcji na frontendzie)
    const distributionQuery = `
      SELECT ex.muscle_group, COUNT(*)::int as "count"
      FROM log_series ls
      JOIN workout_sessions ws ON ls.workout_session_id = ws.id
      JOIN exercises ex ON ls.exercise_id = ex.id
      WHERE ws.user_id = $1
      GROUP BY ex.muscle_group
      ORDER BY "count" DESC
    `;

    // Odpalamy wszystkie zapytania równolegle przez Promise.all dla maksymalnej wydajności sieciowej
    const [workoutsRes, tonnageRes, streakRes, favRes, distRes] = await Promise.all([
      pool.query(workoutsCountQuery, [userId]),
      pool.query(tonnageQuery, [userId]),
      pool.query(streakQuery, [userId]),
      pool.query(favoriteMuscleQuery, [userId]),
      pool.query(distributionQuery, [userId])
    ]);

    // Formatujemy i mapujemy paczkę zwrotną dokładnie pod klucze, których szuka StatsView.jsx
    res.json({
      totalWorkouts: workoutsRes.rows[0]?.totalWorkouts || 0,
      totalVolume: tonnageRes.rows[0]?.totalTonnage || 0, // Mapowanie tonażu na frontendowy totalVolume
      currentStreak: streakRes.rows[0]?.currentStreak || 0,
      maxStreak: streakRes.rows[0]?.maxStreak || 0,
      favoriteMuscleGroup: favRes.rows[0]?.muscleGroup || 'Brak danych', // Zgodność z favoriteMuscleGroup
      muscleDistribution: distRes.rows // Tablica z obiektami { muscle_group, count }
    });

  } catch (error) {
    res.status(500).json({ error: "Błąd serwera podczas kompilacji statystyk", details: error.message });
  }
});

module.exports = router;