// frontend/src/views/Settings.jsx
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';

// Funkcja pomocnicza dekodująca klucz VAPID z Base64
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function Settings({ token, showToast }) {
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [permissionState, setPermissionState] = useState('default');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Sprawdzamy wsparcie dla Push API w przeglądarce/urządzeniu
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsPushSupported(true);
      setPermissionState(Notification.permission);
    }
  }, []);

  const handleSubscribePush = async () => {
    setIsLoading(true);
    try {
      // 1. Prośba o uprawnienia systemowe
      const permission = await Notification.requestPermission();
      setPermissionState(permission);

      if (permission !== 'granted') {
        throw new Error('Odmówiono dostępu do powiadomień.');
      }

      // 2. Pobranie aktywnego Service Workera
      const registration = await navigator.serviceWorker.ready;
      
      // 3. Pobranie i konwersja klucza VAPID
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('Brak klucza VAPID w konfiguracji aplikacji.');
      }
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      // 4. Subskrypcja w przeglądarce
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      // 5. Wysłanie subskrypcji na backend (endpoint zapisany w routes/friends.js)
      const res = await fetch(`${API_BASE_URL}/api/friends/subscribe`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(subscription)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Błąd zapisu na serwerze.');
      }

      showToast('Powiadomienia Push zostały aktywowane! 🔔', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      <div className="border-b border-zinc-800/80 pb-4">
        <h2 className="text-2xl font-black text-white">⚙️ Ustawienia</h2>
        <p className="text-zinc-400 text-sm mt-1">Zarządzaj swoim kontem i preferencjami.</p>
      </div>

      {/* KAFELEK 1: POWIADOMIENIA PUSH */}
      <div className="bg-[#161920] border border-zinc-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Powiadomienia Push 🔔
            </h3>
            <p className="text-sm text-zinc-400 mt-1">
              Otrzymuj alerty o zaproszeniach do Gangu i nowych reakcjach (🔥) pod Twoimi treningami, nawet gdy apka jest zamknięta.
            </p>
          </div>
        </div>

        <div className="mt-5 border-t border-zinc-800/60 pt-5">
          {!isPushSupported ? (
            <div className="text-sm text-amber-500 bg-amber-500/10 p-4 rounded-xl border border-amber-500/20">
              <strong>Brak wsparcia:</strong> Twoja przeglądarka lub urządzenie nie obsługuje powiadomień. <br/>
              <em>Jeśli jesteś na iPhone/iOS, musisz najpierw dodać tę stronę do ekranu głównego (Dodaj do ekranu początkowego).</em>
            </div>
          ) : permissionState === 'granted' ? (
            <div className="text-sm text-emerald-500 bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 font-bold flex items-center gap-2">
              ✅ Powiadomienia są włączone dla tego urządzenia!
            </div>
          ) : permissionState === 'denied' ? (
            <div className="text-sm text-red-500 bg-red-500/10 p-4 rounded-xl border border-red-500/20">
              ❌ Zablokowałeś powiadomienia w przeglądarce. Zmień uprawnienia w ustawieniach strony (ikonka kłódki przy pasku adresu URL), aby je włączyć.
            </div>
          ) : (
            <button 
              onClick={handleSubscribePush}
              disabled={isLoading}
              className="w-full md:w-auto px-6 py-3 bg-gymRed hover:bg-red-600 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Aktywowanie...' : 'Włącz powiadomienia na tym urządzeniu'}
            </button>
          )}
        </div>
      </div>

      {/* MIEJSCE NA PRZYSZŁE KAFELKI */}
      <div className="bg-[#161920]/50 border border-zinc-800 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center text-center text-zinc-500 min-h-[120px]">
        <span className="text-2xl mb-2">🚧</span>
        <span className="text-sm font-semibold">Więcej ustawień wkrótce...</span>
      </div>

    </div>
  );
}