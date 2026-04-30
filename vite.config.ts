import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: process.env.VITE_PUBLIC_BASE_PATH || '/secretaria/',
  plugins: [
    tailwindcss(),
    react()
  ],
})
