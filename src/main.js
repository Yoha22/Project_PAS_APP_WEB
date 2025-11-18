// Punto de entrada principal
import './assets/css/main.css';

// Verificar autenticación y redirigir
import { authService } from './services/auth.js';

if (!authService.isAuthenticated() && !window.location.pathname.includes('login.html')) {
  window.location.href = '/login.html';
}

console.log('Sistema de Acceso Frontend cargado');

