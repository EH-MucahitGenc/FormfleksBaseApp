import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3001,
    host: true,
    proxy: {
      '/api': {
        target: 'https://localhost:7127',
        changeOrigin: true,
        secure: false,
      },
      '/hubs': {
        target: 'https://localhost:7127',
        ws: true,
        secure: false,
      },
      '/Uploads': {
        target: 'https://localhost:7127',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
