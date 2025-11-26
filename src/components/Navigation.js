/**
 * Componente de navegación reutilizable
 * Evita la duplicación de código en todas las páginas
 */

import { authService } from '../services/auth.js';
import { themeService } from '../services/theme.js';

/**
 * Crea y retorna el HTML de la barra de navegación
 * @param {string} activePage - La página actual para resaltarla
 * @returns {string} HTML de la navegación
 */
export function createNavigationHTML(activePage = '') {
  const pages = [
    { path: '/dashboard.html', label: 'Dashboard', id: 'dashboard' },
    { path: '/usuarios.html', label: 'Usuarios', id: 'usuarios' },
    { path: '/dispositivos.html', label: 'Dispositivos', id: 'dispositivos' },
    { path: '/historial.html', label: 'Historial', id: 'historial' },
    { path: '/alarmas.html', label: 'Alarmas', id: 'alarmas' },
  ];

  const navLinks = pages.map(page => {
    const isActive = activePage === page.id;
    const activeClass = isActive 
      ? 'text-blue-600 dark:text-blue-400 font-bold' 
      : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400';
    
    return `<a href="${page.path}" class="${activeClass}">${page.label}</a>`;
  }).join('\n                    ');

  return `
    <nav class="bg-white dark:bg-gray-800 shadow-lg mb-8">
        <div class="max-w-7xl mx-auto px-4">
            <div class="flex justify-between h-16">
                <div class="flex items-center">
                    <h1 class="text-xl font-bold dark:text-white">Sistema de Acceso</h1>
                </div>
                <div class="flex items-center space-x-4">
                    <button id="themeToggle" class="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all cursor-pointer">
                        <i class="fas fa-moon dark:fa-sun text-gray-800 dark:text-yellow-400" id="themeIcon"></i>
                    </button>
                    ${navLinks}
                    <a href="/config-esp32.html" class="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400" title="Configurar IP del ESP32">
                        <i class="fas fa-cog"></i>
                    </a>
                    <button id="logoutBtn" class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        </div>
    </nav>
  `;
}

/**
 * Inicializa la navegación en una página
 * @param {string} activePage - ID de la página actual (opcional)
 */
export function initNavigation(activePage = '') {
  // Función para inicializar la navegación cuando el DOM esté listo
  function doInit() {
    // Buscar el contenedor de navegación o crear uno
    let navContainer = document.querySelector('nav');
    
    // Si no existe un nav, buscar un contenedor con id="nav" o crear uno al inicio del body
    if (!navContainer) {
      const navPlaceholder = document.getElementById('nav');
      if (navPlaceholder) {
        navPlaceholder.outerHTML = createNavigationHTML(activePage);
        navContainer = document.querySelector('nav');
      } else {
        // Insertar al inicio del body
        const body = document.body;
        if (body) {
          body.insertAdjacentHTML('afterbegin', createNavigationHTML(activePage));
          navContainer = document.querySelector('nav');
        }
      }
    } else {
      // Reemplazar el nav existente
      navContainer.outerHTML = createNavigationHTML(activePage);
      navContainer = document.querySelector('nav');
    }

    // Inicializar funcionalidad del botón de tema
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        themeService.toggle();
        updateThemeIcon();
      });
      
      // Actualizar icono inicial
      updateThemeIcon();
      
      // Escuchar cambios de tema
      window.addEventListener('themechange', () => {
        updateThemeIcon();
      });
    }

    // Inicializar funcionalidad del botón de logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
          await authService.logout();
        }
      });
    }
  }

  // Esperar a que el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', doInit);
  } else {
    // DOM ya está listo
    doInit();
  }
}

/**
 * Actualiza el icono del tema según el estado actual
 */
function updateThemeIcon() {
  const themeIcon = document.getElementById('themeIcon');
  if (!themeIcon) return;
  
  const isDark = themeService.isDark();
  if (isDark) {
    themeIcon.classList.remove('fa-moon');
    themeIcon.classList.add('fa-sun');
  } else {
    themeIcon.classList.remove('fa-sun');
    themeIcon.classList.add('fa-moon');
  }
}

/**
 * Función helper para obtener el ID de la página actual desde la URL
 * @returns {string} ID de la página actual
 */
export function getCurrentPageId() {
  const path = window.location.pathname;
  const filename = path.split('/').pop() || '';
  
  const pageMap = {
    'dashboard.html': 'dashboard',
    'usuarios.html': 'usuarios',
    'dispositivos.html': 'dispositivos',
    'historial.html': 'historial',
    'alarmas.html': 'alarmas',
    'config-esp32.html': 'config',
  };
  
  return pageMap[filename] || '';
}

