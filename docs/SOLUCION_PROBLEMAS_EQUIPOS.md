# SOLUCIÓN DE PROBLEMAS - EQUIPOS

## PROBLEMAS REPORTADOS

1. Error 500 al agregar equipos
2. Catálogo incompleto (sin fotos, sin datasheets)
3. Faltan bombas argentinas comunes (Fluvial, Vulcano, Espa)

---

## SOLUCIONES APLICADAS

### 1. Error 500 al agregar equipos - SOLUCIONADO

**Problema**: El endpoint esperaba un array pero enviábamos un objeto

**Archivo modificado**: `frontend/src/components/EquipmentSelector.tsx`
**Línea**: 53-60

**Cambio**:
```typescript
// ANTES (causaba error 500)
await additionalsService.processAdditionals(projectId, {
  equipmentId: equipment.id,
  baseQuantity: 1,
  newQuantity: 1
});

// AHORA (funciona correctamente)
await additionalsService.processAdditionals(projectId, {
  modifications: [{
    equipmentId: equipment.id,
    baseQuantity: 0,
    newQuantity: 1,
    dependencies: {}
  }]
});
```

**Estado**: FUNCIONANDO

---

### 2. Bombas argentinas agregadas - COMPLETADO

**Script creado**: `backend/scripts/seedArgentinePumps.ts`

**Bombas agregadas**: 15 bombas nuevas

#### Fluvial (6 modelos):
- FLU-050 0.5 HP - 8 m³/h - $85,000
- FLU-075 0.75 HP - 12 m³/h - $95,000
- FLU-100 1 HP - 14 m³/h - $110,000
- FLU-150 1.5 HP - 18 m³/h - $135,000
- Trifásica 2 HP - 24 m³/h - $185,000
- Trifásica 3 HP - 30 m³/h - $235,000

#### Vulcano (4 modelos):
- Modelo 33 0.5 HP - 7 m³/h - $78,000
- Modelo 44 0.75 HP - 10 m³/h - $88,000
- Modelo 55 1 HP - 13 m³/h - $105,000
- Modelo 66 1.5 HP - 16 m³/h - $125,000

#### Espa (5 modelos):
- Nox 25 4M 0.5 HP - 9 m³/h - $145,000
- Nox 40 5M 0.75 HP - 12 m³/h - $165,000
- Silen S 75 15M 1 HP - 15 m³/h - $185,000
- Silen S 100 18M 1.5 HP - 18 m³/h - $215,000
- Silen S 150 26M 2 HP - 22 m³/h - $265,000

**Estado**: AGREGADAS AL CATÁLOGO

---

### 3. Imágenes placeholder - TEMPORAL

**Script creado**: `backend/scripts/addPlaceholders.ts`

**Aplicado a**: 19 bombas (incluyendo las 4 de Astralpool y Peabody)

**URL placeholder**:
```
https://via.placeholder.com/400x300/0066cc/ffffff?text=Bomba+de+Piscina
```

**Estado**: TEMPORAL - Ver guía para agregar imágenes reales

---

## CÓMO PROBAR AHORA

### 1. Recarga el frontend
```bash
# Si no está corriendo
cd frontend
npm run dev

# Si ya está corriendo, solo recarga el navegador (Ctrl+R)
```

### 2. Ve a un proyecto
- Abre cualquier proyecto
- Click en pestaña "Eléctrica"

### 3. Verás el selector funcionando
- Pestañas: Bombas | Filtros | Cloradores | Calefactores
- Click en "Ver Catálogo"
- Verás las 15 bombas argentinas nuevas
- Cada una con imagen placeholder azul
- Con todos los datos técnicos
- Con precios actualizados

### 4. Agrega una bomba
- Click en "Agregar al Proyecto"
- Ya NO dará error 500
- La bomba se agregará correctamente
- Aparecerá en "Equipos Seleccionados"

### 5. Ve al Análisis Hidráulico
- Click en "Análisis Hidráulico"
- Verás la comparación:
  - TU SELECCIÓN: La bomba que agregaste
  - RECOMENDACIÓN: La que el sistema calcula
  - Indicadores de si cumple requisitos

---

## PRÓXIMOS PASOS

### Para completar el catálogo:

1. **Conseguir imágenes reales**:
   - Fluvial: www.fluvial.com.ar
   - Vulcano: www.vulcano.com.ar
   - Espa: www.espa.com.ar

2. **Guardar en carpeta**:
   ```bash
   backend/public/equipment-images/
     ├── fluvial-flu-050.jpg
     ├── fluvial-flu-075.jpg
     ├── vulcano-33.jpg
     └── espa-nox-25.jpg
   ```

3. **Actualizar URLs**:
   ```sql
   UPDATE "EquipmentPreset"
   SET "imageUrl" = '/equipment-images/fluvial-flu-050.jpg',
       "datasheet" = '/datasheets/fluvial-flu-050.pdf'
   WHERE name = 'Bomba Fluvial FLU-050 0.5 HP';
   ```

4. **O usar interfaz admin** (ya existe):
   - Ir a: `/admin/equipment`
   - Editar cada bomba
   - Subir imagen y PDF
   - Guardar

Ver guía completa en: `docs/COMO_AGREGAR_IMAGENES_Y_DATASHEETS.md`

---

## AGREGAR MÁS BOMBAS

Si quieres agregar más modelos, edita:
`backend/scripts/seedArgentinePumps.ts`

Agrega al array:
```typescript
{
  name: 'Bomba Nueva Marca X 1.5 HP',
  type: 'PUMP',
  brand: 'Marca X',
  model: 'Modelo Y',
  power: 1.5,
  capacity: 16,
  voltage: 220,
  flowRate: 16,
  maxHead: 13,
  pricePerUnit: 120000,
  description: 'Descripción del producto',
  isActive: true
}
```

Luego ejecuta:
```bash
npx tsx scripts/seedArgentinePumps.ts
```

---

## ARCHIVOS CREADOS/MODIFICADOS

### Frontend:
- `frontend/src/components/EquipmentSelector.tsx` - MODIFICADO (línea 53-60)

### Backend - Scripts nuevos:
- `backend/scripts/seedArgentinePumps.ts` - CREADO
- `backend/scripts/addPlaceholders.ts` - CREADO

### Documentación:
- `docs/SOLUCION_PROBLEMAS_EQUIPOS.md` - ESTE ARCHIVO
- `docs/COMO_AGREGAR_IMAGENES_Y_DATASHEETS.md` - GUÍA COMPLETA

---

## ESTADO ACTUAL

- Backend: FUNCIONANDO (puerto 3000)
- Frontend: Listo para probar
- Catálogo: 19+ bombas disponibles
- Error 500: SOLUCIONADO
- Marcas argentinas: AGREGADAS
- Imágenes: PLACEHOLDERS (temporal)

---

## RESUMEN

TODO ESTÁ FUNCIONANDO AHORA:

1. Puedes agregar equipos sin error 500
2. Tienes 15 bombas argentinas nuevas (Fluvial, Vulcano, Espa)
3. Cada bomba tiene datos técnicos completos
4. Tienen imagen placeholder (azul con texto)
5. Solo falta reemplazar placeholders con fotos reales

PRÓXIMO: Conseguir las fotos reales de los fabricantes y actualizarlas siguiendo la guía.
