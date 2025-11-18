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

Este proyecto está configurado para desplegarse con **Docker** en Render usando Nginx como servidor web.

### Requisitos Previos

1. Cuenta en [Render](https://render.com)
2. Repositorio Git (GitHub, GitLab o Bitbucket) con el código
3. URL del backend API en producción

### Pasos para Desplegar

#### Opción 1: Usando render.yaml (Recomendado)

1. **Conectar el repositorio a Render:**
   - Ve a tu dashboard de Render
   - Haz clic en "New +" → "Web Service"
   - Conecta tu repositorio de Git
   - Render detectará automáticamente el archivo `render.yaml`

2. **Configurar variables de entorno:**
   - En la configuración del servicio, ve a "Environment"
   - Agrega la variable de entorno:
     - **Key:** `VITE_API_URL`
     - **Value:** URL de tu backend API (ej: `https://project-pas-api.onrender.com`)
     - **Importante:** No incluyas `/api` al final, se agrega automáticamente

3. **Desplegar:**
   - Render construirá la imagen Docker y desplegará automáticamente
   - El sitio estará disponible en una URL como: `https://sistema-acceso-frontend.onrender.com`

#### Opción 2: Configuración Manual

Si prefieres configurar manualmente:

1. **Crear nuevo Web Service:**
   - Ve a "New +" → "Web Service"
   - Conecta tu repositorio

2. **Configuración:**
   - **Name:** `sistema-acceso-frontend` (o el que prefieras)
   - **Runtime:** Docker
   - **Dockerfile Path:** `./Dockerfile`
   - **Docker Context:** `.`
   - **Environment Variables:**
     - `VITE_API_URL` = `https://project-pas-api.onrender.com` (sin `/api`)

3. **Desplegar:**
   - Haz clic en "Create Web Service"

### Build Local con Docker

Puedes construir y probar la imagen Docker localmente:

```bash
# Construir la imagen (reemplaza VITE_API_URL con tu URL)
docker build --build-arg VITE_API_URL=https://project-pas-api.onrender.com -t sistema-acceso-frontend .

# Ejecutar el contenedor
docker run -p 8080:80 sistema-acceso-frontend

# Acceder a http://localhost:8080
```

### Ventajas de usar Docker

- **Mejor rendimiento:** Nginx es más eficiente que el servidor estático de Render
- **SPA Routing:** Manejo correcto de rutas para Single Page Applications
- **Control del entorno:** Consistencia entre desarrollo y producción
- **Compresión gzip:** Archivos comprimidos automáticamente
- **Cache optimizado:** Headers de cache configurados para mejor rendimiento

### Variables de Entorno

| Variable | Descripción | Ejemplo | Cuándo se usa |
|----------|-------------|---------|--------------|
| `VITE_API_URL` | URL base del backend API (sin `/api`) | `https://project-pas-api.onrender.com` | Tiempo de build |

**Importante:** 
- `VITE_API_URL` se inyecta durante el **build** de Docker, no en runtime
- No incluyas `/api` al final, se agrega automáticamente en el código
- Las variables que comienzan con `VITE_` son expuestas al cliente
- Asegúrate de que la URL del backend sea pública y accesible

### Actualizaciones Automáticas

Render se conecta automáticamente a tu repositorio Git. Cada vez que hagas push a la rama principal, Render:
1. Detectará los cambios
2. Construirá la imagen Docker (incluye `npm install` y `npm run build`)
3. Desplegará el nuevo contenedor con Nginx

### Estructura del Dockerfile

El Dockerfile usa un **multi-stage build**:

1. **Stage 1 (builder):** 
   - Usa Node.js 20 Alpine
   - Instala dependencias
   - Compila la aplicación con Vite
   - Inyecta `VITE_API_URL` en tiempo de build

2. **Stage 2 (production):**
   - Usa Nginx Alpine (imagen ligera)
   - Copia archivos compilados desde el stage 1
   - Configura Nginx para servir archivos estáticos
   - Maneja SPA routing (todas las rutas redirigen a index.html)

### Notas Importantes

- El proxy de Vite (`/api`) solo funciona en desarrollo. En producción, todas las peticiones usan `VITE_API_URL`
- Asegúrate de que tu backend tenga CORS configurado para permitir peticiones desde el dominio de Render
- Nginx está configurado para manejar rutas SPA correctamente (todas las rutas redirigen a index.html)
- Los archivos estáticos tienen cache configurado para mejor rendimiento
- El servicio Docker en Render puede tardar unos segundos en "despertar" si no ha recibido tráfico reciente

