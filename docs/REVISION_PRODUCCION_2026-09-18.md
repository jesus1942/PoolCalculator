# PoolInstaller — revisión del 18 de septiembre de 2026

## Resultado y límites

Esta revisión corrige seguridad, organización del frontend, recuperación de acceso, configuración de integraciones y experiencia pública. No convierte automáticamente el producto en un SaaS con cobro: todavía faltan el ciclo real de suscripción, las condiciones comerciales y pruebas de aceptación con datos de una empresa piloto.

El repositorio conserva el nombre `jesus1942/PoolCalculator`; la marca de la aplicación es PoolInstaller. Frontend en GitHub Pages y también servido por el backend en Railway.

## Lo que conviene conservar

- Cálculo de materiales, modelos, presupuestos y proyecto en una ficha vinculada.
- Agenda, cuadrillas, avances y portal del cliente: hay una base útil para gestionar la ejecución.
- Modelo de organizaciones y permisos de proyecto, ahora comprobados contra las membresías vigentes.
- Identidad visual de papel, arena, verde azulado y trazos dibujados a mano.

## Correcciones incorporadas

- La autorización consulta usuario, membresía y versión de sesión en cada solicitud. Un ADMIN de empresa no es SUPERADMIN de plataforma.
- Los cambios de contraseña invalidan sesiones previas. Recuperación guarda un hash del token y lo consume una sola vez mediante transacción.
- OAuth usa estado firmado vinculado al navegador; no imprime tokens y entrega el JWT en fragmento de URL. Se verifica el email de Google antes de vincularlo.
- Operaciones de proyectos, avances, agenda, checklist, cuadrillas, conversaciones y adicionales comprueban pertenencia y permisos. Los cambios de proyecto no aceptan propietario, organización ni escrituras Prisma anidadas aportadas por el cliente.
- Catálogos compartidos reservan sus cambios a SUPERADMIN. Configuraciones personales sólo aceptan campos explícitos.
- Se retiraron cuatro páginas antiguas y componentes exclusivos que no estaban conectados a rutas. Las vistas Experience que reutilizan lógica activa se conservaron.
- Carga por página y pestaña, pantalla de error recuperable, página no encontrada y manejo común de sesiones. Se eliminó el splash artificial de 3,5 segundos.
- Formularios con etiquetas asociadas, contraste corregido y protección contra doble envío. El contacto confirma registro persistido, sin afirmar entrega de correo si no ocurrió.
- Transporte de correo único para formularios, recuperación y agenda; configuración vigente del superusuario.
- CORS exacto, límite de solicitudes y cuerpos, respuestas JSON de error, paquetes privados excluidos del servidor estático y comprobación de disponibilidad de base en `/ready`.
- Dependencias críticas actualizadas; un solo lock de npm y validación de ambas aplicaciones antes del despliegue.

## Integraciones del superusuario

Entrar en **Configuración → Integraciones** con rol SUPERADMIN.

| Servicio | Campos | Comportamiento disponible |
|---|---|---|
| Dirección pública | URL del frontend, incluido subdirectorio si corresponde | Retorno OAuth, enlaces de recuperación y origen CORS dinámico |
| Google | Client ID, client secret, URL exacta de callback | Acceso Google y vinculación por correo verificado; botón público sólo si está habilitado/configurado |
| Correo | Host, puerto, TLS, usuario, contraseña, remitente y correo administrador | Recuperación, agenda y formularios públicos; verificación SMTP sin enviar correos |
| WhatsApp enlace | Número internacional sólo dígitos | Contacto `wa.me` visible cuando se habilita |
| WhatsApp Cloud | Phone Number ID, Business Account ID, versión API y access token | Almacenamiento seguro y comprobación de credenciales. Automatismos y recepción de mensajes pendientes |
| Telegram | Bot token y Chat ID | Almacenamiento seguro y comprobación de bot/destino. Automatismos y recepción pendientes |

Los secretos están cifrados con AES-256-GCM. El navegador recibe únicamente un indicador de que existen. Vacío conserva; borrar requiere acción explícita. Las revisiones impiden sobrescrituras entre dos sesiones.

`INTEGRATIONS_ENCRYPTION_KEY` permanece fuera de la base, en el entorno del servidor. Debe conservarse con los respaldos seguros: cambiarla sin migración impide descifrar la configuración. No pegar credenciales en issues, commits o capturas.

La prueba de conexión no es prueba de entrega. Google necesita URL de callback coincidente y configuración del proyecto externo; SMTP necesita remitente autorizado. Los campos de webhook son reservas de configuración, no una bandeja de mensajes ya implementada.

Fuentes oficiales: [OAuth de Google](https://developers.google.com/identity/protocols/oauth2/web-server), [Bot API de Telegram](https://core.telegram.org/bots/api), [Cloud API de WhatsApp](https://developers.facebook.com/docs/whatsapp/cloud-api/overview).

## Diario visual de cada piscina

La vista de clientes pasa de una lista compacta a un diario editorial: portada con la fotografía más reciente disponible, capítulos fechados, índice, orden cronológico o reciente, filtro de fotografías, galería con teclado y conversación con el equipo. El indicador de lectura mide cuánto se recorrió la página; no representa avance de obra. El estado viene del proyecto, sin inventar fechas, porcentajes ni tareas terminadas.

- Cada historia reutiliza exclusivamente las publicaciones marcadas como visibles para el cliente. Las fotos y relatos privados no se copian a la demostración pública.
- La API y el CSV comparten una lista blanca. Desactivar **Mostrar detalles** oculta descripciones y fotografías; desactivar **Mostrar costos** elimina importes. La metadata técnica y el perfil comercial interno nunca se incluyen.
- El editor de avances permite **Proponer relato**, revisarlo y aplicarlo a la descripción, conservando el texto previo. Es una ayuda editorial local basada en título, categoría y cantidad de fotos; **no analiza visualmente las imágenes ni usa una API de IA**. Nunca publica por sí sola.
- La muestra `/demo/historia` utiliza el mismo componente que la página real, con historia ficticia e imagen ilustrativa generada. Sus mensajes están deshabilitados y no consulta proyectos de clientes.
- Los enlaces para compartir respetan el subdirectorio de GitHub Pages y las exportaciones apuntan al backend. El acceso del cliente conserva sus credenciales de proyecto, separadas del acceso Google de usuarios de la aplicación.
- La revisión de historias reales requiere acceso autorizado a una obra específica; no se abrieron cuentas de clientes ni se enviaron comentarios durante el desarrollo.
- La ampliación y la reparación de enlaces cuentan con **72 pruebas** (55 backend y 17 frontend). Se compilaron ambas aplicaciones; el último ajuste de navegación también pasó TypeScript y compilación de frontend. La comprobación pública y sus límites están en [QA visual](design-qa.md).
- La recuperación de rutas del 404 de Pages conserva consulta y capítulo, rechaza destinos externos y no interfiere con anclas normales. Entrar al diario lleva a la portada; regresar al recorrido restaura su sección al montar la página. Se retiró el HTML de splash obsoleto y se corrigieron los metadatos, iconos y manifiesto para ambos hosts.

## Despliegue y comprobación

- Node 22; instalar desde raíz con `npm ci`.
- Nixpacks fija el archivo `e6f23dc08d3624daab7094b701aa3954923c6bbb`, usado por su proveedor oficial de Node 22. El catálogo predeterminado anterior no incluía `nodejs_22`; el primer intento de build falló antes de iniciar la aplicación y se corrigió sin tocar la base.
- `npm run check` genera Prisma, ejecuta regresiones y compila servidor/frontend.
- El arranque de Railway ejecuta `prisma migrate deploy`. La cadena contiene 44 migraciones: además de versión de sesión y configuración cifrada, se añadieron dos reparaciones de compatibilidad para campos y tablas que existían en el esquema pero faltaban en el historial de migraciones.
- La primera reparación agrega `bedSandM3PerCementBag` antes de la migración de marzo que lo utiliza; la segunda completa el esquema mediante operaciones idempotentes, conserva los índices existentes y no modifica los valores de las filas. Ante equipos con nombres duplicados o accesos antiguos sin credenciales, aborta y revierte la transacción para permitir una revisión específica.
- CI aplica todas las migraciones a PostgreSQL 16 vacío y exige que `prisma migrate diff --exit-code` no encuentre diferencias respecto de `schema.prisma`.
- `scripts/run-tests.mjs` ejecuta las pruebas en procesos aislados de credenciales y destinos reales. Las consultas de prueba están simuladas y cualquier conexión no simulada apunta a un puerto local cerrado; el entorno de producción de Railway no contamina las pruebas.
- Todos los usuarios deben iniciar sesión nuevamente. Los enlaces de recuperación emitidos antes de la corrección deben solicitarse de nuevo.
- `/health` comprueba proceso; `/ready` comprueba base. El limitador en memoria opera por instancia: antes de múltiples réplicas, compartir contadores en Redis u otro almacén compatible.
- Railway usa `/ready` como comprobación previa a habilitar el despliegue, con límite de 180 segundos.
- `TRUST_PROXY_HOPS=0` si el servidor recibe al cliente directamente; por defecto producción usa 1 para el proxy. Ajustar al número real de saltos confiables.
- Para dominio propio: registrar el dominio elegido, verificarlo en el proveedor, configurar DNS/TLS, actualizar URL pública, callback Google y compilación `VITE_API_URL`/`VITE_BASE`. No se compró ni afirmó disponibilidad de ningún dominio.
- Las migraciones son aditivas: un rollback de código no debe borrar las columnas/tablas nuevas ni la clave de cifrado.

## Bloqueadores para vender suscripciones

1. Modelo de planes y límites por organización, alta de suscripción y cobro real. Manejar prueba, renovación, pago fallido, gracia, cancelación y reactivación con webhooks verificados e idempotentes. El middleware previo de límites era un placeholder.
2. Validar recuperación y OAuth con las credenciales reales, entrega de correos y recorrido completo de una empresa piloto. No se crearon cuentas ni se enviaron mensajes a personas durante esta revisión.
3. Formalizar condiciones, privacidad, tratamiento de datos, soporte y política de cancelación con revisión apropiada.
4. Dos dumps históricos contenían usuarios, hashes y tokens. Se retiraron del árbol versionado; siguen recuperables en el historial público. Requieren saneamiento coordinado del historial y renovación de credenciales afectadas. No se reescribió historia sin autorización.
5. Probar restauración de backup fuera de producción, monitorización y alertas de disponibilidad.
6. Quedan dos avisos moderados en React Router 6.30.6. La resolución requiere migración a la versión mayor 7 y sus pruebas. No se aplica hidratación SSR aquí ni se introdujeron redirecciones externas recibidas del usuario; esto no elimina el aviso del proveedor.

## Mercado y posición defendible

Las rutas, fotos, presupuestos y cobros ya aparecen en productos consolidados. Fuentes oficiales consultadas el 18/09/2026:

| Producto | Capacidades observadas |
|---|---|
| [Skimmer](https://www.getskimmer.com/) | Agenda/rutas, trabajo sin conexión, historial, informes, presupuestos y pagos recurrentes |
| [Pool Brain](https://www.poolbrain.com/features/) | Presupuesto a trabajo/factura, flujos, portal y rentabilidad por ruta |
| [Jobber](https://www.getjobber.com/industries/pool-service-software/) | CRM, propuestas, anticipos, agenda recurrente, formularios y avisos |
| [Trowel](https://trowelapp.com/para-quien/piscinas/) | Partidas, cambios, cronograma, compras y coste real por obra |

Hipótesis a validar con empresas argentinas: una sola ficha desde instalación hasta garantía y mantenimiento, margen real por obra y cobro local. Las próximas prestaciones comerciales deben sostener ese recorrido; no basta con agregar más pantallas o prometer superioridad sin evidencia.

## Verificación y estado de entrega

- La revisión inicial aprobó 49 pruebas backend y 9 frontend con Node 22.23.2, también heredando un entorno padre de producción con configuración ficticia conflictiva. El diario sumó pruebas de privacidad, borradores y enlaces, hasta 55 backend y 17 frontend. Los resultados del último despliegue se registran abajo.
- Entrada JavaScript: de aproximadamente 1.266 KB a 307 KB, con funciones pesadas cargadas por ruta/pestaña. La imagen ilustrativa de la muestra ocupa aproximadamente 407 KiB y se solicita al entrar en ese contenido.
- La primera ejecución de CI detectó un fallo histórico: la migración de marzo utilizaba `bedSandM3PerCementBag` antes de crearlo. Tras repararlo, las 44 migraciones se aplicaron correctamente con Prisma a PostgreSQL WASM local y a PostgreSQL 16 en CI, sin diferencias de esquema. Repetir las dos reparaciones conservó íntegros los datos sintéticos.
- Landing publicada con animaciones y recorrido interactivo. La comprobación final de escritorio confirmó el acceso directo al diario en Pages, la entrada desde su portada, el regreso a la sección del recorrido y los números completos del índice. La galería permite Escape y restaura el foco; orden y filtro de fotografías funcionan en la muestra. Alcance, capturas y límites en [QA visual](design-qa.md): móvil y una sesión de cliente real siguen pendientes.
- El usuario autorizó explícitamente subir y desplegar esta versión. Se integraron el [PR #4, revisión de producción](https://github.com/jesus1942/PoolCalculator/pull/4) y el [PR #5, diario del cliente](https://github.com/jesus1942/PoolCalculator/pull/5). El ajuste de enlaces y navegación corresponde a `fe5a384910c77fbb96bc5ba730a9fcfc0704126d`. El saneamiento coordinado del historial con datos sensibles sigue pendiente.
- [CI de la versión publicada](https://github.com/jesus1942/PoolCalculator/actions/runs/35368571773): aprobado, **72 pruebas sin fallos** (55 backend + 17 frontend), compilación de ambas aplicaciones y esquema PostgreSQL 16 sin diferencias. [Publicación de Pages](https://github.com/jesus1942/PoolCalculator/actions/runs/35368571882): aprobada.
- Railway: despliegue `41c23599-9d0d-4102-bca5-7aae01b41ad0` del commit `fe5a384` en estado **SUCCESS**. Las 44 migraciones están al día; servidor en puerto 8080 y comprobación `/ready` aprobada. La clave de cifrado dedicada está configurada fuera del repositorio. Los cambios exclusivos de `/docs/` quedan fuera del disparador de despliegue para no reconstruir la aplicación al guardar evidencia.
- URLs publicadas: [aplicación en Railway](https://poolcalculator-production.up.railway.app/), [landing en GitHub Pages](https://jesus1942.github.io/PoolCalculator/) y [diario de muestra](https://poolcalculator-production.up.railway.app/demo/historia). Este resultado no equivale a validar cobros reales ni las credenciales externas de cada integración.
