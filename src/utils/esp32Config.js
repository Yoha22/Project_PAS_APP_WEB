/**
 * Configuración del dispositivo ESP32 para captura de huellas
 */

export const esp32Config = {
  // IP por defecto del ESP32
  defaultIP: '192.168.40.112',
  
  // Endpoint para registrar huella
  endpoint: '/registrarHuella',
  
  /**
   * Obtener la IP configurada del ESP32
   */
  getIP() {
    return localStorage.getItem('esp32_ip') || this.defaultIP;
  },
  
  /**
   * Configurar la IP del ESP32
   */
  setIP(ip) {
    localStorage.setItem('esp32_ip', ip);
  },
  
  /**
   * Obtener la URL completa para registrar huella
   */
  getRegisterUrl() {
    return `http://${this.getIP()}${this.endpoint}`;
  },
  
  /**
   * Validar formato de IP
   */
  isValidIP(ip) {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) return false;
    
    const parts = ip.split('.');
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }
};

