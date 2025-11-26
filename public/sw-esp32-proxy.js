/**
 * Service Worker para proxy local con ESP32
 * Permite hacer peticiones al ESP32 sin problemas de CORS
 * Intercepta peticiones a /esp32-direct/* y las redirige al ESP32 real
 */

const CACHE_NAME = 'esp32-proxy-v1';
const ESP32_CONFIG_IP = '192.168.4.1';

// Instalar Service Worker
self.addEventListener('install', (event) => {
    console.log('[SW-ESP32] Service Worker instalado');
    self.skipWaiting(); // Activar inmediatamente
});

// Activar Service Worker
self.addEventListener('activate', (event) => {
    console.log('[SW-ESP32] Service Worker activado');
    event.waitUntil(self.clients.claim()); // Tomar control de todas las páginas
});

// Interceptar peticiones
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Solo interceptar peticiones a /esp32-direct/*
    if (url.pathname.startsWith('/esp32-direct/')) {
        event.respondWith(handleESP32Request(event.request));
    }
    // Dejar pasar todas las demás peticiones normalmente
});

/**
 * Manejar peticiones al ESP32
 */
async function handleESP32Request(request) {
    const url = new URL(request.url);
    const method = request.method;
    
    console.log('[SW-ESP32] Interceptando petición:', {
        path: url.pathname,
        method: method
    });

    try {
        // Extraer IP del ESP32 de los headers o parámetros
        const esp32IP = request.headers.get('X-ESP32-IP') || 
                       url.searchParams.get('ip') || 
                       ESP32_CONFIG_IP;
        
        // Determinar URL real del ESP32
        let esp32Url;
        
        if (url.pathname.includes('/get')) {
            // GET request - obtener HTML
            const targetUrl = url.searchParams.get('url') || `http://${esp32IP}/`;
            esp32Url = targetUrl;
        } else if (url.pathname.includes('/post')) {
            // POST request - enviar datos
            const targetUrl = url.searchParams.get('url') || `http://${esp32IP}/config`;
            esp32Url = targetUrl;
        } else {
            throw new Error('Ruta no reconocida');
        }

        console.log('[SW-ESP32] Redirigiendo a ESP32:', esp32Url);

        // Preparar petición al ESP32
        const esp32RequestInit = {
            method: method,
            headers: {},
            cache: 'no-cache'
        };

        // Si es POST, copiar el body
        if (method === 'POST') {
            const body = await request.text();
            esp32RequestInit.body = body;
            
            // Copiar Content-Type si existe
            const contentType = request.headers.get('Content-Type');
            if (contentType) {
                esp32RequestInit.headers['Content-Type'] = contentType;
            }
        }

        // Hacer petición al ESP32 (Service Workers no tienen restricciones CORS)
        const esp32Response = await fetch(esp32Url, esp32RequestInit);

        console.log('[SW-ESP32] Respuesta del ESP32:', {
            status: esp32Response.status,
            statusText: esp32Response.statusText
        });

        // Leer el cuerpo de la respuesta
        const responseBody = await esp32Response.text();
        
        // Determinar Content-Type
        let contentType = esp32Response.headers.get('Content-Type') || 'application/json';
        
        // Si la respuesta parece ser HTML
        if (responseBody.trim().startsWith('<!DOCTYPE') || responseBody.trim().startsWith('<html')) {
            contentType = 'text/html; charset=utf-8';
        }
        
        // Si la respuesta parece ser JSON
        try {
            JSON.parse(responseBody);
            contentType = 'application/json';
        } catch (e) {
            // No es JSON, mantener el tipo detectado
        }

        // Crear respuesta para el cliente
        const response = new Response(
            method === 'GET' && contentType.includes('text/html')
                ? JSON.stringify({ html: responseBody, success: true })
                : responseBody,
            {
                status: esp32Response.status,
                statusText: esp32Response.statusText,
                headers: {
                    'Content-Type': contentType,
                    'X-ESP32-Proxy': 'true',
                    'Access-Control-Allow-Origin': '*', // Permitir CORS desde cualquier origen
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, X-ESP32-IP'
                }
            }
        );

        return response;

    } catch (error) {
        console.error('[SW-ESP32] Error en proxy:', error);
        
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message || 'Error en Service Worker proxy'
            }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'X-ESP32-Proxy': 'true',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        );
    }
}

// Manejar mensajes del cliente
self.addEventListener('message', (event) => {
    console.log('[SW-ESP32] Mensaje recibido:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

