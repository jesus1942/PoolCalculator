# Manual de accesos y permisos — Pool Calculator (SaaS)

> Guía completa de quién ve qué, por qué lo ve, y cómo dar o quitar cada acceso.
> Actualizado: julio 2026.

---

## 1. Los dos niveles de rol (la base de todo)

Cada persona tiene **dos roles distintos** que se combinan:

### 1.1 Rol global (de la cuenta)

Es el rol del usuario en toda la plataforma. Se ve en la columna **"Rol"** de la pantalla Usuarios.

| Rol | Quién es | Qué puede |
|---|---|---|
| `SUPERADMIN` | **Vos** (el proveedor del SaaS) | Todo: crear tenants, pararse en cualquier organización, crear cualquier usuario con cualquier rol, ver todos los costos. Las cuentas SUPERADMIN son **invisibles** para los tenants. |
| `ADMIN` | El dueño/administrador de un tenant | Administra su organización: proyectos, usuarios (solo instaladores), agenda, chat, costos de SUS proyectos. |
| `USER` | Usuario estándar de una organización | Ve y trabaja los proyectos propios o que le compartieron. |
| `INSTALLER` | Instalador | Mundo reducido: su agenda, el clima, los proyectos que le compartieron (solo las pestañas habilitadas), los chats donde participa. **Nunca** costos, **nunca** exportar, **nunca** crear proyectos. |
| `VIEWER` | Solo lectura | Ve lo que le compartan, jamás edita, aunque el permiso de edición esté tildado por error. |

### 1.2 Rol de organización (de la membresía)

Es el rol de esa persona **dentro de una organización puntual**. Columna **"Rol Org"**.
Una misma persona puede ser ADMIN de su organización y a la vez MEMBER en otra.

| Rol Org | Qué significa en esa organización |
|---|---|
| `OWNER` | Dueño de la organización. Gestiona sus usuarios. |
| `ADMIN` | Administrador de la organización. Gestiona sus usuarios. |
| `MEMBER` | Miembro común: participa, ve lo que le compartan. |
| `VIEWER` | Miembro de solo lectura. |

### 1.3 Cómo se combinan

- La pantalla **Usuarios** la ven: SUPERADMIN, ADMIN global, y los OWNER/ADMIN **de la organización** (aunque su rol global sea USER).
- Los tenants (todo el que no es SUPERADMIN) solo pueden **crear y editar instaladores**, con rol de org MEMBER o VIEWER. Cualquier otro rol lo asignás únicamente vos.
- **La organización activa** es la del selector del menú lateral. Todo lo que hacés (crear usuarios, ver proyectos, agenda) ocurre **en esa organización**. Vos como SUPERADMIN ves todas las organizaciones en el selector; los demás solo aquellas donde son miembros.

> ⚠️ **Importante**: el rol viaja dentro de la sesión (token). Si le cambiás el rol a alguien, el cambio completo aplica cuando esa persona **cierra sesión y vuelve a entrar**. Ante una baja urgente: cambiale también la contraseña.

---

## 2. Organizaciones (tenants)

- **Crear un tenant**: menú **Tenants** (solo SUPERADMIN). Podés cargar el owner en el momento (email + nombre + contraseña) o crear la organización vacía y después pararte en ella para darle usuarios.
- El **owner de un tenant** queda con rol global ADMIN y podrá crear sus propios instaladores.
- **Operar un tenant ajeno**: elegí la organización en el selector del menú → todo lo que hagas (Usuarios, proyectos, agenda) ocurre dentro de ese tenant. No te convertís en miembro: seguís siendo el proveedor.

---

## 3. Las CUATRO vías por las que alguien ve un proyecto

Esta es la sección más importante del manual. Un proyecto puede aparecer en la lista de una persona por **cualquiera** de estas cuatro vías:

### Vía 1 — Es el dueño
Quien crea el proyecto tiene acceso total permanente: todas las pestañas, edición, costos, exportación.

### Vía 2 — Es admin de la organización del proyecto
SUPERADMIN y ADMIN global ven **todos** los proyectos de la organización donde están parados, con costos. Es la vista de dueño de negocio.

### Vía 3 — Compartido explícito (Usuarios → Permisos)
Es el compartir "a mano": en **Usuarios → Permisos** (del usuario) elegís por proyecto:
- **Compartir proyecto** (on/off)
- **Puede editar** (nunca aplica a VIEWER)
- **Puede ver costos** ← la llave de la parte económica
- **Pestañas visibles** (Vista General, Estado, Losetas, Hidráulica, etc.)

### Vía 4 — Asignación operativa por agenda ⭐ (la que sorprende)
**Si asignás a una persona a un evento de agenda vinculado a un proyecto — o la persona integra una cuadrilla asignada al evento — esa persona pasa a ver ese proyecto automáticamente.**

Qué le da esta vía (y qué no):
- ✅ Ve la tarjeta del proyecto en su lista (nombre, cliente, modelo, medidas, ubicación, estado).
- ✅ Entra solo a **Vista General** y **Estado**.
- ❌ **Sin costos** (el servidor manda todos los importes en cero).
- ❌ Sin edición, sin exportar, sin el resto de las pestañas.

**¿Por qué existe?** Para que el operario citado a una obra sepa a dónde va, qué piscina es y en qué estado está — sin que le tengas que compartir nada a mano. **Se revoca sola**: sacás a la persona del evento (o de la cuadrilla) y el proyecto desaparece de su lista.

### Tabla comparativa

| | Dueño | Admin de la org | Compartido explícito | Asignación por agenda |
|---|---|---|---|---|
| Ve la tarjeta | ✅ | ✅ | ✅ | ✅ |
| Pestañas | Todas | Todas | Las que elijas | Solo Vista General y Estado |
| Edita | ✅ | ✅ | Si lo tildás (VIEWER nunca) | ❌ |
| Ve costos | ✅ | ✅ | **Solo si tildás "Puede ver costos"** | ❌ |
| Exporta | ✅ | ✅ | ❌ | ❌ |
| Cómo se quita | — | Sacándolo de la org | Toggle "Compartir" OFF | Sacándolo del evento/cuadrilla |

---

## 4. El blindaje económico

La parte económica está protegida **en el servidor**, no escondida en la pantalla:

- Sin "Puede ver costos", todos estos campos llegan **en cero** al navegador: costo de materiales, mano de obra, costo total, precios unitarios, precios custom, totales de hidráulica/eléctrica/cama de arena, gran total.
- La **exportación** (Excel y paquete de documentación) solo funciona para el dueño del proyecto o un admin. A cualquier otro le da error de permiso, tenga las pestañas que tenga.
- Los usuarios `VIEWER` jamás editan, aunque el checkbox de edición quede tildado.
- Los `INSTALLER` no pueden crear proyectos ni tocar la API de administración, aunque conozcan las direcciones.

---

## 5. Comunicación (quién chatea con quién)

### 5.1 Chat de evento de agenda
Cada evento tiene su conversación. Participan: los **asignados** al evento, la **cuadrilla** y quien lo creó. Soporta fotos (avances de obra). Es el canal natural instalador ↔ oficina.

### 5.2 Conversaciones (pestaña Mensajes)
Chat interno de la organización:
- **Crear** conversaciones: admins y usuarios estándar (no instaladores ni viewers).
- **Participar**: cualquiera que haya sido agregado como participante, incluidos instaladores.
- Los admins de la organización ven las conversaciones de su org; los invitados solo aquellas donde participan.

### 5.3 Timeline público del cliente
Desde el proyecto podés generar un **enlace público** para el cliente final:
- El cliente ve el timeline de avances (con fotos) **sin usuario ni contraseña**, solo con el link.
- **Vos decidís** si ese link muestra costos (`Mostrar costos`) y el nivel de detalle. Por defecto, sin costos.
- El cliente puede dejar comentarios, que ves en el timeline del proyecto.
- El enlace se puede **desactivar** cuando quieras y elegir qué novedades son visibles.

> ⚠️ El link público es un secreto: cualquiera que lo tenga ve el timeline. No lo publiques en redes.

---

## 6. El mundo del instalador (resumen)

Un usuario `INSTALLER` al entrar ve su **Panel de Instalador**:

1. **Su agenda**: los eventos donde está asignado (con clima del día).
2. **Mis Proyectos**: solo los proyectos que le compartieron (por permisos o por agenda), con las pestañas habilitadas y sin plata.
3. **Mensajes**: los chats donde participa.
4. Puede reportar avances con fotos en el chat del evento.

No puede: ver costos, exportar, crear proyectos, ver otros usuarios, tocar configuración.

---

## 7. Recetas: auditar y revocar accesos

### "¿Qué está viendo exactamente esta persona?"
1. **Usuarios → Permisos** (en la fila de la persona): lista todos los proyectos de la organización y marca cuáles están **Compartidos** y con qué pestañas/costos. → Esto audita la **Vía 3**.
2. **Usuarios → Operativo**: muestra los eventos de agenda que tiene asignados (próximos 21 días) — cada evento vinculado a un proyecto le da acceso operativo a ese proyecto. → Esto audita la **Vía 4**.
3. Revisá también si integra alguna **cuadrilla** (menú Agenda → cuadrillas) asignada a eventos con proyecto.

### "Quiero que deje de ver un proyecto"
- Si fue compartido explícito → **Permisos** → toggle "Compartir proyecto" OFF → Guardar.
- Si es por agenda → editá el evento y quitala de los asignados (o de la cuadrilla).
- Si es admin de la organización → el acceso es por rol: hay que cambiarle el rol (y que re-ingrese).

### "Le cambié el rol y sigue viendo lo de antes"
El rol viaja en la sesión: pedile que **cierre sesión y vuelva a entrar**. Urgencia → cambiale la contraseña.

### "Quiero darle a un instalador su parte del proyecto"
1. Usuarios → crear el instalador (rol INSTALLER).
2. Permisos → Compartir proyecto → elegir pestañas (típico: Vista General + Estado) → NO tildar "Puede ver costos".
3. (Opcional) Asignarlo a los eventos de agenda de esa obra: le suma el chat del evento y su agenda.

---

## 8. Caso resuelto: "Natalia ve proyectos que no le compartí"

**Qué pasó**: Natalia veía las tarjetas de Familia Lopez, Maia Giorgetti y Piscina de Luciana **sin la parte económica** (los costos llegaban en cero — el blindaje funcionó). Esa combinación —tarjeta visible + Vista General/Estado + sin plata— es la firma de la **Vía 4 (asignación por agenda)**: quedó asignada a eventos vinculados a esos proyectos (o en una cuadrilla de esos eventos), probablemente durante las pruebas. También pudo sumarse alguna Vía 3 si en algún momento se tildó "Compartir" desde Permisos.

**Cómo verificarlo en 1 minuto**: Usuarios → fila de Natalia → **Permisos** (¿algún proyecto figura "Compartido"?) y **Operativo** (¿qué eventos tiene asignados y a qué proyectos apuntan?).

**Cómo cortarlo**: destildar los compartidos y quitarla de los eventos/cuadrillas que no correspondan.

**Nota**: si Natalia va a operar solo su propia organización, conviene que su membresía en TU organización sea mínima (VIEWER) o directamente quitarle las asignaciones de agenda de tus obras.

---

## 9. Mejoras de seguridad pendientes (anotadas, no urgentes)

1. **Revalidar el rol en cada request**: hoy el rol vive en el token de sesión hasta que expira o la persona re-ingresa. Propuesto: verificar rol y organización contra la base en cada llamada, para que un cambio de rol aplique al instante.
2. **Acotar el ADMIN global por membresía**: hoy un ADMIN global parado en una organización actúa como admin de esa organización. Propuesto: exigir además que su membresía en esa organización sea OWNER/ADMIN.
3. **Botón "Quitar de la organización"**: hoy no hay UI para remover una membresía; solo se puede degradar el rol.

---

*Cualquier cosa que no cierre con este manual, es un bug: reportalo.*
