// Punto de entrada principal
import './assets/css/main.css';

// Verificar autenticación y redirigir
import { authService } from './services/auth.js';

// Obtener la ruta actual
const currentPath = window.location.pathname;
const isLoginPage = currentPath.includes('login.html');
const isIndexPage = currentPath === '/' || currentPath === '/index.html' || currentPath.endsWith('/');

// Si está en el index y está autenticado, redirigir al dashboard
if (isIndexPage && authService.isAuthenticated()) {
  window.location.href = '/dashboard.html';
} 
// Si no está autenticado y no está en login, redirigir a login
else if (!authService.isAuthenticated() && !isLoginPage) {
  window.location.href = '/login.html';
}

console.log('Sistema de Acceso Frontend cargado');

