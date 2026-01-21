# 🚀 Guía de Deploy - Pool Calculator

## Backend en ngrok (Actual)

**URL Backend**: https://6565fd67a4cf.ngrok-free.app

Este backend está corriendo en tu computadora mediante ngrok. Debe estar siempre ejecutándose para que la aplicación funcione.

### Mantener ngrok corriendo:

```bash
# En terminal del backend
cd /home/jesusolguin/Projects/pool-calculator/backend
npm run dev

# En otra terminal para ngrok
ngrok http 3000
```

**IMPORTANTE**: Cuando ngrok se reinicie, la URL cambiará. Deberás actualizar la variable de entorno en Vercel.

---

## Frontend en Vercel (Deploy)

### Paso 1: Subir código a GitHub

```bash
cd /home/jesusolguin/Projects/pool-calculator
git init
git add .
git commit -m "Initial commit - Pool Calculator"

# Crear repo en GitHub y luego:
git remote add origin https://github.com/TU_USUARIO/pool-calculator.git
git push -u origin main
```

### Paso 2: Deploy en Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Sign up / Login (usa tu cuenta de GitHub)
3. Click en "Add New Project"
4. Import tu repositorio `pool-calculator`
5. Configurar proyecto:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Paso 3: Variables de Entorno en Vercel

En la sección "Environment Variables" de Vercel, agregar:

```
VITE_API_URL=https://6565fd67a4cf.ngrok-free.app/api
```

### Paso 4: Deploy

Click en "Deploy" y espera unos minutos.

Tu app estará disponible en: `https://tu-proyecto.vercel.app`

---

## 📱 Usar la Aplicación

### URLs Finales:

- **Frontend (Vercel)**: `https://tu-proyecto.vercel.app`
- **Backend (ngrok)**: `https://6565fd67a4cf.ngrok-free.app`

### Para Compartir con Clientes:

1. Crea un proyecto y agreg actualizaciones
2. Ve a "Compartir Timeline"
3. Ingresa credenciales del cliente
4. Copia el link generado: `https://tu-proyecto.vercel.app/client-login?returnUrl=...`
5. Envía al cliente con usuario y contraseña

---

## 🔧 Actualizar la URL de ngrok

Cuando ngrok se reinicie (nueva URL), actualizar en Vercel:

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Editar `VITE_API_URL` con la nueva URL de ngrok
4. Redeploy el proyecto (Deployments → Redeploy)

---

## 🌐 Solución Permanente (Recomendado)

Para producción real, considera:

### Opción 1: Backend en Railway/Render (Gratis)
- Deploy el backend en Railway.app o Render.com
- URL permanente
- Sin necesidad de ngrok

### Opción 2: VPS (Digital Ocean, AWS)
- $5-10/mes
- Control total
- Dominio propio

### Opción 3: ngrok Pro
- $8/mes
- URL permanente
- Múltiples túneles

---

## 📝 Notas

- El backend DEBE estar corriendo para que funcione
- ngrok gratuito tiene límite de requests
- Para producción real, usar Railway/Render/VPS
- La base de datos (SQLite) está en tu computadora

---

Desarrollado por **Jesús Olguín - Domotics & IoT Solutions**
