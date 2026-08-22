# Pool Installer — Mobile V2

## Objetivo

La interfaz V2 mantiene la identidad visual artesanal/técnica del proyecto y reorganiza la experiencia para operar desde teléfonos sin comprimir la interfaz desktop.

## Navegación global

En mobile la navegación principal es inferior:

- Inicio
- Obras
- Agenda
- Mensajes
- Más

`Más` abre el menú completo y conserva configuración, ayuda, administración y cambio de organización según permisos.

En desktop se mantiene el sidebar.

## Pantallas V2

### Dashboard

`frontend/src/pages/DashboardV2.tsx`

Prioriza obras activas, agenda, condiciones de trabajo y alertas. La pantalla nace usando los tokens `artisan.css` y componentes `rough-*`, sin depender del remapeo visual del dashboard legado.

### Proyectos

`frontend/src/pages/ProjectsV2.tsx`

Listado mobile-first con filtros de estado. Conserva creación, edición, eliminación, permisos y costos.

### Detalle de proyecto

`frontend/src/pages/ProjectDetail.tsx`

En mobile las secciones se agrupan en Obra, Instalación, Gestión y Documentos mediante `ProjectMobileSectionNav`. En desktop se conservan accesos rápidos horizontales.

### Hidráulica

`frontend/src/components/hydraulic/HydraulicWorkspace.tsx`

Una sola sección contiene:

- Diseño
- 3D
- Equipos
- Cálculo
- Materiales

El plano 2D sigue siendo la fuente editable del proyecto. El análisis profesional y la lista de materiales leen la misma configuración. La vista 3D usa `TechnicalPoolScene` y tiene fallback SVG.

### Agenda

`frontend/src/pages/AgendaExperience.tsx`

En teléfono presenta una lista de trabajo orientada a hoy/próximos siete días. La agenda administrativa completa sigue disponible desde `Gestionar` y permanece como vista principal en desktop.

### Modelos

`frontend/src/pages/PoolModelsExperience.tsx`

En teléfono presenta catálogo compacto y buscable. La administración completa del catálogo sigue disponible desde `Administrar` y permanece como vista principal en desktop.

### Instalador

`frontend/src/pages/InstallerV2.tsx`

Flujo orientado a la ejecución en obra: trabajo seleccionado, estado, notas, clima, fotos y mensajes.

### Chat

`frontend/src/pages/ChatExperience.tsx`

Se conserva la lógica responsive del chat existente (lista/hilo), corrigiendo el viewport para convivir con header y navegación inferior.

## Three.js

`frontend/src/components/visual/TechnicalPoolScene.tsx`

La escena se carga de forma diferida con versión fijada. Si WebGL, red o Three.js no están disponibles, se mantiene un esquema SVG técnico funcional.

## Footer

`frontend/src/components/layout/Footer.tsx`

El footer editorial V2 integra una maqueta técnica 3D. En la aplicación autenticada se muestra en desktop; en mobile se prioriza la navegación de trabajo. La landing pública sí utiliza el footer completo.

## Responsive global

`frontend/src/theme/mobile-v2.css`

Incluye tamaños táctiles, safe-area, prevención de zoom involuntario en formularios, ajustes de viewport para chat y reglas de reducción de movimiento.

## Validación

`.github/workflows/frontend-check.yml` ejecuta en cada push a `main`:

1. `npm --prefix frontend ci --ignore-scripts`
2. `npm --prefix frontend run build`
3. publica el estado `frontend-build` en el commit

El deploy de GitHub Pages continúa usando `.github/workflows/deploy-pages.yml`.
