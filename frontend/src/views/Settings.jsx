// frontend/src/views/Settings.jsx
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';

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
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSubscriptionState = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        setIsPushSupported(true);
        try {
          const registration = await navigator.serviceWorker.ready;
          const sub = await registration.pushManager.getSubscription();
          if (sub) {
            setIsSubscribed(true);
            setCurrentSubscription(sub);
          }
        } catch (err) {
          console.error("Błąd podczas sprawdzania subskrypcji:", err);
        }
      }
      setIsLoading(false);
    };

    checkSubscriptionState();
  }, []);

  const handleTogglePush = async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;

      // WYŁĄCZENIE POWIADOMIENI
      if (isSubscribed && currentSubscription) {
        await fetch(`${API_BASE_URL}/api/notifications/unsubscribe`, {
          method: 'DELETE',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ endpoint: currentSubscription.endpoint })
        });
        
        await currentSubscription.unsubscribe();
        
        setIsSubscribed(false);
        setCurrentSubscription(null);
        showToast('Powiadomienia zostały wyłączone na tym urządzeniu. 🔕', 'success');
      } 
      
      // WŁĄCZENIE POWIADOMIENI
      else {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          throw new Error('Musisz odblokować powiadomienia v ustawieniach przeglądarki!');
        }

        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) throw new Error('Brak klucza VAPID w konfiguracji frontendu.');
        
        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

        const newSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });

        const res = await fetch(`${API_BASE_URL}/api/notifications/subscribe`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify(newSubscription)
        });

        if (!res.ok) throw new Error('Błąd zapisu subskrypcji na serwerze.');

        setIsSubscribed(true);
        setCurrentSubscription(newSubscription);
        showToast('Powiadomienia Push aktywowane! 🔔', 'success');
      }
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

      <div className="bg-[#161920] border border-zinc-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Powiadomienia Push 🔔
            </h3>
            <p className="text-sm text-zinc-400 mt-1 mr-4">
              Alerty o zaproszeniach do Gangu i nowych reakcjach (🔥) pod treningami na tym urządzeniu.
            </p>
          </div>
          
          <div className="shrink-0">
            {!isPushSupported ? (
              <span className="text-xs text-red-400 font-bold bg-red-400/10 px-2 py-1 rounded">Brak wsparcia</span>
            ) : isLoading ? (
              <div className="w-12 h-6 bg-zinc-800 rounded-full animate-pulse" />
            ) : (
              <button
                type="button"
                role="switch"
                aria-checked={isSubscribed}
                onClick={handleTogglePush}
                disabled={isLoading}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 ease-in-out cursor-pointer focus:outline-none focus:ring-2 focus:ring-gymRed focus:ring-offset-2 focus:ring-offset-[#161920] ${
                  isSubscribed ? 'bg-gymRed shadow-[0_0_12px_rgba(239,68,68,0.4)]' : 'bg-zinc-700'
                }`}
              >
                <span className="sr-only">Włącz powiadomienia</span>
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ease-in-out ${
                    isSubscribed ? 'translate-x-8' : 'translate-x-1'
                  }`}
                />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-[#161920]/50 border border-zinc-800 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center text-center text-zinc-500 min-h-[120px]">
        <span className="text-2xl mb-2">🚧</span>
        <span className="text-sm font-semibold">Więcej ustawień wkrótce...</span>
      </div>
    </div>
  );
}