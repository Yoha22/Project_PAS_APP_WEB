# Configuración de Variables de Entorno

## Configuración Automática

**¡Buenas noticias!** La URL de la API ya está configurada por defecto en el código. No necesitas configurar ninguna variable de entorno en Render para producción.

### Comportamiento por Defecto:

- **En desarrollo local:** Usa el proxy de Vite (`/api`) que apunta a `http://localhost:8000`
- **En producción:** Usa automáticamente `https://project-pas-api.onrender.com/api`

### Variable de Entorno Opcional (Solo si necesitas override)

Si necesitas usar una URL diferente (por ejemplo, para testing o staging), puedes crear un archivo `.env` en la raíz del proyecto:

```env
VITE_API_URL=https://tu-api-custom.com
```

**IMPORTANTE:** 
- No incluyas `/api` al final de la URL
- El código automáticamente agrega `/api` al baseURL
- La URL debe ser la base de tu API (sin el prefijo `/api`)

### Para desarrollo local con API remota:

Si quieres probar el frontend local contra la API en producción:
```env
VITE_API_URL=https://project-pas-api.onrender.com
```

### Verificación:

1. En desarrollo: Reinicia el servidor (`npm run dev`)
2. Verifica en la consola del navegador que la URL se esté usando correctamente
3. Deberías ver en los logs: `🌐 Petición API: POST https://project-pas-api.onrender.com/api/auth/login`

## Configuración en Render (Producción)

**NO ES NECESARIO** configurar `VITE_API_URL` en Render. El código ya tiene la URL de producción hardcodeada como valor por defecto.

Si quieres usar una URL diferente en producción, entonces sí puedes configurarla en Render:
1. Ve a tu servicio en Render Dashboard
2. Settings > Environment Variables
3. Agrega: `VITE_API_URL` = `https://tu-api-custom.com`
4. Haz un nuevo deploy

## Estructura del archivo .env

```env
# URL de la API backend
# En desarrollo local: http://localhost:8000
# En producción (Render): https://project-pas-api.onrender.com
VITE_API_URL=https://project-pas-api.onrender.com
```

## Troubleshooting

### La variable no se está usando:
1. Verifica que el archivo se llame exactamente `.env` (con el punto al inicio)
2. Verifica que esté en la raíz del proyecto `Project_PAS_APP_WEB`
3. Reinicia el servidor de desarrollo (`npm run dev`)
4. En producción, verifica que la variable esté configurada en Render y haz un nuevo deploy

### Error de CORS:
- Asegúrate de que la URL en `VITE_API_URL` coincida exactamente con la URL de tu API backend
- Verifica que el backend tenga configurado CORS correctamente para permitir el origen del frontend

