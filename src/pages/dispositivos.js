// Importar CSS como módulo (Vite lo procesará durante el build)
import '/src/assets/css/dark-mode.css';

// Los imports DEBEN estar al principio absoluto del módulo
import { authService } from '/src/services/auth.js';
import { dispositivosService } from '/src/services/dispositivos.js';
import { themeService } from '/src/services/theme.js';
import { showLoading, hideLoading, showTableLoading, handleError, formatDate } from '/src/utils/ui-helpers.js';

// Log inicial
console.log('=== Script de dispositivos iniciado ===');

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
    console.log('✅ Usuario autenticado, cargando página de dispositivos...');
    initializeDispositivos();
}

// Función para inicializar la página
function initializeDispositivos() {
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
        const isDark = html.classList.contains('dark');
        if (isDark) {
            html.classList.remove('dark');
            localStorage.setItem('darkMode', 'false');
        } else {
            html.classList.add('dark');
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
        logoutBtn.addEventListener('click', async () => {
            await authService.logout();
            window.location.href = '/login.html';
        });
    }

    // Cargar dispositivos
    async function loadDispositivos() {
        const tbody = document.getElementById('dispositivosTable');
        showTableLoading(tbody, 6, 'Cargando dispositivos...');
        
        try {
            const response = await dispositivosService.getAll();
            if (response.success) {
                renderDispositivos(response.data);
            } else {
                throw new Error(response.message || 'Error al cargar dispositivos');
            }
        } catch (error) {
            console.error('Error al cargar dispositivos:', error);
            const errorMessage = handleError(error, 'No se pudieron cargar los dispositivos');
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4 text-red-600 dark:text-red-400">
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

    function renderDispositivos(dispositivos) {
        const tbody = document.getElementById('dispositivosTable');
        if (dispositivos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 dark:text-gray-200">No hay dispositivos registrados</td></tr>';
            return;
        }

        tbody.innerHTML = dispositivos.map(device => `
            <tr class="border-b dark:border-gray-700">
                <td class="px-6 py-3 dark:text-gray-200">${device.id}</td>
                <td class="px-6 py-3 dark:text-gray-200">${device.nombre}</td>
                <td class="px-6 py-3 dark:text-gray-200">${device.ip_local || '-'}</td>
                <td class="px-6 py-3 dark:text-gray-200">${device.ultima_conexion ? formatDate(device.ultima_conexion) : 'Nunca'}</td>
                <td class="px-6 py-3">
                    <span class="px-2 py-1 rounded ${device.activo ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}">
                        ${device.activo ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td class="px-6 py-3">
                    <button onclick="editDevice(${device.id})" class="bg-blue-500 text-white px-2 py-1 rounded mr-2 hover:bg-blue-600">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    ${device.activo ? `
                        <button onclick="revokeToken(${device.id})" class="bg-yellow-500 text-white px-2 py-1 rounded mr-2 hover:bg-yellow-600">
                            <i class="fas fa-ban"></i> Revocar
                        </button>
                    ` : ''}
                    <button onclick="deleteDevice(${device.id})" class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </td>
            </tr>
        `).join('');
    }

    window.editDevice = async (id) => {
        const editBtn = event.target.closest('button');
        if (editBtn) showLoading(editBtn, 'Cargando...');
        
        try {
            const response = await dispositivosService.getById(id);
            if (response.success) {
                const device = response.data;
                document.getElementById('deviceId').value = device.id;
                document.getElementById('nombre').value = device.nombre;
                document.getElementById('codigo').value = '';
                document.getElementById('codigo').disabled = true;
                document.getElementById('modalTitle').textContent = 'Editar Dispositivo';
                document.getElementById('deviceModal').classList.remove('hidden');
            } else {
                throw new Error(response.message || 'Error al cargar el dispositivo');
            }
        } catch (error) {
            const errorMessage = handleError(error, 'No se pudo cargar el dispositivo');
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorMessage
            });
        } finally {
            if (editBtn) hideLoading(editBtn);
        }
    };

    window.deleteDevice = async (id) => {
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
                await dispositivosService.delete(id);
                Swal.fire({
                    icon: 'success',
                    title: 'Éxito',
                    text: 'Dispositivo eliminado correctamente',
                    timer: 2000
                });
                loadDispositivos();
            } catch (error) {
                const errorMessage = handleError(error, 'No se pudo eliminar el dispositivo');
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorMessage
                });
            }
        }
    };

    window.revokeToken = async (id) => {
        const result = await Swal.fire({
            title: '¿Revocar token?',
            text: 'El dispositivo quedará inactivo y necesitará re-registrarse',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, revocar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#eab308'
        });

        if (result.isConfirmed) {
            try {
                await dispositivosService.revokeToken(id);
                Swal.fire({
                    icon: 'success',
                    title: 'Éxito',
                    text: 'Token revocado correctamente',
                    timer: 2000
                });
                loadDispositivos();
            } catch (error) {
                const errorMessage = handleError(error, 'No se pudo revocar el token');
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorMessage
                });
            }
        }
    };

    // Agregar dispositivo
    const addDeviceBtn = document.getElementById('addDeviceBtn');
    if (addDeviceBtn) {
        addDeviceBtn.addEventListener('click', () => {
            document.getElementById('deviceForm').reset();
            document.getElementById('deviceId').value = '';
            document.getElementById('codigo').disabled = false;
            document.getElementById('modalTitle').textContent = 'Agregar Dispositivo';
            document.getElementById('deviceModal').classList.remove('hidden');
        });
    }

    // Cancelar modal
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            document.getElementById('deviceModal').classList.add('hidden');
        });
    }

    // Generar código
    const generateCodeBtn = document.getElementById('generateCodeBtn');
    if (generateCodeBtn) {
        generateCodeBtn.addEventListener('click', async () => {
            showLoading(generateCodeBtn, 'Generando...');
            
            try {
                const response = await dispositivosService.generateRegistrationCode();
                if (response.success) {
                    document.getElementById('codigo').value = response.data.codigo;
                    Swal.fire({
                        icon: 'success',
                        title: 'Éxito',
                        text: 'Código generado correctamente',
                        timer: 2000
                    });
                } else {
                    throw new Error(response.message || 'Error al generar el código');
                }
            } catch (error) {
                const errorMessage = handleError(error, 'No se pudo generar el código');
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorMessage
                });
            } finally {
                hideLoading(generateCodeBtn);
            }
        });
    }

    // Enviar formulario
    const deviceForm = document.getElementById('deviceForm');
    if (deviceForm) {
        deviceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = deviceForm.querySelector('button[type="submit"]');
            const nombre = document.getElementById('nombre').value.trim();
            const codigo = document.getElementById('codigo').value.trim();
            
            // Validaciones
            if (!nombre) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error de validación',
                    text: 'El nombre es requerido'
                });
                return;
            }
            
            const formData = {
                nombre,
                codigo: codigo || undefined,
            };

            showLoading(submitBtn, 'Guardando...');
            
            try {
                const deviceId = document.getElementById('deviceId').value;
                if (deviceId) {
                    await dispositivosService.update(deviceId, { nombre: formData.nombre });
                    Swal.fire({
                        icon: 'success',
                        title: 'Éxito',
                        text: 'Dispositivo actualizado correctamente',
                        timer: 2000
                    });
                } else {
                    if (!codigo) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error de validación',
                            text: 'El código de registro es requerido para nuevos dispositivos'
                        });
                        hideLoading(submitBtn);
                        return;
                    }
                    
                    await dispositivosService.create(formData);
                    Swal.fire({
                        icon: 'success',
                        title: 'Éxito',
                        text: 'Dispositivo creado. Usa el código para registrar el ESP32',
                        timer: 3000
                    });
                }
                document.getElementById('deviceModal').classList.add('hidden');
                loadDispositivos();
            } catch (error) {
                const errorMessage = handleError(error, 'Error al guardar el dispositivo');
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorMessage
                });
            } finally {
                hideLoading(submitBtn);
            }
        });
    }

    // Cargar dispositivos inicial
    loadDispositivos();
}

