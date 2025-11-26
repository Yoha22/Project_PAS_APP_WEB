// Importar CSS como módulo (Vite lo procesará durante el build)
import '/src/assets/css/dark-mode.css';

// Los imports DEBEN estar al principio absoluto del módulo
import { authService } from '/src/services/auth.js';
import { esp32Config } from '/src/utils/esp32Config.js';
import { themeService } from '/src/services/theme.js';
import apiClient from '/src/services/api.js';
import { initNavigation } from '/src/components/Navigation.js';

// Swal está disponible globalmente desde el script tag en el HTML
const Swal = window.Swal;

// Log inicial
console.log('[ESP32-CONFIG] Script de config-esp32 iniciado');

// Verificar autenticación
if (!authService || !authService.isAuthenticated()) {
    console.warn('[ESP32-CONFIG] ⚠️ Usuario no autenticado, redirigiendo a login...');
    window.location.href = '/login.html';
} else {
    console.log('[ESP32-CONFIG] ✅ Usuario autenticado, cargando página de configuración ESP32...');
    initializeConfig();
}

// Función para inicializar la página
async function initializeConfig() {
    // Inicializar navegación
    initNavigation('config');
    
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

    // Cargar IP actual
    const esp32IPInput = document.getElementById('esp32IP');
    const esp32ConfigIPInput = document.getElementById('esp32ConfigIP');
    
    if (esp32IPInput) {
        esp32IPInput.value = esp32Config.getIP();
    }
    if (esp32ConfigIPInput) {
        esp32ConfigIPInput.value = '192.168.4.1'; // IP fija en modo configuración
    }

    // Botón para guardar IP
    const saveIPBtn = document.getElementById('saveIPBtn');
    if (saveIPBtn) {
        saveIPBtn.addEventListener('click', () => {
            const ip = esp32IPInput.value.trim();
            if (esp32Config.isValidIP(ip)) {
                esp32Config.setIP(ip);
                Swal.fire({
                    icon: 'success',
                    title: 'IP guardada',
                    text: `IP del ESP32 configurada: ${ip}`,
                    timer: 2000,
                    showConfirmButton: false
                });
                console.log('[ESP32-CONFIG] IP guardada:', ip);
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'IP inválida',
                    text: 'Por favor ingresa una dirección IP válida (ej: 192.168.1.100)'
                });
            }
        });
    }

    // Botón para abrir portal ESP32
    const openPortalBtn = document.getElementById('openPortalBtn');
    if (openPortalBtn) {
        openPortalBtn.addEventListener('click', () => {
            const configIP = '192.168.4.1';
            window.open(`http://${configIP}`, '_blank');
        });
    }

    // Botón para cargar en iframe
    const loadIframeBtn = document.getElementById('loadIframeBtn');
    if (loadIframeBtn) {
        loadIframeBtn.addEventListener('click', () => {
            loadESP32Iframe();
        });
    }

    // Botón para activar modo configuración (si el ESP32 está en IP normal)
    const activateConfigModeBtn = document.getElementById('activateConfigModeBtn');
    if (activateConfigModeBtn) {
        activateConfigModeBtn.addEventListener('click', () => {
            activateConfigMode();
        });
    }

    // Mostrar instrucciones
    showInstructions();
}

/**
 * Mostrar instrucciones para configurar el ESP32
 */
function showInstructions() {
    const instructionsContainer = document.getElementById('instructionsContainer');
    if (!instructionsContainer) return;

    instructionsContainer.innerHTML = `
        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
            <h3 class="text-xl font-semibold text-blue-800 dark:text-blue-200 mb-4">
                <i class="fas fa-info-circle mr-2"></i>Instrucciones para Configurar el ESP32
            </h3>
            <ol class="list-decimal list-inside space-y-3 text-blue-700 dark:text-blue-300">
                <li class="font-semibold">Conecta tu dispositivo (PC, tablet o móvil) a la red WiFi del ESP32 llamada "SistemaAcceso-XXXX"</li>
                <li>Una vez conectado, abre tu navegador y ve a: <code class="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">http://192.168.4.1</code></li>
                <li>Completa el formulario con:
                    <ul class="list-disc list-inside ml-6 mt-2 space-y-1">
                        <li>Las credenciales de tu red WiFi</li>
                        <li>La URL de tu servidor API</li>
                        <li>El código de registro del administrador</li>
                        <li>Un nombre para el dispositivo</li>
                    </ul>
                </li>
                <li>Haz clic en "Guardar Configuración"</li>
                <li>El ESP32 se reiniciará y se conectará a tu red WiFi</li>
            </ol>
            <div class="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded">
                <p class="text-sm text-yellow-800 dark:text-yellow-200">
                    <i class="fas fa-exclamation-triangle mr-2"></i>
                    <strong>Nota:</strong> Cuando estés conectado a la red del ESP32, no tendrás acceso a internet. 
                    Esto es normal. Solo podrás acceder al portal de configuración del ESP32.
                </p>
            </div>
        </div>
    `;
}

/**
 * Cargar el portal del ESP32 en un iframe
 */
function loadESP32Iframe() {
    const iframeContainer = document.getElementById('iframeContainer');
    if (!iframeContainer) return;

    const configIP = '192.168.4.1';

    iframeContainer.classList.remove('hidden');
    iframeContainer.innerHTML = `
        <div class="mb-4 flex justify-between items-center">
            <h3 class="text-lg font-semibold dark:text-white">
                <i class="fas fa-cog mr-2"></i>Portal de Configuración del ESP32
            </h3>
            <button id="closeIframeBtn" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
            <p class="text-sm text-blue-700 dark:text-blue-300">
                <i class="fas fa-info-circle mr-2"></i>
                Si no se carga el iframe, asegúrate de estar conectado a la red WiFi "SistemaAcceso-XXXX" y 
                haz clic en el botón "Abrir en Nueva Ventana" para acceder directamente.
            </p>
        </div>
        <iframe 
            id="esp32Iframe"
            src="http://${configIP}/" 
            class="w-full border border-gray-300 dark:border-gray-600 rounded-lg"
            style="min-height: 600px; width: 100%;"
            sandbox="allow-forms allow-scripts allow-same-origin"
            onload="console.log('Iframe cargado')"
            onerror="console.error('Error cargando iframe')">
        </iframe>
        <div class="mt-4 flex gap-2">
            <button onclick="window.open('http://${configIP}', '_blank')" 
                    class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                <i class="fas fa-external-link-alt mr-2"></i>Abrir en Nueva Ventana
            </button>
            <button id="refreshIframeBtn" 
                    class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">
                <i class="fas fa-redo mr-2"></i>Recargar
            </button>
        </div>
    `;

    // Botón para cerrar iframe
    const closeIframeBtn = document.getElementById('closeIframeBtn');
    if (closeIframeBtn) {
        closeIframeBtn.addEventListener('click', () => {
            iframeContainer.classList.add('hidden');
            iframeContainer.innerHTML = '';
        });
    }

    // Botón para refrescar iframe
    const refreshIframeBtn = document.getElementById('refreshIframeBtn');
    if (refreshIframeBtn) {
        refreshIframeBtn.addEventListener('click', () => {
            const iframe = document.getElementById('esp32Iframe');
            if (iframe) {
                iframe.src = iframe.src; // Recargar
            }
        });
    }
}

/**
 * Activar modo configuración en el ESP32 (si está en IP normal)
 */
async function activateConfigMode() {
    const esp32IP = document.getElementById('esp32IP')?.value || esp32Config.getIP();
    
    if (!esp32IP || !esp32Config.isValidIP(esp32IP)) {
        Swal.fire({
            icon: 'error',
            title: 'IP inválida',
            text: 'Por favor configura la IP del ESP32 primero'
        });
        return;
    }

    const result = await Swal.fire({
        title: '¿Activar modo configuración?',
        text: `Esto reiniciará el ESP32 y lo pondrá en modo Access Point (AP). Conéctate al WiFi "SistemaAcceso-XXXX" después.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, activar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#10b981',
    });

    if (!result.isConfirmed) {
        return;
    }

    try {
        Swal.fire({
            title: 'Activando modo configuración...',
            text: 'Por favor espera...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const response = await apiClient.post('/esp32/activate-config-mode', {
            ip: esp32IP
        });

        if (response.data.success) {
            Swal.fire({
                icon: 'success',
                title: 'Modo configuración activado',
                text: 'El ESP32 se reiniciará. Conéctate al WiFi "SistemaAcceso-XXXX" y espera unos segundos antes de acceder al portal.',
                timer: 5000
            });
        } else {
            throw new Error(response.data.error || 'Error desconocido');
        }
    } catch (error) {
        console.error('[ESP32-CONFIG] Error al activar modo configuración', error);
        
        let errorMessage = 'No se pudo activar el modo configuración.';
        if (error.response?.data?.error) {
            errorMessage = error.response.data.error;
        } else if (error.message) {
            errorMessage = error.message;
        }

        Swal.fire({
            icon: 'warning',
            title: 'Advertencia',
            html: `<p>${errorMessage}</p><p class="text-sm mt-2">El ESP32 puede estar ya en modo configuración. Intenta conectarte directamente a la red "SistemaAcceso-XXXX".</p>`,
            confirmButtonText: 'Entendido'
        });
    }
}
