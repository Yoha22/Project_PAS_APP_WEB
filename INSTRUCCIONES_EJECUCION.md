# Cómo Ejecutar el Frontend

## Requisitos Previos

1. **Node.js y npm** instalados (versión 16 o superior)
2. **Backend Laravel** corriendo en `http://localhost:8000`

## Pasos para Ejecutar

### 1. Instalar Dependencias

Abre una terminal en la carpeta `frontend` y ejecuta:

```bash
cd frontend
npm install
```

Esto instalará:
- `axios` (para peticiones HTTP)
- `vite` (servidor de desarrollo)

### 2. Configurar Variables de Entorno (Opcional)

Crea un archivo `.env` en la carpeta `frontend`:

```env
VITE_API_URL=http://localhost:8000/api
```

Si no creas este archivo, se usará la URL por defecto.

### 3. Iniciar el Servidor de Desarrollo

Ejecuta:

```bash
npm run dev
```

El frontend estará disponible en: **http://localhost:3000**

### 4. Acceder a las Páginas

- **Login/Registro:** http://localhost:3000/login.html
- **Dashboard:** http://localhost:3000/dashboard.html
- **Usuarios:** http://localhost:3000/usuarios.html
- **Historial:** http://localhost:3000/historial.html
- **Alarmas:** http://localhost:3000/alarmas.html

## Comandos Disponibles

- `npm run dev` - Inicia servidor de desarrollo (puerto 3000)
- `npm run build` - Construye la aplicación para producción
- `npm run preview` - Previsualiza la build de producción

## Notas Importantes

1. **El backend debe estar corriendo** antes de iniciar el frontend
2. El proxy de Vite redirige las peticiones `/api/*` a `http://localhost:8000`
3. Si cambias el puerto del backend, actualiza `vite.config.js`

## Solución de Problemas

### Error: "Cannot find module"
```bash
# Elimina node_modules y reinstala
rm -rf node_modules package-lock.json
npm install
```

### Error de conexión con la API
- Verifica que el backend Laravel esté corriendo
- Verifica que la URL en `vite.config.js` sea correcta
- Revisa la consola del navegador para ver errores CORS

### Puerto 3000 ocupado
Edita `vite.config.js` y cambia el puerto:
```js
server: {
  port: 3001, // Cambia el puerto aquí
}
```

