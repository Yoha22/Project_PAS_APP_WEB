/**
 * Cliente directo para comunicación con ESP32
 * Hace peticiones directas al ESP32 sin pasar por el backend
 * Maneja errores de CORS y proporciona fallbacks
 */

/**
 * Helper para logs de depuración
 */
function debugLog(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[ESP32-DIRECT] [${timestamp}] ${message}`, data || '');
}

/**
 * Obtener HTML del portal de configuración directamente del ESP32
 * @param {string} ip - IP del ESP32 (default: 192.168.4.1)
 * @param {boolean} useServiceWorker - Si usar Service Worker para bypass CORS
 * @returns {Promise<{success: boolean, html?: string, error?: string}>}
 */
export async function getConfigHtmlDirect(ip = '192.168.4.1', useServiceWorker = false) {
    debugLog('Obteniendo HTML directamente del ESP32', { ip, useServiceWorker });
    const url = `http://${ip}/`;

    try {
        if (useServiceWorker) {
            // Usar Service Worker como proxy
            debugLog('Usando Service Worker para bypass CORS');
            const response = await fetch(`/esp32-direct/get?url=${encodeURIComponent(url)}`, {
                method: 'GET',
                headers: {
                    'X-ESP32-IP': ip
                }
            });

            if (response.ok) {
                const data = await response.json();
                return {
                    success: true,
                    html: data.html || data.body
                };
            } else {
                throw new Error(`Service Worker error: ${response.status}`);
            }
        } else {
            // Intentar petición directa
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            try {
                const response = await fetch(url, {
                    method: 'GET',
                    mode: 'cors',
                    signal: controller.signal,
                    headers: {
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                    }
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    const html = await response.text();
                    debugLog('HTML obtenido exitosamente', { length: html.length });
                    return {
                        success: true,
                        html
                    };
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            } catch (fetchError) {
                clearTimeout(timeoutId);
                
                // Si es error de CORS, intentar con no-cors (limitado)
                if (fetchError.name === 'TypeError' && 
                    (fetchError.message.includes('CORS') || fetchError.message.includes('Failed to fetch'))) {
                    debugLog('CORS bloqueado, intentando con no-cors mode');
                    
                    // Con no-cors no podemos leer la respuesta, pero podemos verificar conectividad
                    try {
                        await fetch(url, {
                            method: 'HEAD',
                            mode: 'no-cors',
                            signal: controller.signal
                        });
                        
                        // Si llegamos aquí, el ESP32 es accesible pero CORS bloquea
                        return {
                            success: false,
                            error: 'CORS bloqueado. Se requiere Service Worker o modificar ESP32 para agregar headers CORS.',
                            corsBlocked: true
                        };
                    } catch (noCorsError) {
                        throw fetchError; // Re-lanzar error original
                    }
                }
                
                throw fetchError;
            }
        }
    } catch (error) {
        debugLog('Error al obtener HTML', { error: error.message });
        return {
            success: false,
            error: error.message || 'Error desconocido al conectar con el ESP32'
        };
    }
}

/**
 * Enviar configuración directamente al ESP32
 * @param {string} ip - IP del ESP32
 * @param {object} data - Datos de configuración
 * @param {boolean} useServiceWorker - Si usar Service Worker
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function postConfigDirect(ip = '192.168.4.1', data, useServiceWorker = false) {
    debugLog('Enviando configuración directamente al ESP32', { ip, data: { ...data, password: '***' } });
    const url = `http://${ip}/config`;

    try {
        if (useServiceWorker) {
            // Usar Service Worker como proxy
            debugLog('Usando Service Worker para bypass CORS');
            const formData = new URLSearchParams();
            Object.keys(data).forEach(key => {
                formData.append(key, data[key]);
            });

            const response = await fetch(`/esp32-direct/post?url=${encodeURIComponent(url)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-ESP32-IP': ip
                },
                body: formData.toString()
            });

            if (response.ok) {
                const result = await response.json();
                return {
                    success: true,
                    data: result
                };
            } else {
                const errorText = await response.text();
                throw new Error(`Service Worker error: ${response.status} - ${errorText}`);
            }
        } else {
            // Intentar petición directa
            const formData = new URLSearchParams();
            Object.keys(data).forEach(key => {
                formData.append(key, data[key]);
            });

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos para configuración

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    mode: 'cors',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: formData.toString(),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    const result = await response.json();
                    debugLog('Configuración enviada exitosamente', result);
                    return {
                        success: true,
                        data: result
                    };
                } else {
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }
            } catch (fetchError) {
                clearTimeout(timeoutId);
                
                // Si es error de CORS
                if (fetchError.name === 'TypeError' && 
                    (fetchError.message.includes('CORS') || fetchError.message.includes('Failed to fetch'))) {
                    debugLog('CORS bloqueado en POST');
                    return {
                        success: false,
                        error: 'CORS bloqueado. Se requiere Service Worker.',
                        corsBlocked: true
                    };
                }
                
                throw fetchError;
            }
        }
    } catch (error) {
        debugLog('Error al enviar configuración', { error: error.message });
        return {
            success: false,
            error: error.message || 'Error desconocido al enviar configuración'
        };
    }
}

/**
 * Activar modo configuración directamente en el ESP32
 * @param {string} ip - IP actual del ESP32 (no en modo config)
 * @param {boolean} useServiceWorker - Si usar Service Worker
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function activateConfigModeDirect(ip, useServiceWorker = false) {
    debugLog('Activando modo configuración directamente', { ip, useServiceWorker });
    const url = `http://${ip}/reconfig`;

    try {
        if (useServiceWorker) {
            const response = await fetch(`/esp32-direct/post?url=${encodeURIComponent(url)}`, {
                method: 'POST',
                headers: {
                    'X-ESP32-IP': ip
                }
            });

            if (response.ok) {
                const result = await response.json();
                return {
                    success: true,
                    data: result
                };
            } else {
                throw new Error(`Service Worker error: ${response.status}`);
            }
        } else {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    mode: 'cors',
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    const result = await response.json();
                    return {
                        success: true,
                        data: result
                    };
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            } catch (fetchError) {
                clearTimeout(timeoutId);
                
                if (fetchError.name === 'TypeError' && 
                    (fetchError.message.includes('CORS') || fetchError.message.includes('Failed to fetch'))) {
                    return {
                        success: false,
                        error: 'CORS bloqueado. Se requiere Service Worker.',
                        corsBlocked: true
                    };
                }
                
                throw fetchError;
            }
        }
    } catch (error) {
        debugLog('Error al activar modo configuración', { error: error.message });
        return {
            success: false,
            error: error.message || 'Error desconocido al activar modo configuración'
        };
    }
}

