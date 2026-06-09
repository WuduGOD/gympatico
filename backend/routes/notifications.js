// backend/routes/notifications.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/auth');
const webpush = require('web-push');

// Konfiguracja VAPID
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:kontakt@gympatico.pl',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// =========================================================================
// 1. REJESTRACJA SUBSKRYPCJI PUSH (POST /api/notifications/subscribe)
// =========================================================================
router.post('/subscribe', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const subscription = req.body;

  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return res.status(400).json({ error: "Brak poprawnych danych subskrypcji." });
  }

  try {
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) 
       VALUES ($1::uuid, $2, $3, $4) 
       ON CONFLICT (user_id, endpoint) DO NOTHING`,
      [userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
    );
    res.status(201).json({ message: "Subskrypcja Push zapisana poprawnie! 🔔" });
  } catch (error) {
    res.status(500).json({ error: "Błąd zapisu subskrypcji Push", details: error.message });
  }
});

// =========================================================================
// 2. USUWANIE SUBSKRYPCJI PUSH (DELETE /api/notifications/unsubscribe)
// =========================================================================
router.delete('/unsubscribe', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { endpoint } = req.body;

  if (!endpoint) {
    return res.status(400).json({ error: "Brak endpointu subskrypcji do usunięcia." });
  }

  try {
    await pool.query(
      "DELETE FROM push_subscriptions WHERE user_id = $1::uuid AND endpoint = $2",
      [userId, endpoint]
    );
    res.json({ message: "Subskrypcja Push została wyrejestrowana. 🔕" });
  } catch (error) {
    res.status(500).json({ error: "Błąd usuwania subskrypcji Push", details: error.message });
  }
});

module.exports = router;