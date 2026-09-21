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

Catálogo por categorías: instalación base, luces/accesorios, veredas/terminaciones, horas, máquinas/traslados, materiales de obra y materiales hidráulicos/eléctricos. Cada preset permite editar nombre, categoría, tipo, unidad, cantidad y tarifa antes de agregarlo. Los presets personalizados se pueden guardar, actualizar y eliminar, sin revalorizar partidas existentes; se guardan inmediatamente por obra con Guardar preset. Eliminar un preset sigue siendo un cambio del borrador que se confirma al guardar Costos. No es aún un catálogo global compartido entre obras.

Las plantillas no inventan precios: comienzan en cero. Para luces extra se cotiza sólo la cantidad adicional; vereda puede cargarse por m² o metro lineal. No agregar una partida manual si el trabajo ya está representado en la base o en adicionales.

## Validación

100 pruebas: 73 backend y 27 frontend. Incluyen exclusión estricta de materiales, compatibilidad con opciones antiguas, selección de partidas sin modificar Costos, ocultación de detalle sin alterar el total, extras por luces y superficie, y persistencia de categorías sin aplicar tarifas a partidas anteriores. Compilación TypeScript y producción verificadas.

La sesión del navegador disponible redirigía al ingreso en la revisión previa. No se verificó visualmente el proyecto privado de Leonardo ni se modificó su presupuesto guardado.


## Corrección de Guardar preset y redondeo

Guardar preset persiste el catálogo inmediatamente mediante el endpoint validado de Costos, confirma el resultado, selecciona el preset y abre su categoría. Para losetas/vereda se utiliza Veredas y terminaciones. Guarda sólo el preset: conserva sin enviar las partidas todavía en edición, actualizando su revisión para el siguiente guardado. Un preset repetido se actualiza por identificador o nombre/tipo/unidad/categoría, sin crear otra copia. Los errores de permisos o revisión se informan y no se presentan como guardados.

En el libro económico, cantidades y tarifas se redondean al entero superior antes de multiplicar. Los residuos binarios próximos a un entero no suben artificialmente el precio. Ejemplo: 11,700256 m² × 65000,00000000002 pasa a 12 m² × $65.000 = $780.000. El cálculo compartido alimenta Costos, propuesta y hoja económica del Excel. Los cómputos geométricos técnicos de origen conservan su precisión; no se reescriben los proyectos históricos.

Validación ampliada a 106 pruebas: 75 backend y 31 frontend, con regresiones del ejemplo de losetas, valores cero, exclusiones, exportación, categoría, deduplicación y conservación del borrador al persistir presets.

## Volumen del modelo y camiones de agua

Modelos incorpora Volumen de agua: capacidad del folleto en m³ o estimación automática por forma y profundidad media. Crear y actualizar el modelo guardan el volumen y su origen; los cambios de dimensiones recalculan sólo modelos automáticos. El valor de folleto se conserva. Los modelos anteriores usan cálculo al leer y guardan la estimación cuando se editan, sin atribuirles un dato de fabricante desconocido.

Costos incorpora Camiones de agua: toma el volumen del modelo y permite ingresar litros por camión. Guarda capacidad contratada y precio opcional en la obra. Viajes = techo(m³ × 1000 / litros por camión), usando el volumen preciso antes de redondear los viajes. Muestra excedente y no cuenta un viaje extra cuando la división es exacta. Ejemplo: 36 m³, 10.000 litros/camión = 4 viajes y 4.000 litros de excedente.

Planificar agua no cobra automáticamente el suministro. Sólo al marcar su inclusión se genera una partida material en el presupuesto completo, nunca en la propuesta de instalación. La capacidad se conserva con Guardar costos y la partida automática se recalcula desde el modelo; no requiere volver a agregarla.

Migración aditiva: dos columnas en PoolPreset (volumen opcional y origen). No se alteran precios ni cantidades guardadas. La estimación geométrica no descuenta escalones ni playa húmeda; cargar la capacidad real cuando exista folleto.

113 pruebas: 81 backend y 32 frontend. Verifican creación/actualización del volumen, prioridad del folleto, formas, conversión m³/litros, viajes exactos y parciales, validación, persistencia y exclusión del agua en la propuesta de instalación.
