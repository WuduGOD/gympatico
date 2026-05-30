// backend/routes/weight.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/auth');
const { getUserPlan } = require('../utils/userHelpers'); // <--- IMPORT HELPERA

// Pobieranie historii wagi
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  
  try {
    // Korzystamy z ujednoliconego helpera
    const plan = await getUserPlan(userId);

    if (!plan) {
      return res.status(404).json({ error: "Użytkownik nie istnieje." });
    }

    // Twardy sufit dla planu darmowego
    let sqlLimitFilter = '';
    if (!plan.is_premium && plan.role !== 'TRAINER') {
      sqlLimitFilter = 'LIMIT 7';
    }

    const query = `
      SELECT id, user_id, weight, date 
      FROM weight_logs 
      WHERE user_id = $1 
      ORDER BY date DESC 
      ${sqlLimitFilter}
    `;
    
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Błąd pobierania wagi", details: error.message });
  }
});

module.exports = router;