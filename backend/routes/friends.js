// backend/routes/friends.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/auth');
const checkLimits = require('../middleware/checkLimits');
const { getUserPlan } = require('../utils/userHelpers'); 
const webpush = require('web-push');

// =========================================================================
// KONFIGURACJA WEB PUSH (VAPID)
// =========================================================================
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:kontakt@gympatico.pl',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Funkcja pomocnicza do bezpiecznego wysyłania powiadomień i czyszczenia bazy
const sendPushNotification = async (targetUserId, payloadObj) => {
  if (!process.env.VAPID_PUBLIC_KEY) return; // Pomija, jeśli nie skonfigurowano VAPID w .env

  try {
    const subsRes = await pool.query(
      "SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1::uuid", 
      [targetUserId]
    );

    if (subsRes.rowCount === 0) return;

    const payload = JSON.stringify(payloadObj);

    const pushPromises = subsRes.rows.map(sub => {
      const pushSubscription = { 
        endpoint: sub.endpoint, 
        keys: { auth: sub.auth, p256dh: sub.p256dh } 
      };
      
      return webpush.sendNotification(pushSubscription, payload).catch(err => {
        // 410 (Gone) lub 404 (Not Found) oznaczają, że użytkownik cofnął uprawnienia w przeglądarce
        if (err.statusCode === 410 || err.statusCode === 404) {
          return pool.query("DELETE FROM push_subscriptions WHERE endpoint = $1", [sub.endpoint]);
        }
      });
    });

    await Promise.all(pushPromises);
  } catch (e) {
    console.error("Błąd systemowy podczas wysyłania powiadomienia Push:", e.message);
  }
};

// =========================================================================
// 1. WYSŁANIE ZAPROSZENIA
// =========================================================================
router.post('/request', authenticateToken, checkLimits('friends'), async (req, res) => {
  const { targetNick } = req.body;
  const senderId = req.user.userId;

  if (!targetNick) return res.status(400).json({ error: "Musisz podać nick!" });

  try {
    const userResult = await pool.query('SELECT id FROM users WHERE LOWER(nick) = LOWER($1)', [targetNick.trim()]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: "Nie znaleziono użytkownika o takim nicku!" });

    const receiverId = userResult.rows[0].id;
    if (senderId === receiverId) return res.status(400).json({ error: "Nie możesz zaprosić samego siebie!" });

    const checkResult = await pool.query(
      `SELECT * FROM friendships WHERE (sender_id = $1::uuid AND receiver_id = $2::uuid) OR (sender_id = $2::uuid AND receiver_id = $1::uuid)`,
      [senderId, receiverId]
    );
    if (checkResult.rows.length > 0) return res.status(400).json({ error: "Zaproszenie między Wami już istnieje lub jest oczekujące!" });

    await pool.query('INSERT INTO friendships (sender_id, receiver_id, status) VALUES ($1::uuid, $2::uuid, \'PENDING\')', [senderId, receiverId]);
    
    // Opcjonalnie: Wyślij push do odbiorcy (jeśli chcesz powiadamiać o nowych zaproszeniach)
    await sendPushNotification(receiverId, {
      title: "Nowe zaproszenie! ✉️",
      body: `${req.user.nick} chce dołączyć do Twojego Gangu!`,
      url: "/social"
    });

    res.status(201).json({ message: `Zaproszenie do użytkownika ${targetNick} zostało wysłane!` });
  } catch (error) {
    res.status(500).json({ error: "Błąd wysyłania zaproszenia", details: error.message });
  }
});

// =========================================================================
// 2. RANKING ZNAJOMYCH
// =========================================================================
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const query = `
      SELECT u.id, u.nick, u.last_workout_at, u.is_premium,
        CASE WHEN u.last_workout_at < NOW() - INTERVAL '12 days' THEN 0 ELSE u.current_streak END as "current_streak"
      FROM friendships f
      JOIN users u ON (f.sender_id = u.id AND f.receiver_id = $1::uuid) OR (f.receiver_id = u.id AND f.sender_id = $1::uuid)
      WHERE f.status = 'ACCEPTED' AND u.id != $1::uuid
      UNION
      SELECT id, nick, last_workout_at, is_premium,
        CASE WHEN last_workout_at < NOW() - INTERVAL '12 days' THEN 0 ELSE current_streak END as "current_streak"
      FROM users WHERE id = $1::uuid
      ORDER BY "current_streak" DESC, nick ASC
    `;
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Błąd pobierania rankingu", details: error.message });
  }
});

// =========================================================================
// 3. SKRZYNKA ODBIORCZA ZAPROSZEŃ
// =========================================================================
router.get('/requests', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const result = await pool.query(
      `SELECT f.id as friendship_id, u.id as sender_id, u.nick FROM friendships f JOIN users u ON f.sender_id = u.id WHERE f.receiver_id = $1::uuid AND f.status = 'PENDING'`, 
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Błąd ładowania skrzynki", details: error.message });
  }
});

// =========================================================================
// 4. AKCEPTACJA ZAPROSZENIA
// =========================================================================
router.post('/accept', authenticateToken, async (req, res) => {
  const { friendshipId } = req.body;
  const userId = req.user.userId; 
  if (!friendshipId) return res.status(400).json({ error: "Brak identyfikatora." });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const friendshipRes = await client.query(`SELECT sender_id, receiver_id FROM friendships WHERE id = $1::uuid AND receiver_id = $2::uuid AND status = 'PENDING' FOR UPDATE`, [friendshipId, userId]);
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
      const countRes = await client.query(`SELECT COUNT(*) FROM friendships WHERE status = 'ACCEPTED' AND (sender_id = $1::uuid OR receiver_id = $1::uuid)`, [userId]);
      if (parseInt(countRes.rows[0].count, 10) >= 5) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: "Osiągnięto limit (5 znajomych)." });
      }
    }

    const senderPlan = await getUserPlan(senderId, client);
    if (senderPlan && !senderPlan.is_premium && senderPlan.role !== 'TRAINER') {
      const countRes = await client.query(`SELECT COUNT(*) FROM friendships WHERE status = 'ACCEPTED' AND (sender_id = $1::uuid OR receiver_id = $1::uuid)`, [senderId]);
      if (parseInt(countRes.rows[0].count, 10) >= 5) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: "Nadawca osiągnął już maksymalny limit znajomych!" });
      }
    }

    await client.query("UPDATE friendships SET status = 'ACCEPTED' WHERE id = $1::uuid", [friendshipId]);
    
    // Zapis powiadomienia w bazie dla in-app UI
    await client.query(
      "INSERT INTO notifications (user_id, sender_id, type, message) VALUES ($1::uuid, $2::uuid, 'FRIEND_ACCEPT', 'Zaakceptował(a) Twoje zaproszenie do Gangu!')",
      [senderId, userId]
    );

    await client.query('COMMIT');

    // 🔴 Wysłanie powiadomienia Web Push do nadawcy
    await sendPushNotification(senderId, {
      title: "Zaproszenie zaakceptowane! 🤝",
      body: `${req.user.nick} dołączył(a) do Twojego Gangu!`,
      url: "/social"
    });

    res.json({ message: "Zaproszenie zaakceptowane! 🤝" });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: "Błąd akceptacji", details: error.message });
  } finally {
    client.release();
  }
});

// =========================================================================
// 5. ODRZUCENIE ZAPROSZENIA
// =========================================================================
router.delete('/requests/:friendshipId', authenticateToken, async (req, res) => {
  const { friendshipId } = req.params;
  const userId = req.user.userId;
  try {
    const result = await pool.query("DELETE FROM friendships WHERE id = $1::uuid AND receiver_id = $2::uuid AND status = 'PENDING'", [friendshipId, userId]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Nie znaleziono zaproszenia." });
    res.json({ message: "Zaproszenie odrzucone." });
  } catch (error) {
    res.status(500).json({ error: "Błąd odrzucania", details: error.message });
  }
});

// =========================================================================
// 6. FEED AKTYWNOŚCI ZNAJOMYCH
// =========================================================================
router.get('/activity', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const query = `
      SELECT 
          u.id as user_id, u.nick, u.is_premium, 
          ws.id as workout_id, ws.name as workout_name, 
          COALESCE(ws.ended_at, ws.started_at, NOW()) as started_at,
          COALESCE(
            (SELECT json_agg(json_build_object('emoji', r.emoji, 'count', r.count, 'user_reacted', r.user_reacted))
             FROM (
                SELECT emoji, count(*) as count, bool_or(user_id = $1::uuid) as user_reacted
                FROM workout_reactions
                WHERE workout_id = ws.id
                GROUP BY emoji
             ) r
            ), '[]'::json
          ) as reactions
      FROM workout_sessions ws
      JOIN users u ON ws.user_id = u.id
      WHERE ws.user_id IN (
          SELECT CASE WHEN sender_id = $1::uuid THEN receiver_id ELSE sender_id END
          FROM friendships
          WHERE (sender_id = $1::uuid OR receiver_id = $1::uuid) AND status = 'ACCEPTED'
      )
      ORDER BY COALESCE(ws.ended_at, ws.started_at, NOW()) DESC
      LIMIT 30;
    `;
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Błąd pobierania feedu", details: error.message });
  }
});

// =========================================================================
// 7. PRZEŁĄCZANIE REAKCJI (Dodaj / Usuń) + Powiadomienia
// =========================================================================
const ALLOWED_EMOJIS = ['🔥', '💪', '👑', '👏'];

router.post('/activity/reaction', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { workoutId, emoji } = req.body;
  
  if (!workoutId || !emoji) {
    return res.status(400).json({ error: "Brak danych reakcji." });
  }

  if (!ALLOWED_EMOJIS.includes(emoji)) {
    return res.status(400).json({ error: "Niedozwolona reakcja." });
  }

  try {
    const checkRes = await pool.query(
      "SELECT id FROM workout_reactions WHERE workout_id = $1::uuid AND user_id = $2::uuid AND emoji = $3",
      [workoutId, userId, emoji]
    );

    if (checkRes.rowCount > 0) {
      await pool.query("DELETE FROM workout_reactions WHERE id = $1::uuid", [checkRes.rows[0].id]);
      return res.json({ message: "Reakcja usunięta" });
    } else {
      await pool.query(
        "INSERT INTO workout_reactions (workout_id, user_id, emoji) VALUES ($1::uuid, $2::uuid, $3)",
        [workoutId, userId, emoji]
      );

      const workoutRes = await pool.query("SELECT user_id FROM workout_sessions WHERE id = $1::uuid", [workoutId]);
      
      if (workoutRes.rowCount > 0) {
        const ownerId = workoutRes.rows[0].user_id;
        
        if (ownerId !== userId) {
          // Zapis w bazie
          await pool.query(
            "INSERT INTO notifications (user_id, sender_id, type, message) VALUES ($1::uuid, $2::uuid, 'REACTION', $3)",
            [ownerId, userId, `Zareagował(a) ${emoji} na Twój trening!`]
          );

          // 🔴 Wysłanie powiadomienia Web Push do autora treningu
          await sendPushNotification(ownerId, {
            title: "Nowa reakcja! 🔥",
            body: `${req.user.nick} zareagował(a) ${emoji} na Twój trening!`,
            url: "/social"
          });
        }
      }

      return res.json({ message: "Reakcja dodana" });
    }
  } catch (error) {
    res.status(500).json({ error: "Błąd podczas przełączania reakcji", details: error.message });
  }
});

// =========================================================================
// 8. WYZWANIA TYGODNIA
// =========================================================================
router.get('/challenges/weekly', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const query = `
      WITH gang_members AS (
        SELECT receiver_id as user_id FROM friendships WHERE sender_id = $1::uuid AND status = 'ACCEPTED'
        UNION
        SELECT sender_id as user_id FROM friendships WHERE receiver_id = $1::uuid AND status = 'ACCEPTED'
        UNION
        SELECT $1::uuid as user_id
      ),
      weekly_stats AS (
        SELECT 
          ws.user_id,
          COUNT(DISTINCT ws.id) as workouts_count,
          COALESCE(SUM(ls.weight * ls.reps), 0) as total_volume
        FROM workout_sessions ws
        LEFT JOIN log_series ls ON ws.id = ls.workout_session_id
        WHERE ws.user_id IN (SELECT user_id FROM gang_members)
          AND ws.started_at >= date_trunc('week', NOW() AT TIME ZONE 'Europe/Warsaw') AT TIME ZONE 'Europe/Warsaw'
        GROUP BY ws.user_id
      )
      SELECT 
        u.id, 
        u.nick, 
        u.is_premium,
        COALESCE(s.workouts_count, 0) as workouts_count,
        COALESCE(s.total_volume, 0) as total_volume
      FROM gang_members gm
      JOIN users u ON gm.user_id = u.id
      LEFT JOIN weekly_stats s ON u.id = s.user_id
      ORDER BY total_volume DESC, workouts_count DESC;
    `;
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Błąd pobierania wyzwań tygodnia", details: error.message });
  }
});

// =========================================================================
// 9. PODGLĄD PROFILU ZNAJOMEGO
// =========================================================================
router.get('/profile/:friendId', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { friendId } = req.params;

  try {
    const query = `
      WITH is_friend AS (
        SELECT 1 FROM friendships 
        WHERE status = 'ACCEPTED' 
        AND ((sender_id = $1::uuid AND receiver_id = $2::uuid) OR (sender_id = $2::uuid AND receiver_id = $1::uuid))
      ),
      stats_30d AS (
        SELECT 
          user_id,
          COUNT(DISTINCT ws.id) as workouts_count,
          COALESCE(SUM(ls.weight * ls.reps), 0) as total_volume
        FROM workout_sessions ws
        LEFT JOIN log_series ls ON ws.id = ls.workout_session_id
        WHERE ws.user_id IN ($1::uuid, $2::uuid)
          AND ws.started_at >= NOW() - INTERVAL '30 days'
        GROUP BY user_id
      ),
      friend_recent AS (
        SELECT id, name, started_at
        FROM workout_sessions
        WHERE user_id = $2::uuid
        ORDER BY started_at DESC
        LIMIT 5
      )
      SELECT 
        u.id, u.nick, u.current_streak, u.is_premium,
        COALESCE((SELECT workouts_count FROM stats_30d WHERE user_id = $2::uuid), 0) as friend_workouts,
        COALESCE((SELECT total_volume FROM stats_30d WHERE user_id = $2::uuid), 0) as friend_volume,
        COALESCE((SELECT workouts_count FROM stats_30d WHERE user_id = $1::uuid), 0) as my_workouts,
        COALESCE((SELECT total_volume FROM stats_30d WHERE user_id = $1::uuid), 0) as my_volume,
        COALESCE((SELECT json_agg(json_build_object('id', id, 'name', name, 'started_at', started_at)) FROM friend_recent), '[]'::json) as recent_workouts
      FROM users u
      WHERE u.id = $2::uuid AND EXISTS (SELECT 1 FROM is_friend);
    `;
    const result = await pool.query(query, [userId, friendId]);
    
    if (result.rowCount === 0) {
      return res.status(403).json({ error: "Brak dostępu lub znajomy nie istnieje." });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Błąd ładowania profilu", details: error.message });
  }
});

// =========================================================================
// 10. POWIADOMIENIA (Pobieranie)
// =========================================================================
router.get('/notifications', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const query = `
      SELECT n.id, n.type, n.message, n.is_read, n.created_at, u.nick as sender_nick
      FROM notifications n
      LEFT JOIN users u ON n.sender_id = u.id
      WHERE n.user_id = $1::uuid
      ORDER BY n.created_at DESC
      LIMIT 20
    `;
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Błąd pobierania powiadomień", details: error.message });
  }
});

// =========================================================================
// 11. POWIADOMIENIA (Oznacz jako przeczytane)
// =========================================================================
router.patch('/notifications/read', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    await pool.query("UPDATE notifications SET is_read = TRUE WHERE user_id = $1::uuid AND is_read = FALSE", [userId]);
    res.json({ message: "Powiadomienia odczytane." });
  } catch (error) {
    res.status(500).json({ error: "Błąd aktualizacji powiadomień", details: error.message });
  }
});

// =========================================================================
// 12. USUWANIE ZNAJOMEGO
// =========================================================================
router.delete('/:friendId', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { friendId } = req.params;

  try {
    const result = await pool.query(`
      DELETE FROM friendships 
      WHERE status = 'ACCEPTED' 
      AND ((sender_id = $1::uuid AND receiver_id = $2::uuid) OR (sender_id = $2::uuid AND receiver_id = $1::uuid))
    `, [userId, friendId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Nie znaleziono takiej znajomości." });
    }

    res.json({ message: "Użytkownik został usunięty ze znajomych. 💔" });
  } catch (error) {
    res.status(500).json({ error: "Błąd podczas usuwania znajomego", details: error.message });
  }
});

module.exports = router;