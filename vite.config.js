// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 5000,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
})
