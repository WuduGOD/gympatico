const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/auth');

// Wysyłanie zaproszenia
router.post('/request', authenticateToken, async (req, res) => {
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

// Pobranie rankingu znajomych
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    // Dynamicznie zerujemy streak w rankingu, jeśli użytkownik opuścił cały tydzień treningowy
    const query = `
      SELECT u.id, u.nick, u.last_workout_at, u.is_premium,
        CASE 
          WHEN u.last_workout_at < NOW() - INTERVAL '12 days' THEN 0
          ELSE u.current_streak
        END as "current_streak"
      FROM friendships f
      JOIN users u ON (f.sender_id = u.id AND f.receiver_id = $1) OR (f.receiver_id = u.id AND f.sender_id = $1)
      WHERE f.status = 'ACCEPTED' AND u.id != $1
      ORDER BY "current_streak" DESC
    `;
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Błąd pobierania rankingu znajomych", details: error.message });
  }
});

// Skrzynka odbiorcza zaproszeń
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

// Akceptacja zaproszenia
router.post('/accept', authenticateToken, async (req, res) => {
  const { friendshipId } = req.body;
  const userId = req.user.userId; // Wyciągamy ID zalogowanego użytkownika z tokenu

  if (!friendshipId) {
    return res.status(400).json({ error: "Brak identyfikatora zaproszenia." });
  }

  try {
    // Dodajemy warunek: receiver_id = $2
    const query = `
      UPDATE friendships 
      SET status = 'ACCEPTED' 
      WHERE id = $1 AND receiver_id = $2 AND status = 'PENDING' 
      RETURNING *
    `;
    
    const result = await pool.query(query, [friendshipId, userId]);
    
    // Jeśli zaproszenie nie należało do usera, zapytanie nie zmodyfikuje żadnego wiersza
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: "Zaproszenie nie istnieje, zostało już przetworzone lub nie masz uprawnień do jego akceptacji." 
      });
    }
    
    res.json({ message: "Zaproszenie zaakceptowane! 🤝" });
  } catch (error) {
    res.status(500).json({ error: "Błąd serwera podczas akceptacji zaproszenia", details: error.message });
  }
});

router.delete('/requests/:friendshipId', authenticateToken, async (req, res) => {
  const { friendshipId } = req.params;
  const userId = req.user.userId;

  try {
    // Pancerne i szybkie zapytanie: kasujemy tylko, jeśli ID się zgadza, status to PENDING i zalogowany user jest ODBIORCĄ
    const deleteQuery = `
      DELETE FROM friendships 
      WHERE id = $1 AND receiver_id = $2 AND status = 'PENDING'
    `;
    const result = await pool.query(deleteQuery, [friendshipId, userId]);

    // Jeśli baza danych nie usunęła żadnego wiersza (rowCount === 0), zwracamy błąd uprawnień lub braku rekordu
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