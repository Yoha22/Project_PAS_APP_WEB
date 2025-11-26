// Importar CSS como módulo (Vite lo procesará durante el build)
import '/src/assets/css/dark-mode.css';

// Los imports DEBEN estar al principio absoluto del módulo
import { authService } from '/src/services/auth.js';
import { accesosService } from '/src/services/accesos.js';
import { themeService } from '/src/services/theme.js';
import { showTableLoading, handleError, formatDate } from '/src/utils/ui-helpers.js';

// Log inicial
console.log('=== Script de historial iniciado ===');

// Manejo global de errores
window.addEventListener('error', (event) => {
    console.error('❌ Error global capturado:', event.error);
    event.preventDefault();
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Promesa rechazada no manejada:', event.reason);
    event.preventDefault();
});

// Verificar autenticación
if (!authService || !authService.isAuthenticated()) {
    console.warn('⚠️ Usuario no autenticado, redirigiendo a login...');
    window.location.href = '/login.html';
} else {
    console.log('✅ Usuario autenticado, cargando página de historial...');
    initializeHistorial();
}

// Función para inicializar la página
function initializeHistorial() {
    // Configurar tema
    if (themeService) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                themeService.init();
                updateThemeIcon();
            });
        } else {
            themeService.init();
            updateThemeIcon();
        }
    }

    // Toggle tema
    window.toggleTheme = function() {
        const html = document.documentElement;
        const body = document.body;
        const isDark = html.classList.contains('dark');
        
        if (isDark) {
            html.classList.remove('dark');
            body.classList.remove('active');
            html.setAttribute('data-theme', 'light');
            localStorage.setItem('darkMode', 'false');
        } else {
            html.classList.add('dark');
            body.classList.add('active');
            html.setAttribute('data-theme', 'dark');
            localStorage.setItem('darkMode', 'true');
        }
        
        updateThemeIcon();
    };
    
    window.updateThemeIcon = function() {
        const themeIcon = document.getElementById('themeIcon');
        if (!themeIcon) return;
        
        const isDark = document.documentElement.classList.contains('dark');
        if (isDark) {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        } else {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        }
    };

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn && authService) {
        logoutBtn.addEventListener('click', () => {
            authService.logout();
        });
    }

    let currentPage = 1;
    let refreshInterval = null;

    // Cargar accesos
    async function loadAccesos(page = 1) {
        const tbody = document.getElementById('accesosTable');
        showTableLoading(tbody, 4, 'Cargando historial...');
        
        try {
            const response = await accesosService.getAll({ page });
            if (response.success) {
                renderAccesos(response.data.data);
                renderPagination(response.data);
            } else {
                throw new Error(response.message || 'Error al cargar el historial');
            }
        } catch (error) {
            console.error('Error cargando accesos:', error);
            const errorMessage = handleError(error, 'No se pudo cargar el historial');
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-4 text-red-600 dark:text-red-400">
                        <i class="fas fa-exclamation-triangle mr-2"></i>${errorMessage}
                    </td>
                </tr>
            `;
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorMessage
            });
        }
    }

    function renderAccesos(accesos) {
        const tbody = document.getElementById('accesosTable');
        if (accesos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 dark:text-gray-200">No hay accesos registrados</td></tr>';
            return;
        }

        tbody.innerHTML = accesos.map(acceso => `
            <tr class="border-b dark:border-gray-700">
                <td class="px-6 py-3 dark:text-gray-200">${acceso.id}</td>
                <td class="px-6 py-3 dark:text-gray-200">${acceso.usuario?.nombre || 'N/A'}</td>
                <td class="px-6 py-3 dark:text-gray-200">${formatDate(acceso.fecha_hora)}</td>
                <td class="px-6 py-3">
                    <span class="px-2 py-1 rounded ${acceso.tipo_acceso === 'Apertura' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'}">
                        ${acceso.tipo_acceso}
                    </span>
                </td>
            </tr>
        `).join('');
    }

    function renderPagination(pagination) {
        const paginationDiv = document.getElementById('pagination');
        if (!pagination || pagination.last_page <= 1) {
            paginationDiv.innerHTML = '';
            return;
        }
        
        let html = '';
        for (let i = 1; i <= pagination.last_page; i++) {
            html += `<button onclick="loadPage(${i})" class="px-4 py-2 mx-1 rounded ${i === pagination.current_page ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'}">${i}</button>`;
        }
        paginationDiv.innerHTML = html;
    }

    window.loadPage = (page) => {
        currentPage = page;
        loadAccesos(page);
    };

    // Auto-refresh cada 30 segundos (opcional)
    function startAutoRefresh() {
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = setInterval(() => {
            loadAccesos(currentPage);
        }, 30000); // 30 segundos
    }

    function stopAutoRefresh() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
    }

    // Iniciar auto-refresh cuando la página está visible
    if (document.visibilityState === 'visible') {
        startAutoRefresh();
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            startAutoRefresh();
        } else {
            stopAutoRefresh();
        }
    });

    // Limpiar intervalo al salir
    window.addEventListener('beforeunload', () => {
        stopAutoRefresh();
    });

    // Cargar accesos inicial
    loadAccesos();
}

