# 🔧 TROUBLESHOOTING - Análisis Profesionales

## ❌ Problema: Error "Cannot read properties of undefined"

### ✅ SOLUCIÓN APLICADA

He agregado validaciones robustas en ambos componentes para prevenir errores cuando los datos no están disponibles.

**Cambios realizados:**
1. ✅ Validación más estricta de datos antes de renderizar
2. ✅ Mensajes de error más descriptivos
3. ✅ Prevención de redirect automático al login
4. ✅ Botón "Reintentar" en todos los estados de error

---

## 🧪 CÓMO PROBAR AHORA

### 1. Recarga la página del frontend
```bash
# Presiona Ctrl+R o F5 en el navegador
```

### 2. Navega a un proyecto

### 3. Click en "Análisis Hidráulico" o "Análisis Eléctrico"

**AHORA DEBERÍAS VER UNO DE ESTOS MENSAJES:**

---

## 📋 MENSAJES POSIBLES Y SUS SOLUCIONES

### ✅ Mensaje: "Calculando análisis..."
**Significado:** Está cargando correctamente
**Acción:** Esperar

---

### ⚠️ Mensaje: "No hay datos de análisis hidráulico disponibles"
**Causa:** El proyecto no tiene la configuración hidráulica necesaria

**Solución paso a paso:**
1. Ve a la pestaña **"Hidráulica"** del proyecto
2. Verifica que haya:
   - ✅ Tuberías configuradas (succión y retorno)
   - ✅ Diámetros definidos
   - ✅ Accesorios agregados (codos, válvulas, etc.)
3. Guarda la configuración
4. Vuelve a "Análisis Hidráulico"
5. Click en "Intentar cargar"

---

### ⚠️ Mensaje: "No hay datos de análisis eléctrico disponibles"
**Causa:** El proyecto no tiene la configuración eléctrica necesaria

**Solución paso a paso:**
1. Ve a la pestaña **"Eléctrica"** del proyecto
2. Verifica que haya:
   - ✅ Equipos eléctricos configurados (bomba, filtro, etc.)
   - ✅ Potencias definidas
   - ✅ Voltaje configurado
3. Guarda la configuración
4. Vuelve a "Análisis Eléctrico"
5. Click en "Intentar cargar"

---

### ❌ Mensaje: "Error del servidor: [mensaje específico]"
**Causa:** El backend está devolviendo un error

**Solución:**
1. Abre la consola del backend (terminal donde corre `npm run dev`)
2. Busca el error específico (generalmente en rojo)
3. El error puede ser:
   - Proyecto no encontrado
   - Falta algún dato en la BD
   - Error de cálculo

**Acción recomendada:**
- Comparte el error específico del backend para ayudarte mejor

---

### ❌ Mensaje: "Error de conexión. Verifica que el backend esté corriendo en puerto 3000"
**Causa:** El backend no está corriendo

**Solución:**
```bash
# Terminal 1 - Verifica si el backend está corriendo
curl http://localhost:3000/health

# Si no responde, inicia el backend
cd backend
npm run dev

# Deberías ver:
# Server running on http://localhost:3000
```

---

### ❌ Mensaje: "Error de autenticación. Tu sesión puede haber expirado"
**Causa:** El token JWT expiró o no es válido

**Solución:**
1. Recarga la página completa (F5)
2. Si sigue fallando:
   - Cierra sesión
   - Vuelve a iniciar sesión
3. Intenta de nuevo

---

## 🔍 DEBUGGING AVANZADO

### Ver qué está pasando en la consola del navegador

**Presiona F12 y ve a la pestaña "Console"**

Busca mensajes como:
```
Error loading hydraulic analysis: [detalles]
```

**Los mensajes importantes son:**
- `status: 401` → Problema de autenticación
- `status: 404` → Proyecto no encontrado
- `status: 500` → Error del servidor
- `ERR_NETWORK` → Backend no responde

---

## 🛠️ VERIFICAR CONFIGURACIÓN DEL PROYECTO

### Checklist para Análisis Hidráulico:

En la pestaña **"Hidráulica"** debe haber:
- [ ] Bomba de filtrado seleccionada
- [ ] Filtro seleccionado
- [ ] Tubería de succión (diámetro y longitud)
- [ ] Tubería de retorno (diámetro y longitud)
- [ ] Al menos 1 accesorio agregado

### Checklist para Análisis Eléctrico:

En la pestaña **"Eléctrica"** debe haber:
- [ ] Bomba con potencia definida
- [ ] Voltaje configurado (220V o 380V)
- [ ] Al menos 1 equipo eléctrico

---

## 🔄 SI TODO FALLA

### Reset completo:

1. **Limpia el caché del navegador:**
   - Ctrl+Shift+Delete
   - Selecciona "Caché" y "Cookies"
   - Limpia

2. **Reinicia ambos servidores:**
```bash
# Terminal 1 - Backend
cd backend
pkill -f "tsx.*src/index.ts"  # Mata procesos anteriores
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

3. **Inicia sesión de nuevo**

4. **Abre un proyecto que SEPAS que tiene configuración completa**

---

## 📞 CÓMO PEDIR AYUDA

Si sigues teniendo problemas, comparte:

1. **Mensaje exacto del error** (captura de pantalla)
2. **Consola del navegador** (F12 → Console tab)
3. **Consola del backend** (terminal donde corre npm run dev)
4. **Pasos que hiciste** antes del error

**Ejemplo de reporte útil:**
```
1. Abrí el proyecto "Piscina Casa López"
2. Click en "Análisis Hidráulico"
3. Veo el mensaje: "Error del servidor: Cannot calculate TDH"
4. En la consola del backend veo: [pegar error]
```

---

## ✨ PRÓXIMOS PASOS SI TODO FUNCIONA

Una vez que veas los análisis correctamente:

1. **Ajusta parámetros:**
   - Click en "Configuración"
   - Cambia distancia al equipo
   - Cambia altura estática
   - Click "Recalcular"

2. **Revisa los warnings:**
   - Si hay advertencias en amarillo, léelas
   - Te dirán si hay problemas con las velocidades, cables, etc.

3. **Usa la información:**
   - Los cálculos son profesionales y precisos
   - Úsalos para seleccionar equipos adecuados
   - Exporta el proyecto a Excel para incluir los análisis

---

**¡La funcionalidad está lista, solo necesita que el proyecto tenga los datos correctos!** 🚀
