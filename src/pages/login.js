// Importar CSS como módulo (Vite lo procesará durante el build)
import '/src/assets/css/main.css';
import '/src/assets/css/sty.css';
import '/src/assets/css/dark-mode.css';

// Manejo global de errores para evitar que la página quede en blanco
window.addEventListener('error', (event) => {
    console.error('❌ Error global capturado:', event.error);
    console.error('Archivo:', event.filename);
    console.error('Línea:', event.lineno, 'Columna:', event.colno);
    console.error('Mensaje:', event.message);
    // NO mostrar alertas que bloqueen - solo loguear
    // La página debe seguir funcionando incluso con errores
    // Prevenir que el error se propague y detenga la ejecución
    event.preventDefault();
});

// Manejar errores de promesas no capturadas
window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Promesa rechazada no manejada:', event.reason);
    // NO detener la ejecución - solo loguear
    event.preventDefault(); // Prevenir que el error se propague
});

// Los imports DEBEN estar al principio absoluto del módulo
import { authService } from '/src/services/auth.js';
import { themeService } from '/src/services/theme.js';
import apiClient from '/src/services/api.js';
import { checkBackendHealth, isNetworkError } from '/src/utils/ui-helpers.js';

// Log inicial para verificar que el script se ejecuta
console.log('=== Script de login iniciado ===');
console.log('Timestamp:', new Date().toISOString());

// Verificar que los módulos se cargaron correctamente
if (!authService || !themeService || !apiClient) {
    console.error('❌ ERROR CRÍTICO: No se pudieron cargar los módulos necesarios');
    console.error('La página puede no funcionar correctamente');
    // NO detener la ejecución - dejar que la página se muestre
}

console.log('✅ Módulos cargados:', {
    authService: !!authService,
    themeService: !!themeService,
    apiClient: !!apiClient
});

// Verificar la URL base de la API
if (apiClient && apiClient.defaults) {
    console.log('🌐 API Base URL configurada:', apiClient.defaults.baseURL);
    console.log('🔧 Variable de entorno VITE_API_URL:', import.meta.env.VITE_API_URL || 'No definida');
    console.log('🔍 Modo de desarrollo:', import.meta.env.DEV ? 'Sí' : 'No');
    console.log('🔍 Modo de producción:', import.meta.env.PROD ? 'Sí' : 'No');
    
    // Diagnóstico completo
    console.group('📊 Diagnóstico de Variables de Entorno');
    console.log('VITE_API_URL:', import.meta.env.VITE_API_URL || '❌ NO DEFINIDA');
    console.log('DEV:', import.meta.env.DEV);
    console.log('PROD:', import.meta.env.PROD);
    console.log('MODE:', import.meta.env.MODE);
    console.log('Base URL final:', apiClient.defaults.baseURL);
    console.log('Todas las variables VITE_*:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));
    console.groupEnd();
    
    // Advertencia si VITE_API_URL no está definida en producción
    if (!import.meta.env.DEV && !import.meta.env.VITE_API_URL) {
        console.warn('⚠️ ADVERTENCIA: VITE_API_URL no está definida en producción');
        console.warn('   Esto significa que la variable no se pasó durante el build de Docker');
        console.warn('   Verifica en Render > Environment que VITE_API_URL esté configurada');
        console.warn('   URL actual que se usará:', apiClient.defaults.baseURL);
    }
} else {
    console.error('❌ apiClient no está configurado correctamente');
}

// Inicializar servicio de tema (solo si está disponible)
if (themeService) {
    document.addEventListener('DOMContentLoaded', () => {
        try {
            themeService.init();
            // Actualizar icono después de inicializar
            setTimeout(() => {
                const themeIcon = document.getElementById('themeIcon');
                if (themeIcon) {
                    const isDark = document.documentElement.classList.contains('dark');
                    if (isDark) {
                        themeIcon.classList.remove('fa-moon');
                        themeIcon.classList.add('fa-sun');
                    } else {
                        themeIcon.classList.remove('fa-sun');
                        themeIcon.classList.add('fa-moon');
                    }
                }
            }, 100);
        } catch (error) {
            console.error('Error inicializando tema:', error);
            // Continuar sin tema - no es crítico
        }
    });
}

let isRegisterMode = false;
let checkRegisterModeExecuted = false; // Bandera para evitar ejecución duplicada

// Verificar si es modo registro
async function checkRegisterMode() {
    // Evitar ejecución duplicada
    if (checkRegisterModeExecuted) {
        console.log('checkRegisterMode ya se ejecutó, omitiendo...');
        return;
    }
    checkRegisterModeExecuted = true;

    // Si no hay apiClient o authService, no intentar verificar
    if (!apiClient || !authService) {
        console.warn('⚠️ apiClient o authService no están disponibles - omitiendo verificación de modo registro');
        console.warn('   La página seguirá funcionando en modo login por defecto');
        isRegisterMode = false;
        return;
    }
    
    try {
        console.log('Verificando modo registro...');
        const baseURL = apiClient.defaults?.baseURL || 'no disponible';
        console.log('API Base URL:', baseURL);
        console.log('Ruta:', '/auth/check-admin');
        
        // Usar timeout corto para no bloquear la página
        const response = await apiClient.get('/auth/check-admin', { timeout: 5000 });
        console.log('Respuesta recibida:', response);
        
        const data = response.data;
        isRegisterMode = !data.exists;
        console.log('Modo registro:', isRegisterMode);
        
        if (isRegisterMode) {
            document.getElementById('title').textContent = 'Registrar Admin';
            document.getElementById('formTitle').textContent = 'Registrar Administrador';
            document.getElementById('formSubtitle').textContent = 'Crea tu cuenta de administrador';
            document.getElementById('submitText').textContent = 'Registrar';
            document.getElementById('registerFields').style.display = 'block';
            document.getElementById('telefono').required = true;
            document.getElementById('codigo').required = true;
        }
    } catch (error) {
        // No mostrar error si es un error de red - es normal si el backend está inactivo
        if (isNetworkError(error)) {
            console.warn('⚠️ Backend no disponible para verificar modo registro (esto es normal si está inactivo)');
        } else {
            console.warn('Error verificando modo registro:', error.message);
        }
        
        // Continuar en modo login por defecto
        isRegisterMode = false;
    }
}

// Manejar envío del formulario - intentar inicializar incluso si hay errores
function initializeForm() {
    try {
        const authForm = document.getElementById('authForm');
        if (!authForm) {
            console.warn('⚠️ Formulario de autenticación no encontrado, reintentando...');
            // Reintentar después de un breve delay
            setTimeout(initializeForm, 100);
            return;
        }

        if (!authService) {
            console.error('❌ authService no está disponible');
            // Mostrar mensaje de error pero permitir que la página se muestre
            authForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const swalAvailable = typeof Swal !== 'undefined';
                if (swalAvailable) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Los servicios de autenticación no están disponibles. Por favor, recarga la página.'
                    });
                } else {
                    alert('Error: Los servicios de autenticación no están disponibles. Por favor, recarga la página.');
                }
            });
            return;
        }

        authForm.addEventListener('submit', async (e) => {
            try {
                e.preventDefault();
                
                if (!authService) {
                    const swalAvailable = typeof Swal !== 'undefined';
                    if (swalAvailable) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Los servicios de autenticación no están disponibles. Por favor, recarga la página.'
                        });
                    } else {
                        alert('Error: Los servicios de autenticación no están disponibles. Por favor, recarga la página.');
                    }
                    return;
                }
            
                const formData = {
                    correo: document.getElementById('correo').value,
                    password: document.getElementById('password').value,
                };

                if (isRegisterMode) {
                    formData.telefono = document.getElementById('telefono').value;
                    formData.codigo = document.getElementById('codigo').value;
                }

                const submitBtn = document.getElementById('submitBtn');
                const originalText = submitBtn ? submitBtn.innerHTML : '';
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Procesando...';
                }

                try {
                    let result;
                    if (isRegisterMode) {
                        result = await authService.register(formData);
                    } else {
                        result = await authService.login(formData);
                    }

                    console.log('✅ Resultado del login/registro:', result);
                    console.log('✅ result.success:', result?.success);
                    console.log('✅ Token guardado:', !!localStorage.getItem('auth_token'));

                    if (result && result.success) {
                        console.log('✅ Login exitoso, mostrando mensaje y redirigiendo...');
                        
                        // Mostrar mensaje de éxito
                        try {
                            const swalAvailable = typeof Swal !== 'undefined';
                            if (swalAvailable) {
                                await Swal.fire({
                                    icon: 'success',
                                    title: 'Éxito',
                                    text: result.message || 'Operación exitosa',
                                    timer: 1500,
                                    showConfirmButton: false
                                });
                            }
                        } catch (swalError) {
                            console.warn('⚠️ Error con SweetAlert, continuando con redirección:', swalError);
                        }
                        
                        // Redirigir al dashboard
                        console.log('🔄 Redirigiendo a dashboard...');
                        window.location.href = '/dashboard.html';
                    } else {
                        console.error('❌ Login falló - result.success es false o undefined');
                        console.error('Result completo:', result);
                        
                        const swalAvailable = typeof Swal !== 'undefined';
                        if (swalAvailable) {
                            Swal.fire({
                                icon: 'error',
                                title: 'Error',
                                text: result?.message || 'Ocurrió un error al iniciar sesión'
                            });
                        } else {
                            alert(result?.message || 'Ocurrió un error al iniciar sesión');
                        }
                    }
                } catch (error) {
                    console.error('Error completo:', error);
                    console.error('Detalles del error:', {
                        message: error.message,
                        code: error.code,
                        response: error.response ? {
                            status: error.response.status,
                            statusText: error.response.statusText,
                            data: error.response.data
                        } : null,
                        request: error.request ? {
                            responseURL: error.request.responseURL,
                            status: error.request.status
                        } : null,
                        config: error.config ? {
                            method: error.config.method,
                            url: error.config.url,
                            baseURL: error.config.baseURL,
                            fullURL: error.config.baseURL 
                                ? `${error.config.baseURL}/${error.config.url || ''}`.replace(/\/+/g, '/').replace(':/', '://')
                                : error.config.url
                        } : null
                    });
                    
                    // Usar el mensaje de usuario del error si está disponible (viene del interceptor)
                    let errorMessage = error.userMessage || 'Ocurrió un error al procesar la solicitud';
                    
                    // Si es un error de red, proporcionar mensaje más específico
                    if (isNetworkError(error)) {
                        const attemptedURL = error.config?.baseURL 
                            ? `${error.config.baseURL}/${error.config.url || ''}`.replace(/\/+/g, '/').replace(':/', '://')
                            : error.config?.url || 'URL desconocida';
                        
                        errorMessage = `No se pudo conectar con el servidor en: ${attemptedURL}. `;
                        errorMessage += 'El backend puede estar inactivo (normal en Render free tier). ';
                        errorMessage += 'Espera unos segundos y vuelve a intentar.';
                        
                        console.error('❌ Error de red detectado');
                        console.error('URL intentada:', attemptedURL);
                        console.error('Base URL configurada:', apiClient.defaults?.baseURL);
                        console.error('VITE_API_URL:', import.meta.env.VITE_API_URL || 'NO DEFINIDA');
                    } else if (error.response) {
                        // El servidor respondió con un error
                        errorMessage = error.response.data?.message 
                            || error.response.data?.error 
                            || errorMessage
                            || `Error ${error.response.status}: ${error.response.statusText}`;
                    } else if (!error.userMessage) {
                        // Error al configurar la petición o error desconocido
                        errorMessage = error.message || errorMessage;
                    }
                    
                    const swalAvailable = typeof Swal !== 'undefined';
                    if (swalAvailable) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: errorMessage
                        });
                    } else {
                        alert(errorMessage);
                    }
                } finally {
                    const submitBtn = document.getElementById('submitBtn');
                    if (submitBtn && originalText) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = originalText;
                    }
                }
            } catch (formError) {
                console.error('❌ Error en el manejador del formulario:', formError);
                const submitBtn = document.getElementById('submitBtn');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    const originalText = submitBtn.getAttribute('data-original-text') || '<i class="fas fa-sign-in-alt mr-2"></i><span id="submitText">Iniciar Sesión</span>';
                    submitBtn.innerHTML = originalText;
                }
                const swalAvailable = typeof Swal !== 'undefined';
                if (swalAvailable) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Ocurrió un error inesperado. Por favor, intenta nuevamente.'
                    });
                } else {
                    alert('Ocurrió un error inesperado. Por favor, intenta nuevamente.');
                }
            }
        });
    } catch (initError) {
        console.error('❌ Error inicializando formulario:', initError);
        // Asegurar que la página se muestre incluso si hay errores
    }
}

// Verificar estado del backend al cargar la página
async function checkBackendStatus() {
    if (!apiClient) {
        console.warn('⚠️ apiClient no disponible para health check');
        return false;
    }
    
    try {
        console.log('🏥 Verificando estado del backend...');
        const isHealthy = await checkBackendHealth(apiClient);
        if (isHealthy) {
            console.log('✅ Backend está activo y respondiendo');
            return true;
        } else {
            console.warn('⚠️ Backend no responde correctamente');
            return false;
        }
    } catch (error) {
        console.warn('⚠️ No se pudo verificar el estado del backend:', error.message);
        if (isNetworkError(error)) {
            console.warn('   Esto puede indicar que el backend está inactivo (normal en Render free tier)');
        }
        return false;
    }
}

// Inicializar después de que el DOM esté listo (solo una vez)
// Usar try-catch para asegurar que los errores no detengan la carga de la página
function initializePage() {
    try {
        // Verificar estado del backend primero (no bloqueante)
        checkBackendStatus().then(isHealthy => {
            if (!isHealthy) {
                console.warn('⚠️ Backend parece estar inactivo. El login puede fallar hasta que el backend se active.');
            }
        }).catch(err => {
            console.warn('⚠️ Error verificando estado del backend:', err);
        });
        
        if (document.readyState === 'loading') {
            // DOM aún no está listo, esperar al evento
            document.addEventListener('DOMContentLoaded', () => {
                console.log('DOM cargado, ejecutando checkRegisterMode...');
                // Ejecutar checkRegisterMode de forma segura
                checkRegisterMode().catch(err => {
                    console.warn('⚠️ Error en checkRegisterMode (no crítico):', err);
                    // Continuar - la página debe funcionar en modo login por defecto
                });
            });
        } else {
            // DOM ya está listo, ejecutar inmediatamente
            console.log('DOM ya está listo, ejecutando checkRegisterMode...');
            // Ejecutar checkRegisterMode de forma segura
            checkRegisterMode().catch(err => {
                console.warn('⚠️ Error en checkRegisterMode (no crítico):', err);
                // Continuar - la página debe funcionar en modo login por defecto
            });
        }
    } catch (error) {
        console.error('❌ Error inicializando página:', error);
        // NO detener la ejecución - la página debe seguir funcionando
    }
}

// Inicializar la página y el formulario
initializePage();

// Inicializar formulario cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeForm, 50);
    });
} else {
    setTimeout(initializeForm, 50);
}

