// Importar CSS como módulo (Vite lo procesará durante el build)
import '/src/assets/css/dark-mode.css';

// Los imports DEBEN estar al principio absoluto del módulo
import { authService } from '/src/services/auth.js';
import { esp32Config } from '/src/utils/esp32Config.js';

// Log inicial
console.log('=== Script de config-esp32 iniciado ===');

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
    console.log('✅ Usuario autenticado, cargando página de configuración ESP32...');
    initializeConfig();
}

// Función para inicializar la página
function initializeConfig() {
    // Cargar IP actual
    const esp32IPInput = document.getElementById('esp32IP');
    if (esp32IPInput) {
        esp32IPInput.value = esp32Config.getIP();
    }

    // Manejar envío del formulario
    const configForm = document.getElementById('configForm');
    if (configForm) {
        configForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const submitBtn = configForm.querySelector('button[type="submit"]');
            const ip = esp32IPInput.value.trim();
            
            if (esp32Config.isValidIP(ip)) {
                esp32Config.setIP(ip);
                Swal.fire({
                    icon: 'success',
                    title: 'Configuración guardada',
                    text: `IP del ESP32 configurada: ${ip}`,
                    timer: 2000
                }).then(() => {
                    window.location.href = '/usuarios.html';
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'IP inválida',
                    text: 'Por favor ingresa una dirección IP válida (ej: 192.168.1.100)'
                });
            }
        });
    }
}

