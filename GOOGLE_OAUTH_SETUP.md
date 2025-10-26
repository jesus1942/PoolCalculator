# Configuración de Google OAuth para Pool Calculator

## Paso 1: Crear Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Click en el selector de proyectos (arriba a la izquierda)
3. Click en "Nuevo Proyecto"
4. Nombre del proyecto: `Pool Calculator` (o el que prefieras)
5. Click en "Crear"

## Paso 2: Habilitar Google+ API

1. En el menú lateral, ve a **APIs y servicios > Biblioteca**
2. Busca "Google+ API"
3. Click en "Google+ API"
4. Click en "HABILITAR"

## Paso 3: Configurar Pantalla de Consentimiento OAuth

1. En el menú lateral, ve a **APIs y servicios > Pantalla de consentimiento de OAuth**
2. Selecciona **Externo** (para testing)
3. Click en "CREAR"

### Información de la aplicación:
- **Nombre de la aplicación:** Pool Calculator
- **Correo electrónico de asistencia:** tu-email@gmail.com
- **Logo de la aplicación:** (opcional)
- **Dominio de la aplicación:** `localhost` (para desarrollo)
- **Correo electrónico de contacto del desarrollador:** tu-email@gmail.com

4. Click en "GUARDAR Y CONTINUAR"

### Alcances (Scopes):
5. En la siguiente pantalla (Alcances), NO agregues ningún alcance personalizado
6. Los alcances básicos (`profile` y `email`) se agregan automáticamente
7. Click en "GUARDAR Y CONTINUAR"

### Usuarios de prueba:
8. Click en "+ AGREGAR USUARIOS"
9. Agrega tu email y el de cualquier persona que quieras que pueda probar
10. Click en "AGREGAR"
11. Click en "GUARDAR Y CONTINUAR"
12. Revisa el resumen y click en "VOLVER AL PANEL"

## Paso 4: Crear Credenciales OAuth 2.0

1. En el menú lateral, ve a **APIs y servicios > Credenciales**
2. Click en "+ CREAR CREDENCIALES" (arriba)
3. Selecciona "ID de cliente de OAuth 2.0"

### Configurar el cliente OAuth:
- **Tipo de aplicación:** Aplicación web
- **Nombre:** Pool Calculator Web Client

### URIs de redireccionamiento autorizados:
Agrega estas URLs EXACTAMENTE como se muestran:

```
http://localhost:3000/api/auth/google/callback
http://127.0.0.1:3000/api/auth/google/callback
```

**IMPORTANTE:** Si usas un puerto diferente para el backend, cámbialo aquí.

4. Click en "CREAR"

## Paso 5: Copiar Credenciales

Aparecerá un popup con tus credenciales:

```
ID de cliente: 123456789-abcdefghijk.apps.googleusercontent.com
Secreto de cliente: GOCSPX-abcdefghijklmnopqrstuvwxyz
```

**GUARDA ESTAS CREDENCIALES EN UN LUGAR SEGURO**

## Paso 6: Configurar Variables de Entorno

1. Abre `/backend/.env`
2. Actualiza las siguientes líneas con tus credenciales:

```env
GOOGLE_CLIENT_ID=tu_client_id_aqui
GOOGLE_CLIENT_SECRET=tu_client_secret_aqui
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

3. Guarda el archivo
4. Reinicia el servidor backend

## Paso 7: Probar Google OAuth

1. Abre tu navegador en `http://localhost:5173/login`
2. Click en el botón "Continuar con Google"
3. Selecciona tu cuenta de Google
4. Acepta los permisos solicitados
5. Deberías ser redirigido al Dashboard automáticamente

## Solución de Problemas

### Error: "redirect_uri_mismatch"
**Causa:** La URL de callback no coincide con la configurada en Google Cloud Console

**Solución:**
1. Verifica que la URL en `.env` sea EXACTAMENTE igual a la configurada en Google Console
2. Asegúrate de incluir `http://` al inicio
3. Verifica que el puerto sea el correcto (3000 por defecto)

### Error: "access_denied"
**Causa:** El usuario no está en la lista de usuarios de prueba

**Solución:**
1. Ve a Google Cloud Console > Pantalla de consentimiento OAuth
2. Agrega el usuario a la lista de "Usuarios de prueba"

### Error: "invalid_client"
**Causa:** Client ID o Client Secret incorrectos

**Solución:**
1. Verifica que copiaste correctamente las credenciales en `.env`
2. NO debe haber espacios extra al inicio o final
3. Reinicia el servidor backend después de cambiar `.env`

### No se recibe el token en el frontend
**Causa:** Problema de CORS o redirección

**Solución:**
1. Verifica que `FRONTEND_URL=http://localhost:5173` esté en `.env`
2. Verifica que el puerto del frontend sea el correcto
3. Revisa la consola del navegador para errores

## Publicar la Aplicación (Producción)

Cuando estés listo para producción:

1. En Google Cloud Console, ve a **Pantalla de consentimiento OAuth**
2. Click en "PUBLICAR APLICACIÓN"
3. Google revisará tu aplicación (puede tomar unos días)
4. Actualiza las URIs de redireccionamiento con tu dominio real:
   ```
   https://tu-dominio.com/api/auth/google/callback
   ```
5. Actualiza `GOOGLE_CALLBACK_URL` y `FRONTEND_URL` en tu `.env` de producción

## Seguridad

- NUNCA compartas tu `GOOGLE_CLIENT_SECRET`
- NUNCA subas el archivo `.env` a Git
- Usa variables de entorno diferentes para desarrollo y producción
- En producción, usa HTTPS siempre

## Referencias

- [Documentación OAuth 2.0 de Google](https://developers.google.com/identity/protocols/oauth2)
- [Guía de Passport Google OAuth20](http://www.passportjs.org/packages/passport-google-oauth20/)
