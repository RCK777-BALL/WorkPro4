import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      clsx: path.resolve(__dirname, './src/vendor/clsx.js'),
      'tailwind-merge': path.resolve(__dirname, './src/vendor/tailwind-merge.js'),
      'class-variance-authority': path.resolve(__dirname, './src/vendor/class-variance-authority.js'),
      '@radix-ui/react-slot': path.resolve(__dirname, './src/vendor/react-slot.js'),
      '@radix-ui/react-tabs': path.resolve(__dirname, './src/vendor/react-tabs.js'),
      '@radix-ui/react-select': path.resolve(__dirname, './src/vendor/react-select.js'),
    },
  },
  esbuild: {
    loader: 'tsx',
    include: /src\/.*\.[jt]sx?$/,
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5010',
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace(/^\/api/, '/api'),
      },
    },
  },
  preview: { host: true, port: 4173 },
  optimizeDeps: {
    exclude: ['lucide-react'],
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
        '.jsx': 'jsx',
        '.ts': 'ts',
        '.tsx': 'tsx',
      },
    },
  },
})
