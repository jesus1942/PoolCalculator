# CÓMO AGREGAR IMÁGENES Y DATASHEETS A LOS EQUIPOS

## PROBLEMA ACTUAL
- Las bombas están en el catálogo pero SIN fotos
- NO tienen datasheets (PDFs)
- Esto hace que el selector se vea vacío

## SOLUCIÓN: 3 OPCIONES

---

## OPCIÓN 1: Actualizar manualmente en base de datos (RÁPIDO)

### Para agregar URLs de imágenes externas:

```sql
-- Ejemplo: Agregar imagen de Fluvial desde un sitio web
UPDATE "EquipmentPreset"
SET "imageUrl" = 'https://ejemplo.com/bomba-fluvial-050.jpg',
    "catalogPage" = 'https://fluvial.com.ar/productos/flu-050',
    "datasheet" = 'https://fluvial.com.ar/pdf/flu-050-datasheet.pdf'
WHERE name = 'Bomba Fluvial FLU-050 0.5 HP';
```

### Script para actualizar múltiples bombas:

```typescript
// backend/scripts/updatePumpImages.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const pumpImages = [
  {
    name: 'Bomba Fluvial FLU-050 0.5 HP',
    imageUrl: 'URL_DE_LA_IMAGEN',
    catalogPage: 'URL_DEL_CATALOGO',
    datasheet: 'URL_DEL_PDF'
  },
  // ... más bombas
];

async function updateImages() {
  for (const pump of pumpImages) {
    await prisma.equipmentPreset.update({
      where: { name: pump.name },
      data: {
        imageUrl: pump.imageUrl,
        catalogPage: pump.catalogPage,
        datasheet: pump.datasheet
      }
    });
    console.log(`✅ Actualizada: ${pump.name}`);
  }
}

updateImages();
```

---

## OPCIÓN 2: Usar API de carga de imágenes (RECOMENDADO)

### Paso 1: Preparar archivos
```bash
# Estructura de carpetas
backend/public/equipment-images/
  ├── fluvial-flu-050.jpg
  ├── fluvial-flu-075.jpg
  ├── vulcano-33.jpg
  ├── espa-nox-25.jpg
  └── ...

backend/public/datasheets/
  ├── fluvial-flu-050.pdf
  ├── fluvial-flu-075.pdf
  └── ...
```

### Paso 2: Script de carga automática
```typescript
// backend/scripts/uploadEquipmentMedia.ts
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function uploadMedia() {
  const pumps = await prisma.equipmentPreset.findMany({
    where: { type: 'PUMP', brand: { in: ['Fluvial', 'Vulcano', 'Espa'] } }
  });

  for (const pump of pumps) {
    // Buscar imagen
    const imageName = pump.model.toLowerCase().replace(/\s+/g, '-');
    const imagePath = path.join(__dirname, '../public/equipment-images', `${imageName}.jpg`);

    if (fs.existsSync(imagePath)) {
      await prisma.equipmentPreset.update({
        where: { id: pump.id },
        data: {
          imageUrl: `/equipment-images/${imageName}.jpg`
        }
      });
      console.log(`✅ Imagen: ${pump.name}`);
    }

    // Buscar datasheet
    const pdfPath = path.join(__dirname, '../public/datasheets', `${imageName}.pdf`);

    if (fs.existsSync(pdfPath)) {
      await prisma.equipmentPreset.update({
        where: { id: pump.id },
        data: {
          datasheet: `/datasheets/${imageName}.pdf`
        }
      });
      console.log(`✅ PDF: ${pump.name}`);
    }
  }
}

uploadMedia();
```

### Paso 3: Ejecutar
```bash
cd backend
npx tsx scripts/uploadEquipmentMedia.ts
```

---

## OPCIÓN 3: Interfaz admin en el frontend (FUTURO)

Ya existe el componente `EquipmentManager` en:
`frontend/src/pages/Admin/EquipmentManager.tsx`

### Para activarlo:

1. Agregar ruta en el frontend:
```typescript
// frontend/src/App.tsx
import { EquipmentManager } from '@/pages/Admin/EquipmentManager';

<Route path="/admin/equipment" element={<EquipmentManager />} />
```

2. Ir a: `http://localhost:5173/admin/equipment`

3. Desde ahí puedes:
   - Ver todos los equipos
   - Click en "Editar"
   - Subir imagen principal
   - Subir imágenes adicionales
   - Subir datasheet (PDF)
   - Guardar

---

## DÓNDE CONSEGUIR IMÁGENES Y DATASHEETS

### Fluvial
- Web: https://www.fluvial.com.ar/
- Catálogo: Buscar en "Productos > Bombas para piscinas"
- Descargar imágenes y PDFs de la web oficial

### Vulcano
- Web: https://www.vulcano.com.ar/
- Catálogo: Buscar en "Piscinas > Bombas"
- Descargar fichas técnicas

### Espa
- Web: https://www.espa.com/ (España)
- Distribuidor Argentina: https://www.espa.com.ar/
- Catálogo: Descargar catálogo completo en PDF
- Extraer imágenes individuales

---

## SOLUCIÓN TEMPORAL: Usar placeholder

Mientras consigues las imágenes reales, puedes usar:

```typescript
// backend/scripts/addPlaceholders.ts
const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x300/0066cc/ffffff?text=Bomba';

await prisma.equipmentPreset.updateMany({
  where: {
    imageUrl: null,
    type: 'PUMP'
  },
  data: {
    imageUrl: PLACEHOLDER_IMAGE
  }
});
```

---

## VERIFICAR QUE FUNCIONÓ

```bash
# Ver bombas con imágenes
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const pumps = await prisma.equipmentPreset.findMany({
  where: { type: 'PUMP', brand: 'Fluvial' },
  select: { name: true, imageUrl: true, datasheet: true }
});
console.table(pumps);
process.exit(0);
"
```

---

## RECOMENDACIÓN INMEDIATA

Para que funcione AHORA mismo, ejecuta esto:

```bash
cd backend

# Agregar URLs de ejemplo (cambia por URLs reales)
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Placeholder temporal
await prisma.equipmentPreset.updateMany({
  where: { type: 'PUMP', imageUrl: null },
  data: {
    imageUrl: 'https://via.placeholder.com/400x300/0066cc/ffffff?text=Bomba+de+Piscina',
    catalogPage: 'https://ejemplo.com/catalogo'
  }
});

console.log('✅ Placeholders agregados');
process.exit(0);
"
```

Ahora al menos verás una imagen placeholder en lugar de un espacio vacío.

---

## SIGUIENTE PASO

1. Consigue las imágenes reales de los fabricantes
2. Guárdalas en `backend/public/equipment-images/`
3. Guarda los PDFs en `backend/public/datasheets/`
4. Ejecuta el script de carga
5. Recarga el frontend

El selector mostrará las imágenes inmediatamente!
