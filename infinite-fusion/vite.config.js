import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/infinite-fusion/', // the github repo name
  plugins: [react()],
  server: {
    allowedHosts: ['.ngrok-free.app'],
  },
})
