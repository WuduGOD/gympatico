import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// --- GLOBALNY INTERCEPTOR SIECIOWY (FAIL-SAFE FOR JWT EXPIRATION) ---
const { fetch: originalFetch } = window;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  
  // Jeśli serwer odbił nas z powodu braku lub wygaśnięcia tokenu
  if (response.status === 401 || response.status === 403) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    
    // BEZPIECZNIK: Ignorujemy próby autoryzacji (złe hasło nie może triggerować globalnego wylogowania)
    if (url && !url.includes('/api/auth/login') && !url.includes('/api/auth/register')) {
      // Emitujemy globalne zdarzenie w oknie przeglądarki
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