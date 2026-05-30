// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg'],
      
      // JAWNA KONFIGURACJA WORKBOX (Eliminacja ostrzeżenia o braku .wasm i poprawne cache'owanie)
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}']
      },
      
      manifest: {
        name: 'GymPatico - Profesjonalny Dziennik Treningowy',
        short_name: 'GymPatico',
        description: 'Zaawansowany dziennik treningowy, analityka progresu siłowego oraz kompletny atlas ćwiczeń dla kulturystów i amatorów sportów siłowych.',
        theme_color: '#0c0e12',
        background_color: '#0c0e12',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
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