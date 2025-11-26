/**
 * Utilidades compartidas para UI
 */

/**
 * Mostrar loading state en un elemento
 */
export function showLoading(element, text = 'Cargando...') {
    if (!element) return;
    
    const originalContent = element.innerHTML;
    element.dataset.originalContent = originalContent;
    element.disabled = true;
    element.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>${text}`;
}

/**
 * Ocultar loading state en un elemento
 */
export function hideLoading(element) {
    if (!element) return;
    
    if (element.dataset.originalContent) {
        element.innerHTML = element.dataset.originalContent;
        delete element.dataset.originalContent;
    }
    element.disabled = false;
}

/**
 * Mostrar loading en una tabla
 */
export function showTableLoading(tableBody, columns = 4, text = 'Cargando...') {
    if (!tableBody) return;
    tableBody.innerHTML = `
        <tr>
            <td colspan="${columns}" class="text-center py-4 dark:text-gray-200">
                <i class="fas fa-spinner fa-spin mr-2"></i>${text}
            </td>
        </tr>
    `;
}

/**
 * Manejar errores de forma consistente
 */
export function handleError(error, defaultMessage = 'Ocurrió un error') {
    console.error('Error:', error);
    
    // Si el error ya tiene un mensaje de usuario, usarlo
    if (error.userMessage) {
        return error.userMessage;
    }
    
    let message = defaultMessage;
    
    if (error.response?.data?.message) {
        message = error.response.data.message;
    } else if (error.response?.data?.error) {
        message = error.response.data.error;
    } else if (error.message) {
        message = error.message;
    }
    
    return message;
}

/**
 * Detectar si un error es de red (servidor inalcanzable)
 */
export function isNetworkError(error) {
    return error.code === 'ERR_NETWORK' || 
           error.message === 'Network Error' || 
           error.errorType === 'network' ||
           error.errorType === 'no_response' ||
           error.errorType === 'timeout';
}

/**
 * Detectar si el backend está activo
 */
export async function checkBackendHealth(apiClient) {
    try {
        const response = await apiClient.get('/health', { timeout: 5000 });
        return response.data?.status === 'online';
    } catch (error) {
        console.warn('⚠️ Backend health check falló:', error);
        return false;
    }
}

/**
 * Validar email
 */
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validar cédula (formato básico)
 */
export function isValidCedula(cedula) {
    // Permitir números y guiones, mínimo 7 caracteres
    return /^[\d-]{7,}$/.test(cedula);
}

/**
 * Validar teléfono/celular
 */
export function isValidPhone(phone) {
    // Permitir números, espacios, guiones, paréntesis, mínimo 7 dígitos
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15;
}

/**
 * Formatear fecha
 */
export function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleString('es-ES');
    } catch (error) {
        return dateString;
    }
}

