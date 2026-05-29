const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const authenticateToken = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// KONFIGURACJA RATE LIMITERA DLA STRONY AUTH
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Okno czasowe: 15 minut
  max: 10, // Maksymalnie 10 prób z jednego adresu IP w danym oknie
  
  // Format odpowiedzi dopasowany do frontendu (obsługa catch(err) i showToast)
  message: { 
    error: "Zbyt wiele nieudanych prób! Twój adres IP został tymczasowo zablokowany. Spróbuj ponownie za 15 minut." 
  },
  
  standardHeaders: true, // Zwraca informacje o limicie w nagłówkach RateLimit-*
  legacyHeaders: false,  // Wyłącza przestarzałe nagłówki X-RateLimit-*
});

// Rejestracja
router.post('/register', authLimiter, async (req, res) => {
  const { email, password, nick } = req.body;

  if (!email || !password || !nick) {
    return res.status(400).json({ error: "Wszystkie pola (email, password, nick) są wymagane!" });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: "Hasło musi składać się z co najmniej 8 znaków!" });
  }

  try {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const query = `
      INSERT INTO users (email, password_hash, nick) 
      VALUES ($1, $2, $3) 
      RETURNING id, email, nick, created_at
    `;
    const result = await pool.query(query, [email, passwordHash, nick]);

    res.status(201).json({ message: "Użytkownik zarejestrowany! 🏋️‍♂️", user: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: "Ten adres e-mail lub nick jest już zajęty!" });
    }
    res.status(500).json({ error: "Błąd serwera podczas rejestracji", details: error.message });
  }
});

// Logowanie
router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email i hasło są wymagane!" });
  }

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Nieprawidłowy e-mail lub hasło!" });
    }

    const user = userResult.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Nieprawidłowy e-mail lub hasło!" });
    }

    const token = jwt.sign(
      { userId: user.id, nick: user.nick },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: "Zalogowano pomyślnie! 🦾",
      token,
      user: { id: user.id, email: user.email, nick: user.nick, isPremium: user.is_premium }
    });
  } catch (error) {
    res.status(500).json({ error: "Błąd serwera podczas logowania", details: error.message });
  }
});

// Pobranie aktualnych danych profilu użytkownika (w tym świeżego streaka)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, nick, current_streak, is_premium, weekly_target_workouts FROM users WHERE id = $1',
      [req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Użytkownik nie istnieje." });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Błąd serwera podczas pobierania profilu", details: error.message });
  }
});

router.put('/weekly-target', authenticateToken, async (req, res) => {
  const { weeklyTarget } = req.body;
  const userId = req.user.userId;

  // Walidacja wejścia - cel musi być logiczną liczbą dni w tygodniu (1-7)
  const targetNum = parseInt(weeklyTarget);
  if (isNaN(targetNum) || targetNum < 1 || targetNum > 7) {
    return res.status(400).json({ error: "Cel tygodniowy musi być liczbą od 1 do 7!" });
  }

  try {
    const query = `
      UPDATE users 
      SET weekly_target_workouts = $1 
      WHERE id = $2 
      RETURNING weekly_target_workouts
    `;
    const result = await pool.query(query, [targetNum, userId]);
    
    res.json({ 
      message: "Cel zaktualizowany! 🎯", 
      weekly_target_workouts: result.rows[0].weekly_target_workouts 
    });
  } catch (error) {
    res.status(500).json({ error: "Błąd serwera podczas aktualizacji celu", details: error.message });
  }
});

module.exports = router;