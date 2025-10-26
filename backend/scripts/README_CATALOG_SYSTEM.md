# 📚 Sistema de Gestión de Catálogos de Piscinas

Sistema automatizado para procesar catálogos PDF de piscinas, convertirlos a imágenes PNG y poblar la base de datos.

---

## 🎯 Características

✅ **Opción A**: Carga manual modelo por modelo desde la interfaz web
✅ **Opción B**: Importación masiva automática desde catálogo PDF
✅ **Opción C**: Auto-asignación de imágenes al crear modelos

---

## 📁 Estructura de Archivos

```
/assets/                                    # PDFs de catálogos
├── catalogo-piletas-acquam.pdf            # Catálogo principal (25 modelos)
└── [Nombre Piscina].pdf                   # Catálogos individuales

/backend/public/pool-images/               # Imágenes PNG generadas
├── acquam-page-03.png                     # Jacuzzi
├── acquam-page-04.png                     # Topacio
├── ...
└── Cuarzo Rosa.png                        # Catálogos adicionales

/backend/scripts/
├── process-pool-catalogs.sh               # Convierte PDF → PNG
├── bulk-import-catalog.js                 # Importación masiva
├── update-pool-images.js                  # Asigna imágenes a modelos existentes
└── add-pool-preset.js                     # Agregar modelo individual
```

---

## 🚀 Opción A: Carga Manual desde Web (Recomendado)

### Crear modelo desde la interfaz:

1. Acceder a http://localhost:5173
2. Ir a **"Modelos de Piscinas"**
3. Click en **"Crear Nuevo Modelo"**
4. Llenar el formulario con:
   - Nombre (ej: "Esmeralda")
   - Dimensiones
   - Forma
   - Espacios de colchón
5. **NO subir imagen** - se asignará automáticamente si existe en el catálogo
6. Guardar

### ¿Qué pasa automáticamente?

El sistema busca si hay una imagen con ese nombre en el catálogo:
- ✅ Si existe → Se asigna automáticamente
- ❌ Si no existe → Se crea sin imagen (puedes subirla después)

---

## 📦 Opción B: Importación Masiva (Recomendado para catálogos completos)

### Paso 1: Agregar PDF del catálogo

```bash
# Copiar el PDF a la carpeta assets
cp "NuevoCatalogo.pdf" /home/jesusolguin/Projects/pool-calculator/assets/
```

### Paso 2: Procesar el PDF (Convertir a PNG)

```bash
cd /home/jesusolguin/Projects/pool-calculator/backend/scripts
./process-pool-catalogs.sh
```

**Resultado:**
```
🔍 Buscando catálogos PDF en: /assets
📄 Procesando: NuevoCatalogo.pdf
   Convirtiendo a PNG...
   ✅ Creado: NuevoCatalogo.png (3.9M)
```

### Paso 3: Agregar al mapping

Editar `/backend/scripts/update-pool-images.js`:

```javascript
const modelImageMapping = {
  // ... modelos existentes ...
  'NuevoModelo': 'NuevoCatalogo.png',  // ← Agregar esta línea
};
```

También editar `/backend/src/controllers/poolPresetController.ts` (mismo mapping).

### Paso 4: Agregar dimensiones al script de importación masiva

Editar `/backend/scripts/bulk-import-catalog.js`:

```javascript
const catalogData = {
  // ... modelos existentes ...
  'NuevoModelo': {
    length: 5.0,
    width: 3.0,
    depth: 1.3,
    depthEnd: 1.5,
    shape: 'RECTANGULAR'
  },
};
```

### Paso 5: Ejecutar importación masiva

```bash
cd /home/jesusolguin/Projects/pool-calculator/backend/scripts
node bulk-import-catalog.js
```

**Resultado:**
```
📚 Importación masiva de catálogo ACQUAM
👤 Usando usuario: Jesus Olguin
✅ Creada: NuevoModelo (5.0x3.0m) - ID: abc123...
🖼️  Actualizando imágenes de piscinas nuevas...
✅ NuevoModelo -> /pool-images/NuevoCatalogo.png
```

---

## 🔄 Flujo de Trabajo Recomendado

### Para un catálogo con múltiples piscinas:

```bash
# 1. Copiar PDF
cp Catalogo2024.pdf /home/jesusolguin/Projects/pool-calculator/assets/

# 2. Convertir a PNG (si es catálogo de una sola página)
cd backend/scripts
./process-pool-catalogs.sh

# 3. Si es catálogo multipágina, usar pdftoppm manualmente:
cd /home/jesusolguin/Projects/pool-calculator/assets
pdftoppm -png -r 300 Catalogo2024.pdf backend/public/pool-images/catalogo2024-page

# 4. Actualizar mappings y datos en bulk-import-catalog.js

# 5. Ejecutar importación
node bulk-import-catalog.js
```

---

## 📝 Scripts Disponibles

### `process-pool-catalogs.sh`
**Propósito**: Detecta PDFs nuevos en `/assets`, los convierte a PNG y los guarda en `/pool-images`

**Uso**:
```bash
./process-pool-catalogs.sh
```

**Características**:
- Ignora el catálogo principal (`catalogo-piletas-acquam.pdf`)
- Detecta si ya existe PNG con ese nombre
- Convierte a 300 DPI (alta calidad)
- Muestra instrucciones de siguientes pasos

---

### `bulk-import-catalog.js`
**Propósito**: Importa múltiples modelos de piscina a la vez

**Uso**:
```bash
node bulk-import-catalog.js
```

**Características**:
- Verifica si el modelo ya existe (no crea duplicados)
- Usa el primer usuario disponible o ADMIN
- Asigna imágenes automáticamente después de crear
- Muestra resumen de operaciones

---

### `update-pool-images.js`
**Propósito**: Actualiza URLs de imágenes para modelos existentes

**Uso**:
```bash
node update-pool-images.js
```

**Características**:
- Busca modelos por nombre exacto
- Actualiza campo `imageUrl`
- Salta modelos no encontrados
- No crea nuevos modelos

---

### `add-pool-preset.js`
**Propósito**: Agregar un modelo individual de forma interactiva

**Uso**:
```bash
node add-pool-preset.js
```

**Proceso interactivo**:
1. Solicita nombre de la piscina
2. Solicita dimensiones
3. Solicita forma
4. Confirma antes de crear
5. Actualiza imagen automáticamente

---

## 🗂️ Modelos Actuales en el Catálogo

### Catálogo ACQUAM Principal (25 modelos):

| Modelo | Dimensiones | Forma | Imagen |
|--------|-------------|-------|--------|
| Jacuzzi | 2.8×2.8×1.0m | Rectangular | acquam-page-03.png |
| Topacio | 3.5×2.5×1.2m | Rectangular | acquam-page-04.png |
| Cuarzo | 4.0×2.5×1.2m | Rectangular | acquam-page-05.png |
| Tanzanita | 4.5×2.5×1.3m | Rectangular | acquam-page-06.png |
| Jaspe | 5.0×2.5×1.3m | Rectangular | acquam-page-07.png |
| Circón | 5.5×3.0×1.3m | Rectangular | acquam-page-08.png |
| Ambar | 6.0×3.0×1.3-1.5m | Rectangular | acquam-page-09.png |
| Amatista | 6.5×3.1×1.3-1.6m | Rectangular | acquam-page-10.png |
| **Turquesa** | **6.5×3.1×1.3-1.6m** | **Rectangular** | **acquam-page-11.png** |
| Turmalina | 7.0×3.2×1.3-1.6m | Rectangular | acquam-page-12.png |
| Gema Azul | 7.3×3.5×1.4-1.6m | Rectangular | acquam-page-13.png |
| Ópalo | 8.0×3.6×1.4-1.7m | Rectangular | acquam-page-14.png |
| Agua Marina | 8.5×3.7×1.4-1.8m | Rectangular | acquam-page-15.png |
| Ágata | 9.0×3.8×1.4-1.8m | Rectangular | acquam-page-16.png |
| Zafiro Azul | 9.5×4.0×1.5-1.9m | Rectangular | acquam-page-17.png |
| Onix | 10.0×4.0×1.5-2.0m | Rectangular | acquam-page-18.png |
| Zafiro | 11.0×4.2×1.5-2.0m | Rectangular | acquam-page-19.png |
| Espinela | 12.0×4.5×1.5-2.1m | Rectangular | acquam-page-20.png |
| Aventurina | 6.0×4.0×1.3m | Kidney | acquam-page-21.png |
| Alejandrita | 7.0×4.0×1.3-1.5m | Kidney | acquam-page-22.png |
| Diamante Rojo | 8.0×4.5×1.4-1.6m | Kidney | acquam-page-23.png |
| Kriptonita | 8.0×4.0×1.3-1.6m | L-Shaped | acquam-page-25.png |
| Coral | 9.0×4.5×1.4-1.7m | L-Shaped | acquam-page-26.png |
| Jade | 10.0×4.5×1.5-1.8m | L-Shaped | acquam-page-27.png |

### Catálogos Adicionales:

| Modelo | Dimensiones | Forma | Imagen |
|--------|-------------|-------|--------|
| **Cuarzo Rosa** | **4.0×2.5×1.2m** | **Rectangular** | **Cuarzo Rosa.png** |

---

## 🛠️ Troubleshooting

### Error: "pdftoppm not found"
```bash
sudo pacman -S poppler  # Manjaro/Arch
```

### Error: "No se encontró usuario"
Crear un usuario desde la web primero en http://localhost:5173/register

### Las imágenes no se muestran
1. Verificar que el archivo PNG existe en `/pool-images/`
2. Ejecutar `node update-pool-images.js`
3. Refrescar navegador (Ctrl+Shift+R)

### Modelo creado pero sin imagen
```bash
# Agregar al mapping y ejecutar:
node update-pool-images.js
```

---

## 📊 Estado Actual del Sistema

✅ **25 modelos** del catálogo principal
✅ **1 modelo adicional** (Cuarzo Rosa)
✅ **Todas las imágenes** asignadas correctamente
✅ **Auto-asignación** funcionando en creación desde web
✅ **Importación masiva** lista para usar

---

## 🎯 Próximos Pasos Sugeridos

1. ✅ Sistema funcionando completamente
2. 💡 Agregar vista previa de imagen en el formulario de creación
3. 💡 Botón "Sincronizar Catálogo" en la interfaz web
4. 💡 API endpoint para subir PDF y procesarlo automáticamente
