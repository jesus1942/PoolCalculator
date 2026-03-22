# Vista Hidraulica SVG

## Objetivo

Esta vista es la base de trabajo para la edicion tecnica de instalaciones dentro de `Hidraulica` y debe preservarse como referencia para futuras vistas, especialmente la pestaña de `Electrica`.

Archivo principal:

- `frontend/src/components/PlumbingEditor.tsx`

## Alcance actual

- Planta tecnica en SVG dentro de ventana flotante.
- Pileta rectangular escalada en metros.
- Playa humeda, escalera y pared interna dibujadas en la geometria.
- Bocas hidraulicas arrastrables con persistencia.
- Equipo arrastrable con persistencia.
- Ramales exteriores perimetrales.
- Colector tipo arbol para retornos.
- Colector tipo arbol para hidrojets.
- Workspace con zoom, paneo explicito y panel lateral ocultable.
- Workspace del equipo en segunda ventana flotante.
- Bloques principales del equipo arrastrables:
  - manifold de entrada
  - bomba de filtrado
  - filtro
  - bloque de calefaccion / bypass
  - manifold de salida
  - bomba de hidrojets
- Archivo compartible del workspace del equipo para trabajo aislado:
  - `frontend/src/components/hydraulic/EquipmentWorkspacePreview.shared.tsx`

## Reglas de la vista

- Los caños nunca deben cruzar por dentro del espejo de agua si el recorrido real va por afuera.
- El drag de accesorios tiene prioridad sobre el paneo del workspace.
- El autosave silencioso ocurre al soltar una interaccion, no durante el arrastre.
- El guardado manual sigue siendo un flujo separado del autosave.
- La geometria de la pileta y de los elementos internos debe seguir expresada en metros y luego escalarse a SVG.
- El workspace del equipo debe tomar los equipos reales del proyecto antes de inventar equipos genericos.
- La bomba mas potente puede reasignarse al circuito de hidrojets si el proyecto tiene hidrojets y hay mas de una bomba.

## Persistencia

Se persiste en `project.plumbingConfig`:

- `distanceToEquipment`
- `hydraulicLayout.referenceSide`
- `hydraulicLayout.equipmentOffsetMeters`
- `hydraulicLayout.equipmentHeightFromZero`
- `hydraulicLayout.equipmentBaseHeightFromFloor`
- `hydraulicLayout.equipmentWorkspaceLayout`
- `hydraulicLayout.points[]`

El autosave silencioso se dispara desde el editor al finalizar una interaccion de drag y se resuelve en `ProjectDetail.tsx` sin recargar la pagina ni cambiar de pestaña.

## Piezas claves del codigo

- `HydraulicCssPreview`
  - workspace SVG editable
  - zoom / paneo
  - drag de puntos y equipo
  - dibujo de caños y colectores
- `collectorRouteToEquipment(...)`
  - unifica la salida del colector hacia el equipo
- `pointPipeRoute(...)`
  - resuelve rutas perimetrales exteriores para puntos individuales
- `handleAutoSavePlumbingConfig(...)` en `ProjectDetail.tsx`
  - persistencia silenciosa sin recarga de vista
- `EquipmentWorkspacePreview`
  - sala tecnica SVG editable
  - drag de bloques principales del equipo
  - lectura automatica de bombas, filtro y calefaccion desde el proyecto
- `EquipmentWorkspacePreview.shared.tsx`
  - copia compartible del workspace del equipo
  - util para pasar a otra IA sin arrastrar todo `PlumbingEditor.tsx`

## Restricciones para futuros cambios

- No volver a canvas para la planta principal editable.
- No mezclar autosave con el flujo de guardado manual.
- No reemplazar esta geometria por distribuciones automaticas agresivas sin mantener la edicion manual.
- No romper la compatibilidad con futuras vistas tecnicas de `Electrica`.
- No hardcodear bombas genericas si el proyecto ya trae una bomba real para ese circuito.
- No meter controles de edicion dentro de futuras vistas de exportacion o impresion.

## Siguiente etapa prevista

Sobre esta misma base:

- agrandar y detallar el equipo
- dibujar bombas
- dibujar entradas y salidas
- dibujar valvulas
- distinguir lineas de succion, retorno, hidrojet, aire y calefaccion
- separar una vista tecnica imprimible dentro de la pestaña `Exportacion`
- reutilizar el patron de workspace para la pestaña electrica
