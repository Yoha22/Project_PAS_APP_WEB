/**
 * Servicio para manejar el modo oscuro/claro
 * Persiste la preferencia en localStorage y aplica el tema a todas las páginas
 */

class ThemeService {
  constructor() {
    this.themeKey = 'darkMode';
    // No inicializar automáticamente, se hará cuando el DOM esté listo
  }

  /**
   * Inicializa el tema basado en la preferencia guardada o la del sistema
   */
  init() {
    // Asegurarse de que el DOM esté listo
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this._initTheme());
    } else {
      this._initTheme();
    }
  }

  /**
   * Inicializa el tema (método privado)
   */
  _initTheme() {
    const savedTheme = localStorage.getItem(this.themeKey);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Si hay una preferencia guardada, usarla; si no, usar la del sistema
    const isDark = savedTheme !== null 
      ? savedTheme === 'true' 
      : prefersDark;
    
    this.setTheme(isDark);
  }

  /**
   * Establece el tema (oscuro o claro)
   * @param {boolean} isDark - true para modo oscuro, false para modo claro
   */
  setTheme(isDark) {
    // Asegurarse de que el DOM esté listo
    if (!document.documentElement) {
      console.warn('DOM no está listo, reintentando...');
      setTimeout(() => this.setTheme(isDark), 100);
      return;
    }

    const html = document.documentElement;
    const body = document.body;
    
    if (isDark) {
      html.classList.add('dark');
      body.classList.add('active');
      html.setAttribute('data-theme', 'dark');
    } else {
      html.classList.remove('dark');
      body.classList.remove('active');
      html.setAttribute('data-theme', 'light');
    }
    
    // Guardar preferencia
    localStorage.setItem(this.themeKey, isDark.toString());
    
    // Disparar evento personalizado para que otros componentes puedan reaccionar
    window.dispatchEvent(new CustomEvent('themechange', { detail: { isDark } }));
    
    console.log('Tema cambiado a:', isDark ? 'oscuro' : 'claro');
  }

  /**
   * Alterna entre modo oscuro y claro
   */
  toggle() {
    const isDark = this.isDark();
    this.setTheme(!isDark);
  }

  /**
   * Verifica si el tema actual es oscuro
   * @returns {boolean}
   */
  isDark() {
    return document.body.classList.contains('active') || 
           document.documentElement.classList.contains('dark');
  }

  /**
   * Obtiene el tema actual
   * @returns {'dark'|'light'}
   */
  getTheme() {
    return this.isDark() ? 'dark' : 'light';
  }
}

// Crear instancia única (singleton)
export const themeService = new ThemeService();

// Exportar también la clase por si se necesita
export default ThemeService;

