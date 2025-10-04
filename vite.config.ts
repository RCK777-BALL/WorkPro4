import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
      },
      manifest: {
        name: 'WorkPro CMMS',
        short_name: 'WorkPro',
        start_url: '/',
        display: 'standalone',
        theme_color: '#1e3a8a',
        background_color: '#ffffff',
        description: 'Operate maintenance workflows even when you are offline.',
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
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
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: [...configDefaults.exclude, 'frontend/**'],
  },
})
