// backend/routes/friends.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/auth');
const checkLimits = require('../middleware/checkLimits');
// 🔴 KLUCZOWY IMPORT: Brak tego helpera powodował błąd 500 na serwerze!
const { getUserPlan } = require('../utils/userHelpers'); 

// =========================================================================
// 1. WYSŁANIE ZAPROSZENIA DO ZNAJOMYCH
// =========================================================================
router.post('/request', authenticateToken, checkLimits('friends'), async (req, res) => {
  const { targetNick } = req.body;
  const senderId = req.user.userId;

  if (!targetNick) return res.status(400).json({ error: "Musisz podać nick!" });

  try {
    const userResult = await pool.query('SELECT id FROM users WHERE nick = $1', [targetNick]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Nie znaleziono użytkownika o takim nicku!" });
    }

    const receiverId = userResult.rows[0].id;
    if (senderId === receiverId) return res.status(400).json({ error: "Nie możesz zaprosić samego siebie!" });

    const checkResult = await pool.query(
      "SELECT * FROM friendships WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)",
      [senderId, receiverId]
    );
    if (checkResult.rows.length > 0) {
      return res.status(400).json({ error: "Zaproszenie między Wami już istnieje lub jest oczekujące!" });
    }

    await pool.query('INSERT INTO friendships (sender_id, receiver_id, status) VALUES ($1, $2, \'PENDING\')', [senderId, receiverId]);
    res.status(201).json({ message: `Zaproszenie do użytkownika ${targetNick} zostało wysłane!` });
  } catch (error) {
    res.status(500).json({ error: "Błąd wysyłania zaproszenia", details: error.message });
  }
});

// =========================================================================
// 2. POBRANIE RANKINGU ZNAJOMYCH (Zgłoszenie ciągłości streaków)
// =========================================================================
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
      JOIN users u ON (f.sender_id = u.id AND f.receiver_id = $1) OR (f.receiver_id = u.id AND f.sender_id = $1)
      WHERE f.status = 'ACCEPTED' AND u.id != $1

      UNION

      SELECT id, nick, last_workout_at, is_premium,
        CASE 
          WHEN last_workout_at < NOW() - INTERVAL '12 days' THEN 0
          ELSE current_streak
        END as "current_streak"
      FROM users
      WHERE id = $1

      ORDER BY "current_streak" DESC, nick ASC
    `;
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Błąd pobierania rankingu znajomych", details: error.message });
  }
});

// =========================================================================
// 3. SKRZYNKA ODBIORCZA ZAPROSZEŃ
// =========================================================================
router.get('/requests', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const query = `
      SELECT f.id as friendship_id, u.id as sender_id, u.nick 
      FROM friendships f 
      JOIN users u ON f.sender_id = u.id
      WHERE f.receiver_id = $1 AND f.status = 'PENDING'
    `;
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Błąd ładowania skrzynki", details: error.message });
  }
});

// =========================================================================
// 4. AKCEPTACJA ZAPROSZENIA (W pełni bezpieczna i transakcyjna)
// =========================================================================
router.post('/accept', authenticateToken, async (req, res) => {
  const { friendshipId } = req.body;
  const userId = req.user.userId; 

  if (!friendshipId) {
    return res.status(400).json({ error: "Brak identyfikatora zaproszenia." });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // KROK A: Pobieramy rekord zaproszenia z blokadą wiersza relacji
    const friendshipRes = await client.query(
      `SELECT sender_id, receiver_id FROM friendships 
       WHERE id = $1 AND receiver_id = $2 AND status = 'PENDING' FOR UPDATE`,
      [friendshipId, userId]
    );

    if (friendshipRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        error: "Zaproszenie nie istnieje, zostało już przetworzone lub nie masz uprawnień do jego akceptacji." 
      });
    }

    const senderId = friendshipRes.rows[0].sender_id;

    // KROK B: Sortowanie ID w celu uniknięcia zakleszczeń (Deadlocks) bazy danych
    const firstId = userId < senderId ? userId : senderId;
    const secondId = userId < senderId ? senderId : userId;

    await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [firstId]);
    await client.query('SELECT id FROM users WHERE id = $2 FOR UPDATE', [secondId]);

    // KROK C: Weryfikacja limitu gangu po stronie ODBIORCY
    const receiverPlan = await getUserPlan(userId, client);
    if (receiverPlan && !receiverPlan.is_premium && receiverPlan.role !== 'TRAINER') {
      const countRes = await client.query(
        `SELECT COUNT(*) FROM friendships 
         WHERE status = 'ACCEPTED' AND (sender_id = $1 OR receiver_id = $1)`,
        [userId]
      );
      if (parseInt(countRes.rows[0].count, 10) >= 5) {
        await client.query('ROLLBACK');
        return res.status(403).json({ 
          error: "Nie możesz zaakceptować zaproszenia. Osiągnięto limit planu darmowego (maksymalnie 5 znajomych w gangu). Odblokuj Premium 👥!" 
        });
      }
    }

    // KROK D: Weryfikacja limitu po stronie NADAWCY
    const senderPlan = await getUserPlan(senderId, client);
    if (senderPlan && !senderPlan.is_premium && senderPlan.role !== 'TRAINER') {
      const countRes = await client.query(
        `SELECT COUNT(*) FROM friendships 
         WHERE status = 'ACCEPTED' AND (sender_id = $1 OR receiver_id = $1)`,
        [senderId]
      );
      if (parseInt(countRes.rows[0].count, 10) >= 5) {
        await client.query('ROLLBACK');
        return res.status(403).json({ 
          error: "Nie można zaakceptować zaproszenia. Nadawca osiągnął już maksymalny limit 5 znajomych w swoim darmowym gangu!" 
        });
      }
    }

    // KROK E: Zmiana statusu znajomości na aktywną
    await client.query(
      "UPDATE friendships SET status = 'ACCEPTED' WHERE id = $1",
      [friendshipId]
    );

    await client.query('COMMIT');
    res.json({ message: "Zaproszenie zaakceptowane! 🤝" });
  } catch (error) {
    await client.query('ROLLBACK');
    // 🔴 DODANO DIAGNOSTYKĘ LOGÓW: Zapis błędu bezpośrednio w konsoli deweloperskiej Rendera
    console.error("❌ CRITICAL BACKEND ERROR IN POST /accept:", error);
    res.status(500).json({ error: "Błąd serwera podczas akceptacji zaproszenia", details: error.message });
  } finally {
    client.release();
  }
});

// =========================================================================
// 5. ODRZUCENIE / USUNIĘCIE ZAPROSZENIA
// =========================================================================
router.delete('/requests/:friendshipId', authenticateToken, async (req, res) => {
  const { friendshipId } = req.params;
  const userId = req.user.userId;

  try {
    const deleteQuery = `
      DELETE FROM friendships 
      WHERE id = $1 AND receiver_id = $2 AND status = 'PENDING'
    `;
    const result = await pool.query(deleteQuery, [friendshipId, userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ 
        error: "Nie znaleziono takiego zaproszenia lub nie masz uprawnień do jego odrzucenia." 
      });
    }

    res.json({ message: "Zaproszenie zostało odrzucone. ✕" });
  } catch (error) {
    res.status(500).json({ error: "Błąd serwera podczas odrzucania zaproszenia", details: error.message });
  }
});

module.exports = router;