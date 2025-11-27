// Importar CSS como módulo (Vite lo procesará durante el build)
import '/src/assets/css/dark-mode.css';

// Los imports DEBEN estar al principio absoluto del módulo
import { authService } from '/src/services/auth.js';
import { administradoresService } from '/src/services/administradores.js';
import { themeService } from '/src/services/theme.js';
import { showLoading, hideLoading, handleError, isValidPhone } from '/src/utils/ui-helpers.js';
import { initNavigation } from '/src/components/Navigation.js';

// Log inicial
console.log('=== Script de administradores iniciado ===');

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
    console.log('✅ Usuario autenticado, cargando página de administradores...');
    initializeAdministradores();
}

// Función para inicializar la página
function initializeAdministradores() {
    // Inicializar navegación
    initNavigation('administradores');
    
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
    
    // Cargar administradores
    loadAdministradores();
    
    // Configurar eventos
    setupEventListeners();
}

// Cargar lista de administradores
async function loadAdministradores() {
    const tableBody = document.getElementById('administradoresTable');
    
    try {
        showTableLoading(tableBody, 4);
        
        const response = await administradoresService.getAll();
        
        if (response.success && response.data) {
            renderAdministradores(response.data);
        } else {
            throw new Error(response.message || 'Error al cargar administradores');
        }
    } catch (error) {
        const errorMessage = handleError(error, 'Error al cargar administradores');
        tableBody.innerHTML = `
            <tr class="dark:bg-gray-800">
                <td colspan="4" class="text-center py-4 text-red-600 dark:text-red-400">
                    ${errorMessage}
                </td>
            </tr>
        `;
    }
}

// Renderizar administradores en la tabla
function renderAdministradores(administradores) {
    const tableBody = document.getElementById('administradoresTable');
    
    if (!administradores || administradores.length === 0) {
        tableBody.innerHTML = `
            <tr class="dark:bg-gray-800">
                <td colspan="4" class="text-center py-4 dark:text-gray-200">
                    No hay administradores registrados
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = administradores.map(admin => `
        <tr class="dark:bg-gray-800 border-b dark:border-gray-700">
            <td class="px-6 py-3 dark:text-gray-200">${admin.id}</td>
            <td class="px-6 py-3 dark:text-gray-200">${admin.correo || '-'}</td>
            <td class="px-6 py-3 dark:text-gray-200">${admin.telefono_admin || '-'}</td>
            <td class="px-6 py-3">
                <button onclick="editAdmin(${admin.id})" class="bg-blue-500 text-white px-2 py-1 rounded mr-2 hover:bg-blue-600">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button onclick="deleteAdmin(${admin.id})" class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </td>
        </tr>
    `).join('');
}

// Función para mostrar loading en tabla
function showTableLoading(tableBody, columns) {
    tableBody.innerHTML = `
        <tr class="dark:bg-gray-800">
            <td colspan="${columns}" class="text-center py-4 dark:text-gray-200">
                <i class="fas fa-spinner fa-spin mr-2"></i>Cargando...
            </td>
        </tr>
    `;
}

// Configurar event listeners
function setupEventListeners() {
    // Botón agregar administrador
    const addAdminBtn = document.getElementById('addAdminBtn');
    if (addAdminBtn) {
        addAdminBtn.addEventListener('click', () => {
            document.getElementById('adminForm').reset();
            document.getElementById('adminId').value = '';
            document.getElementById('password').required = true;
            document.getElementById('codigo').required = true;
            document.getElementById('editPasswordSection').style.display = 'none';
            document.getElementById('editCodigoSection').style.display = 'none';
            document.getElementById('passwordHelp').textContent = 'Mínimo 6 caracteres con al menos un símbolo especial. Requerida al crear.';
            document.getElementById('codigoHelp').textContent = 'Código único para este administrador. No se mostrará después de guardar.';
            document.getElementById('modalTitle').textContent = 'Agregar Administrador';
            document.getElementById('submitText').textContent = 'Guardar';
            document.getElementById('adminModal').classList.remove('hidden');
        });
    }
    
    // Botón cancelar
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            document.getElementById('adminModal').classList.add('hidden');
            document.getElementById('adminForm').reset();
        });
    }
    
    // Enviar formulario
    const adminForm = document.getElementById('adminForm');
    if (adminForm) {
        adminForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleSubmit();
        });
    }
}

// Manejar envío del formulario
async function handleSubmit() {
    const submitBtn = document.querySelector('#adminForm button[type="submit"]');
    const adminId = document.getElementById('adminId').value;
    const correo = document.getElementById('correo').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const password = document.getElementById('password').value;
    const codigo = document.getElementById('codigo').value;
    
    // Validaciones
    if (!correo) {
        Swal.fire({
            icon: 'error',
            title: 'Error de validación',
            text: 'El correo electrónico es requerido'
        });
        return;
    }
    
    if (!isValidEmail(correo)) {
        Swal.fire({
            icon: 'error',
            title: 'Error de validación',
            text: 'El correo electrónico no tiene un formato válido'
        });
        return;
    }
    
    if (telefono && !isValidPhone(telefono)) {
        Swal.fire({
            icon: 'error',
            title: 'Error de validación',
            text: 'El teléfono debe tener exactamente 10 dígitos'
        });
        return;
    }
    
    // Validar password solo al crear o si se proporciona al editar
    if (!adminId && !password) {
        Swal.fire({
            icon: 'error',
            title: 'Error de validación',
            text: 'La contraseña es requerida al crear un administrador'
        });
        return;
    }
    
    if (password && !isValidPassword(password)) {
        Swal.fire({
            icon: 'error',
            title: 'Error de validación',
            text: 'La contraseña debe tener al menos 6 caracteres e incluir un símbolo especial'
        });
        return;
    }
    
    // Validar código solo al crear o si se proporciona al editar
    if (!adminId && !codigo) {
        Swal.fire({
            icon: 'error',
            title: 'Error de validación',
            text: 'El código de administrador es requerido'
        });
        return;
    }
    
    const formData = {
        correo,
        telefono: telefono || null,
    };
    
    // Solo incluir password y código si se proporcionaron
    if (password) {
        formData.password = password;
    }
    if (codigo) {
        formData.codigo = parseInt(codigo);
    }
    
    showLoading(submitBtn, 'Guardando...');
    
    try {
        if (adminId) {
            await administradoresService.update(adminId, formData);
            Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: 'Administrador actualizado correctamente',
                timer: 2000
            });
        } else {
            await administradoresService.create(formData);
            Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: 'Administrador creado correctamente',
                timer: 2000
            });
        }
        document.getElementById('adminModal').classList.add('hidden');
        document.getElementById('adminForm').reset();
        loadAdministradores();
    } catch (error) {
        const errorMessage = handleError(error, 'Error al guardar el administrador');
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: errorMessage
        });
    } finally {
        hideLoading(submitBtn);
    }
}

// Funciones globales para los botones de la tabla
window.editAdmin = async (id) => {
    const editBtn = event.target.closest('button');
    if (editBtn) showLoading(editBtn, 'Cargando...');
    
    try {
        const response = await administradoresService.getById(id);
        if (response.success) {
            const admin = response.data;
            document.getElementById('adminId').value = admin.id;
            document.getElementById('correo').value = admin.correo || '';
            document.getElementById('telefono').value = admin.telefono_admin || '';
            // NO cargar password ni código por seguridad
            document.getElementById('password').value = '';
            document.getElementById('codigo').value = '';
            
            // Configurar modo edición
            document.getElementById('password').required = false;
            document.getElementById('codigo').required = false;
            document.getElementById('editPasswordSection').style.display = 'block';
            document.getElementById('editCodigoSection').style.display = 'block';
            document.getElementById('passwordHelp').textContent = 'Deja en blanco para mantener la contraseña actual. Completa solo si deseas cambiarla.';
            document.getElementById('codigoHelp').textContent = 'Deja en blanco para mantener el código actual. Completa solo si deseas cambiarlo.';
            document.getElementById('modalTitle').textContent = 'Editar Administrador';
            document.getElementById('submitText').textContent = 'Actualizar';
            document.getElementById('adminModal').classList.remove('hidden');
        } else {
            throw new Error(response.message || 'Error al cargar el administrador');
        }
    } catch (error) {
        const errorMessage = handleError(error, 'No se pudo cargar el administrador');
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: errorMessage
        });
    } finally {
        if (editBtn) hideLoading(editBtn);
    }
};

window.deleteAdmin = async (id) => {
    const result = await Swal.fire({
        title: '¿Estás seguro?',
        text: 'Esta acción no se puede deshacer',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });
    
    if (result.isConfirmed) {
        try {
            await administradoresService.delete(id);
            Swal.fire({
                icon: 'success',
                title: 'Eliminado',
                text: 'Administrador eliminado correctamente',
                timer: 2000
            });
            loadAdministradores();
        } catch (error) {
            const errorMessage = handleError(error, 'Error al eliminar el administrador');
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorMessage
            });
        }
    }
};

// Funciones de validación
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPassword(password) {
    // Mínimo 6 caracteres y al menos un símbolo especial
    return password.length >= 6 && /[\W]/.test(password);
}

