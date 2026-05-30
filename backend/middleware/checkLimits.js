// backend/middleware/checkLimits.js
const pool = require('../config/db');

/**
 * Fabryka middleware do twardej weryfikacji limitów biznesowych planu FREE
 * @param {('workouts'|'templates'|'exercises'|'friends')} resourceType - Typ sprawdzanego zasobu
 */
const checkLimits = (resourceType) => {
  return async (req, res, next) => {
    const userId = req.user.userId;

    try {
      // 1. Pobieramy aktualną rolę i status premium bezpośrednio z bazy danych (Fail-Safe)
      const userCheck = await pool.query(
        'SELECT is_premium as "isPremium", role FROM users WHERE id = $1',
        [userId]
      );

      if (userCheck.rowCount === 0) {
        return res.status(404).json({ error: "Użytkownik nie istnieje." });
      }

      const { isPremium, role } = userCheck.rows[0];

      // BEZPIECZNIK: Konta Premium oraz konta klasy TRAINER mają całkowicie zniesione limity
      if (isPremium || role === 'TRAINER') {
        return next();
      }

      // 2. WERYFIKACJA LIMITÓW DLA UŻYTKOWNIKÓW Z POZIOMU FREE
      
      // A. Limit Treningów (Max 10)
      if (resourceType === 'workouts') {
        const countRes = await pool.query('SELECT COUNT(*) FROM workout_sessions WHERE user_id = $1', [userId]);
        if (parseInt(countRes.rows[0].count, 10) >= 10) {
          return res.status(403).json({ error: "Osiągnięto limit planu darmowego (maksymalnie 10 treningów). Odblokuj wersję Premium 🦾 lub usuń stare sesje, aby zapisać nową!" });
        }
      }

      // B. Limit Szablonów (Max 3)
      if (resourceType === 'templates') {
        const countRes = await pool.query('SELECT COUNT(*) FROM workout_templates WHERE user_id = $1', [userId]);
        if (parseInt(countRes.rows[0].count, 10) >= 3) {
          return res.status(403).json({ error: "Osiągnięto limit planu darmowego (maksymalnie 3 szablony). Przejdź na wersję Premium 💾, aby tworzyć nieograniczone plany!" });
        }
      }

      // C. Limit Własnych Ćwiczeń (Max 5)
      if (resourceType === 'exercises') {
        const countRes = await pool.query('SELECT COUNT(*) FROM exercises WHERE user_id = $1', [userId]);
        if (parseInt(countRes.rows[0].count, 10) >= 5) {
          return res.status(403).json({ error: "Osiągnięto limit planu darmowego (maksymalnie 5 własnych ćwiczeń). Przejdź na wersję Premium 📚, aby rozbudowywać atlas!" });
        }
      }

      // --- POPRAWKA: D. Limit Znajomych (Maksymalnie 5 zaakceptowanych znajomości w gangu) ---
      if (resourceType === 'friends') {
        const countQuery = `
          SELECT COUNT(*) FROM friendships 
          WHERE status = 'ACCEPTED' AND (sender_id = $1 OR receiver_id = $1)
        `;
        const countRes = await pool.query(countQuery, [userId]);
        const currentFriendsCount = parseInt(countRes.rows[0].count, 10);

        if (currentFriendsCount >= 5) {
          return res.status(403).json({
            error: "Osiągnięto limit planu darmowego (maksymalnie 5 znajomych w gangu). Odblokuj wersję Premium 👥, aby móc zapraszać kolejnych deweloperów do wspólnej rywalizacji!"
          });
        }
      }

      // Jeśli użytkownik mieści się w limitach — puszczamy żądanie dalej
      next();
    } catch (error) {
      res.status(500).json({ error: "Błąd serwera podczas weryfikacji limitów konta", details: error.message });
    }
  };
};

module.exports = checkLimits;