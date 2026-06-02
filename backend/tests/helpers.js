// backend/tests/helpers.js
const pool = require('../config/db');

const EXERCISE_SEED = [
  ['Wyciskanie sztangi na ławce poziomej', 'Klatka piersiowa'],
  ['Przysiad ze sztangą na plecach (Back squat)', 'Nogi'],
];

async function ensureTestSchema() {
  // 1. Zapewniamy istnienie kolumny (jeśli bazy w ogóle nie było)
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'USER';
  `);

  // 2. 🔴 POPRAWKA: Wymuszamy twarde rzutowanie typu na VARCHAR(20) 
  // Jeśli kolumna istniała jako ENUM, Postgres przekonwertuje obecne wartości (np. 'USER') na czysty string
  await pool.query(`
    ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(20) USING role::varchar;
  `);

  // 3. Czyszczenie ewentualnych wartości NULL przed nałożeniem restrykcji NOT NULL
  await pool.query(`
    UPDATE users SET role = 'USER' WHERE role IS NULL;
  `);

  // 4. 🔴 POPRAWKA: Wyrównanie restrykcji do produkcyjnego init.sql
  await pool.query(`
    ALTER TABLE users ALTER COLUMN role SET DEFAULT 'USER';
    ALTER TABLE users ALTER COLUMN role SET NOT NULL;
  `);
}

async function resetDatabase() {
  await ensureTestSchema();
  await pool.query('TRUNCATE users CASCADE');
  await pool.query('TRUNCATE exercises CASCADE');
}

async function seedExercises() {
  for (const [name, muscleGroup] of EXERCISE_SEED) {
    await pool.query(
      `INSERT INTO exercises (name, muscle_group) VALUES ($1, $2)`,
      [name, muscleGroup]
    );
  }
}

async function getExerciseIdByName(namePattern) {
  const result = await pool.query(
    `SELECT id FROM exercises WHERE name ILIKE $1 LIMIT 1`,
    [namePattern]
  );
  return result.rows[0]?.id;
}

async function closePool() {
  await pool.end();
}

module.exports = {
  resetDatabase,
  seedExercises,
  getExerciseIdByName,
  closePool,
};