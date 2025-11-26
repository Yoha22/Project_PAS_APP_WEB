// Importar CSS como módulo (Vite lo procesará durante el build)
import '/src/assets/css/dark-mode.css';

// Los imports DEBEN estar al principio absoluto del módulo
import { authService } from '/src/services/auth.js';
import { usuariosService } from '/src/services/usuarios.js';
import { themeService } from '/src/services/theme.js';
import { huellasService } from '/src/services/huellas.js';
import { esp32Config } from '/src/utils/esp32Config.js';
import { showLoading, hideLoading, showTableLoading, handleError, isValidCedula, isValidPhone } from '/src/utils/ui-helpers.js';
import { initNavigation } from '/src/components/Navigation.js';

// Log inicial
console.log('=== Script de usuarios iniciado ===');

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
    console.log('✅ Usuario autenticado, cargando página de usuarios...');
    initializeUsuarios();
}

// Función para inicializar la página
function initializeUsuarios() {
    // Inicializar navegación
    initNavigation('usuarios');
    
    // Configurar tema
    if (themeService) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                themeService.init();
            });
        } else {
            themeService.init();
        }
    }

    let currentPage = 1;

    // Cargar usuarios
    async function loadUsuarios(page = 1) {
        const tbody = document.getElementById('usuariosTable');
        showTableLoading(tbody, 6, 'Cargando usuarios...');
        
        try {
            const response = await usuariosService.getAll(page, 5);
            if (response.success) {
                renderUsuarios(response.data.data);
                renderPagination(response.data);
            } else {
                throw new Error(response.message || 'Error al cargar usuarios');
            }
        } catch (error) {
            console.error('Error cargando usuarios:', error);
            const errorMessage = handleError(error, 'No se pudieron cargar los usuarios');
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

    function renderUsuarios(usuarios) {
        const tbody = document.getElementById('usuariosTable');
        if (usuarios.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 dark:text-gray-200">No hay usuarios</td></tr>';
            return;
        }

        tbody.innerHTML = usuarios.map(usuario => `
            <tr class="border-b dark:border-gray-700">
                <td class="px-6 py-3 dark:text-gray-200">${usuario.id}</td>
                <td class="px-6 py-3 dark:text-gray-200">${usuario.nombre}</td>
                <td class="px-6 py-3 dark:text-gray-200">${usuario.huella_digital || '-'}</td>
                <td class="px-6 py-3 dark:text-gray-200">${usuario.cedula || '-'}</td>
                <td class="px-6 py-3 dark:text-gray-200">${usuario.celular || '-'}</td>
                <td class="px-6 py-3">
                    <button onclick="editUser(${usuario.id})" class="bg-blue-500 text-white px-2 py-1 rounded mr-2 hover:bg-blue-600">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button onclick="deleteUser(${usuario.id})" class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">
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
        loadUsuarios(page);
    };

    window.editUser = async (id) => {
        const editBtn = event.target.closest('button');
        if (editBtn) showLoading(editBtn, 'Cargando...');
        
        try {
            const response = await usuariosService.getById(id);
            if (response.success) {
                const usuario = response.data;
                document.getElementById('userId').value = usuario.id;
                document.getElementById('nombre').value = usuario.nombre;
                document.getElementById('cedula').value = usuario.cedula || '';
                document.getElementById('celular').value = usuario.celular || '';
                limpiarHuella();
                document.getElementById('huella_digital').placeholder = 'La huella no se puede editar';
                document.getElementById('capturarHuella').disabled = true;
                document.getElementById('modalTitle').textContent = 'Editar Usuario';
                document.getElementById('userModal').classList.remove('hidden');
            } else {
                throw new Error(response.message || 'Error al cargar el usuario');
            }
        } catch (error) {
            const errorMessage = handleError(error, 'No se pudo cargar el usuario');
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorMessage
            });
        } finally {
            if (editBtn) hideLoading(editBtn);
        }
    };

    window.deleteUser = async (id) => {
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
                await usuariosService.delete(id);
                Swal.fire({
                    icon: 'success',
                    title: 'Éxito',
                    text: 'Usuario eliminado correctamente',
                    timer: 2000
                });
                loadUsuarios(currentPage);
            } catch (error) {
                const errorMessage = handleError(error, 'No se pudo eliminar el usuario');
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorMessage
                });
            }
        }
    };

    // Limpiar campo de huella
    function limpiarHuella() {
        const huellaInput = document.getElementById('huella_digital');
        huellaInput.value = '';
        huellaInput.type = 'number';
        document.getElementById('huellaStatus').textContent = '';
        document.getElementById('huellaStatus').className = 'text-xs text-gray-500 dark:text-gray-400';
    }

    // Capturar huella desde dispositivo ESP32
    const capturarHuellaBtn = document.getElementById('capturarHuella');
    if (capturarHuellaBtn) {
        capturarHuellaBtn.addEventListener('click', async function() {
            const btn = this;
            const status = document.getElementById('huellaStatus');
            const huellaInput = document.getElementById('huella_digital');
            
            showLoading(btn, 'Capturando...');
            status.textContent = 'Esperando huella...';
            status.className = 'text-xs text-yellow-600 dark:text-yellow-400';
            
            const ESP32_URL = esp32Config.getRegisterUrl();
            
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);
                
                const response = await fetch(ESP32_URL, {
                    method: 'GET',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    const data = await response.text();
                    
                    if (data && data.trim() !== '') {
                        const idHuella = data.trim();
                        
                        // Guardar la huella temporalmente en la API
                        try {
                            const result = await huellasService.register({ idHuella: parseInt(idHuella) });
                            
                            if (result.success) {
                                huellaInput.value = idHuella;
                                status.textContent = '✓ Huella capturada y registrada';
                                status.className = 'text-xs text-green-600 dark:text-green-400';
                            } else {
                                huellaInput.value = idHuella;
                                status.textContent = '✓ Huella capturada (no registrada en API)';
                                status.className = 'text-xs text-yellow-600 dark:text-yellow-400';
                            }
                        } catch (apiError) {
                            huellaInput.value = idHuella;
                            status.textContent = '✓ Huella capturada (ID: ' + idHuella + ')';
                            status.className = 'text-xs text-yellow-600 dark:text-yellow-400';
                            console.warn('Error al registrar en API:', apiError);
                        }
                    } else {
                        status.textContent = 'Huella capturada (sin ID)';
                        status.className = 'text-xs text-yellow-600 dark:text-yellow-400';
                    }
                } else {
                    throw new Error('Error en la respuesta del servidor');
                }
            } catch (error) {
                console.error('No se pudo conectar con el ESP32:', error);
                status.textContent = '✗ Error al capturar';
                status.className = 'text-xs text-red-600 dark:text-red-400';
                Swal.fire({
                    icon: 'warning',
                    title: 'Advertencia',
                    text: 'No se pudo conectar con el dispositivo de huellas. Puedes agregar el usuario sin huella o ingresar el ID manualmente.',
                    timer: 4000,
                    showConfirmButton: false
                });
            } finally {
                hideLoading(btn);
            }
        });
    }

    // Agregar usuario
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', () => {
            document.getElementById('userForm').reset();
            document.getElementById('userId').value = '';
            limpiarHuella();
            document.getElementById('huella_digital').placeholder = 'O ingresa el ID manualmente (opcional)';
            document.getElementById('capturarHuella').disabled = false;
            document.getElementById('modalTitle').textContent = 'Agregar Usuario';
            document.getElementById('userModal').classList.remove('hidden');
        });
    }

    // Cancelar modal
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            document.getElementById('userModal').classList.add('hidden');
            limpiarHuella();
        });
    }

    // Enviar formulario
    const userForm = document.getElementById('userForm');
    if (userForm) {
        userForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = userForm.querySelector('button[type="submit"]');
            const nombre = document.getElementById('nombre').value.trim();
            const cedula = document.getElementById('cedula').value.trim();
            const celular = document.getElementById('celular').value.trim();
            
            // Validaciones
            if (!nombre) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error de validación',
                    text: 'El nombre es requerido'
                });
                return;
            }
            
            if (cedula && !isValidCedula(cedula)) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error de validación',
                    text: 'La cédula no tiene un formato válido'
                });
                return;
            }
            
            if (celular && !isValidPhone(celular)) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error de validación',
                    text: 'El celular no tiene un formato válido'
                });
                return;
            }
            
            const formData = {
                nombre,
                cedula: cedula || null,
                celular: celular || null,
            };

            const huellaDigital = document.getElementById('huella_digital').value.trim();
            if (huellaDigital && huellaDigital !== '0') {
                formData.huella_digital = parseInt(huellaDigital);
            }

            showLoading(submitBtn, 'Guardando...');
            
            try {
                const userId = document.getElementById('userId').value;
                if (userId) {
                    await usuariosService.update(userId, formData);
                    Swal.fire({
                        icon: 'success',
                        title: 'Éxito',
                        text: 'Usuario actualizado correctamente',
                        timer: 2000
                    });
                } else {
                    await usuariosService.create(formData);
                    Swal.fire({
                        icon: 'success',
                        title: 'Éxito',
                        text: 'Usuario creado correctamente',
                        timer: 2000
                    });
                }
                document.getElementById('userModal').classList.add('hidden');
                limpiarHuella();
                loadUsuarios(currentPage);
            } catch (error) {
                const errorMessage = handleError(error, 'Error al guardar el usuario');
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

    // Cargar usuarios inicial
    loadUsuarios();
}

