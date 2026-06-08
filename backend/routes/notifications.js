const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const pool = require('../config/db');
const authenticateToken = require('../middleware/auth');

// Konfiguracja VAPID
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// 1. ENDPOINT: Rejestracja urządzenia (wywoływana z frontendu)
router.post('/subscribe', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const subscription = req.body; // To jest obiekt z przeglądarki

  try {
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (user_id, endpoint) DO NOTHING`,
      [userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
    );
    res.status(201).json({ message: "Subskrypcja Push zapisana!" });
  } catch (error) {
    res.status(500).json({ error: "Błąd zapisu subskrypcji." });
  }
});