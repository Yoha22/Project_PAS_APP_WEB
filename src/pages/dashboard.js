// Importar CSS como módulo (Vite lo procesará durante el build)
import '/src/assets/css/dark-mode.css';

import { authService } from '/src/services/auth.js';
import { accesosService } from '/src/services/accesos.js';
import { themeService } from '/src/services/theme.js';
import { handleError, isNetworkError } from '/src/utils/ui-helpers.js';
import { initNavigation } from '/src/components/Navigation.js';

// Inicializar navegación
initNavigation('dashboard');

// Configurar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        themeService.init();
    });
} else {
    themeService.init();
}

// Función para inicializar el dashboard (solo se ejecuta si está autenticado)
function initializeDashboard() {

    // Función para mostrar loading en elementos del dashboard
    function showDashboardLoading() {
        const personaMasIngresosEl = document.getElementById('personaMasIngresos');
        const fechaMasIngresosEl = document.getElementById('fechaMasIngresos');
        
        if (personaMasIngresosEl) {
            personaMasIngresosEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';
        }
        if (fechaMasIngresosEl) {
            fechaMasIngresosEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';
        }
        
        // Ocultar gráficos mientras carga
        const barChart = document.getElementById('barChart');
        const pieChart = document.getElementById('pieChart');
        if (barChart) {
            barChart.style.display = 'none';
        }
        if (pieChart) {
            pieChart.style.display = 'none';
        }
    }
    
    // Función para ocultar loading y mostrar datos
    function hideDashboardLoading() {
        const barChart = document.getElementById('barChart');
        const pieChart = document.getElementById('pieChart');
        if (barChart) {
            barChart.style.display = 'block';
        }
        if (pieChart) {
            pieChart.style.display = 'block';
        }
    }

    // Cargar estadísticas
    async function loadStats() {
        // Mostrar loading
        showDashboardLoading();
        
        try {
            const stats = await accesosService.getStats();
            
            if (stats.success) {
                const data = stats.data;
                
                // Actualizar información
                const personaMasIngresosEl = document.getElementById('personaMasIngresos');
                const fechaMasIngresosEl = document.getElementById('fechaMasIngresos');
                
                if (personaMasIngresosEl) {
                    personaMasIngresosEl.textContent = data.persona_mas_ingresos?.nombre || 'N/A';
                }
                if (fechaMasIngresosEl) {
                    fechaMasIngresosEl.textContent = data.fecha_mas_ingresos || 'N/A';
                }

                // Ocultar loading
                hideDashboardLoading();

                // Gráfico de barras
                const barCtx = document.getElementById('barChart');
                if (barCtx) {
                    // Destruir gráfico anterior si existe
                    if (window.barChartInstance) {
                        window.barChartInstance.destroy();
                    }
                    
                    window.barChartInstance = new Chart(barCtx.getContext('2d'), {
                        type: 'bar',
                        data: {
                            labels: (data.aperturas_por_dia || []).map(item => item.fecha),
                            datasets: [{
                                label: 'Aperturas por Día',
                                data: (data.aperturas_por_dia || []).map(item => item.cantidad),
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
                }

                // Gráfico circular
                const pieCtx = document.getElementById('pieChart');
                if (pieCtx) {
                    // Destruir gráfico anterior si existe
                    if (window.pieChartInstance) {
                        window.pieChartInstance.destroy();
                    }
                    
                    window.pieChartInstance = new Chart(pieCtx.getContext('2d'), {
                        type: 'pie',
                        data: {
                            labels: ['Aperturas en el Mes'],
                            datasets: [{
                                data: [data.total_aperturas_mes || 0],
                                backgroundColor: ['rgba(255, 99, 132, 0.2)'],
                                borderColor: ['rgba(255, 99, 132, 1)'],
                                borderWidth: 1
                            }]
                        }
                    });
                }
            } else {
                // Si success es false, mostrar error
                throw new Error(stats.message || 'Error al cargar estadísticas');
            }
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
            
            // Ocultar loading
            hideDashboardLoading();
            
            // Actualizar elementos con valores por defecto
            const personaMasIngresosEl = document.getElementById('personaMasIngresos');
            const fechaMasIngresosEl = document.getElementById('fechaMasIngresos');
            
            if (personaMasIngresosEl) {
                personaMasIngresosEl.textContent = 'N/A';
            }
            if (fechaMasIngresosEl) {
                fechaMasIngresosEl.textContent = 'N/A';
            }
            
            // Ocultar gráficos en caso de error
            const barChart = document.getElementById('barChart');
            const pieChart = document.getElementById('pieChart');
            if (barChart) {
                barChart.style.display = 'none';
            }
            if (pieChart) {
                pieChart.style.display = 'none';
            }
            
            // Mostrar mensaje de error al usuario
            const errorMessage = handleError(error, 'No se pudieron cargar las estadísticas');
            const swalAvailable = typeof Swal !== 'undefined';
            
            if (swalAvailable) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorMessage,
                    confirmButtonText: 'Reintentar',
                    showCancelButton: true,
                    cancelButtonText: 'Cerrar'
                }).then((result) => {
                    if (result.isConfirmed) {
                        loadStats();
                    }
                });
            } else {
                alert(errorMessage);
            }
        }
    }

    loadStats();
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
    } else {
        console.log('✅ Usuario autenticado, cargando dashboard...');
        // Continuar con el resto del código solo si está autenticado
        initializeDashboard();
    }
}

