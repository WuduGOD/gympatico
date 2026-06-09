// frontend/public/gym-push.js (lub sw.js)

// =========================================================================
// 1. ODBIÓR POWIADOMIENIA (Zdarzenie 'push')
// =========================================================================
self.addEventListener('push', function(event) {
  // Jeśli z backendu nie przyszły żadne dane, przerywamy
  if (!event.data) return;

  try {
    const data = event.data.json();
    
    // Opcje konfiguracyjne powiadomienia (UX)
    const options = {
      body: data.body,
      // 'icon' to główne logo, które pojawia się obok tekstu powiadomienia
      icon: data.icon || '/icon-192x192.png', 
      // 'badge' to malutka, zazwyczaj biała na przezroczystym tle ikonka (tylko na Androida)
      badge: data.badge || '/badge-72x72.png', 
      // Wibracja: [wibruj, pauza, wibruj] (w milisekundach)
      vibrate: [200, 100, 200], 
      // Przekazujemy ukryte dane (np. URL do otwarcia po kliknięciu)
      data: {
        url: data.url || '/'
      },
      // Wymusza pokazanie powiadomienia na ekranie telefonu
      requireInteraction: false
    };

    // AKCJA 1: Wyświetlenie fizycznego powiadomienia przez system
    const showNotificationPromise = self.registration.showNotification(data.title, options);

    // AKCJA 2: Sygnał do aplikacji React (Auto-odświeżanie w czasie rzeczywistym)
    const notifyClientsPromise = clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(windowClients) {
        windowClients.forEach(function(client) {
          // Jeśli aplikacja jest w miarę aktywna (nie została całkowicie "zabita" przez telefon)
          if (client.visibilityState === 'visible' || client.focused) {
            client.postMessage({ type: 'PUSH_RECEIVED' });
          }
        });
      });

    // Zmuszamy Service Workera, aby poczekał na wykonanie OBU operacji naraz
    event.waitUntil(Promise.all([showNotificationPromise, notifyClientsPromise]));
    
  } catch (error) {
    console.error('Błąd parsowania danych Push:', error);
  }
});

// =========================================================================
// 2. REAKCJA NA KLIKNIĘCIE (Zdarzenie 'notificationclick')
// =========================================================================
self.addEventListener('notificationclick', function(event) {
  // Zamykamy powiadomienie (żeby nie wisiało na pasku zadań telefonu/systemu)
  event.notification.close();

  const targetUrl = event.notification.data.url;

  // Szukamy, czy karta z aplikacją GymPatico jest już otwarta w tle
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
      // Jeśli użytkownik ma już otwartą apkę, po prostu ją "wyciągamy" na wierzch i przekierowujemy
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Jeśli apka była całkowicie zamknięta, otwieramy nowe okno na zadanym URL (np. /social)
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});