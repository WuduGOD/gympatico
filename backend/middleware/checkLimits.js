// backend/middleware/checkLimits.js
const pool = require('../config/db');
const { getUserPlan } = require('../utils/userHelpers');

/**
 * Fabryka middleware do weryfikacji sztywnych limitów ilościowych zasobów planu FREE.
 * @param {('templates'|'exercises'|'friends'|'workouts')} resourceType - Typ sprawdzanego zasobu
 */
const checkLimits = (resourceType) => {
  return async (req, res, next) => {
    const userId = req.user.userId;

    try {
      // Pobranie planu i roli użytkownika z bazy danych
      const plan = await getUserPlan(userId);

      if (!plan) {
        return res.status(404).json({ error: "Użytkownik nie istnieje." });
      }

      // Konta Premium oraz TRAINER mają całkowicie zniesione wszelkie limity ilościowe
      if (plan.is_premium || plan.role === 'TRAINER') {
        return next();
      }

      // A. Limit Szablonów (Max 3)
      if (resourceType === 'templates') {
        const countRes = await pool.query('SELECT COUNT(*) FROM workout_templates WHERE user_id = $1', [userId]);
        if (parseInt(countRes.rows[0].count, 10) >= 3) {
          return res.status(403).json({ 
            error: "Osiągnięto limit planu darmowego (maksymalnie 3 szablony). Przejdź na wersję Premium 💾, aby tworzyć nieograniczone plany!" 
          });
        }
      }

      // B. Limit Własnych Ćwiczeń (Max 5)
      if (resourceType === 'exercises') {
        const countRes = await pool.query('SELECT COUNT(*) FROM exercises WHERE user_id = $1', [userId]);
        if (parseInt(countRes.rows[0].count, 10) >= 5) {
          return res.status(403).json({ 
            error: "Osiągnięto limit planu darmowego (maksymalnie 5 własnych ćwiczeń). Przejdź na wersję Premium 📚, aby rozbudowywać atlas!" 
          });
        }
      }

      // C. Limit Znajomych (Max 5)
      if (resourceType === 'friends') {
        const countQuery = `
          SELECT COUNT(*) FROM friendships 
          WHERE status = 'ACCEPTED' AND (sender_id = $1 OR receiver_id = $1)
        `;
        const countRes = await pool.query(countQuery, [userId]);
        if (parseInt(countRes.rows[0].count, 10) >= 5) {
          return res.status(403).json({
            error: "Osiągnięto limit planu darmowego (maksymalnie 5 znajomych w gangu). Odblokuj wersję Premium 👥, aby zapraszać kolejnych użytkowników!"
          });
        }
      }

      // 🔴 NOWOŚĆ: D. Zabezpieczenie limitu zapisanych treningów w historii (Max 10 dla planu darmowego)
      if (resourceType === 'workouts') {
        const countRes = await pool.query('SELECT COUNT(*) FROM workout_sessions WHERE user_id = $1', [userId]);
        if (parseInt(countRes.rows[0].count, 10) >= 10) {
          return res.status(403).json({
            error: "Osiągnięto limit planu darmowego (maksymalnie 10 zapisanych treningów). Przejdź na wersję Premium ⚡, aby rejestrować nielimitowane sesje w historii!"
          });
        }
      }

      next();
    } catch (error) {
      res.status(500).json({ error: "Błąd serwera podczas weryfikacji limitów", details: error.message });
    }
  };
};

module.exports = checkLimits;