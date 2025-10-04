import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5010',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  },
  preview: { host: true, port: 4173 },
  optimizeDeps: {
    entries: ['index.html'],
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      input: 'index.html',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['frontend/**'],
    include: [
      'src/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'backend/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
    ],
  },
})
