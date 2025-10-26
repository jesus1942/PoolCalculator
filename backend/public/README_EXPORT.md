# 📊 Exportación de Proyectos a Excel

Esta funcionalidad permite exportar cualquier proyecto de la aplicación como una nueva hoja en el archivo Excel de materiales, siguiendo el mismo formato de las hojas existentes.

## 🚀 Cómo usar

### Desde la API:

**Endpoint:** `POST /api/projects/:id/export-excel`

**Headers:**
```
Authorization: Bearer <tu_token_jwt>
Content-Type: application/json
```

**Ejemplo con curl:**
```bash
curl -X POST http://localhost:3000/api/projects/<PROJECT_ID>/export-excel \
  -H "Authorization: Bearer <TU_TOKEN>" \
  -H "Content-Type: application/json"
```

### Desde el Frontend:

1. Navegar al proyecto que deseas exportar
2. Ir a la pestaña **"Exportar"**
3. Hacer click en el botón verde **"Excel ACQUAM"**
4. Esperar la confirmación de éxito

El botón se encuentra junto a los otros botones de exportación (PDF, HTML, WhatsApp, CSV).

## 📁 Ubicación del Excel

El archivo se actualiza en:
```
/home/jesusolguin/Projects/pool-calculator/backend/public/CALCULADORA MATERIALES AQUAM.xlsx
```

## 📋 Formato de la hoja exportada

La nueva hoja incluye:

### Información del Proyecto
- Fecha de exportación
- Cliente
- Domicilio
- Descripción de la piscina (dimensiones y profundidad)

### Materiales de PVC (40mm)
- Codo 90°
- Codo 45°
- Tee
- Válvula de corte (esférica)
- Caños PN10 x 6 m

### Adicionales
- Pegamento PVC azul x 500 ml
- Acetona x 1 Litro
- Cinta teflón ALTA DENSIDAD
- Pasta selladora 1 tubo
- Abrazaderas

### Materiales de Construcción
- Tanza roja
- Spray o tiza
- Estacas
- Nylon/Geotextil
- Cemento 50 kg
- Malla sima 6 mm
- Ladrillos cerámicos
- Mixto para relleno (m³)
- Mixto para la cama (m³)
- Arena Gruesa (m³)

## 🔍 Comparación con Excel Manual

Una vez exportado el proyecto, podrás:

1. Abrir el archivo Excel
2. Ver la nueva hoja con el nombre del proyecto
3. Comparar los cálculos de la app con los cálculos manuales
4. Identificar discrepancias y ajustar según sea necesario

## ⚙️ Detalles Técnicos

- **Script Python:** `/backend/public/export_to_excel.py`
- **Controlador:** `/backend/src/controllers/projectController.ts` → `exportToExcel()`
- **Ruta:** `/backend/src/routes/projectRoutes.ts`
- **Librería:** `openpyxl` (Python)

## 🐛 Troubleshooting

### Error: "Python3 no encontrado"
Instalar Python 3:
```bash
sudo pacman -S python  # Manjaro/Arch
```

### Error: "openpyxl no encontrado"
Instalar openpyxl:
```bash
pip install openpyxl
```

### Error: "Permiso denegado"
Verificar permisos del script:
```bash
chmod +x /home/jesusolguin/Projects/pool-calculator/backend/public/export_to_excel.py
```

## 📝 Notas

- Si ya existe una hoja con el mismo nombre, se reemplazará automáticamente
- Los nombres de hoja tienen un límite de 31 caracteres
- El archivo Excel original se modifica directamente (hacer backup si es necesario)
- La exportación requiere autenticación (JWT token)
- Solo el dueño del proyecto o un admin puede exportar
