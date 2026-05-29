const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/auth'); // Twoje middleware do weryfikacji JWT

// 1. Pobieranie atlasu ćwiczeń (Globalne + Prywatne zalogowanego użytkownika)
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    // Pobieramy ćwiczenia, gdzie user_id jest NULL (systemowe) LUB należy do zalogowanego usera
    const query = `
      SELECT id, name, muscle_group as "muscle_group", user_id as "user_id"
      FROM exercises
      WHERE user_id IS NULL OR user_id = $1
      ORDER BY name ASC
    `;
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Błąd serwera podczas pobierania atlasu ćwiczeń", details: error.message });
  }
});

// 2. Dodawanie własnego ćwiczenia przez użytkownika
router.post('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { name, muscleGroup } = req.body;

  if (!name || !muscleGroup) {
    return res.status(400).json({ error: "Nazwa ćwiczenia oraz grupa mięśniowa są wymagane!" });
  }

  try {
    // Sprawdzamy duplikaty w zakresie globalnym oraz prywatnym tego użytkownika
    const checkQuery = `
      SELECT id FROM exercises 
      WHERE LOWER(name) = LOWER($1) AND (user_id IS NULL OR user_id = $2)
    `;
    const checkResult = await pool.query(checkQuery, [name.trim(), userId]);
    if (checkResult.rows.length > 0) {
      return res.status(400).json({ error: "Ćwiczenie o takiej nazwie już istnieje w Twoim atlasie!" });
    }

    const insertQuery = `
      INSERT INTO exercises (name, muscle_group, user_id)
      VALUES ($1, $2, $3)
      RETURNING id, name, muscle_group as "muscle_group", user_id as "user_id"
    `;
    const result = await pool.query(insertQuery, [name.trim(), muscleGroup, userId]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Błąd serwera podczas dodawania ćwiczenia", details: error.message });
  }
});

// 3. Usuwanie własnego ćwiczenia przez użytkownika
router.delete('/:id', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const exerciseId = req.params.id;

  try {
    // Klauzula WHERE chroni przed usunięciem ćwiczeń globalnych (NULL) lub innych userów
    const deleteQuery = 'DELETE FROM exercises WHERE id = $1 AND user_id = $2 RETURNING *';
    const result = await pool.query(deleteQuery, [exerciseId, userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Nie znaleziono ćwiczenia lub nie masz uprawnień do jego usunięcia." });
    }

    res.json({ message: "Ćwiczenie zostało pomyślnie usunięte z Twojego atlasu." });
  } catch (error) {
    // Obsługa klucza obcego (Foreign Key Constraint) — ochrona integralności danych
    if (error.code === '23503') {
      return res.status(400).json({ 
        error: "Nie można usunąć ćwiczenia, ponieważ zostało już użyte w zapisanych treningach! Usuń najpierw te treningi z historii." 
      });
    }
    res.status(500).json({ error: "Błąd serwera podczas usuwania ćwiczenia", details: error.message });
  }
});

module.exports = router;