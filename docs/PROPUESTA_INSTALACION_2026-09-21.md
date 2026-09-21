# Propuesta de instalación y presets

Este ajuste reemplaza el criterio de materiales seleccionados descrito en COSTOS_UNIFICADOS_2026-09-21.md.

## Criterio comercial

La Propuesta de instalación cotiza trabajos y servicios. Excluye todas las partidas de tipo material, incluidos materiales de vereda, aun cuando una configuración antigua tuviera habilitado incluirlos. El documento Presupuesto completo permite incorporar materiales con sus precios. No se cambian cantidades ni tarifas de proyectos existentes.

## Panel lateral de exportación

- Selección individual de partidas: modifica el alcance y total de este documento, no el libro Costos.
- Opciones independientes para detalle, unidades/cantidades, tarifas y subtotales. Ocultarlas conserva el importe. Desactivar el detalle deja el total.
- Las opciones se guardan en la configuración de cada plantilla y se aplican a vista previa y HTML/PDF imprimible. El texto preparado para WhatsApp utiliza el mismo alcance y opciones.
- Los campos dinámicos del editor y el resumen económico del dossier usan el total de instalación seleccionado. Los importes escritos manualmente como texto libre no se reinterpretan; deben revisarse por el autor.
- Si se excluyen trabajos, revisar también el alcance redactado y condiciones. Las descripciones libres no se reescriben automáticamente.

## Costos y catálogo

La primera cifra destacada es la instalación. Los materiales y el total completo quedan identificados por separado. La tabla abre mostrando instalación y servicios.

Catálogo por categorías: instalación base, luces/accesorios, veredas/terminaciones, horas, máquinas/traslados, materiales de obra y materiales hidráulicos/eléctricos. Cada preset permite editar nombre, categoría, tipo, unidad, cantidad y tarifa antes de agregarlo. Los presets personalizados se pueden guardar, actualizar y eliminar, sin revalorizar partidas existentes; persisten por obra al guardar Costos. No es aún un catálogo global compartido entre obras.

Las plantillas no inventan precios: comienzan en cero. Para luces extra se cotiza sólo la cantidad adicional; vereda puede cargarse por m² o metro lineal. No agregar una partida manual si el trabajo ya está representado en la base o en adicionales.

## Validación

100 pruebas: 73 backend y 27 frontend. Incluyen exclusión estricta de materiales, compatibilidad con opciones antiguas, selección de partidas sin modificar Costos, ocultación de detalle sin alterar el total, extras por luces y superficie, y persistencia de categorías sin aplicar tarifas a partidas anteriores. Compilación TypeScript y producción verificadas.

La sesión del navegador disponible redirigía al ingreso en la revisión previa. No se verificó visualmente el proyecto privado de Leonardo ni se modificó su presupuesto guardado.
