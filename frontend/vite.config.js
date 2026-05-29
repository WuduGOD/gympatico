import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa' // <--- NOWY IMPORT

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({ // <--- KONFIGURACJA PWA
      registerType: 'autoUpdate', // Automatyczna aktualizacja plików w pamięci podręcznej
      injectRegister: 'auto',
      includeAssets: ['favicon.svg'], // Pliki do bezwzględnego cache'owania
      manifest: {
        name: 'GymPatico Trening',
        short_name: 'GymPatico',
        description: 'Twoja garażowa aplikacja treningowa i atlas ćwiczeń',
        theme_color: '#121212',       // Kolor paska systemowego na telefonie
        background_color: '#121212',  // Kolor ekranu powitalnego (Splash screen)
        display: 'standalone',        // KLUCZOWE: Odpalanie bez paska przeglądarki!
        orientation: 'portrait',
        icons: [                      // Ikony wymagane przez Android/iOS do instalacji
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})