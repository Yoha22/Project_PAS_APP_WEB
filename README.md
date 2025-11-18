# Project_PAS_APP_WEB

## Sistema de Acceso - Frontend

Frontend del Sistema de Acceso construido con JavaScript vanilla y Vite.

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Estructura

- `src/services/` - Servicios API
- `src/pages/` - Páginas de la aplicación
- `src/components/` - Componentes reutilizables
- `src/utils/` - Utilidades
- `src/assets/` - Assets estáticos (CSS, JS, imágenes)

## Despliegue en Render

Este proyecto está configurado para desplegarse como un **Static Site** en Render.

### Requisitos Previos

1. Cuenta en [Render](https://render.com)
2. Repositorio Git (GitHub, GitLab o Bitbucket) con el código
3. URL del backend API en producción

### Pasos para Desplegar

#### Opción 1: Usando render.yaml (Recomendado)

1. **Conectar el repositorio a Render:**
   - Ve a tu dashboard de Render
   - Haz clic en "New +" → "Static Site"
   - Conecta tu repositorio de Git
   - Render detectará automáticamente el archivo `render.yaml`

2. **Configurar variables de entorno:**
   - En la configuración del servicio, ve a "Environment"
   - Agrega la variable de entorno:
     - **Key:** `VITE_API_URL`
     - **Value:** URL de tu backend API (ej: `https://tu-backend.onrender.com/api`)

3. **Desplegar:**
   - Render construirá y desplegará automáticamente
   - El sitio estará disponible en una URL como: `https://sistema-acceso-frontend.onrender.com`

#### Opción 2: Configuración Manual

Si prefieres configurar manualmente:

1. **Crear nuevo Static Site:**
   - Ve a "New +" → "Static Site"
   - Conecta tu repositorio

2. **Configuración:**
   - **Name:** `sistema-acceso-frontend` (o el que prefieras)
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
   - **Environment Variables:**
     - `VITE_API_URL` = `https://tu-backend.onrender.com/api`

3. **Desplegar:**
   - Haz clic en "Create Static Site"

### Variables de Entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_API_URL` | URL completa del backend API | `https://tu-backend.onrender.com/api` |

**Importante:** Las variables de entorno que comienzan con `VITE_` son expuestas al cliente. Asegúrate de que la URL del backend sea pública y accesible.

### Actualizaciones Automáticas

Render se conecta automáticamente a tu repositorio Git. Cada vez que hagas push a la rama principal, Render:
1. Detectará los cambios
2. Ejecutará `npm install && npm run build`
3. Desplegará los nuevos archivos estáticos

### Notas Importantes

- El proxy de Vite (`/api`) solo funciona en desarrollo. En producción, todas las peticiones usan `VITE_API_URL`
- Asegúrate de que tu backend tenga CORS configurado para permitir peticiones desde el dominio de Render
- El sitio estático es gratuito en Render, pero puede tardar unos segundos en "despertar" si no ha recibido tráfico reciente

