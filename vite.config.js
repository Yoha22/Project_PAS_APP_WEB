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
        login: resolve(__dirname, 'login.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        usuarios: resolve(__dirname, 'usuarios.html'),
        administradores: resolve(__dirname, 'administradores.html'),
        dispositivos: resolve(__dirname, 'dispositivos.html'),
        historial: resolve(__dirname, 'historial.html'),
        alarmas: resolve(__dirname, 'alarmas.html'),
        'config-esp32': resolve(__dirname, 'config-esp32.html'),
      },
    },
  },
  // Los assets estáticos (img, etc.) se copiarán desde public/img
  // Los HTML en la raíz se procesan como puntos de entrada arriba
  publicDir: 'public',
});

