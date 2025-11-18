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
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto 80
EXPOSE 80

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]

