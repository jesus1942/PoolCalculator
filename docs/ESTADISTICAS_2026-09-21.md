# Estadísticas de instalaciones

Nueva ruta protegida `/statistics`, accesible desde el menú (también móvil) y el panel. Mantiene los cuatro KPI operativos existentes.

- Lee proyectos mediante el servicio autorizado existente; no agrega consultas a otras empresas.
- Deduplica por ID y usa el motor de la propuesta de instalación guardada, con sus exclusiones; nunca incluye materiales.
- Sin permiso económico, no reconstruye importes y advierte si los acumulados son parciales.
- Cuenta obras completadas, aprobadas/en ejecución, presupuestos pendientes y volumen de agua; separa agua completada y prevista.
- Comparación anual y mensual por fecha de creación UTC, con estado actual. No simula fechas de finalización inexistentes.
- Agua calculada desde capacidad del folleto/dimensiones; no pretende ser medición ni registro de entregas.
- Importes ARS nominales, no cobros ni beneficio; excluyen borradores y cancelados. No existen registros de pagos en el esquema actual.
- Tabla enlaza cada proyecto para contrastar los indicadores. Carga, error con reintento y vacío explícitos.

Pruebas nuevas: duplicados, exclusiones de estados/materiales, volumen de folleto, separación previsto/completado, permisos económicos, exclusiones comerciales, agrupación temporal y comparación con base cero. Validación adicional: TypeScript y builds de producción. Sin prueba autenticada sobre proyectos privados del usuario.
