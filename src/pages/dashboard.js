// Importar CSS como módulo (Vite lo procesará durante el build)
import '/src/assets/css/dark-mode.css';

import { authService } from '/src/services/auth.js';
import { accesosService } from '/src/services/accesos.js';
import { themeService } from '/src/services/theme.js';

// Script simple para toggle de tema
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
    console.log('Tema cambiado a:', isDark ? 'claro' : 'oscuro');
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

// Configurar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.updateThemeIcon();
        themeService.init();
    });
} else {
    window.updateThemeIcon();
    themeService.init();
}

// Verificar autenticación (solo si authService está disponible)
if (!authService) {
    console.error('❌ authService no está disponible - redirigiendo a login');
    window.location.href = '/login.html';
} else {
    console.log('🔍 Verificando autenticación en dashboard...');
    console.log('🔑 Token en localStorage:', !!localStorage.getItem('auth_token'));
    console.log('🔑 Token completo:', localStorage.getItem('auth_token') ? localStorage.getItem('auth_token').substring(0, 20) + '...' : 'No hay token');
    console.log('✅ authService.isAuthenticated():', authService.isAuthenticated());

    if (!authService.isAuthenticated()) {
        console.warn('⚠️ Usuario no autenticado, redirigiendo a login...');
        window.location.href = '/login.html';
        // NO usar throw - solo redirigir
        return; // Salir temprano para evitar errores
    }

    console.log('✅ Usuario autenticado, cargando dashboard...');
}

// Logout (solo si authService está disponible)
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn && authService) {
    logoutBtn.addEventListener('click', () => {
        authService.logout();
    });
} else if (logoutBtn) {
    // Si no hay authService, al menos redirigir manualmente
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('auth_token');
        window.location.href = '/login.html';
    });
}

// Cargar estadísticas
async function loadStats() {
    try {
        const stats = await accesosService.getStats();
        
        if (stats.success) {
            const data = stats.data;
            
            // Actualizar información
            document.getElementById('personaMasIngresos').textContent = 
                data.persona_mas_ingresos?.nombre || 'N/A';
            document.getElementById('fechaMasIngresos').textContent = 
                data.fecha_mas_ingresos || 'N/A';

            // Gráfico de barras
            const barCtx = document.getElementById('barChart').getContext('2d');
            new Chart(barCtx, {
                type: 'bar',
                data: {
                    labels: data.aperturas_por_dia.map(item => item.fecha),
                    datasets: [{
                        label: 'Aperturas por Día',
                        data: data.aperturas_por_dia.map(item => item.cantidad),
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });

            // Gráfico circular
            const pieCtx = document.getElementById('pieChart').getContext('2d');
            new Chart(pieCtx, {
                type: 'pie',
                data: {
                    labels: ['Aperturas en el Mes'],
                    datasets: [{
                        data: [data.total_aperturas_mes],
                        backgroundColor: ['rgba(255, 99, 132, 0.2)'],
                        borderColor: ['rgba(255, 99, 132, 1)'],
                        borderWidth: 1
                    }]
                }
            });
        }
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

loadStats();

