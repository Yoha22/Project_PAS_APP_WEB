/**
 * Utilidad simple para alternar el tema sin depender de módulos ES6
 * Se puede usar directamente en cualquier página HTML
 */

// Función global para alternar tema
window.toggleTheme = function() {
    const html = document.documentElement;
    const body = document.body;
    const isDark = html.classList.contains('dark');
    
    if (isDark) {
        html.classList.remove('dark');
        body.classList.remove('active');
        html.setAttribute('data-theme', 'light');
        localStorage.setItem('darkMode', 'false');
    } else {
        html.classList.add('dark');
        body.classList.add('active');
        html.setAttribute('data-theme', 'dark');
        localStorage.setItem('darkMode', 'true');
    }
    
    updateThemeIcon();
    console.log('Tema cambiado a:', isDark ? 'claro' : 'oscuro');
};

// Función para actualizar el icono del tema
window.updateThemeIcon = function() {
    const themeIcon = document.getElementById('themeIcon');
    if (!themeIcon) return;
    
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    } else {
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
    }
};

// Configurar botón cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemeToggle);
} else {
    initThemeToggle();
}

function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', window.toggleTheme);
        window.updateThemeIcon();
    }
}

