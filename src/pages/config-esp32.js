// Importar CSS como módulo (Vite lo procesará durante el build)
import '/src/assets/css/dark-mode.css';

// Los imports DEBEN estar al principio absoluto del módulo
import { authService } from '/src/services/auth.js';
import { esp32Config } from '/src/utils/esp32Config.js';
import { themeService } from '/src/services/theme.js';
import apiClient from '/src/services/api.js';
import { initNavigation } from '/src/components/Navigation.js';
import { getOptimalMode, detectNetworkContext, isInESP32Network } from '/src/utils/NetworkDetector.js';
import { getConfigHtmlDirect, postConfigDirect, activateConfigModeDirect } from '/src/services/esp32DirectClient.js';

// Log inicial
console.log('[ESP32-CONFIG] Script de config-esp32 iniciado');

// Estado global del modo de comunicación
let currentMode = null;
let useServiceWorker = false;
let serviceWorkerRegistered = false;

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

/**
 * Registrar Service Worker para bypass de CORS
 */
async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        debugLog('Service Worker no soportado en este navegador');
        return false;
    }

    // Verificar si ya hay un Service Worker activo
    try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        const swRegistration = registrations.find(reg => 
            reg.active?.scriptURL?.includes('sw-esp32-proxy.js')
        );
        
        if (swRegistration && swRegistration.active) {
            debugLog('Service Worker ya está registrado y activo', {
                state: swRegistration.active.state,
                scriptURL: swRegistration.active.scriptURL
            });
            serviceWorkerRegistered = true;
            return true;
        }
    } catch (err) {
        debugLog('Error verificando Service Worker existente', err);
    }

    if (serviceWorkerRegistered) {
        debugLog('Service Worker marcado como registrado');
        return true;
    }

    try {
        const registration = await navigator.serviceWorker.register('/sw-esp32-proxy.js', {
            scope: '/'
        });

        debugLog('Service Worker registrado exitosamente', {
            scope: registration.scope,
            active: registration.active?.state,
            installing: registration.installing?.state,
            waiting: registration.waiting?.state
        });

        // Esperar a que el Service Worker esté activo
        if (registration.installing) {
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Timeout esperando Service Worker'));
                }, 10000);
                
                registration.installing.addEventListener('statechange', () => {
                    if (registration.installing.state === 'activated') {
                        clearTimeout(timeout);
                        resolve();
                    } else if (registration.installing.state === 'redundant') {
                        clearTimeout(timeout);
                        reject(new Error('Service Worker se volvió redundante'));
                    }
                });
            });
        } else if (registration.waiting) {
            // Si está esperando, forzar activación
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Verificar que realmente esté activo
        if (registration.active && registration.active.state === 'activated') {
            serviceWorkerRegistered = true;
            debugLog('Service Worker confirmado como activo');
            return true;
        }

        serviceWorkerRegistered = true;
        return true;
    } catch (error) {
        debugLog('Error al registrar Service Worker', { error: error.message, stack: error.stack });
        return false;
    }
}

/**
 * Detectar y configurar modo óptimo de comunicación
 */
async function detectAndSetMode() {
    debugLog('Detectando modo óptimo de comunicación...');
    
    const configIP = document.getElementById('esp32ConfigIP')?.value || '192.168.4.1';
    const optimalMode = await getOptimalMode(configIP);
    
    currentMode = optimalMode.mode;
    
    // Si está en modo directo, SIEMPRE intentar usar Service Worker para evitar CORS
    if (currentMode === 'direct' || currentMode === 'hybrid') {
        debugLog('Modo directo detectado - registrando Service Worker para evitar CORS');
        
        // Asegurar que Service Worker esté registrado
        const swRegistered = await registerServiceWorker();
        useServiceWorker = swRegistered; // Usar SW si se registró exitosamente
        
        if (!swRegistered) {
            debugLog('WARNING: Service Worker no disponible, pueden haber problemas de CORS');
            // Intentar de todas formas sin Service Worker
            useServiceWorker = false;
        }
        
        // Mostrar mensaje informativo si está en modo directo
        if (currentMode === 'direct') {
            const instructionsEl = document.getElementById('directModeInstructions');
            if (instructionsEl) {
                instructionsEl.classList.remove('hidden');
            }
            
            const statusEl = document.getElementById('esp32ConnectionStatus');
            if (statusEl) {
                statusEl.innerHTML = `
                    <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <p class="text-yellow-800 dark:text-yellow-200 font-semibold mb-2">
                            <i class="fas fa-wifi mr-2"></i>Modo Directo Activo
                        </p>
                        <p class="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
                            Estás conectado directamente a la red WiFi del ESP32. El sistema funcionará sin necesidad de internet.
                        </p>
                        <p class="text-xs text-yellow-600 dark:text-yellow-400">
                            <strong>Nota:</strong> Asegúrate de estar conectado al WiFi "SistemaAcceso-XXXX" para poder configurar el dispositivo.
                        </p>
                    </div>
                `;
            }
        } else {
            const instructionsEl = document.getElementById('directModeInstructions');
            if (instructionsEl) {
                instructionsEl.classList.add('hidden');
            }
        }
    } else {
        useServiceWorker = optimalMode.details.useServiceWorker || false;
    }

    debugLog('Modo óptimo determinado', {
        mode: currentMode,
        useServiceWorker,
        details: optimalMode.details
    });

    // Actualizar indicador visual
    updateModeIndicator(currentMode, optimalMode.details);

    return optimalMode;
}

/**
 * Actualizar indicador visual del modo activo
 */
function updateModeIndicator(mode, details) {
    const indicator = document.getElementById('modeIndicator');
    if (!indicator) return;

    const modeText = {
        'direct': 'Modo Directo',
        'proxy': 'Modo Proxy',
        'hybrid': 'Modo Híbrido',
        'unavailable': 'Sin Conexión'
    };

    const modeColors = {
        'direct': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700',
        'proxy': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700',
        'hybrid': 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700',
        'unavailable': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700'
    };

    const modeIcons = {
        'direct': 'fa-wifi',
        'proxy': 'fa-cloud',
        'hybrid': 'fa-network-wired',
        'unavailable': 'fa-exclamation-triangle'
    };

    indicator.className = `inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${modeColors[mode] || modeColors.unavailable}`;
    indicator.innerHTML = `
        <i class="fas ${modeIcons[mode] || modeIcons.unavailable} mr-2"></i>
        ${modeText[mode] || 'Desconocido'}
    `;

    // Agregar tooltip con detalles
    if (details && details.reason) {
        indicator.title = details.reason;
    }
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

    // Intentar registrar Service Worker temprano (por si acaso se necesita)
    if ('serviceWorker' in navigator) {
        registerServiceWorker().catch(err => {
            debugLog('Service Worker no pudo registrarse inicialmente', err);
        });
    }

    // Registrar Service Worker PRIMERO (funciona offline)
    debugLog('Inicializando: Registrando Service Worker primero...');
    await registerServiceWorker().catch(err => {
        debugLog('Service Worker no disponible, continuando sin él', err);
    });

    // Detectar modo óptimo al inicializar
    await detectAndSetMode();

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
                // Redetectar modo después de cambiar IP
                detectAndSetMode();
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
        checkConnectionBtn.addEventListener('click', async () => {
            await checkESP32Connection();
            await detectAndSetMode(); // Redetectar después de verificar
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

    // Verificar conexión al cargar la página (primero detectar modo, luego verificar)
    setTimeout(async () => {
        await detectAndSetMode(); // Primero detectar modo para configurar Service Worker
        await checkESP32Connection(); // Luego verificar conexión
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

    // Detectar contexto de red
    const networkContext = await detectNetworkContext();
    debugLog('Contexto de red detectado', networkContext);

    // Si detecta que está en la red del ESP32, forzar uso de Service Worker
    const isInESP32Network = await isInESP32Network();
    if (isInESP32Network) {
        debugLog('Detectado en red del ESP32 - forzando modo directo con Service Worker');
        currentMode = 'direct';
        await registerServiceWorker(); // Asegurar que esté registrado
        useServiceWorker = true;
        updateModeIndicator('direct', { useServiceWorker: true });
    }

    // Intentar primero con IP de configuración
    try {
        debugLog('Intentando conectar con ESP32 en modo configuración', { 
            ip: configIP, 
            useServiceWorker, 
            currentMode 
        });
        
        // SIEMPRE usar Service Worker si está disponible para evitar CORS
        const shouldUseSW = useServiceWorker || serviceWorkerRegistered;
        const directResult = await getConfigHtmlDirect(configIP, shouldUseSW);
        
        if (directResult.success) {
            statusDiv.className = 'mb-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800';
            statusIcon.className = 'fas fa-check-circle text-green-500 mr-2';
            statusText.textContent = `ESP32 accesible en modo configuración (${configIP}) - Modo: ${currentMode || 'Directo'}`;
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
    if (esp32IP && esp32IP !== configIP && currentMode !== 'direct') {
        try {
            debugLog('Intentando conectar con ESP32 en IP normal', { ip: esp32IP, mode: currentMode });
            
            // Solo intentar proxy si NO estamos en modo directo
            if (currentMode !== 'direct') {
                try {
                    const response = await apiClient.get('/esp32/config-html', {
                        params: { ip: esp32IP }
                    });

                    if (response.data.success) {
                        statusDiv.className = 'mb-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800';
                        statusIcon.className = 'fas fa-info-circle text-blue-500 mr-2';
                        statusText.textContent = `ESP32 accesible en IP normal (${esp32IP}) vía proxy. Usa "Activar Modo Configuración" para configurarlo.`;
                        debugLog('ESP32 encontrado en IP normal vía proxy', { ip: esp32IP });
                        if (checkBtn) {
                            checkBtn.disabled = false;
                            checkBtn.innerHTML = '<i class="fas fa-satellite-dish mr-2"></i>Verificar Conexión';
                        }
                        return;
                    } else {
                        throw new Error(response.data.error);
                    }
                } catch (proxyError) {
                    // Si el proxy falla, puede ser que no haya internet
                    debugLog('Proxy no disponible', { error: proxyError.message });
                    // Continuar para mostrar mensaje
                }
            }
            
            // Si llegamos aquí, el proxy falló o estamos en modo directo
            statusDiv.className = 'mb-4 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800';
            statusIcon.className = 'fas fa-exclamation-triangle text-yellow-500 mr-2';
            statusText.innerHTML = `
                <div>
                    <p class="mb-2">No se pudo verificar vía proxy. Puede que no haya internet.</p>
                    <p class="text-xs mt-2"><strong>Para configurar el ESP32:</strong></p>
                    <ol class="list-decimal list-inside text-xs ml-2">
                        <li>Conecta tu dispositivo a la red WiFi "SistemaAcceso-XXXX"</li>
                        <li>Vuelve a esta página y haz clic en "Verificar Conexión"</li>
                    </ol>
                </div>
            `;
        } catch (error) {
            statusDiv.className = 'mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800';
            statusIcon.className = 'fas fa-times-circle text-red-500 mr-2';
            statusText.innerHTML = `
                <div>
                    <p class="mb-2">No se pudo conectar con el ESP32 en modo configuración.</p>
                    <p class="text-xs mt-2"><strong>Instrucciones:</strong></p>
                    <ol class="list-decimal list-inside text-xs ml-2">
                        <li>Asegúrate de que el ESP32 esté encendido y en modo configuración (red "SistemaAcceso-XXXX")</li>
                        <li>Conecta tu dispositivo a la red WiFi "SistemaAcceso-XXXX"</li>
                        <li>Verifica que la IP de configuración sea 192.168.4.1</li>
                        <li>Vuelve a hacer clic en "Verificar Conexión"</li>
                    </ol>
                </div>
            `;
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

        debugLog('Enviando petición para activar modo configuración', { ip: esp32IP, mode: currentMode });
        
        let response;
        
        // Para activar modo config, generalmente necesitamos el backend porque el ESP32 está en IP normal
        // Pero intentemos directo primero si está en modo hybrid
        if (currentMode === 'direct') {
            debugLog('Modo directo activo, pero activar modo config requiere IP normal - usando proxy');
            // En modo directo, el ESP32 ya está en modo config, no necesitamos activarlo
            Swal.fire({
                icon: 'info',
                title: 'ESP32 ya en modo configuración',
                text: 'El ESP32 parece estar ya en modo configuración. Puedes cargar el formulario directamente.'
            });
            return;
        }
        
        // Usar proxy del backend para activar modo config (requiere internet)
        debugLog('Usando proxy del backend para activar modo configuración (requiere internet)');
        response = await apiClient.post('/esp32/activate-config-mode', {
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
            
            // Redetectar modo después de activar
            setTimeout(() => {
                detectAndSetMode();
            }, 3000);
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
    debugLog('Cargando HTML del ESP32...', { mode: currentMode, useServiceWorker });
    
    const container = document.getElementById('esp32ConfigContainer');
    const content = document.getElementById('esp32FormContent');
    const loadBtn = document.getElementById('loadConfigHtmlBtn');
    
    if (!container || !content) {
        debugLog('ERROR: Contenedores no encontrados');
        return;
    }

    // Redetectar modo antes de cargar
    await detectAndSetMode();

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
        debugLog('Solicitando HTML del ESP32', { ip: configIP, mode: currentMode, useServiceWorker });
        
        let result;
        
        // Si está en modo directo, NO usar el backend en absoluto
        if (currentMode === 'direct' || currentMode === 'hybrid') {
            debugLog('Usando modo directo para cargar HTML (SIN backend)');
            
            // Si detecta que está en la red del ESP32, SIEMPRE usar Service Worker
            const inESP32Net = await isInESP32Network();
            if (inESP32Net) {
                debugLog('Detectado en red ESP32 - forzando Service Worker');
                currentMode = 'direct';
                await registerServiceWorker();
                useServiceWorker = true;
            }
            
            // Asegurar que Service Worker esté registrado si es necesario
            if (!useServiceWorker && serviceWorkerRegistered) {
                useServiceWorker = true;
            }
            
            if (!useServiceWorker) {
                debugLog('Intentando registrar Service Worker antes de cargar HTML');
                const swRegistered = await registerServiceWorker();
                if (swRegistered) {
                    useServiceWorker = true;
                    debugLog('Service Worker registrado exitosamente');
                }
            }
            
            // FORZAR uso de Service Worker para evitar CORS en modo directo
            const shouldUseSW = useServiceWorker || serviceWorkerRegistered;
            result = await getConfigHtmlDirect(configIP, shouldUseSW);
            
            // Si falla por CORS y no estamos usando Service Worker, intentar registrarlo
            if (!result.success && result.corsBlocked && !useServiceWorker) {
                debugLog('CORS bloqueado, intentando registrar Service Worker y reintentar');
                const swRegistered = await registerServiceWorker();
                if (swRegistered) {
                    useServiceWorker = true;
                    result = await getConfigHtmlDirect(configIP, true);
                }
            }
            
            // Si el modo directo falla y estamos en modo hybrid, intentar proxy solo si hay internet
            if (!result.success && currentMode === 'hybrid') {
                debugLog('Modo directo falló, verificando si hay internet para usar proxy');
                const { checkInternetConnection } = await import('/src/utils/NetworkDetector.js');
                const hasInternet = await checkInternetConnection();
                
                if (hasInternet) {
                    debugLog('Internet disponible, usando proxy como fallback');
                    try {
                        const response = await apiClient.get('/esp32/config-html', {
                            params: { ip: configIP }
                        });
                        if (response.data.success) {
                            result = { success: true, html: response.data.html };
                        }
                    } catch (proxyError) {
                        debugLog('Proxy también falló', proxyError);
                        throw new Error('No se pudo cargar el formulario ni vía directo ni vía proxy. Verifica tu conexión.');
                    }
                } else {
                    throw new Error('No hay conexión a internet y el modo directo falló. Asegúrate de estar conectado a la red del ESP32.');
                }
            }
        } else {
            // Usar proxy del backend (requiere internet)
            debugLog('Usando proxy del backend para cargar HTML (requiere internet)');
            const response = await apiClient.get('/esp32/config-html', {
                params: { ip: configIP }
            });

            if (response.data.success && response.data.html) {
                result = { success: true, html: response.data.html };
            } else {
                throw new Error(response.data.error || 'No se pudo obtener el HTML');
            }
        }

        debugLog('HTML recibido', { 
            success: result.success,
            htmlLength: result.html?.length || 0 
        });

        if (result.success && result.html) {
            renderESP32HTML(result.html);
        } else {
            throw new Error(result.error || 'No se pudo obtener el HTML');
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
                        <li>Si estás en la red del ESP32, el sistema debería detectarlo automáticamente</li>
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
    debugLog('Formulario ESP32 enviado', { mode: currentMode, useServiceWorker });
    
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
            ip: configIP,
            mode: currentMode,
            useServiceWorker
        });

        let result;
        
        // Si está en modo directo, NO usar el backend en absoluto
        if (currentMode === 'direct' || currentMode === 'hybrid') {
            debugLog('Usando modo directo para enviar configuración (SIN backend)');
            
            // Asegurar que Service Worker esté registrado
            if (!useServiceWorker) {
                debugLog('Intentando registrar Service Worker antes de enviar');
                const swRegistered = await registerServiceWorker();
                if (swRegistered) {
                    useServiceWorker = true;
                }
            }
            
            result = await postConfigDirect(configIP, data, useServiceWorker);
            
            // Si falla por CORS y no estamos usando Service Worker, intentar registrarlo
            if (!result.success && result.corsBlocked && !useServiceWorker) {
                debugLog('CORS bloqueado, intentando registrar Service Worker y reintentar');
                const swRegistered = await registerServiceWorker();
                if (swRegistered) {
                    useServiceWorker = true;
                    result = await postConfigDirect(configIP, data, true);
                }
            }
            
            // Si el modo directo falla y estamos en modo hybrid, intentar proxy solo si hay internet
            if (!result.success && currentMode === 'hybrid') {
                debugLog('Modo directo falló, verificando si hay internet para usar proxy');
                const { checkInternetConnection } = await import('/src/utils/NetworkDetector.js');
                const hasInternet = await checkInternetConnection();
                
                if (hasInternet) {
                    debugLog('Internet disponible, usando proxy como fallback');
                    try {
                        const response = await apiClient.post('/esp32/config', {
                            ...data,
                            ip: configIP
                        });
                        result = { success: response.data.success, data: response.data };
                    } catch (proxyError) {
                        debugLog('Proxy también falló', proxyError);
                        throw new Error('No se pudo enviar la configuración ni vía directo ni vía proxy.');
                    }
                } else {
                    throw new Error('No hay conexión a internet y el modo directo falló. Asegúrate de estar conectado a la red del ESP32 y que el Service Worker esté activo.');
                }
            }
        } else {
            // Usar proxy del backend (requiere internet)
            debugLog('Usando proxy del backend para enviar configuración (requiere internet)');
            const response = await apiClient.post('/esp32/config', {
                ...data,
                ip: configIP
            });
            result = { success: response.data.success, data: response.data };
        }

        debugLog('Respuesta del ESP32 recibida', result);

        if (resultDiv) {
            if (result.success) {
                const message = result.data?.message || 'Configuración guardada exitosamente';
                resultDiv.innerHTML = `
                    <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg">
                        <i class="fas fa-check-circle mr-2"></i>${message}
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
                throw new Error(result.error || 'Error desconocido');
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
