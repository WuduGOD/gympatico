require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pool = require('./config/db');
const templatesRouter = require('./routes/templates');

// Krytyczny bezpiecznik środowiskowy
if (!process.env.JWT_SECRET) {
  console.error("FATAL ERROR: Zmienna środowiskowa JWT_SECRET nie została zdefiniowana!");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// --- GLOBALNE MIDDLEWARE BEZPIECZEŃSTWA NAGŁÓWKÓW ---
app.use(helmet());

// Zaawansowana i w pełni utwardzona konfiguracja CORS
app.use(cors({
  origin: (origin, callback) => {
    // Zezwalamy na żądania bez nagłówka Origin (np. wewnętrzne testy serwera, Postman, Insomnia)
    if (!origin) return callback(null, true);

    // Czyszczenie stringów ze skrajnych spacji oraz końcowych ukośników (BHP danych)
    const cleanOrigin = origin.trim().replace(/\/$/, "");
    const cleanFrontendUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.trim().replace(/\/$/, "") : "";

    // Kryteria dopasowania uprawnień sieciowych (Origins Whitelist)
    const isLocalhost = cleanOrigin.startsWith('http://localhost') || cleanOrigin.startsWith('http://127.0.0.1');
    const isMainVercel = cleanFrontendUrl && cleanOrigin === cleanFrontendUrl;
    
    // FIX SECURE: Łączymy prefiks nazwy projektu z domeną Vercel.
    // Wpuszcza tylko adresy typu: gympatico.vercel.app, gympatico-git-main.vercel.app itp.
    // Blokuje natomiast: jakas-inna-nazwa-uzytkownika.vercel.app
    const isVercelSubdomain = cleanOrigin.startsWith('https://gympatico') && cleanOrigin.endsWith('.vercel.app');

    if (isLocalhost || isMainVercel || isVercelSubdomain) {
      // Adres zweryfikowany pozytywnie -> generujemy poprawne nagłówki dla Preflight (OPTIONS)
      return callback(null, true);
    } else {
      // Rejestrujemy próby nieautoryzowanego dostępu na żywo w logach Rendera
      console.error(`[CORS BLOKADA] Nieautoryzowany Origin: "${origin}". Oczekiwano FRONTEND_URL: "${process.env.FRONTEND_URL}"`);
      return callback(null, false); // Blokujemy ruch przeglądarkowy czysto, bez crashowania procesu Node
    }
  },
  credentials: true,
  optionsSuccessStatus: 200 // Zapewnia stabilną obsługę zapytań przedwstępnych OPTIONS w starszych przeglądarkach
}));

app.use(express.json());

// --- PODPIĘCIE MODUŁOWYCH ROUTERÓW API ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/weight', require('./routes/weight'));
app.use('/api/workouts', require('./routes/workouts'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/exercises', require('./routes/exercises'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/templates', templatesRouter);

// Uruchomienie serwera
app.listen(PORT, () => {
  console.log(`🚀 Serwer GymPatico działa stabilnie i bezpiecznie na porcie ${PORT}`);
});

module.exports = app;