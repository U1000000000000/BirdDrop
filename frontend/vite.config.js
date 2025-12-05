import { defineConfig } from "vite";
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: ".",
  server: {
    port: 5173,
      allowedHosts: [
        'localhost',
        '127.0.0.1',
        'leyla-plaided-flittingly.ngrok-free.dev'
      ],
      proxy: {
        // Proxy WebSocket upgrade requests to backend
        '/ws': {
          target: 'ws://localhost:8080',
          ws: true,
          changeOrigin: true,
        },
      },
  },
  build: {
    outDir: "dist",
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});
