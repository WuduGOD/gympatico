require('dotenv').config(); // Wczytujemy zmienne na samym starcie

// Walidacja zmiennych środowiskowych (Fail-Fast)
if (!process.env.JWT_SECRET) {
  console.error("\n❌ BŁĄD KRYTYCZNY: Zmienna środowiskowa JWT_SECRET nie jest ustawiona!");
  console.error("Zabezpiecz aplikację, tworząc plik .env i ustawiając JWT_SECRET.\n");
  process.exit(1); // Natychmiastowe zatrzymanie serwera
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pool = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());

// 1. Definiujemy bezpieczną listę zaufanych adresów (origins)
const allowedOrigins = [
  process.env.FRONTEND_URL,    // Adres z Vercela
  'http://localhost:5173',     // Lokalny serwer Vite (Desktop)
  'http://127.0.0.1:5173'      // Alternatywny lokalny adres IP
].filter(Boolean); // Usuwa undefined, jeśli FRONTEND_URL nie jest ustawiony lokalnie

// Aktywacja podstawowych middleware
app.use(cors({
  origin: (origin, callback) => {
    // Zezwalamy na żądania bez nagłówka Origin (np. Postman, Insomnia czy skrypty serwerowe)
    if (!origin) return callback(null, true);

    // 1. Oczyszczamy adresy z ewentualnych spacji na końcach oraz ukośników (BHP stringów)
    const cleanOrigin = origin.trim().replace(/\/$/, "");
    const cleanFrontendUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.trim().replace(/\/$/, "") : "";

    // 2. Definiujemy reguły dopasowania
    const isLocalhost = cleanOrigin.startsWith('http://localhost') || cleanOrigin.startsWith('http://127.0.0.1');
    const isMainVercel = cleanFrontendUrl && cleanOrigin === cleanFrontendUrl;
    const isVercelSubdomain = cleanOrigin.endsWith('.vercel.app'); // Wpuszcza wszystkie produkcyjne i testowe aliasy Vercela

    if (isLocalhost || isMainVercel || isVercelSubdomain) {
      // Adres spełnia kryteria – wpuszczamy i generujemy poprawne nagłówki dla Preflight (OPTIONS)
      return callback(null, true);
    } else {
      // Jeżeli adres zostanie odrzucony, serwer jawnie zapisze to w logach live na Renderze
      console.error(`[CORS BLOKADA] Nieautoryzowany Origin: "${origin}". Oczekiwano FRONTEND_URL: "${process.env.FRONTEND_URL}"`);
      return callback(null, false); // Blokujemy czysto, bez crashowania procesu Node
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json());

// PODPIĘCIE MODUŁOWYCH ROUTERÓW
app.use('/api/auth', require('./routes/auth'));
app.use('/api/weight', require('./routes/weight'));
app.use('/api/workouts', require('./routes/workouts'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/exercises', require('./routes/exercises'));
app.use('/api/stats', require('./routes/stats'));

// [INFO] Stary, publiczny blok app.get('/api/exercises') został usunięty.
// Wszystkie zapytania GET oraz POST dla ćwiczeń przetwarza teraz moduł powyżej.

// Start serwera
app.listen(PORT, () => {
  console.log(`🚀 Profesjonalny, modułowy serwer GymPatico śmiga pod adresem http://localhost:${PORT}`);
});