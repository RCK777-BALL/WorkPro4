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
      '@radix-ui/react-tabs': path.resolve(__dirname, './src/vendor/react-tabs.js'),
      '@radix-ui/react-select': path.resolve(__dirname, './src/vendor/react-select.js'),
    },
    dedupe: [
      'react',
      'react-dom',
      '@radix-ui/react-slot',
      '@radix-ui/react-tabs',
      '@radix-ui/react-select',
      '@radix-ui/react-toast',
      '@radix-ui/react-primitive',
      '@radix-ui/react-compose-refs',
      '@radix-ui/react-context',
      '@radix-ui/react-presence',
      '@radix-ui/react-dismissable-layer',
      '@radix-ui/react-portal',
      '@radix-ui/react-use-callback-ref',
      '@radix-ui/react-use-controllable-state',
      '@radix-ui/react-use-layout-effect',
      '@radix-ui/react-use-escape-keydown',
      '@radix-ui/react-visually-hidden',
    ],
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
    include: ['@radix-ui/react-slot'],
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
