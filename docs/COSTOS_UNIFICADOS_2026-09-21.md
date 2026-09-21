# Costos unificados — 21 de septiembre de 2026

## Cambio de uso

La pestaña **Costos** reúne partidas, presets, tareas, roles/tarifas y adicionales. Las antiguas pestañas económicas dejan de competir en la navegación del proyecto. Hidráulica, Eléctrica y Losetas mantienen su configuración técnica; sus cantidades y precios de origen se reflejan en Costos. Una corrección explícita en Costos prevalece para esta obra y puede restaurarse a su origen.

1. Revisar el criterio de mano de obra. Una tarifa comercial de modelo y el costo de sus tareas son alternativas, nunca se suman ambas.
2. Revisar cantidades, unidades y tarifas. Desmarcar una partida excluye su importe. Una tarifa cero se respeta.
3. Usar presets de hora, hora hombre, hora máquina, jornada, m², metro lineal, unidad, m³, camionada o global. Los precios nuevos empiezan en cero para completar con valores reales.
4. Horas hombre = personas × horas por persona. Horas máquina = equipos × horas de uso. Camionadas = redondeo hacia arriba de volumen requerido / capacidad por viaje; la tarifa se expresa por viaje completo.
5. Guardar costos antes de cambiar de sección o exportar. Los borradores no afectan documentos. Los presets personalizados quedan guardados en la obra; las tarifas globales por rol siguen en su sección interna y no revalorizan tareas anteriores automáticamente.

## Una fuente de importes

`backend/src/utils/projectPricing.ts` es un motor puro importado también por el frontend. Alimenta Costos, Vista General, total de la respuesta de proyectos, detalle económico de propuestas y presupuesto detallado, mensajes preparados para WhatsApp y la hoja Costos del Excel.

- Adicionales: se cobra `max(0, nueva cantidad − cantidad incluida de fábrica)`.
- Referencias exactas de catálogo representadas en hidráulica/eléctrica descuentan las unidades materiales cubiertas, conservando la mano de obra adicional. No se eliminan partidas sólo por parecido de nombres.
- El desglose de materiales no suma bolsas y kilos, ni m³ y bolsones de un mismo insumo. Cuando no concilia con el importe histórico se conserva el total agregado, en lugar de inventar una diferencia negativa.
- Las líneas tienen origen identificable. Ajustes cuyo origen desapareció se advierten y no se cobran.
- No se añade en Exportar un recargo fijo de calefacción ajeno a Costos. Cualquier servicio debe estar representado en las partidas.
- Exportar permite elegir el alcance (completo o mano de obra con materiales de obra seleccionados), pero ya no permite escribir otro total manual. Los valores manuales antiguos se conservan en configuración por compatibilidad, pero no se usan como fuente de importes.
- El editor de texto comercial se conserva. Si se utiliza texto personalizado, se adjunta el detalle económico vigente; los importes escritos como texto libre requieren revisión del autor.
- El dossier utiliza el presupuesto completo en su sección económica. Las fichas técnicas y el listado técnico conservan sus funciones y cálculos geométricos.
- Excel agrega una hoja Costos activa con partidas, unidad, cantidad, tarifa, subtotal, revisión y total. Las hojas técnicas conservan sus fórmulas propias; no son la fuente del importe cotizado.

## Persistencia y seguridad

No hay migración ni reescritura masiva de proyectos. Los ajustes se guardan en `exportSettings.costing` mediante `PUT /projects/:id/costing`, validando campos, unidades e importes. Exige edición, visibilidad financiera y permiso Costos. Revisión y comparación atómica de `updatedAt` evitan sobrescribir cambios de otra sesión. Guardar la configuración de Exportar conserva el libro contable vigente. Los usuarios sin visibilidad financiera no reciben el libro ni sus presets.

## Verificación

- 94 pruebas: 72 backend y 22 frontend; ninguna falló.
- Compilación TypeScript y build de servidor/frontend aprobados.
- Nuevas regresiones: cantidades extra, tarifa cero, modelo/tareas, cobertura parcial de catálogo, preservación de MO, nombres parecidos, unidades equivalentes, conciliación, ajustes huérfanos, validación, aislamiento y conflictos concurrentes.
- Exportaciones: coincidencia de totales, selección de alcance, descarte de overrides antiguos y escape de texto HTML.
- Excel generado y reabierto localmente: subtotales y total coinciden, excluidos ausentes, revisión preservada y nombres que comienzan con `=` tratados como texto.
- No se verificó visualmente la nueva pestaña autenticada ni el PDF real de Leonardo: el navegador disponible siguió redirigiendo al ingreso. El usuario indicó el proyecto de Leonardo que termina en `009a`; no se modificaron sus datos mediante la sesión privada ni se intervino el segundo proyecto.

Los errores de cálculo corregidos pueden cambiar el total mostrado de obras que tenían unidades incluidas cobradas otra vez. Revisar sus partidas antes de enviar una propuesta; no se ajustó ningún proyecto para alcanzar un precio objetivo.
