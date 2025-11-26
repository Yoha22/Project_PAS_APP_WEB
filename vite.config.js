import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  // Configurar base path explícitamente para producción
  base: '/',
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        cookieDomainRewrite: 'localhost',
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'public/login.html'),
        dashboard: resolve(__dirname, 'public/dashboard.html'),
        usuarios: resolve(__dirname, 'public/usuarios.html'),
        dispositivos: resolve(__dirname, 'public/dispositivos.html'),
        historial: resolve(__dirname, 'public/historial.html'),
        alarmas: resolve(__dirname, 'public/alarmas.html'),
        'config-esp32': resolve(__dirname, 'public/config-esp32.html'),
      },
    },
  },
  // Los assets estáticos (img, etc.) se copiarán desde public/img
  // Los HTML en public/ se procesan como puntos de entrada arriba
  publicDir: 'public',
});

