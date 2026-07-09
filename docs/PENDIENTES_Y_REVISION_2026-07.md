# Revisión integral — Julio 2026 (previa a presentación Poliplástica del Golfo)

Resumen de la revisión de arquitectura, cálculos y rediseños hechos el 08/07/2026,
más la lista de pendientes acordados para después de la presentación.

## Qué se verificó y quedó OK

### Arquitectura multi-nivel (creador → tenants → proyectos → compartidos)
- **Creador (Jesús)** = rol `SUPERADMIN`: acceso total a todas las organizaciones.
- **Tenants** = `Organization` + `OrganizationMember` (roles OWNER/ADMIN/MEMBER/VIEWER).
- **Clientes del tenant** = `Project` (cada proyecto es la piscina de un cliente final).
- **Compartir con el cliente final** = `ProjectShare`: usuario/contraseña propios,
  timeline de solo lectura (`PublicTimeline`), sin edición. Costos ocultos salvo
  que el tenant active `showCosts`.
- **Compartir con instaladores** = `ProjectAccess`: `canEdit=false` por defecto y
  `canViewFinancials=false` ⇒ el backend hace strip recursivo de TODOS los campos
  económicos (`sanitizeProjectForAccess` en `backend/src/utils/projectAccess.ts`).
  El admin puede otorgar edición por proyecto (pestañas permitidas incluidas).
- **Intercomunicación** = módulo `Conversation` (tenant ↔ instalador, tenant ↔ cliente)
  + ahora **comentarios del cliente en su timeline** (ver abajo).

### Cálculos (repaso completo)
- Geometría (`calculations.ts`): perímetro/área/volumen OK, incluye fórmula de
  Ramanujan para óvalos y profundidad promedio para fondos con pendiente.
- Losetas (`tileCalculations.ts`): anillo perimetral + filas extra + esquinas OK.
- Cama de arena (`bedCalculations.ts`): volumen = caja de excavación − casco OK.
- Hidráulica (`hydraulicCalculations.ts`): Hazen-Williams (10.67·Q^1.85·L / C^1.85·D^4.87),
  pérdidas singulares K·v²/2g, velocidad Q/A y TDH con factor de seguridad: correctos.
- Eléctrica (`electricalCalculations.ts`): I = P/(V·cosφ·η) y ΔV = 2·L·I·ρ/S con
  límite 3%: correctos.

## Qué se corrigió en esta revisión

1. **Seguridad de shares**: `projectShareController` leía `(req as any).userId`,
   que nunca se setea (el middleware pone `req.user.userId`). Con `userId: undefined`
   Prisma ignoraba el filtro ⇒ cualquier usuario autenticado podía crear/modificar
   el share de cualquier proyecto, y el toggle de visibilidad devolvía 404 siempre.
   Ahora todo pasa por `resolveProjectAccessProfile` (dueño / admin / acceso con edición).
2. **Comentarios del cliente en el timeline** (nuevo): modelo `ProjectClientComment`,
   endpoints públicos por `shareToken` (crear/listar) y de tenant (listar/responder/
   eliminar). UI en `PublicTimeline` (cliente) y `ProjectTimeline` (tenant).
   Tipos: Felicitación / Sugerencia / Consulta / Comentario.
3. **Precios de cama**: la geomembrana y la malla electrosoldada se buscaban por
   nombre en inglés (`GEOMEMBRANE`, `ELECTROWELDED_MESH`) que no matchea el catálogo
   en castellano ⇒ salían con costo $0. Ahora matchean por tipo del enum y por
   nombre en castellano.
4. **Dashboard**: reorganizado en pestañas Resumen / Agenda / Clima / Análisis.
5. **Exportación**: plantillas en una sola fila (sin grillas duplicadas), acciones en
   una fila, panel del editor en pestañas Contenido / Precios / Documento, y las
   opciones "Alcance de instalación" / "Modo comercial" definidas una sola vez.

## Rediseño "Artesanal Sobrio" (handoff de diseño — julio 2026)

Implementado en esta pasada:
- Tokens de ambos temas + ThemeContext con toggle (persistido) + grilla de
  ingeniero + filtros de trazo a mano globales (`#pcRough`/`#pcRoughIcon`).
- Átomos con capa rugosa: `Card`, `Button`, `Input`, `Select` + helpers
  `.rough-*` (`frontend/src/theme/artisan.css`).
- Layout/sidebar re-skineado (nav con barra de acento, separadores punteados,
  toggle de tema, logout).
- Remapeo global de la piel anterior a los tokens (fondos, textos, bordes,
  tintes, gradientes aplanados, cero glow/sombras, títulos en mono).
- Verificado por screenshot: Login (ambos temas), Landing, Dashboard
  (Resumen/Agenda), Proyectos.

Pendiente de re-skin fino (hoy salen con el remapeo global, consistentes
pero sin el trazo rugoso en cada tarjeta interna):
- [ ] Gráficos (recharts) usan colores inline JS (cyan/emerald viejos):
      pasarles la paleta artesanal por props.
- [ ] Chips de eventos de agenda usan `event.typeColor/statusColor` de la BD
      (colores custom por evento): mapear los defaults a los tokens.
- [ ] Trazo rugoso 1:1 en tarjetas internas de: ProjectDetail (12 tabs),
      Agenda (calendario), Chat (burbujas asimétricas del handoff), Settings
      (toggles dibujados), Admin (8 sub-páginas), Estados (toasts/skeleton/
      empty según `PoolStates.dc.html`).
- [ ] Sketches SVG de piscina hechos a mano en tarjetas de Modelos/Proyectos
      (paths en `PoolModels.dc.html` del handoff).
- [ ] Subrayado ondulado del hero de la Landing (path SVG del handoff).
- [ ] Revisión mobile-first pantalla por pantalla (hit targets ≥44px, chat en
      una columna, calendario compacto) según sección mobile del README.

## Pendientes (anotados, NO bloquean la presentación)

- [ ] **Notificar al tenant** cuando el cliente deja un comentario (push/email ya
      existen para agenda; reutilizar `pushNotificationService`).
- [ ] **Invitación por email a la agenda**: hoy solo se puede asignar a usuarios
      YA registrados (la asignación guarda un userId). Si se invita a alguien que
      todavía no tiene cuenta, al registrarse no hereda nada. Falta una tabla de
      invitaciones pendientes por email que se reclame al registrarse, + mail de
      invitación con link.
- [ ] **Export defaults en Configuración**: los logos de marca, condiciones
      comerciales por defecto y modo comercial inicial siguen definidos por
      proyecto/en código. Crear pestaña "Exportación" en Configuración con
      defaults a nivel usuario/organización.
- [ ] **Unificar el cálculo de vereda del frontend**: `EnhancedExportManager.
      calculateSidewalkArea()` usa ancho de loseta hardcodeado 0.30 m (solo para
      recomendar equipos); el backend usa 0.40/0.50 según tipo de anillo. Mover a
      un solo cálculo compartido.
- [ ] **Estimación de pastina**: `totalPerimeterWithRows` en `tileCalculations.ts`
      duplica el aporte por fila (× 2). Es una aproximación generosa; revisar con
      datos reales de obra antes de ajustar (los precios están calibrados con la
      fórmula actual).
- [ ] **INSTALLER en API**: el rol instalador solo puede usar `/api/agenda` y
      `/api/weather` (middleware `authenticate`). Si se quiere que vea el proyecto
      compartido sin datos económicos vía `ProjectAccess`, hay que permitirle
      `GET /api/projects/:id` (la sanitización financiera ya funciona).
- [ ] **Code-split del frontend**: bundle principal ~1.7 MB; separar exportación
      (html2canvas/jspdf) con dynamic import.
- [ ] **Typecheck estricto**: `vite build` no corre `tsc`; `npm run build:check`
      tiene errores preexistentes (TileEditor, tipos de plumbingConfig, CSS vars).
      Limpiarlos y activar `build:check` en CI.
- [ ] **CORS**: el backend permite cualquier origen ("permitir todos en desarrollo")
      también en producción. Restringir a los dominios de Pages/Railway.
