// backend/middleware/checkLimits.js
const pool = require('../config/db');
const { getUserPlan } = require('../utils/userHelpers');

const checkLimits = (resourceType) => {
  return async (req, res, next) => {
    const userId = req.user.userId;

    try {
      const plan = await getUserPlan(userId);
      if (!plan) return res.status(404).json({ error: "Użytkownik nie istnieje." });
      if (plan.is_premium || plan.role === 'TRAINER') return next();

      if (resourceType === 'templates') {
        const countRes = await pool.query('SELECT COUNT(*) FROM workout_templates WHERE user_id = $1::uuid', [userId]);
        if (parseInt(countRes.rows[0].count, 10) >= 3) {
          return res.status(403).json({ error: "Osiągnięto limit (max 3 szablony). Przejdź na Premium 💾!" });
        }
      }

      if (resourceType === 'exercises') {
        const countRes = await pool.query('SELECT COUNT(*) FROM exercises WHERE user_id = $1::uuid', [userId]);
        if (parseInt(countRes.rows[0].count, 10) >= 5) {
          return res.status(403).json({ error: "Osiągnięto limit (max 5 własnych ćwiczeń). Przejdź na Premium 📚!" });
        }
      }

      if (resourceType === 'friends') {
        const countRes = await pool.query(
          "SELECT COUNT(*) FROM friendships WHERE status = 'ACCEPTED' AND (sender_id = $1::uuid OR receiver_id = $1::uuid)", 
          [userId]
        );
        if (parseInt(countRes.rows[0].count, 10) >= 5) {
          return res.status(403).json({ error: "Osiągnięto limit gangu (max 5 znajomych). Odblokuj Premium 👥!" });
        }
      }

      if (resourceType === 'workouts') {
        const countRes = await pool.query('SELECT COUNT(*) FROM workout_sessions WHERE user_id = $1::uuid', [userId]);
        if (parseInt(countRes.rows[0].count, 10) >= 10) {
          return res.status(403).json({ error: "Osiągnięto limit historii (max 10 treningów). Przejdź na Premium ⚡!" });
        }
      }

      next();
    } catch (error) {
      res.status(500).json({ error: "Błąd weryfikacji limitów", details: error.message });
    }
  };
};

module.exports = checkLimits;