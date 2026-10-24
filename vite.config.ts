import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // host: true makes the dev server reachable from a phone on the same Wi-Fi.
    host: true,
    port: 5177,
  },
})
