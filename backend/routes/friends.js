// backend/routes/friends.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/auth');
const checkLimits = require('../middleware/checkLimits');
const { getUserPlan } = require('../utils/userHelpers'); 

// 1. WYSŁANIE ZAPROSZENIA DO ZNAJOMYCH
router.post('/request', authenticateToken, checkLimits('friends'), async (req, res) => {
  const { targetNick } = req.body;
  const senderId = req.user.userId;

  if (!targetNick) return res.status(400).json({ error: "Musisz podać nick!" });

  try {
    // 🔴 POPRAWKA: Wyszukiwanie niewrażliwe na wielkość liter (Case-Insensitive)
    const userResult = await pool.query('SELECT id FROM users WHERE LOWER(nick) = LOWER($1)', [targetNick.trim()]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Nie znaleziono użytkownika o takim nicku!" });
    }

    const receiverId = userResult.rows[0].id;
    if (senderId === receiverId) return res.status(400).json({ error: "Nie możesz zaprosić samego siebie!" });

    const checkResult = await pool.query(
      `SELECT * FROM friendships 
       WHERE (sender_id = $1::uuid AND receiver_id = $2::uuid) 
          OR (sender_id = $2::uuid AND receiver_id = $1::uuid)`,
      [senderId, receiverId]
    );
    if (checkResult.rows.length > 0) {
      return res.status(400).json({ error: "Zaproszenie między Wami już istnieje lub jest oczekujące!" });
    }

    await pool.query('INSERT INTO friendships (sender_id, receiver_id, status) VALUES ($1::uuid, $2::uuid, \'PENDING\')', [senderId, receiverId]);
    res.status(201).json({ message: `Zaproszenie do użytkownika ${targetNick} zostało wysłane!` });
  } catch (error) {
    res.status(500).json({ error: "Błąd wysyłania zaproszenia", details: error.message });
  }
});

// 2. POBRANIE RANKINGU ZNAJOMYCH
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const query = `
      SELECT u.id, u.nick, u.last_workout_at, u.is_premium,
        CASE 
          WHEN u.last_workout_at < NOW() - INTERVAL '12 days' THEN 0
          ELSE u.current_streak
        END as "current_streak"
      FROM friendships f
      JOIN users u ON (f.sender_id = u.id AND f.receiver_id = $1::uuid) OR (f.receiver_id = u.id AND f.sender_id = $1::uuid)
      WHERE f.status = 'ACCEPTED' AND u.id != $1::uuid

      UNION

      SELECT id, nick, last_workout_at, is_premium,
        CASE 
          WHEN last_workout_at < NOW() - INTERVAL '12 days' THEN 0
          ELSE current_streak
        END as "current_streak"
      FROM users
      WHERE id = $1::uuid

      ORDER BY "current_streak" DESC, nick ASC
    `;
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Błąd pobierania rankingu znajomych", details: error.message });
  }
});

// 3. SKRZYNKA ODBIORCZA ZAPROSZEŃ
router.get('/requests', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const query = `
      SELECT f.id as friendship_id, u.id as sender_id, u.nick 
      FROM friendships f 
      JOIN users u ON f.sender_id = u.id
      WHERE f.receiver_id = $1::uuid AND f.status = 'PENDING'
    `;
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Błąd ładowania skrzynki", details: error.message });
  }
});

// 4. AKCEPTACJA ZAPROSZENIA
router.post('/accept', authenticateToken, async (req, res) => {
  const { friendshipId } = req.body;
  const userId = req.user.userId; 

  if (!friendshipId) return res.status(400).json({ error: "Brak identyfikatora zaproszenia." });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const friendshipRes = await client.query(
      `SELECT sender_id, receiver_id FROM friendships 
       WHERE id = $1::uuid AND receiver_id = $2::uuid AND status = 'PENDING' FOR UPDATE`,
      [friendshipId, userId]
    );

    if (friendshipRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Zaproszenie nie istnieje lub zostało przetworzone." });
    }

    const senderId = friendshipRes.rows[0].sender_id;

    const firstId = userId < senderId ? userId : senderId;
    const secondId = userId < senderId ? senderId : userId;

    await client.query('SELECT id FROM users WHERE id = $1::uuid FOR UPDATE', [firstId]);
    await client.query('SELECT id FROM users WHERE id = $1::uuid FOR UPDATE', [secondId]);

    const receiverPlan = await getUserPlan(userId, client);
    if (receiverPlan && !receiverPlan.is_premium && receiverPlan.role !== 'TRAINER') {
      const countRes = await client.query(
        `SELECT COUNT(*) FROM friendships 
         WHERE status = 'ACCEPTED' AND (sender_id = $1::uuid OR receiver_id = $1::uuid)`,
        [userId]
      );
      if (parseInt(countRes.rows[0].count, 10) >= 5) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: "Osiągnięto limit planu darmowego (5 znajomych w gangu). Odblokuj Premium!" });
      }
    }

    const senderPlan = await getUserPlan(senderId, client);
    if (senderPlan && !senderPlan.is_premium && senderPlan.role !== 'TRAINER') {
      const countRes = await client.query(
        `SELECT COUNT(*) FROM friendships 
         WHERE status = 'ACCEPTED' AND (sender_id = $1::uuid OR receiver_id = $1::uuid)`,
        [senderId]
      );
      if (parseInt(countRes.rows[0].count, 10) >= 5) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: "Nadawca osiągnął już maksymalny limit 5 znajomych w swoim darmowym gangu!" });
      }
    }

    await client.query("UPDATE friendships SET status = 'ACCEPTED' WHERE id = $1::uuid", [friendshipId]);
    await client.query('COMMIT');
    res.json({ message: "Zaproszenie zaakceptowane! 🤝" });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: "Błąd serwera podczas akceptacji", details: error.message });
  } finally {
    client.release();
  }
});

// 5. ODRZUCENIE ZAPROSZENIA
router.delete('/requests/:friendshipId', authenticateToken, async (req, res) => {
  const { friendshipId } = req.params;
  const userId = req.user.userId;

  try {
    const result = await pool.query(
      "DELETE FROM friendships WHERE id = $1::uuid AND receiver_id = $2::uuid AND status = 'PENDING'", 
      [friendshipId, userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Nie znaleziono zaproszenia." });
    }
    res.json({ message: "Zaproszenie zostało odrzucone. ✕" });
  } catch (error) {
    res.status(500).json({ error: "Błąd odrzucania zaproszenia", details: error.message });
  }
});

module.exports = router;