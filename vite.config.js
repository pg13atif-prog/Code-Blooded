import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      watch: {
        ignored: ['**/screenshots/**'],
      },
      proxy: {
        // The api/ functions (TMDB, ratings, AI, search) hold the API keys on the server;
        // in development they are reached through the live site.
        '/api': { target: 'https://cinescopeai.xyz', changeOrigin: true }
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) return 'vendor-firebase';
              if (id.includes('@google/genai')) return 'vendor-genai';
              if (id.includes('framer-motion')) return 'vendor-framer-motion';
              if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
              return 'vendor';
            }
          }
        }
      }
    }
  }
})
