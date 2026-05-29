-- 1. Tabela Użytkowników
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nick VARCHAR(55) UNIQUE NOT NULL,
    weekly_target_workouts INT DEFAULT 3,
    current_streak INT DEFAULT 0,
    max_streak INT DEFAULT 0,
    last_workout_at TIMESTAMP,
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela Logów Wagi
CREATE TABLE weight_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    weight NUMERIC(5,2) NOT NULL,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela Ćwiczeń (Czysta kolumna name, bez starego ograniczenia UNIQUE)
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    muscle_group VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE DEFAULT NULL
);

-- 4. INDEKSY UNIKALNE (Muszą powstać natychmiast po tabeli exercises!)
-- Zabezpieczenie ćwiczeń globalnych (brak wielokrotnych duplikatów o tej samej nazwie w atlasie systemowym)
CREATE UNIQUE INDEX exercises_global_name_idx ON exercises (LOWER(name)) WHERE user_id IS NULL;

-- Zabezpieczenie ćwiczeń prywatnych (dany user nie doda u siebie dwóch tak samo nazwanych pozycji)
CREATE UNIQUE INDEX exercises_user_name_idx ON exercises (LOWER(name), user_id) WHERE user_id IS NOT NULL;

-- 5. Tabela Znajomości
CREATE TABLE friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_friendship UNIQUE (sender_id, receiver_id)
);

-- 6. Tabela Sesji Treningowych
CREATE TABLE workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    comment TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabela Serii Treningowych
CREATE TABLE log_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
    weight NUMERIC NOT NULL,
    reps INT NOT NULL,
    series_order INT NOT NULL,
    estimated_one_rm NUMERIC,
    is_alternative BOOLEAN DEFAULT FALSE,
    comment TEXT
);

-- Tabela główna szablonów
CREATE TABLE workout_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela przechowująca konfigurację serii w danym szablonie
CREATE TABLE template_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    weight NUMERIC(6,2) NOT NULL,
    reps INT NOT NULL,
    series_order INT NOT NULL
);

CREATE INDEX idx_templates_user ON workout_templates(user_id);
CREATE INDEX idx_template_series_template ON template_series(template_id);

-- 8. SEEDOWANIE BAZY DANYCH (Teraz ON CONFLICT idealnie trafia w utworzony wyżej indeks globalny)
INSERT INTO exercises (name, muscle_group) VALUES
  -- Klatka piersiowa
  ('Wyciskanie sztangi na ławce poziomej', 'Klatka piersiowa'),
  ('Wyciskanie hantli na ławce skośnej dodatniej', 'Klatka piersiowa'),
  ('Pompki na poręczach (Dips)', 'Klatka piersiowa'),
  ('Rozpiętki z hantlami na ławce poziomej', 'Klatka piersiowa'),

  -- Plecy
  ('Martwy ciąg klasyczny', 'Plecy'),
  ('Podciąganie na drążku (nachwytem)', 'Plecy'),
  ('Wiosłowanie sztangą w opadzie tułowia', 'Plecy'),
  ('Ściąganie drążka wyciągu górnego do klatki', 'Plecy'),
  ('Wiosłowanie hantlem jednorącz w oparciu o ławkę', 'Plecy'),

  -- Barki
  ('Wyciskanie żołnierskie (OHP)', 'Barki'),
  ('Wyciskanie hantli siedząc', 'Barki'),
  ('Unoszenie hantli bokiem stojąc', 'Barki'),
  ('Odwrotne rozpiętki na maszynie (Face pulls)', 'Barki'),

  -- Nogi
  ('Przysiad ze sztangą na plecach (Back squat)', 'Nogi'),
  ('Wypychanie ciężaru na suwnicy (Leg press)', 'Nogi'),
  ('Rumuński martwy ciąg (RDL)', 'Nogi'),
  ('Prostowanie nóg na maszynie siedząc', 'Nogi'),
  ('Uginanie nóg na maszynie leżąc', 'Nogi'),

  -- Ramiona (Biceps i Triceps)
  ('Uginanie przedramion ze sztangą łamaną stojąc', 'Biceps'),
  ('Uginanie przedramion z hantlami z supinacją', 'Biceps'),
  ('Wyciskanie francuskie ze sztangą łamaną leżąc', 'Triceps'),
  ('Prostowanie przedramion na wyciągu (linki)', 'Triceps')
ON CONFLICT (LOWER(name)) WHERE user_id IS NULL DO NOTHING;