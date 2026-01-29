import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },

  // Development server proxy: forward /api/* to local backend at localhost:18080
  // Keeps the /api prefix so backend routes remain unchanged.
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:18080',
        changeOrigin: true,
        secure: false,
        // keep the /api prefix on the proxied request - remove or adjust if backend expects root
        rewrite: (path) => path,
        // increase timeout for long-running requests (file uploads / analysis jobs)
        timeout: 60000
      }
    }
  },
})
