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
      manifest: {
        name: 'GymPatico - Profesjonalny Dziennik Treningowy',
        short_name: 'GymPatico',
        description: 'Zaawansowany dziennik treningowy, analityka progresu siłowego oraz kompletny atlas ćwiczeń dla kulturystów i amatorów sportów siłowych.',
        theme_color: '#0c0e12',       /* Kolor systemowy dopasowany do gymDark */
        background_color: '#0c0e12',  /* Ekran powitalny PWA */
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