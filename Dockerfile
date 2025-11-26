# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias (solo producción para optimizar)
RUN npm ci

# Copiar el resto de los archivos
COPY . .

# Argumento para la URL de la API (se pasa en tiempo de build)
# IMPORTANTE: En Render, las variables de entorno se pasan como build args automáticamente
# si están configuradas en el panel de Environment
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Verificar que la variable se recibió (para debugging)
RUN if [ -z "$VITE_API_URL" ]; then \
        echo "⚠️ ADVERTENCIA: VITE_API_URL no está definida como build arg"; \
        echo "   Esto significa que la variable no se pasó durante el build"; \
        echo "   Verifica que VITE_API_URL esté configurada en Render > Environment"; \
    else \
        echo "✅ VITE_API_URL recibida: $VITE_API_URL"; \
    fi

# Compilar la aplicación
RUN npm run build

# Stage 2: Production stage
FROM nginx:alpine

# Copiar archivos compilados desde el stage de build
# Copiar todo el contenido de dist (incluye public/ y assets/)
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar los HTML compilados desde dist/public/ a la raíz
# Esto permite acceder a /login.html en lugar de /public/login.html
RUN if [ -d /usr/share/nginx/html/public ]; then \
        cp -r /usr/share/nginx/html/public/*.html /usr/share/nginx/html/ 2>/dev/null || true; \
        # Eliminar la carpeta public después de copiar los HTML para evitar confusión
        rm -rf /usr/share/nginx/html/public || true; \
    fi

# Copiar configuración de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto 80
EXPOSE 80

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]

