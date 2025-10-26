# Sistema de Contexto para Claude Code

## 📋 Objetivo

Este sistema permite mantener un historial detallado de todos los cambios realizados en el proyecto, con fecha y autor. Así Claude Code siempre puede saber dónde se quedó la última vez y qué se ha modificado.

## 📁 Archivos del Sistema

- **`.claude-context.json`**: Archivo principal con toda la información del proyecto
- **`context-manager.py`**: Script Python para gestionar el contexto
- **`update-context.sh`**: Script bash simple para actualizaciones rápidas
- **`.claude-context.backup.json`**: Backup automático (se crea al guardar cambios)

## 🚀 Uso Rápido

### Agregar un cambio rápido

```bash
# Usando el script bash (más simple)
./update-context.sh "Descripción del cambio"

# Ejemplo
./update-context.sh "Corregido bug en cálculo de losetas"
```

### Agregar múltiples cambios

```bash
# Usando el script Python
python3 context-manager.py add "Cambio 1" "Cambio 2" "Cambio 3"

# Ejemplo
python3 context-manager.py add \
  "Agregado sistema de notificaciones" \
  "Corregido bug en exportación PDF" \
  "Mejorado rendimiento de cálculos"
```

### Modo interactivo (recomendado para varios cambios)

```bash
python3 context-manager.py interactive
```

Te preguntará:
1. Autor (por defecto: Jesus Olguin)
2. Los cambios uno por uno (Enter vacío para terminar)
3. Confirmación antes de guardar

### Ver historial de cambios

```bash
# Ver últimos 10 cambios
python3 context-manager.py history

# Ver últimos 20 cambios
python3 context-manager.py history 20
```

### Ver resumen del proyecto

```bash
python3 context-manager.py summary
```

## 📊 Estructura del Archivo de Contexto

```json
{
  "projectName": "Pool Calculator",
  "description": "Descripción del proyecto",
  "lastUpdate": "2025-10-10",
  "version": "2.0.0",
  "changelog": [
    {
      "date": "2025-10-10",
      "timestamp": "2025-10-10 15:30:45",
      "author": "Jesus Olguin",
      "changes": [
        "Descripción del cambio 1",
        "Descripción del cambio 2"
      ]
    }
  ],
  "structure": { ... },
  "features": { ... },
  "database": { ... }
}
```

## 🔄 Flujo de Trabajo Recomendado

### Antes de empezar a trabajar

1. Leer el contexto para ver dónde se quedó:
   ```bash
   python3 context-manager.py summary
   python3 context-manager.py history 5
   ```

### Durante el desarrollo

2. Hacer cambios en el código normalmente

### Después de hacer cambios

3. Registrar los cambios:
   ```bash
   python3 context-manager.py interactive
   ```

4. Hacer commit si usas git:
   ```bash
   git add .
   git commit -m "Descripción del commit"
   ```

## 💡 Ejemplos de Uso

### Ejemplo 1: Cambio simple

```bash
./update-context.sh "Agregado botón de exportar a Excel en página de proyectos"
```

### Ejemplo 2: Varios cambios relacionados

```bash
python3 context-manager.py add \
  "Implementado sistema de caché en frontend" \
  "Agregado índice en tabla de proyectos" \
  "Optimizado query de búsqueda de productos"
```

### Ejemplo 3: Sesión de desarrollo completa

```bash
# Al inicio
python3 context-manager.py history 5

# ... hacer cambios ...

# Al final
python3 context-manager.py interactive
# Ingresa:
# - Refactorizado componente ProjectDetail
# - Separado lógica de cálculo en hook personalizado
# - Agregados tests unitarios para cálculos
# - Mejorada documentación de componentes
```

## 🎯 Buenas Prácticas

1. **Registrar cambios al final de cada sesión**: No esperes días para actualizar el contexto

2. **Ser específico**: En lugar de "Arreglado bug", escribe "Corregido cálculo de metros cuadrados en piscinas rectangulares"

3. **Agrupar cambios relacionados**: Si hiciste 5 cambios para una misma funcionalidad, regístralos juntos

4. **Usar el modo interactivo**: Es más cómodo para múltiples cambios

5. **Revisar el historial antes de empezar**: Así sabes qué se hizo recientemente

## 🔧 Personalización

### Cambiar autor por defecto

Edita `context-manager.py` línea ~116:

```python
author = "Tu Nombre Aquí"
```

### Agregar más información al contexto

Edita `.claude-context.json` y agrega nuevos campos. Por ejemplo:

```json
{
  "todos": [
    "Implementar sistema de permisos",
    "Agregar vista de calendario"
  ],
  "bugs": [
    "Error en cálculo cuando piscina es muy grande"
  ]
}
```

## 📝 Notas Importantes

- Los backups se crean automáticamente en `.claude-context.backup.json`
- El archivo usa UTF-8, así que soporta caracteres especiales y acentos
- Si el archivo se corrompe, puedes restaurar desde el backup
- Claude Code lee este archivo automáticamente al iniciar

## 🚨 Solución de Problemas

### Error: "No existe el archivo .claude-context.json"

El archivo ya existe. Si no lo ves, ejecuta:
```bash
ls -la | grep claude-context
```

### Error de permisos en scripts

Dale permisos de ejecución:
```bash
chmod +x update-context.sh context-manager.py
```

### Archivo corrupto

Restaura desde el backup:
```bash
cp .claude-context.backup.json .claude-context.json
```

## 📞 Ayuda

Si necesitas agregar más funcionalidades al sistema de contexto, simplemente:

1. Edita `context-manager.py` para agregar nuevos comandos
2. Edita `.claude-context.json` para agregar nuevos campos
3. Actualiza este README con la nueva funcionalidad

---

**Versión del sistema**: 1.0.0
**Última actualización**: 2025-10-10
**Autor**: Claude Code
