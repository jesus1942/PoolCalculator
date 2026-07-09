import React from 'react';
import { HdInfo, HdFolderOpen, HdCalendar, HdMessageBubble, HdUsers, HdShare, HdDownload, HdWaves, HdShield, HdLightbulb, HdGear } from '@/components/ui/HandDrawnIcons';
import { useAuth } from '@/context/AuthContext';

// Pestaña de Ayuda: el paso a paso de toda la aplicación, dentro de la app.
// Secciones desplegables nativas (<details>) — livianas y cómodas en el teléfono.

type Seccion = {
  id: string;
  icono: React.ComponentType<{ size?: number; className?: string }>;
  titulo: string;
  contenido: React.ReactNode;
  soloAdmin?: boolean;
};

const P: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-sm leading-6" style={{ color: 'var(--ink-soft)' }}>{children}</p>
);

const Pasos: React.FC<{ items: React.ReactNode[] }> = ({ items }) => (
  <ol className="mt-2 space-y-2">
    {items.map((item, index) => (
      <li key={index} className="flex gap-3 text-sm leading-6" style={{ color: 'var(--ink-soft)' }}>
        <span
          className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
          style={{ backgroundColor: 'var(--accent-2)', color: 'var(--accent)' }}
        >
          {index + 1}
        </span>
        <span className="min-w-0">{item}</span>
      </li>
    ))}
  </ol>
);

const B: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <strong style={{ color: 'var(--ink)' }}>{children}</strong>
);

export const Ayuda: React.FC = () => {
  const { user } = useAuth();
  const esInstalador = user?.role === 'INSTALLER';
  const esAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

  const secciones: Seccion[] = [
    {
      id: 'primeros-pasos',
      icono: HdLightbulb,
      titulo: 'Primeros pasos',
      contenido: (
        <>
          <P>Lo básico para arrancar a usar la aplicación:</P>
          <Pasos items={[
            <>El menú lateral (en el teléfono se abre con el botón ☰) tiene todas las secciones. Abajo está tu usuario, el selector de <B>organización</B> y el botón de tema claro/oscuro.</>,
            <>La <B>organización activa</B> define qué ves: proyectos, agenda y usuarios son siempre de la organización seleccionada.</>,
            <>Si un cambio no aparece, refrescá con <B>Ctrl+Shift+R</B> (o cerrá y abrí la app en el teléfono): el navegador guarda una copia vieja.</>,
          ]} />
        </>
      ),
    },
    {
      id: 'crear-proyecto',
      icono: HdFolderOpen,
      titulo: 'Crear un proyecto (la piscina de un cliente)',
      contenido: (
        <>
          <P>Cada proyecto es la obra de un cliente final: su piscina, sus cálculos, su presupuesto y su historia.</P>
          <Pasos items={[
            <>Andá a <B>Proyectos → Nuevo Proyecto</B>.</>,
            <>Completá nombre del proyecto, datos del cliente y ubicación.</>,
            <>Elegí el <B>modelo de piscina</B>: trae medidas, profundidades y el equipamiento base recomendado (bomba y filtro).</>,
            <>Al guardar, la app calcula sola: geometría (perímetro, área, volumen), losetas, cama de arena, hidráulica y eléctrica.</>,
            <>Entrá al proyecto para ajustar cualquier cosa desde sus pestañas.</>,
          ]} />
        </>
      ),
    },
    {
      id: 'pestanas-proyecto',
      icono: HdWaves,
      titulo: 'Las pestañas del proyecto, una por una',
      contenido: (
        <>
          <Pasos items={[
            <><B>Vista General</B>: resumen de la obra, medidas y costos principales.</>,
            <><B>Estado</B>: etapa de la obra (borrador → aprobado → en obra → completado) y línea de tiempo de avances con fotos.</>,
            <><B>Losetas</B>: anillo perimetral, filas extra y esquinas; calcula cantidades y pastina.</>,
            <><B>Hidráulica</B>: retornos, skimmers, jets, caños y accesorios de plomería.</>,
            <><B>Eléctrica</B>: iluminación, bomba, tablero y cableado.</>,
            <><B>Análisis Hidráulico / Eléctrico</B> (profesional): pérdidas de carga, TDH, caída de tensión — para validar que el sistema esté bien dimensionado.</>,
            <><B>Tareas</B> y <B>Roles</B>: el plan de trabajo y quién hace cada cosa, con su costo de mano de obra.</>,
            <><B>Sistemas</B>: recomendaciones de equipamiento (filtros, bombas, climatización).</>,
            <><B>Adicionales</B>: todo lo que se suma fuera del cálculo base (accesorios, equipos, materiales extra).</>,
            <><B>Exportar</B>: el presupuesto en Excel o PDF, con o sin precios, listo para el cliente.</>,
          ]} />
        </>
      ),
    },
    {
      id: 'exportar',
      icono: HdDownload,
      titulo: 'Exportar el presupuesto',
      contenido: (
        <>
          <Pasos items={[
            <>Dentro del proyecto, abrí la pestaña <B>Exportar</B>.</>,
            <>Elegí qué secciones incluir (Contenido), cómo mostrar los precios (Precios) y el formato del documento (Documento).</>,
            <>El <B>modo comercial</B> arma la propuesta para el cliente; el modo técnico incluye el detalle de obra.</>,
            <>Descargá en Excel (fórmulas vivas) o PDF.</>,
          ]} />
          <P>Solo el dueño del proyecto o un administrador pueden exportar.</P>
        </>
      ),
    },
    {
      id: 'agenda',
      icono: HdCalendar,
      titulo: 'La Agenda: eventos, cuadrillas y avances',
      contenido: (
        <>
          <Pasos items={[
            <>Creá un <B>evento</B> (visita, instalación, mantenimiento) con fecha, lugar y prioridad, y vinculalo a un proyecto.</>,
            <>Asigná <B>personas</B> o una <B>cuadrilla</B> completa: los asignados ven el evento en su agenda y reciben recordatorios.</>,
            <>Cada evento tiene su <B>chat</B>: mensajes e imágenes de avance entre la oficina y la obra.</>,
            <>El <B>clima</B> del día aparece junto a la agenda para planificar la obra.</>,
          ]} />
          <P><B>Ojo</B>: asignar a alguien a un evento con proyecto le da acceso de lectura a la Vista General y el Estado de ese proyecto (sin costos). Se quita sacándolo del evento.</P>
        </>
      ),
    },
    {
      id: 'mensajes',
      icono: HdMessageBubble,
      titulo: 'Mensajes (chat interno)',
      contenido: (
        <>
          <Pasos items={[
            <>En <B>Mensajes</B> están todas tus conversaciones: por proyecto, por evento o grupales.</>,
            <>Los administradores crean conversaciones y agregan participantes; los demás participan en las que los incluyeron.</>,
            <>Se pueden adjuntar <B>fotos</B> (avances de obra) en cualquier conversación.</>,
          ]} />
        </>
      ),
    },
    {
      id: 'compartir-cliente',
      icono: HdShare,
      titulo: 'Compartir la obra con el cliente final',
      contenido: (
        <>
          <Pasos items={[
            <>Dentro del proyecto, en el timeline de Estado, generá el <B>enlace público</B> del cliente.</>,
            <>Elegí si el cliente ve <B>costos</B> y el nivel de detalle (por defecto: sin costos).</>,
            <>Pasale el link: el cliente ve los avances con fotos sin necesitar usuario, y puede dejar <B>comentarios</B> (consultas, sugerencias, felicitaciones).</>,
            <>Sus comentarios te aparecen en el timeline del proyecto para responderle.</>,
            <>El enlace se puede desactivar cuando quieras.</>,
          ]} />
          <P><B>Importante</B>: cualquiera con el link ve el timeline — tratalo como una llave.</P>
        </>
      ),
    },
    ...(!esInstalador ? [{
      id: 'instaladores',
      icono: HdUsers,
      titulo: 'Crear instaladores y darles su parte del proyecto',
      contenido: (
        <>
          <Pasos items={[
            <>Andá a <B>Usuarios → Nuevo usuario</B>: nombre, email y contraseña. El rol es <B>INSTALLER</B>.</>,
            <>En la fila del instalador, abrí <B>Permisos</B>: activá "Compartir proyecto" en las obras que le correspondan.</>,
            <>Elegí las <B>pestañas</B> que va a ver (lo típico: Vista General y Estado). No actives "Puede ver costos" salvo que corresponda: sin eso, todos los importes le llegan en cero.</>,
            <>Asignalo a los <B>eventos de agenda</B> de la obra: le suma su agenda diaria, el clima y el chat del evento para reportar avances con fotos.</>,
            <>Desde <B>Operativo</B> (en su fila de Usuarios) ves su semana, sus eventos y su conversación sin salir de la pantalla.</>,
          ]} />
          <P>El instalador nunca puede: ver costos (salvo permiso explícito), exportar, crear proyectos ni administrar usuarios.</P>
        </>
      ),
    }] : []),
    ...(esInstalador ? [{
      id: 'instalador-guia',
      icono: HdUsers,
      titulo: 'Tu panel de instalador',
      contenido: (
        <>
          <Pasos items={[
            <>En <B>Instalador</B> ves tus eventos del día y el clima.</>,
            <>En <B>Mis Proyectos</B> están las obras que te compartieron, con las pestañas habilitadas.</>,
            <>Reportá avances con fotos desde el <B>chat del evento</B> — la oficina lo ve al instante.</>,
            <>En <B>Mensajes</B> tenés todas tus conversaciones.</>,
          ]} />
        </>
      ),
    }] : []),
    ...(esAdmin ? [{
      id: 'roles',
      icono: HdShield,
      titulo: 'Roles y organizaciones (resumen)',
      contenido: (
        <>
          <P>Cada persona tiene un <B>rol global</B> (qué es en la plataforma) y un <B>rol de organización</B> (qué es dentro de cada organización):</P>
          <Pasos items={[
            <><B>ADMIN</B>: administra su organización — proyectos, usuarios (solo instaladores), agenda, costos.</>,
            <><B>USER</B>: trabaja los proyectos propios o compartidos.</>,
            <><B>INSTALLER</B>: agenda + proyectos compartidos sin plata + chat.</>,
            <><B>VIEWER</B>: solo lectura, nunca edita.</>,
            <>Rol de organización <B>OWNER/ADMIN</B>: puede gestionar los usuarios de esa organización.</>,
          ]} />
          <P>Si cambiás el rol de alguien, aplica cuando esa persona <B>cierra sesión y vuelve a entrar</B>.</P>
        </>
      ),
    }] : []),
    {
      id: 'configuracion',
      icono: HdGear,
      titulo: 'Configuración y preferencias',
      contenido: (
        <>
          <Pasos items={[
            <>El <B>tema claro/oscuro</B> se cambia desde el botón del menú lateral y queda guardado.</>,
            <>En <B>Configuración</B> están los parámetros de cálculo, precios de referencia y datos de tu cuenta.</>,
            <>¿Olvidaste la contraseña? Desde la pantalla de ingreso, <B>"¿Olvidaste tu contraseña?"</B> te manda un mail de recuperación.</>,
          ]} />
        </>
      ),
    },
    {
      id: 'faq',
      icono: HdInfo,
      titulo: 'Preguntas frecuentes',
      contenido: (
        <>
          <Pasos items={[
            <><B>"No veo un cambio que hice"</B> → refrescá con Ctrl+Shift+R; la app guarda copia en caché.</>,
            <><B>"Un usuario ve un proyecto que no le compartí"</B> → seguro está asignado a un evento de agenda de esa obra (o en su cuadrilla). Se quita desde el evento.</>,
            <><B>"El instalador no ve los precios"</B> → es por diseño: hay que activarle "Puede ver costos" en Permisos, proyecto por proyecto.</>,
            <><B>"Cambié un rol y no pasa nada"</B> → la persona tiene que cerrar sesión y volver a entrar.</>,
            <><B>"El cliente no puede comentar"</B> → verificá que el enlace público esté activo en el timeline del proyecto.</>,
          ]} />
        </>
      ),
    },
  ];

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 sm:py-8" style={{ color: 'var(--ink)' }}>
      <div className="mx-auto max-w-3xl space-y-4 sm:space-y-6">
        <div>
          <h1
            className="flex items-center gap-2 text-2xl font-semibold"
            style={{ color: 'var(--ink)', fontFamily: "'JetBrains Mono', monospace" }}
          >
            <HdInfo size={22} />
            Ayuda
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
            El paso a paso de toda la aplicación. Tocá cada sección para abrirla.
          </p>
        </div>

        <div className="space-y-3">
          {secciones.map((seccion) => (
            <details
              key={seccion.id}
              className="group rounded-2xl"
              style={{ backgroundColor: 'var(--card)', border: '1.6px solid var(--hair-strong)' }}
            >
              <summary
                className="flex min-h-[52px] cursor-pointer list-none items-center gap-3 px-4 py-3 text-[15px] font-semibold [&::-webkit-details-marker]:hidden"
                style={{ color: 'var(--ink)' }}
              >
                <seccion.icono size={19} className="shrink-0" />
                <span className="min-w-0 flex-1">{seccion.titulo}</span>
                <span
                  className="text-xs transition-transform group-open:rotate-90"
                  style={{ color: 'var(--ink-soft)' }}
                >
                  ▶
                </span>
              </summary>
              <div className="space-y-3 px-4 pb-4 sm:px-5" style={{ borderTop: '1.3px dashed var(--hair)' }}>
                <div className="pt-3 space-y-3">{seccion.contenido}</div>
              </div>
            </details>
          ))}
        </div>

        <p className="text-center text-[11px]" style={{ color: 'var(--ink-soft)' }}>
          ¿Algo no está explicado acá? Pedilo y lo sumamos a esta guía.
        </p>
      </div>
    </div>
  );
};
