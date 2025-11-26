// Punto de entrada principal
import './assets/css/main.css';

// Verificar autenticación y redirigir
import { authService } from './services/auth.js';
import { redirectTo } from './utils/ui-helpers.js';

// Obtener la ruta actual
const currentPath = window.location.pathname;
const isLoginPage = currentPath.includes('login.html');
const isIndexPage = currentPath === '/' || currentPath === '/index.html' || currentPath.endsWith('/') || currentPath === '';

// Si está en el index y está autenticado, redirigir al dashboard
if (isIndexPage && authService.isAuthenticated()) {
  console.log('🔄 Usuario autenticado, redirigiendo al dashboard...');
  redirectTo('dashboard.html', true);
} 
// Si no está autenticado y no está en login, redirigir a login
else if (!authService.isAuthenticated() && !isLoginPage) {
  console.log('🔄 Usuario no autenticado, redirigiendo a login...');
  redirectTo('login.html', true);
}

console.log('Sistema de Acceso Frontend cargado');

