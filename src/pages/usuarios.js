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
import apiClient from '/src/services/api.js';

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
                <td class="px-6 py-3 dark:text-gray-200">${usuario.clave ? '•••••' : '<span class="text-gray-400 italic">Sin código</span>'}</td>
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
                document.getElementById('clave').value = usuario.clave || '';
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
            
            // Verificar que la IP esté configurada
            const esp32IP = esp32Config.getIP();
            if (!esp32IP || esp32IP === esp32Config.defaultIP) {
                const result = await Swal.fire({
                    icon: 'info',
                    title: 'IP del ESP32 no configurada',
                    text: '¿Deseas configurar la IP del dispositivo ESP32 ahora?',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, configurar',
                    cancelButtonText: 'Cancelar'
                });
                
                if (result.isConfirmed) {
                    window.location.href = '/config-esp32.html';
                }
                return;
            }
            
            showLoading(btn, 'Capturando...');
            status.textContent = 'Conectando con dispositivo...';
            status.className = 'text-xs text-yellow-600 dark:text-yellow-400';
            
            // Actualizar mensaje para indicar que puede tomar tiempo
            status.textContent = 'Esperando huella en el dispositivo (puede tomar hasta 60 segundos)...';
            console.log('🔗 Intentando conectar con ESP32 (IP: ' + esp32IP + ')');
            console.log('⏱️ Esta operación puede tomar hasta 60 segundos (captura de huella + envío al backend)');
            
            try {
                let response;
                
                // Intentar conexión directa primero (si estamos en la misma red local)
                const isSecureContext = window.location.protocol === 'https:';
                const esp32Url = `http://${esp32IP}/registrarHuella`;
                
                if (isSecureContext) {
                    // Si estamos en HTTPS (desplegado), usar proxy del backend
                    console.log('📡 Usando proxy del backend (contexto seguro)');
                    console.log('⏱️ Timeout configurado: 120 segundos para capturar huella');
                    response = await apiClient.get('/esp32-proxy/registrar-huella', {
                        params: { ip: esp32IP },
                        timeout: 120000 // 120 segundos para capturar huella (60 segundos adicionales para confirmación)
                    });
                } else {
                    // Si estamos en HTTP (local), intentar conexión directa
                    console.log('🔗 Intentando conexión directa al ESP32');
                    try {
                        const directResponse = await fetch(esp32Url, {
                            method: 'GET',
                            headers: {
                                'Accept': 'application/json, text/plain, */*'
                            },
                            signal: AbortSignal.timeout(120000) // 120 segundos timeout (60 segundos adicionales para confirmación)
                        });
                        
                        if (directResponse.ok) {
                            const data = await directResponse.json().catch(() => {
                                // Si no es JSON, intentar como texto
                                return directResponse.text().then(text => {
                                    try {
                                        return JSON.parse(text);
                                    } catch {
                                        return { success: true, idHuella: text.trim() };
                                    }
                                });
                            });
                            
                            response = { data: data };
                        } else {
                            throw new Error(`HTTP ${directResponse.status}`);
                        }
                    } catch (directError) {
                        console.warn('⚠️ Conexión directa falló, intentando con proxy:', directError);
                        // Si falla la conexión directa, intentar con proxy
                        console.log('⏱️ Timeout configurado: 120 segundos para capturar huella');
                        response = await apiClient.get('/esp32-proxy/registrar-huella', {
                            params: { ip: esp32IP },
                            timeout: 120000 // 120 segundos (60 segundos adicionales para confirmación)
                        });
                    }
                }
                
                if (response.data.success) {
                    // El backend devuelve el ID de la huella del ESP32
                    // Puede venir en diferentes formatos: response.data.idHuella o response.data.data.idHuella
                    const idHuella = response.data.idHuella || response.data.data?.idHuella || response.data.raw;
                    
                    if (idHuella && idHuella.toString().trim() !== '' && idHuella !== '0') {
                        const idHuellaInt = parseInt(idHuella);
                        
                        if (isNaN(idHuellaInt) || idHuellaInt <= 0) {
                            throw new Error('ID de huella inválido recibido del ESP32');
                        }
                        
                        // Guardar la huella temporalmente en la API
                        try {
                            const result = await huellasService.register({ idHuella: idHuellaInt });
                            
                            if (result.success) {
                                huellaInput.value = idHuellaInt;
                                status.textContent = '✓ Huella capturada y registrada';
                                status.className = 'text-xs text-green-600 dark:text-green-400';
                                
                                Swal.fire({
                                    icon: 'success',
                                    title: 'Huella capturada',
                                    text: `ID de huella: ${idHuellaInt}`,
                                    timer: 2000,
                                    showConfirmButton: false
                                });
                            } else {
                                huellaInput.value = idHuellaInt;
                                status.textContent = '✓ Huella capturada (no registrada en API)';
                                status.className = 'text-xs text-yellow-600 dark:text-yellow-400';
                                
                                Swal.fire({
                                    icon: 'warning',
                                    title: 'Huella capturada',
                                    text: `ID: ${idHuellaInt} (no se pudo registrar en API)`,
                                    timer: 2000,
                                    showConfirmButton: false
                                });
                            }
                        } catch (apiError) {
                            huellaInput.value = idHuellaInt;
                            status.textContent = '✓ Huella capturada (ID: ' + idHuellaInt + ')';
                            status.className = 'text-xs text-yellow-600 dark:text-yellow-400';
                            console.warn('Error al registrar en API:', apiError);
                            
                            Swal.fire({
                                icon: 'info',
                                title: 'Huella capturada',
                                text: `ID: ${idHuellaInt} (no se pudo registrar en API, pero puedes guardarla manualmente)`,
                                timer: 3000
                            });
                        }
                    } else {
                        throw new Error('No se recibió un ID de huella válido del ESP32');
                    }
                } else {
                    throw new Error(response.data.error || 'Error desconocido del servidor');
                }
            } catch (error) {
                console.error('❌ Error al conectar con el ESP32:', error);
                status.textContent = '✗ Error al capturar';
                status.className = 'text-xs text-red-600 dark:text-red-400';
                
                let errorMessage = 'No se pudo conectar con el dispositivo de huellas.';
                let errorDetails = '';
                let isCloudBackend = window.location.protocol === 'https:';
                const isTimeout = error.message?.includes('timeout') || 
                                 error.message?.includes('Connection timed out') ||
                                 error.code === 'ECONNABORTED' ||
                                 error.response?.data?.details?.includes('Connection timed out');
                
                // Manejar diferentes tipos de errores
                if (error.response?.data?.error) {
                    // Error del backend proxy
                    errorDetails = error.response.data.error;
                    if (error.response.data.details) {
                        errorDetails += '\n\n' + error.response.data.details;
                    }
                } else if (error.response?.data?.message) {
                    errorDetails = error.response.data.message;
                } else if (error.message) {
                    errorDetails = error.message;
                } else {
                    errorDetails = 'Error desconocido.';
                }
                
                // Mensaje especial para cuando el backend en la nube no puede alcanzar el ESP32 local
                if (isCloudBackend && (isTimeout || errorDetails.includes('No se pudo conectar'))) {
                    errorMessage = 'El backend en la nube no puede alcanzar el ESP32 en tu red local';
                    errorDetails = `
                        <div style="text-align: left; margin-top: 15px;">
                            <p style="margin-bottom: 10px;"><strong>Problema:</strong></p>
                            <p style="font-size: 0.9em; margin-bottom: 15px;">
                                El backend desplegado en Render.com no puede acceder a IPs privadas locales (como ${esp32IP}).
                                Esto es normal porque las IPs privadas no son accesibles desde internet.
                            </p>
                            
                            <p style="margin-bottom: 10px;"><strong>Soluciones:</strong></p>
                            <ol style="font-size: 0.9em; margin-left: 20px; margin-bottom: 15px;">
                                <li style="margin-bottom: 5px;">
                                    <strong>Usar desde red local:</strong> Accede al frontend desde <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px;">http://</code> en lugar de <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px;">https://</code> cuando estés en la misma red que el ESP32.
                                </li>
                                <li style="margin-bottom: 5px;">
                                    <strong>Usar túnel (ngrok):</strong> Expone el ESP32 a internet temporalmente usando ngrok o similar.
                                </li>
                                <li style="margin-bottom: 5px;">
                                    <strong>Configurar VPN:</strong> Conecta el backend y el ESP32 a la misma VPN.
                                </li>
                            </ol>
                            
                            <p style="font-size: 0.85em; color: #6b7280; margin-top: 15px;">
                                IP del ESP32: <strong>${esp32IP}</strong><br>
                                Protocolo actual: <strong>${window.location.protocol}</strong>
                            </p>
                        </div>
                    `;
                }
                
                const result = await Swal.fire({
                    icon: 'warning',
                    title: 'Advertencia',
                    html: `<p><strong>${errorMessage}</strong></p>${errorDetails}`,
                    showCancelButton: true,
                    confirmButtonText: 'Configurar IP',
                    cancelButtonText: 'Continuar sin huella',
                    footer: '<small>Puedes agregar el usuario sin huella o ingresar el ID manualmente</small>',
                    width: '650px'
                });
                
                if (result.isConfirmed) {
                    window.location.href = '/config-esp32.html';
                }
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
            document.getElementById('clave').value = ''; // Limpiar código personal
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

            // Agregar código personal si está presente
            const clave = document.getElementById('clave').value.trim();
            if (clave) {
                // Validar que solo contenga números y máximo 10 dígitos
                if (!/^[0-9]{1,10}$/.test(clave)) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error de validación',
                        text: 'El código personal debe contener solo números (máximo 10 dígitos)'
                    });
                    return;
                }
                formData.clave = clave;
            }

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

