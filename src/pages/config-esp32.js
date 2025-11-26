// Importar CSS como módulo (Vite lo procesará durante el build)
import '/src/assets/css/dark-mode.css';

// Los imports DEBEN estar al principio absoluto del módulo
import { authService } from '/src/services/auth.js';
import { esp32Config } from '/src/utils/esp32Config.js';
import { themeService } from '/src/services/theme.js';
import apiClient from '/src/services/api.js';
import { initNavigation } from '/src/components/Navigation.js';

// Log inicial
console.log('[ESP32-CONFIG] Script de config-esp32 iniciado');

// Manejo global de errores
window.addEventListener('error', (event) => {
    console.error('[ESP32-CONFIG] ❌ Error global capturado:', event.error);
    event.preventDefault();
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('[ESP32-CONFIG] ❌ Promesa rechazada no manejada:', event.reason);
    event.preventDefault();
});

// Verificar autenticación
if (!authService || !authService.isAuthenticated()) {
    console.warn('[ESP32-CONFIG] ⚠️ Usuario no autenticado, redirigiendo a login...');
    window.location.href = '/login.html';
} else {
    console.log('[ESP32-CONFIG] ✅ Usuario autenticado, cargando página de configuración ESP32...');
    initializeConfig();
}

// Función helper para logs de depuración
function debugLog(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[ESP32-CONFIG] [${timestamp}] ${message}`, data || '');
}

// Función para inicializar la página
function initializeConfig() {
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
                debugLog('IP guardada', { ip });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'IP inválida',
                    text: 'Por favor ingresa una dirección IP válida (ej: 192.168.1.100)'
                });
            }
        });
    }

    // Botón para verificar conexión
    const checkConnectionBtn = document.getElementById('checkConnectionBtn');
    if (checkConnectionBtn) {
        checkConnectionBtn.addEventListener('click', () => {
            checkESP32Connection();
        });
    }

    // Botón para activar modo configuración
    const activateConfigModeBtn = document.getElementById('activateConfigModeBtn');
    if (activateConfigModeBtn) {
        activateConfigModeBtn.addEventListener('click', () => {
            activateConfigMode();
        });
    }

    // Botón para cargar HTML del ESP32
    const loadConfigHtmlBtn = document.getElementById('loadConfigHtmlBtn');
    if (loadConfigHtmlBtn) {
        loadConfigHtmlBtn.addEventListener('click', () => {
            loadESP32ConfigHtml();
        });
    }

    // Botón para cerrar formulario ESP32
    const closeESP32FormBtn = document.getElementById('closeESP32FormBtn');
    if (closeESP32FormBtn) {
        closeESP32FormBtn.addEventListener('click', () => {
            const container = document.getElementById('esp32ConfigContainer');
            if (container) {
                container.classList.add('hidden');
            }
        });
    }

    // Verificar conexión al cargar la página
    setTimeout(() => {
        checkESP32Connection();
    }, 1000);
}

/**
 * Verificar si el ESP32 está accesible
 */
async function checkESP32Connection() {
    debugLog('Verificando conexión con ESP32...');
    
    const statusDiv = document.getElementById('connectionStatus');
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');
    const checkBtn = document.getElementById('checkConnectionBtn');
    
    if (!statusDiv || !statusIcon || !statusText) return;

    // Mostrar estado de carga
    statusDiv.classList.remove('hidden');
    statusDiv.className = 'mb-4 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800';
    statusIcon.className = 'fas fa-spinner fa-spin text-yellow-500 mr-2';
    statusText.textContent = 'Verificando conexión...';
    
    if (checkBtn) {
        checkBtn.disabled = true;
        checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Verificando...';
    }

    const esp32IP = document.getElementById('esp32IP')?.value || esp32Config.getIP();
    const configIP = '192.168.4.1';

    try {
        // Intentar primero con IP de configuración
        debugLog('Intentando conectar con ESP32 en modo configuración', { ip: configIP });
        const configResponse = await fetch(`/api/esp32/config-html?ip=${configIP}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authService.getToken()}`,
            },
        });

        if (configResponse.ok) {
            statusDiv.className = 'mb-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800';
            statusIcon.className = 'fas fa-check-circle text-green-500 mr-2';
            statusText.textContent = `ESP32 accesible en modo configuración (${configIP})`;
            debugLog('ESP32 encontrado en modo configuración', { ip: configIP });
            if (checkBtn) {
                checkBtn.disabled = false;
                checkBtn.innerHTML = '<i class="fas fa-satellite-dish mr-2"></i>Verificar Conexión';
            }
            return;
        }
    } catch (error) {
        debugLog('No se pudo conectar en modo configuración', { error: error.message });
    }

    // Si no está en modo configuración, verificar IP normal
    if (esp32IP && esp32IP !== configIP) {
        try {
            debugLog('Intentando conectar con ESP32 en IP normal', { ip: esp32IP });
            // Intentar una petición simple al ESP32 (por ejemplo, /config)
            const response = await fetch(`http://${esp32IP}/config`, {
                method: 'GET',
                mode: 'no-cors', // Solo para verificar conectividad
            });

            statusDiv.className = 'mb-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800';
            statusIcon.className = 'fas fa-info-circle text-blue-500 mr-2';
            statusText.textContent = `ESP32 accesible en IP normal (${esp32IP}). Usa "Activar Modo Configuración" para configurarlo.`;
            debugLog('ESP32 encontrado en IP normal', { ip: esp32IP });
        } catch (error) {
            statusDiv.className = 'mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800';
            statusIcon.className = 'fas fa-times-circle text-red-500 mr-2';
            statusText.textContent = `No se pudo conectar con el ESP32. Verifica que esté encendido y en la misma red.`;
            debugLog('No se pudo conectar con ESP32', { error: error.message, ip: esp32IP });
        }
    } else {
        statusDiv.className = 'mb-4 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800';
        statusIcon.className = 'fas fa-exclamation-triangle text-yellow-500 mr-2';
        statusText.textContent = 'Configura la IP del ESP32 y verifica la conexión.';
    }

    if (checkBtn) {
        checkBtn.disabled = false;
        checkBtn.innerHTML = '<i class="fas fa-satellite-dish mr-2"></i>Verificar Conexión';
    }
}

/**
 * Activar modo configuración en el ESP32
 */
async function activateConfigMode() {
    debugLog('Activando modo configuración...');
    
    const esp32IP = document.getElementById('esp32IP')?.value || esp32Config.getIP();
    
    if (!esp32IP || !esp32Config.isValidIP(esp32IP)) {
        Swal.fire({
            icon: 'error',
            title: 'IP inválida',
            text: 'Por favor configura una IP válida del ESP32 primero.'
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

        debugLog('Enviando petición para activar modo configuración', { ip: esp32IP });
        
        const response = await apiClient.post('/esp32/activate-config-mode', {
            ip: esp32IP
        });

        debugLog('Respuesta de activación recibida', response.data);

        if (response.data.success) {
            Swal.fire({
                icon: 'success',
                title: 'Modo configuración activado',
                text: 'El ESP32 se reiniciará. Conéctate al WiFi "SistemaAcceso-XXXX" y espera unos segundos antes de cargar el formulario.',
                timer: 5000
            });
        } else {
            throw new Error(response.data.error || 'Error desconocido');
        }
    } catch (error) {
        debugLog('Error al activar modo configuración', { error: error.message, response: error.response?.data });
        
        let errorMessage = 'No se pudo activar el modo configuración.';
        if (error.response?.data?.error) {
            errorMessage = error.response.data.error;
        } else if (error.message) {
            errorMessage = error.message;
        }

        Swal.fire({
            icon: 'warning',
            title: 'Advertencia',
            html: `<p>${errorMessage}</p><p class="text-sm mt-2">El ESP32 puede estar ya en modo configuración o no ser accesible en la IP configurada.</p>`,
            confirmButtonText: 'Intentar cargar formulario de todas formas',
            showCancelButton: true,
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                loadESP32ConfigHtml();
            }
        });
    }
}

/**
 * Cargar HTML del portal de configuración del ESP32
 */
async function loadESP32ConfigHtml() {
    debugLog('Cargando HTML del ESP32...');
    
    const container = document.getElementById('esp32ConfigContainer');
    const content = document.getElementById('esp32FormContent');
    const loadBtn = document.getElementById('loadConfigHtmlBtn');
    
    if (!container || !content) {
        debugLog('ERROR: Contenedores no encontrados');
        return;
    }

    // Mostrar contenedor
    container.classList.remove('hidden');
    
    // Mostrar loading
    content.innerHTML = '<div class="flex items-center justify-center p-8"><i class="fas fa-spinner fa-spin text-3xl text-blue-500 mr-3"></i><span class="text-lg dark:text-gray-300">Cargando formulario del ESP32...</span></div>';
    
    if (loadBtn) {
        loadBtn.disabled = true;
        loadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Cargando...';
    }

    const configIP = document.getElementById('esp32ConfigIP')?.value || '192.168.4.1';

    try {
        debugLog('Solicitando HTML del ESP32', { ip: configIP });
        
        const response = await apiClient.get('/esp32/config-html', {
            params: { ip: configIP }
        });

        debugLog('HTML recibido', { 
            success: response.data.success,
            htmlLength: response.data.html?.length || 0 
        });

        if (response.data.success && response.data.html) {
            renderESP32HTML(response.data.html);
        } else {
            throw new Error(response.data.error || 'No se pudo obtener el HTML');
        }
    } catch (error) {
        debugLog('Error al cargar HTML', { 
            error: error.message, 
            response: error.response?.data 
        });
        
        let errorMessage = 'No se pudo cargar el formulario del ESP32.';
        if (error.response?.data?.error) {
            errorMessage = error.response.data.error;
        } else if (error.message) {
            errorMessage = error.message;
        }

        content.innerHTML = `
            <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
                <div class="flex items-center mb-4">
                    <i class="fas fa-exclamation-triangle text-red-500 text-2xl mr-3"></i>
                    <h4 class="text-lg font-semibold text-red-700 dark:text-red-300">Error al cargar formulario</h4>
                </div>
                <p class="text-red-600 dark:text-red-400 mb-4">${errorMessage}</p>
                <div class="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                    <p><strong>Posibles soluciones:</strong></p>
                    <ul class="list-disc list-inside space-y-1">
                        <li>Verifica que el ESP32 esté en modo configuración (Access Point)</li>
                        <li>Conéctate al WiFi "SistemaAcceso-XXXX"</li>
                        <li>Espera unos segundos después de activar el modo configuración</li>
                        <li>Verifica que la IP sea 192.168.4.1</li>
                    </ul>
                </div>
                <button onclick="window.loadESP32ConfigHtml()" class="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                    <i class="fas fa-redo mr-2"></i>Reintentar
                </button>
            </div>
        `;

        Swal.fire({
            icon: 'error',
            title: 'Error al cargar formulario',
            text: errorMessage
        });
    } finally {
        if (loadBtn) {
            loadBtn.disabled = false;
            loadBtn.innerHTML = '<i class="fas fa-download mr-2"></i>Cargar Formulario ESP32';
        }
    }
}

/**
 * Renderizar HTML del ESP32 y procesar formulario
 */
function renderESP32HTML(html) {
    debugLog('Renderizando HTML del ESP32');
    
    const content = document.getElementById('esp32FormContent');
    if (!content) {
        debugLog('ERROR: Contenedor de contenido no encontrado');
        return;
    }

    // Insertar HTML
    content.innerHTML = html;

    // Buscar el formulario dentro del HTML insertado
    const form = content.querySelector('#configForm');
    if (!form) {
        debugLog('WARNING: Formulario no encontrado en el HTML');
        return;
    }

    // Interceptar el submit del formulario
    form.addEventListener('submit', handleESP32FormSubmit);
    
    debugLog('Formulario ESP32 renderizado y listo');
}

/**
 * Manejar el envío del formulario del ESP32
 */
async function handleESP32FormSubmit(e) {
    e.preventDefault();
    debugLog('Formulario ESP32 enviado');
    
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.innerHTML : '';
    const resultDiv = document.getElementById('result');
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Configurando...';
    }

    if (resultDiv) {
        resultDiv.innerHTML = '<div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-4 py-3 rounded-lg"><i class="fas fa-spinner fa-spin mr-2"></i>Enviando configuración...</div>';
    }

    const configIP = document.getElementById('esp32ConfigIP')?.value || '192.168.4.1';

    try {
        debugLog('Enviando configuración al ESP32', { 
            data: { ...data, password: '***' }, // No loguear password
            ip: configIP 
        });

        const response = await apiClient.post('/esp32/config', {
            ...data,
            ip: configIP
        });

        debugLog('Respuesta del ESP32 recibida', response.data);

        if (resultDiv) {
            if (response.data.success) {
                resultDiv.innerHTML = `
                    <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg">
                        <i class="fas fa-check-circle mr-2"></i>${response.data.message || 'Configuración guardada exitosamente'}
                    </div>
                `;
                
                setTimeout(() => {
                    if (resultDiv) {
                        resultDiv.innerHTML = `
                            <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-4 py-3 rounded-lg">
                                <i class="fas fa-sync-alt fa-spin mr-2"></i>Reiniciando dispositivo... Esto puede tardar unos minutos.
                            </div>
                        `;
                    }
                }, 2000);

                Swal.fire({
                    icon: 'success',
                    title: 'Configuración exitosa',
                    text: 'El ESP32 se está reiniciando y conectando a la red WiFi. Esto puede tardar unos minutos.',
                    timer: 5000
                });
            } else {
                throw new Error(response.data.error || 'Error desconocido');
            }
        }
    } catch (error) {
        debugLog('Error al enviar configuración', { 
            error: error.message, 
            response: error.response?.data 
        });

        let errorMessage = 'Error al enviar la configuración.';
        if (error.response?.data?.error) {
            errorMessage = error.response.data.error;
        } else if (error.message) {
            errorMessage = error.message;
        }

        if (resultDiv) {
            resultDiv.innerHTML = `
                <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
                    <i class="fas fa-exclamation-circle mr-2"></i>Error: ${errorMessage}
                </div>
            `;
        }

        Swal.fire({
            icon: 'error',
            title: 'Error al configurar',
            text: errorMessage
        });
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }
}

// Exponer función globalmente para el botón de reintentar
window.loadESP32ConfigHtml = loadESP32ConfigHtml;
