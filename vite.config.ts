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
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'backend/src/**/*.{test,spec}.{ts,tsx}',
    ],
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    globals: true,
    css: true,
    exclude: ['tests/e2e/**'],
  },
})
