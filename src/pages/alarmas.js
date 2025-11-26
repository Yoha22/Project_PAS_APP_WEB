// Importar CSS como módulo (Vite lo procesará durante el build)
import '/src/assets/css/dark-mode.css';

// Los imports DEBEN estar al principio absoluto del módulo
import { authService } from '/src/services/auth.js';
import { alarmasService } from '/src/services/alarmas.js';
import { themeService } from '/src/services/theme.js';
import { showTableLoading, handleError, formatDate } from '/src/utils/ui-helpers.js';

// Log inicial
console.log('=== Script de alarmas iniciado ===');

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
    console.log('✅ Usuario autenticado, cargando página de alarmas...');
    initializeAlarmas();
}

// Función para inicializar la página
function initializeAlarmas() {
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

    // Cargar alarmas
    async function loadAlarmas(page = 1) {
        const tbody = document.getElementById('alarmasTable');
        showTableLoading(tbody, 4, 'Cargando alarmas...');
        
        try {
            const response = await alarmasService.getAll(page);
            if (response.success) {
                renderAlarmas(response.data.data);
                renderPagination(response.data);
            } else {
                throw new Error(response.message || 'Error al cargar las alarmas');
            }
        } catch (error) {
            console.error('Error cargando alarmas:', error);
            const errorMessage = handleError(error, 'No se pudieron cargar las alarmas');
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

    function renderAlarmas(alarmas) {
        const tbody = document.getElementById('alarmasTable');
        if (alarmas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 dark:text-gray-200">No hay alarmas</td></tr>';
            return;
        }

        tbody.innerHTML = alarmas.map(alarma => `
            <tr class="border-b dark:border-gray-700">
                <td class="px-6 py-3 dark:text-gray-200">${alarma.id}</td>
                <td class="px-6 py-3 dark:text-gray-200">${formatDate(alarma.fecha_hora)}</td>
                <td class="px-6 py-3 dark:text-gray-200">${alarma.descripcion}</td>
                <td class="px-6 py-3">
                    <button onclick="deleteAlarma(${alarma.id})" class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
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
        loadAlarmas(page);
    };

    window.deleteAlarma = async (id) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: 'Esta acción no se puede deshacer',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444'
        });

        if (result.isConfirmed) {
            try {
                await alarmasService.delete(id);
                Swal.fire({
                    icon: 'success',
                    title: 'Éxito',
                    text: 'Alarma eliminada correctamente',
                    timer: 2000
                });
                loadAlarmas(currentPage);
            } catch (error) {
                const errorMessage = handleError(error, 'No se pudo eliminar la alarma');
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorMessage
                });
            }
        }
    };

    // Auto-refresh cada 30 segundos (opcional)
    function startAutoRefresh() {
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = setInterval(() => {
            loadAlarmas(currentPage);
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

    // Cargar alarmas inicial
    loadAlarmas();
}

