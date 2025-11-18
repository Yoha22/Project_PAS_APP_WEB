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
# Render pasa las variables de entorno como build args automáticamente
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Compilar la aplicación
RUN npm run build

# Stage 2: Production stage
FROM nginx:alpine

# Copiar archivos compilados desde el stage de build
# Copiar todo el contenido de dist (incluye public/ y assets/)
COPY --from=builder /app/dist /usr/share/nginx/html

# Si los HTML están en dist/public/, crear enlaces simbólicos o copiar a la raíz
# Esto permite acceder a /login.html en lugar de /public/login.html
RUN if [ -d /usr/share/nginx/html/public ]; then \
        cp -r /usr/share/nginx/html/public/*.html /usr/share/nginx/html/ 2>/dev/null || true; \
    fi

# Copiar configuración de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto 80
EXPOSE 80

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]

