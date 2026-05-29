require('dotenv').config(); // Wczytujemy zmienne na samym starcie

// Walidacja zmiennych środowiskowych (Fail-Fast)
if (!process.env.JWT_SECRET) {
  console.error("\n❌ BŁĄD KRYTYCZNY: Zmienna środowiskowa JWT_SECRET nie jest ustawiona!");
  console.error("Zabezpiecz aplikację, tworząc plik .env i ustawiając JWT_SECRET.\n");
  process.exit(1); // Natychmiastowe zatrzymanie serwera
}

const express = require('express');
const cors = require('cors');
const pool = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Definiujemy bezpieczną listę zaufanych adresów (origins)
const allowedOrigins = [
  process.env.FRONTEND_URL,    // Adres z Vercela
  'http://localhost:5173',     // Lokalny serwer Vite (Desktop)
  'http://127.0.0.1:5173'      // Alternatywny lokalny adres IP
].filter(Boolean); // Usuwa undefined, jeśli FRONTEND_URL nie jest ustawiony lokalnie

// Aktywacja podstawowych middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  optionsSuccessStatus: 200 // Kluczowe dla stabilizacji zapytań przedwstępnych
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