/**
 * Detector de contexto de red para ESP32
 * Detecta si el cliente está en la red local del ESP32 (192.168.4.x)
 * y determina el mejor modo de comunicación
 */

/**
 * Obtener IP local usando WebRTC
 * @returns {Promise<string|null>} IP local o null si no se puede obtener
 */
async function getLocalIP() {
    return new Promise((resolve) => {
        const RTCPeerConnection = window.RTCPeerConnection || 
                                  window.mozRTCPeerConnection || 
                                  window.webkitRTCPeerConnection;

        if (!RTCPeerConnection) {
            resolve(null);
            return;
        }

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        const ips = [];
        const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/g;

        pc.createDataChannel('');
        
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                const match = ipRegex.exec(event.candidate.candidate);
                if (match) {
                    const ip = match[1];
                    if (ips.indexOf(ip) === -1) {
                        ips.push(ip);
                    }
                }
            } else {
                // No más candidatos
                pc.close();
                // Buscar IP en rango 192.168.4.x
                const esp32NetworkIP = ips.find(ip => ip.startsWith('192.168.4.'));
                resolve(esp32NetworkIP || ips[0] || null);
            }
        };

        pc.createOffer()
            .then(offer => pc.setLocalDescription(offer))
            .catch(() => resolve(null));

        // Timeout después de 3 segundos
        setTimeout(() => {
            pc.close();
            const esp32NetworkIP = ips.find(ip => ip.startsWith('192.168.4.'));
            resolve(esp32NetworkIP || ips[0] || null);
        }, 3000);
    });
}

/**
 * Verificar si está en la red del ESP32 (192.168.4.x)
 * @returns {Promise<boolean>}
 */
async function isInESP32Network() {
    try {
        const localIP = await getLocalIP();
        if (localIP && localIP.startsWith('192.168.4.')) {
            console.log('[NetworkDetector] IP local detectada:', localIP);
            return true;
        }

        // Método alternativo: intentar conectar directamente
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            
            const response = await fetch('http://192.168.4.1/', {
                method: 'HEAD',
                mode: 'no-cors',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            console.log('[NetworkDetector] ESP32 accesible directamente');
            return true;
        } catch (error) {
            // Si falla, probablemente no está en la red
            return false;
        }
    } catch (error) {
        console.warn('[NetworkDetector] Error detectando red:', error);
        return false;
    }
}

/**
 * Verificar si puede acceder directamente al ESP32
 * @param {string} ip - IP del ESP32 (default: 192.168.4.1)
 * @returns {Promise<{accessible: boolean, corsBlocked: boolean, error?: string}>}
 */
async function checkESP32DirectAccess(ip = '192.168.4.1') {
    try {
        // Intentar petición simple
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        try {
            const response = await fetch(`http://${ip}/`, {
                method: 'HEAD',
                mode: 'cors',
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            
            return {
                accessible: true,
                corsBlocked: false
            };
        } catch (error) {
            clearTimeout(timeoutId);
            
            // Si es error de CORS, el ESP32 es accesible pero bloqueado por CORS
            if (error.name === 'TypeError' && error.message.includes('CORS')) {
                return {
                    accessible: true,
                    corsBlocked: true,
                    error: 'CORS bloqueado'
                };
            }

            // Intentar con no-cors para verificar conectividad
            try {
                await fetch(`http://${ip}/`, {
                    method: 'HEAD',
                    mode: 'no-cors',
                    signal: controller.signal
                });
                
                return {
                    accessible: true,
                    corsBlocked: true,
                    error: 'CORS bloqueado pero accesible'
                };
            } catch (noCorsError) {
                return {
                    accessible: false,
                    corsBlocked: false,
                    error: error.message
                };
            }
        }
    } catch (error) {
        return {
            accessible: false,
            corsBlocked: false,
            error: error.message
        };
    }
}

/**
 * Verificar si hay conexión a internet
 * @returns {Promise<boolean>}
 */
async function checkInternetConnection() {
    try {
        // Intentar conectar a un servicio conocido
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        // Intentar con Google DNS o un servicio confiable
        const response = await fetch('https://www.google.com/favicon.ico', {
            method: 'HEAD',
            mode: 'no-cors',
            signal: controller.signal,
            cache: 'no-cache'
        });

        clearTimeout(timeoutId);
        return true;
    } catch (error) {
        // Si falla, probablemente no hay internet
        return false;
    }
}

/**
 * Determinar el mejor modo de comunicación
 * @param {string} esp32IP - IP del ESP32
 * @returns {Promise<{mode: 'direct'|'proxy'|'hybrid'|'unavailable', details: object}>}
 */
export async function getOptimalMode(esp32IP = '192.168.4.1') {
    console.log('[NetworkDetector] Determinando modo óptimo...');

    const [inESP32Network, directAccess, hasInternet] = await Promise.all([
        isInESP32Network(),
        checkESP32DirectAccess(esp32IP),
        checkInternetConnection()
    ]);

    const details = {
        inESP32Network,
        directAccess: directAccess.accessible,
        corsBlocked: directAccess.corsBlocked,
        hasInternet
    };

    console.log('[NetworkDetector] Estado de red:', details);

    // Si está en la red del ESP32
    if (inESP32Network || directAccess.accessible) {
        if (!directAccess.corsBlocked) {
            // Acceso directo sin problemas de CORS
            return {
                mode: 'direct',
                details: {
                    ...details,
                    reason: 'En red ESP32 y sin bloqueo CORS'
                }
            };
        } else {
            // Acceso directo pero con CORS bloqueado - usar Service Worker
            return {
                mode: 'direct',
                details: {
                    ...details,
                    reason: 'En red ESP32 pero CORS bloqueado - usar Service Worker',
                    useServiceWorker: true
                }
            };
        }
    }

    // Si hay internet, usar proxy
    if (hasInternet) {
        return {
            mode: 'proxy',
            details: {
                ...details,
                reason: 'Internet disponible, usando proxy del backend'
            }
        };
    }

    // Sin acceso ni a ESP32 ni a internet
    return {
        mode: 'unavailable',
        details: {
            ...details,
            reason: 'Sin acceso al ESP32 ni a internet'
        }
    };
}

/**
 * Detectar contexto de red completo
 * @returns {Promise<object>}
 */
export async function detectNetworkContext() {
    const localIP = await getLocalIP();
    const inESP32Network = await isInESP32Network();
    const hasInternet = await checkInternetConnection();
    const esp32Access = await checkESP32DirectAccess();

    return {
        localIP,
        inESP32Network,
        hasInternet,
        esp32Accessible: esp32Access.accessible,
        esp32CorsBlocked: esp32Access.corsBlocked,
        timestamp: new Date().toISOString()
    };
}

// Exportar funciones individuales también
export {
    getLocalIP,
    isInESP32Network,
    checkESP32DirectAccess,
    checkInternetConnection
};

