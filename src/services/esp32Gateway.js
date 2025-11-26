/**
 * Servicio unificado para comunicación con ESP32
 * Maneja tanto comunicación local como remota vía backend
 */
import apiClient from './api.js';

const esp32Gateway = {
    /**
     * Enviar comando a ESP32
     * @param {number} deviceId - ID del dispositivo
     * @param {string} command - Tipo de comando (config, fingerprint_add, fingerprint_delete, status, control, sync)
     * @param {object} payload - Datos del comando
     * @param {number} priority - Prioridad (1-10, mayor = más prioritario)
     * @returns {Promise} Respuesta del servidor
     */
    async sendCommand(deviceId, command, payload = {}, priority = 5) {
        try {
            const response = await apiClient.post(`/esp32/${deviceId}/command`, {
                command,
                payload,
                priority,
            });
            
            return response.data;
        } catch (error) {
            console.error('[ESP32-GATEWAY] Error enviando comando:', error);
            throw error;
        }
    },

    /**
     * Obtener estado del ESP32
     * @param {number} deviceId - ID del dispositivo
     * @returns {Promise} Estado del dispositivo
     */
    async getStatus(deviceId) {
        try {
            const response = await apiClient.get(`/esp32/${deviceId}/status`);
            return response.data;
        } catch (error) {
            console.error('[ESP32-GATEWAY] Error obteniendo estado:', error);
            throw error;
        }
    },

    /**
     * Configurar dispositivo remotamente
     * @param {number} deviceId - ID del dispositivo
     * @param {object} config - Configuración (ssid, password, serverUrl, useHTTPS)
     * @returns {Promise} Respuesta del servidor
     */
    async configureDevice(deviceId, config) {
        return this.sendCommand(deviceId, 'config', config, 10);
    },

    /**
     * Agregar huella remotamente
     * @param {number} deviceId - ID del dispositivo
     * @param {number} userId - ID del usuario
     * @returns {Promise} Respuesta del servidor
     */
    async addFingerprint(deviceId, userId) {
        return this.sendCommand(deviceId, 'fingerprint_add', { user_id: userId }, 8);
    },

    /**
     * Eliminar huella remotamente
     * @param {number} deviceId - ID del dispositivo
     * @param {number} fingerprintId - ID de la huella
     * @returns {Promise} Respuesta del servidor
     */
    async deleteFingerprint(deviceId, fingerprintId) {
        return this.sendCommand(deviceId, 'fingerprint_delete', { fingerprint_id: fingerprintId }, 8);
    },

    /**
     * Control remoto del dispositivo
     * @param {number} deviceId - ID del dispositivo
     * @param {string} action - Acción (relay_on, relay_off, restart, reset_wifi)
     * @returns {Promise} Respuesta del servidor
     */
    async controlDevice(deviceId, action) {
        return this.sendCommand(deviceId, 'control', { action }, 9);
    },

    /**
     * Obtener comandos pendientes
     * @param {number} deviceId - ID del dispositivo
     * @param {string} status - Estado de comandos (pending, sent, completed, failed, all)
     * @param {number} limit - Límite de resultados
     * @returns {Promise} Lista de comandos
     */
    async getCommands(deviceId, status = 'pending', limit = 50) {
        try {
            const response = await apiClient.get(`/esp32/${deviceId}/commands`, {
                params: { status, limit },
            });
            return response.data;
        } catch (error) {
            console.error('[ESP32-GATEWAY] Error obteniendo comandos:', error);
            throw error;
        }
    },

    /**
     * Capturar huella (intenta local primero, luego remoto)
     * @param {number} deviceId - ID del dispositivo
     * @param {string} deviceIp - IP local del dispositivo (opcional)
     * @returns {Promise} ID de la huella capturada
     */
    async captureFingerprint(deviceId, deviceIp = null) {
        // Primero intentar local si tenemos IP
        if (deviceIp) {
            try {
                const response = await apiClient.get('/esp32-proxy/registrar-huella', {
                    params: { ip: deviceIp },
                });
                
                if (response.data.success && response.data.idHuella) {
                    return response.data.idHuella;
                }
            } catch (error) {
                console.warn('[ESP32-GATEWAY] Error capturando huella localmente, intentando remoto:', error);
            }
        }

        // Si falla local o no hay IP, usar comando remoto
        // Nota: Esto requiere que el usuario presione el botón en el dispositivo
        const response = await this.sendCommand(deviceId, 'fingerprint_add', {}, 8);
        
        if (response.success) {
            // Esperar a que el comando se complete y obtener el ID de huella
            // TODO: Implementar polling o WebSocket para obtener resultado
            return null; // Por ahora retornamos null, se debe obtener de otra forma
        }
        
        throw new Error('Error capturando huella');
    },
};

export default esp32Gateway;

