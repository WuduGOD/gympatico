// frontend/src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// --- GLOBALNY INTERCEPTOR SIECIOWY (FAIL-SAFE FOR JWT EXPIRATION) ---
const { fetch: originalFetch } = window;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  
  // Przechwytujemy potencjalne błędy uwierzytelnienia/autoryzacji
  if (response.status === 401 || response.status === 403) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    
    // BEZPIECZNIK 1: Ignorujemy próby logowania/rejestracji
    if (url && !url.includes('/api/auth/login') && !url.includes('/api/auth/register')) {
      
      // 🔴 POPRAWKA: Filtrowanie komunikatów o limitach planu FREE
      try {
        // Klonujemy odpowiedź, aby nie zablokować strumienia (body used) dla końcowych widoków/hooków
        const responseClone = response.clone();
        const data = await responseClone.json();
        
        // Jeśli w body znajduje się słowo kluczowe powiązane z limitami, 
        // przerywamy procedurę wylogowania i pozwalamy hookowi obsłużyć błąd (np. pokazać toast)
        if (data && data.error && (data.error.includes('limit') || data.error.includes('Osiągnięto'))) {
          return response;
        }
      } catch (jsonError) {
        // Jeśli odpowiedź to nie JSON (np. surowy błąd serwera), pozwalamy na dalsze działanie interceptora
      }

      // Jeśli test klona przeszedł pomyślnie i to nie był limit -> emitujemy zdarzenie wygaśnięcia sesji
      window.dispatchEvent(new Event('gympatico-unauthorized'));
    }
  }
  
  return response;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)