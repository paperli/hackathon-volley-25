import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Get the repository name from the package.json or hardcode it if stable
const repoName = require('./package.json').name; // if using commonjs

// https://vite.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? `/${repoName}/` : '/', // the github repo name
  plugins: [react()],
  server: {
    allowedHosts: ['.ngrok-free.app'],
  },
})
