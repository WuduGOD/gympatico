import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // <--- IMPORTUJEMY NOWY PLUGIN

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // <--- URUCHAMIAMY PLUGIN TAILWINDA
  ],
})