import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Backend API target
const target = 'http://goatedcodoer:8080'

export default defineConfig({
    plugins: [vue()],
    server: {
        host: true,          // equivalent to '0.0.0.0', lets you access via LAN IP
        port: 5173,
        proxy: {
            '/api': {
                target,
                changeOrigin: true,
                secure: false,   // allow self-signed certs if https later
                rewrite: path => path.replace(/^\/api/, '/api'), // keep /api prefix
            }
        }
    },
    preview: {
        host: true,
        port: 5000,
        proxy: {
            '/api': {
                target,
                changeOrigin: true,
                secure: false,
            }
        }
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    }
})
