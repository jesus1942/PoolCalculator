# Nuevas Funcionalidades - Pool Calculator

## Resumen de Mejoras

Se implementaron **5 funcionalidades principales** que estaban pendientes, más mejoras significativas al sistema de exportación y una base de datos completamente poblada con productos reales argentinos.

---

## ✨ Funcionalidades Nuevas

### 1. ⚡ **Editor de Instalación Eléctrica**

**Ubicación:** Pestaña "Instalación Eléctrica" en detalle de proyecto

**Características:**
- ✅ Agregar items eléctricos por categoría (luces, bombas, calefacción, automatización, etc.)
- ✅ Cálculo automático de potencia total y amperaje
- ✅ Recomendación de sección de cable según distancia y amperaje
- ✅ Recomendación de térmica (disyuntor) según consumo
- ✅ Soporte para voltajes 12V, 220V y otros
- ✅ Cálculos basados en normativa AEA 90364

**Cálculos automáticos:**
- Potencia total (Watts)
- Amperaje total (I = P / V)
- Sección de cable recomendada (según tabla IRAM 2178)
- Térmica recomendada (125% del amperaje total)

**Ejemplo de uso:**
```
Proyecto con:
- 3 luces LED 18W 12V = 54W
- 1 bomba 750W 220V = 750W
- 1 transformador 300W = 300W
Total: 1104W (5A) → Cable recomendado: 2.5mm² (hasta 15m)
```

---

### 2. 📄 **Sistema de Exportación Mejorado**

**5 Plantillas Profesionales:**

#### 📘 **Presupuesto para Cliente**
- Presentación simplificada sin detalles técnicos
- Enfoque en características y precio total
- Condiciones de pago y garantía
- Diseño profesional y elegante
- **Formato:** HTML / Imprimible

#### 🔧 **Especificaciones Técnicas para Profesionales**
- Planos y medidas de excavación
- Especificaciones detalladas de materiales
- Listado completo con cantidades exactas
- Secuencia de trabajo recomendada
- Pruebas de presión y normativas aplicables
- Referencias a normas (AEA 90364, IRAM 2178, etc.)
- **Formato:** HTML / Imprimible
- **Ideal para:** Albañiles, plomeros, electricistas

#### 📦 **Lista de Materiales**
- CSV exportable a Excel/Google Sheets
- Categorizado por tipo (Vereda, Cama, Plomería, Eléctrico)
- Cantidades, unidades y observaciones
- Listo para compras
- **Formato:** CSV

#### 💰 **Presupuesto Detallado**
- Incluye costos unitarios
- Subtotales por categoría
- Mano de obra y materiales separados
- **Formato:** HTML

#### 📋 **Reporte Completo**
- Documentación exhaustiva del proyecto
- Combina presupuesto + especificaciones técnicas
- **Formato:** HTML

**Mejoras del sistema:**
- ✅ Selección de plantilla con vista previa
- ✅ Botones de acción (Descargar HTML, Imprimir, Exportar CSV)
- ✅ Descripción de qué incluye cada documento
- ✅ Diseño responsive y profesional

---

### 3. 📝 **Sistema de Gestión de Tareas**

**Ubicación:** Pestaña "Tareas" en detalle de proyecto

**Características:**
- ✅ Crear tareas organizadas por categorías:
  - Excavación
  - Instalación Hidráulica
  - Instalación Eléctrica
  - Solado y Cama
  - Colocación de Losetas
  - Terminaciones
  - Otras Tareas
- ✅ Estados: Pendiente, En Progreso, Completada
- ✅ Estimación de horas de mano de obra
- ✅ Costo de mano de obra por tarea
- ✅ Asignación de roles/oficios
- ✅ Totales por categoría (horas y costos)
- ✅ Notas y descripciones detalladas

**Ejemplo:**
```
Categoría: Excavación
- Excavación del terreno (8 hs, $50.000)
- Nivelación del fondo (4 hs, $25.000)
Total categoría: 12 hs, $75.000
```

---

### 4. ➕ **Sistema de Adicionales**

**Ubicación:** Pestaña "Adicionales" en detalle de proyecto

**Características:**
- ✅ Agregar items adicionales al preset base:
  - Accesorios extra
  - Equipamiento adicional
  - Materiales de construcción
- ✅ Comparación cantidad base vs cantidad nueva
- ✅ **Sistema de dependencias automáticas:**
  - Si agregás luces → Sugiere transformadores y cables
  - Si aumentás retornos → Calcula cañerías adicionales
  - Si agregás calefacción → Verifica capacidad de bomba
- ✅ Alertas visuales de dependencias
- ✅ Integración con reglas de negocio del backend

**Ejemplo de dependencias automáticas:**
```
Agregaste: +2 Luces LED adicionales (50W c/u)
↓
Sistema detecta dependencias:
- Transformador: Necesitás 100W adicionales
- Cableado: +6m de cable 2x1.5mm²
- Térmica: Aumentar de 20A a 25A
```

---

### 5. 👥 **Gestión de Roles/Oficios**

**Ubicación:** Pestaña "Roles/Oficios" en detalle de proyecto

**Características:**
- ✅ Crear roles personalizados (Albañil, Plomero, Electricista, etc.)
- ✅ Definir tarifas por hora o por día
- ✅ Descripción del rol
- ✅ Asignar a tareas específicas
- ✅ Cálculo automático de costos de mano de obra

---

## 🗄️ **Base de Datos Poblada**

### 📦 **64 Productos Reales con Precios Argentinos 2025**

#### Materiales de Construcción (12 items)
- **Cementos:** Portland Loma Negra, Cemento Blanco Minetti
- **Agregados:** Arena gruesa/fina, canto rodado, piedra partida
- **Mallas:** Q188, Q335 electrosoldada
- **Impermeabilizantes:** Sika, Geomembrana 200µ
- **Precios:** $8.500 - $62.000

#### Items de Plomería (16 items)
- **Caños PVC:** Ø32mm a Ø63mm (marca Awaduct)
- **Caños Fusión:** Ø50mm, Ø63mm (marca Tigre)
- **Accesorios:** Codos, tees, válvulas esféricas, válvulas check
- **Adhesivos:** Pegamento PVC, teflón
- **Precios:** $800 - $18.500

#### Accesorios Piscina (9 items)
- **Kit Vulcano Completo:** $96.500 (Skimmer + 3 Retornos + Virola)
- **Skimmers, Retornos, Virolas** individuales
- **Desagües de fondo**
- **Remates:** Lomo ballena, esquineros, rejillas
- **Precios:** $1.800 - $96.500

#### Equipamiento (18 items)
- **Bombas AstralPool:** Sena 0.5HP a 1HP ($185.000 - $285.000)
- **Bombas Peabody:** 1HP $195.000
- **Filtros AstralPool:** Ø400 a Ø600 ($165.000 - $295.000)
- **Calefacción:** Solar, intercambiadores ($285.000 - $425.000)
- **Cloración:** Cloradores salinos ($485.000 - $685.000)
- **Iluminación:** LED RGB, blancas, transformadores ($28.000 - $42.000)
- **Automatización:** Timers, reguladores de nivel
- **Precios:** $8.500 - $685.000

#### Losetas y Cerámicos (9 items)
- **Losetas Antideslizantes:** 30x30, 40x40 (Cerro Negro)
- **Porcelanatos:** Símil madera (Ilva), símil piedra (San Lorenzo)
- **Remates:** Lomo ballena, terminaciones en L
- **Venecitas:** Azul piscina, verde agua (Venecitas Córdoba)
- **Precios:** $1.600 - $9.200

### 🔄 **Actualización de Precios**

Los precios están actualizados a **Octubre 2025** basados en:
- Búsquedas web de proveedores argentinos
- MercadoLibre Argentina
- Tablas de costos de la construcción (La Nación)
- Retailers especializados (Pool Market, Hidrofil, etc.)

**Para actualizar precios:**
```bash
cd backend
npm run seed:products
```

**Fuentes consultadas:**
- MercadoLibre Argentina
- Pool Market Argentina
- Hidrofil (accesorios)
- La Nación (índice de construcción)
- Proveedores locales

---

## 🚀 **Instrucciones de Uso**

### Poblar Base de Datos

```bash
# Desde la raíz del proyecto
cd backend
npm run seed:products
```

Esto creará/actualizará:
- 12 materiales de construcción
- 16 items de plomería
- 9 accesorios
- 18 equipamientos
- 9 losetas y cerámicos

### Usar las Nuevas Funcionalidades

1. **Crear o abrir un proyecto**
2. **Navegar por las pestañas:**
   - ⚡ **Instalación Eléctrica:** Configurar items eléctricos
   - 📝 **Tareas:** Planificar trabajo y estimar costos
   - ➕ **Adicionales:** Agregar items extra con dependencias
   - 📄 **Exportar:** Elegir plantilla y generar documentos

3. **Exportar documentos:**
   - Seleccionar plantilla (Cliente, Profesional, Materiales, etc.)
   - Descargar HTML o exportar CSV
   - Imprimir directamente

---

## 🔧 **Mejoras Técnicas**

### Frontend
- ✅ Nuevo componente `ElectricalEditor.tsx`
- ✅ Nuevo componente `EnhancedExportManager.tsx`
- ✅ Componente `TasksManager.tsx`
- ✅ Componente `AdditionalsManager.tsx`
- ✅ Tipos actualizados con `electricalConfig` y `plumbingConfig`
- ✅ Integración completa en `ProjectDetail.tsx`

### Backend
- ✅ Script `seedProducts.ts` con 64 productos reales
- ✅ Comando npm `seed:products`
- ✅ Rutas de adicionales funcionales
- ✅ Sistema de reglas de negocio para dependencias

### Base de Datos
- ✅ Estructura Prisma completa (sin cambios en schema)
- ✅ Datos poblados con precios argentinos 2025
- ✅ Productos de marcas reconocidas (AstralPool, Loma Negra, Tigre, etc.)

---

## 📊 **Estadísticas del Proyecto**

**Archivos nuevos creados:** 4
- `ElectricalEditor.tsx`
- `EnhancedExportManager.tsx`
- `TasksManager.tsx`
- `AdditionalsManager.tsx`
- `seedProducts.ts`

**Componentes mejorados:** 3
- `ProjectDetail.tsx` (nueva pestaña eléctrica)
- `types/index.ts` (nuevos tipos)
- `package.json` (nuevo script)

**Productos en base de datos:** 64
**Precios actualizados:** Octubre 2025
**Marcas incluidas:** 10+ (AstralPool, Loma Negra, Tigre, Vulcano, etc.)

---

## 🎯 **Próximos Pasos Sugeridos**

1. **Testing:** Probar todas las funcionalidades nuevas
2. **Personalización:** Ajustar precios según región
3. **Más productos:** Agregar más variantes de productos
4. **Automatización:** Scheduled job para actualizar precios
5. **Web scraping:** Sistema automático de actualización de precios

---

## 📞 **Soporte**

Para actualizar precios o agregar productos:
1. Editar `backend/prisma/seedProducts.ts`
2. Ejecutar `npm run seed:products`
3. Los cambios se reflejan inmediatamente

---

**Versión:** 2.0.0
**Fecha:** Octubre 2025
**Desarrollado por:** Jesus Olguin con Claude Code
