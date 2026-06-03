import React from 'react';

/**
 * HandDrawnIcons — iconos dibujados a mano para navegación y UI.
 * Mismo estilo orgánico que AnimatedWeatherIcon: Q-curves, C-curves,
 * strokeWidth 1.5–1.7, imperfecciones intencionales.
 *
 * Uso individual:  <HdCalendar size={24} className="text-blue-500" />
 * Uso unificado:   <AppIcon name="calendar" size={20} className="text-gray-600" />
 */

type IconProps = { size?: number; className?: string; style?: React.CSSProperties };

// ─── Wrapper SVG ───────────────────────────────────────────────────────────────
const Svg: React.FC<{ size: number; className: string; style?: React.CSSProperties; children: React.ReactNode }> = ({
  size,
  className,
  style,
  children,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'block', flexShrink: 0, ...style }}
    aria-hidden
    className={className}
  >
    {children}
  </svg>
);

// ─── HdCalendar ── La Agenda ───────────────────────────────────────────────────
export const HdCalendar: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Cuerpo con esquinas orgánicas */}
    <path
      d="M4.2 6.8 Q4 5.1 5.3 4.3 Q6 4 7.1 4.1 L16.9 4 Q18.3 3.9 19.4 4.5 Q20.1 5.2 20 6.7 L20.1 18.8 Q20.2 20.3 18.8 20.9 Q18.1 21.1 17 21 L7 21.1 Q5.4 21.2 4.7 20.2 Q4.1 19.5 4.2 18.3 Z"
      strokeWidth="1.6"
    />
    {/* Línea divisora ~1/3 desde arriba */}
    <path d="M4.3 9.1 Q8.5 8.7 12.2 9 Q16 9.3 20 8.9" strokeWidth="1.5" />
    {/* Pin izquierdo */}
    <path d="M8.1 4.1 Q7.9 2.9 8 2" strokeWidth="1.6" />
    {/* Pin derecho */}
    <path d="M15.9 4 Q16.1 2.8 16 2" strokeWidth="1.6" />
    {/* Puntos de fechas */}
    <circle cx="8.2" cy="13.3" r="0.9" fill="currentColor" strokeWidth="0" />
    <circle cx="12.1" cy="13.4" r="0.9" fill="currentColor" strokeWidth="0" />
    <circle cx="16" cy="13.2" r="0.9" fill="currentColor" strokeWidth="0" />
    <circle cx="8.3" cy="17.1" r="0.9" fill="currentColor" strokeWidth="0" />
    <circle cx="12" cy="17.3" r="0.9" fill="currentColor" strokeWidth="0" />
  </Svg>
);

// ─── HdLayoutGrid ── Panel / dashboard ────────────────────────────────────────
export const HdLayoutGrid: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Cuadrado superior-izquierdo (ligeramente más alto) */}
    <path
      d="M3.1 3.3 Q3 2.9 3.6 3 L10.4 3.1 Q11 3 11.1 3.7 L11 10.2 Q11.1 10.9 10.3 11 L3.7 11.1 Q3 11.2 3 10.4 Z"
      strokeWidth="1.5"
    />
    {/* Cuadrado superior-derecho */}
    <path
      d="M13.1 3.2 Q13 2.8 13.7 3 L20.3 3 Q21 2.9 21.1 3.6 L21 10.6 Q21.1 11.2 20.4 11.1 L13.6 11 Q12.9 11.1 13 10.3 Z"
      strokeWidth="1.5"
    />
    {/* Cuadrado inferior-izquierdo */}
    <path
      d="M3 13.2 Q2.9 12.8 3.7 12.9 L10.3 13 Q11 12.9 11.1 13.6 L11 20.4 Q11.1 21.1 10.3 21 L3.7 21.1 Q3 21.2 3 20.4 Z"
      strokeWidth="1.5"
    />
    {/* Cuadrado inferior-derecho */}
    <path
      d="M13 13.1 Q12.9 12.7 13.6 12.9 L20.4 13 Q21.1 12.9 21 13.7 L21.1 20.3 Q21.2 21 20.3 21.1 L13.7 21 Q12.9 21.1 13 20.3 Z"
      strokeWidth="1.5"
    />
  </Svg>
);

// ─── HdWaves ── Modelos de Piscinas ───────────────────────────────────────────
export const HdWaves: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Ola superior — S-curve orgánica */}
    <path
      d="M2.3 8.8 C4.5 6.2 6.8 6.1 9.1 8.5 C11.4 10.9 13.6 11.1 16 8.6 C18.2 6.3 20.4 6.1 22 8.2"
      strokeWidth="1.7"
    />
    {/* Ola media */}
    <path
      d="M2 12.4 C4.3 9.8 6.7 9.6 9.2 12.1 C11.5 14.4 13.8 14.6 16.1 12.2 C18.3 9.9 20.5 9.7 22.2 11.9"
      strokeWidth="1.6"
    />
    {/* Ola inferior */}
    <path
      d="M2.1 16.1 C4.4 13.5 6.9 13.3 9.3 15.8 C11.6 18.1 13.7 18.3 16.2 15.9 C18.4 13.6 20.6 13.4 22.1 15.5"
      strokeWidth="1.5"
    />
  </Svg>
);

// ─── HdFolderOpen ── Proyectos ────────────────────────────────────────────────
export const HdFolderOpen: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Tab en esquina superior-izquierda */}
    <path
      d="M3.1 10.3 L3 8.1 Q3 7.1 4.1 7 L8.8 7.1 Q9.5 7.2 9.9 7.8 L11 9.1 Q11.5 9.8 12.4 9.9 L20.1 9.8 Q21.1 9.7 21 10.8 L20.8 18.9 Q20.9 20.1 19.7 20.2 L4.3 20.1 Q3.1 20.2 3 19.1 Z"
      strokeWidth="1.6"
    />
    {/* Borde interno superior (carpeta abierta) */}
    <path d="M3.2 13 Q7 12.3 12.1 12.8 Q17 13.3 21 12.6" strokeWidth="1.5" />
  </Svg>
);

// ─── HdMessageBubble ── Mensajes ──────────────────────────────────────────────
export const HdMessageBubble: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Burbuja con esquinas orgánicas */}
    <path
      d="M4.1 4.3 Q3 4.2 3.1 5.4 L3 15.6 Q2.9 16.9 4.2 17.1 L8.8 17 Q9.2 17 9.3 17.5 L9.5 20.8 Q9.6 21.5 10.2 21 L14.1 17.1 L19.8 17 Q21.1 17.1 21 15.7 L21.1 5.3 Q21.2 4.1 19.9 4.2 Z"
      strokeWidth="1.6"
    />
    {/* Tres puntos dentro */}
    <circle cx="8.5" cy="11" r="1" fill="currentColor" strokeWidth="0" />
    <circle cx="12" cy="11" r="1" fill="currentColor" strokeWidth="0" />
    <circle cx="15.5" cy="11" r="1" fill="currentColor" strokeWidth="0" />
  </Svg>
);

// ─── HdGear ── Configuración ──────────────────────────────────────────────────
export const HdGear: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Círculo central */}
    <path
      d="M10 12 Q9.8 9.8 12 9.7 Q14.3 9.6 14.2 12.1 Q14.3 14.4 12 14.3 Q9.7 14.4 10 12 Z"
      strokeWidth="1.6"
    />
    {/* Dientes del engranaje — 6 pequeños "pétalos" con Q-curves */}
    {/* 12h */}
    <path d="M11.3 9.8 Q11.8 7.8 12.2 9.8" strokeWidth="1.5" />
    {/* 2h */}
    <path d="M13.7 10.5 Q15.5 9.1 14.4 10.9" strokeWidth="1.5" />
    {/* 4h */}
    <path d="M14.3 13.2 Q16.3 14.2 14.1 14.5" strokeWidth="1.5" />
    {/* 6h */}
    <path d="M12.4 14.2 Q11.9 16.3 11.5 14.2" strokeWidth="1.5" />
    {/* 8h */}
    <path d="M10.1 13.5 Q8.1 14.8 9.3 13" strokeWidth="1.5" />
    {/* 10h */}
    <path d="M9.5 10.8 Q7.6 9.6 9.8 9.5" strokeWidth="1.5" />
  </Svg>
);

// ─── HdArrowOut ── Cerrar sesión ──────────────────────────────────────────────
export const HdArrowOut: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Marco de puerta — L invertida izquierda */}
    <path
      d="M9.1 4.2 Q7.9 4.1 7 4.2 Q5.8 4.3 5.9 5.5 L6 18.5 Q5.9 19.8 7.2 19.9 L9.2 20"
      strokeWidth="1.6"
    />
    {/* Flecha apuntando a la derecha */}
    <path d="M11.8 12.1 Q14.5 11.8 18.2 12" strokeWidth="1.6" />
    <path d="M15.5 9.2 Q17.2 11 18.3 12.1 Q17.1 13.2 15.6 14.9" strokeWidth="1.6" />
  </Svg>
);

// ─── HdUsers ── Usuarios ──────────────────────────────────────────────────────
export const HdUsers: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Persona de atrás (más pequeña, desplazada) */}
    <path
      d="M13.8 8.9 Q13.6 6.7 15.2 6.6 Q16.9 6.5 17 8.8 Q17.1 11 15.3 11.1 Q13.5 11.2 13.8 8.9 Z"
      strokeWidth="1.4"
    />
    <path
      d="M12.5 17.8 Q12.3 14.4 15.2 14.2 Q18.2 14 18.4 17.7"
      strokeWidth="1.4"
    />
    {/* Persona delantera (más grande) */}
    <path
      d="M7.5 9.4 Q7.2 6.6 9.5 6.5 Q11.8 6.4 12 9.2 Q12.1 12 9.6 12.1 Q7 12.2 7.5 9.4 Z"
      strokeWidth="1.6"
    />
    <path
      d="M4.1 20.1 Q3.9 15.8 9.5 15.6 Q15.2 15.4 15.1 19.9"
      strokeWidth="1.6"
    />
  </Svg>
);

// ─── HdMenu ── Menú hamburguesa ───────────────────────────────────────────────
export const HdMenu: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Línea superior — ligeramente ondulada */}
    <path d="M3.2 6.8 Q7.5 6.1 12 6.5 Q16.5 6.9 20.8 6.3" strokeWidth="1.7" />
    {/* Línea media */}
    <path d="M3 12.1 Q7.8 11.5 12.3 11.9 Q16.2 12.3 21 11.7" strokeWidth="1.7" />
    {/* Línea inferior — ligeramente más corta */}
    <path d="M3.3 17.4 Q7 16.8 11.8 17.2 Q16 17.6 20.5 17" strokeWidth="1.7" />
  </Svg>
);

// ─── HdX ── Cerrar ────────────────────────────────────────────────────────────
export const HdX: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Diagonal ↘ con ligero overshoot */}
    <path d="M4.8 4.5 Q8.5 8.3 11.8 11.9 Q15.2 15.6 19.4 19.6" strokeWidth="1.7" />
    {/* Diagonal ↙ con ligero overshoot */}
    <path d="M19.5 4.7 Q15.8 8.2 12.1 11.9 Q8.4 15.5 4.5 19.4" strokeWidth="1.7" />
  </Svg>
);

// ─── HdPlus ── Añadir / nuevo ─────────────────────────────────────────────────
export const HdPlus: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Línea vertical con ligera curva */}
    <path d="M12.2 4.1 Q11.7 8 12 12.1 Q12.3 16.2 11.9 20" strokeWidth="1.7" />
    {/* Línea horizontal con ligera curva */}
    <path d="M4.2 12.3 Q8.1 11.7 12 12 Q16 12.3 20.1 11.8" strokeWidth="1.7" />
  </Svg>
);

// ─── HdSearch ── Búsqueda ─────────────────────────────────────────────────────
export const HdSearch: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Círculo orgánico */}
    <path
      d="M5.2 10.3 Q5 6.3 8.5 5 Q12.1 3.8 14.5 6.2 Q17 8.5 16.2 11.8 Q15.4 15.2 11.9 16 Q8.3 16.9 5.9 14.1 Q4.8 12.6 5.2 10.3 Z"
      strokeWidth="1.6"
    />
    {/* Mango — ligeramente curvo hacia abajo-derecha */}
    <path d="M14.8 14.5 Q17 17 19.6 19.8" strokeWidth="1.7" />
  </Svg>
);

// ─── HdChevronRight ── Flecha derecha ─────────────────────────────────────────
export const HdChevronRight: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    <path d="M9.3 5.2 Q13.2 8.8 15.1 12 Q13.1 15.2 9.2 18.9" strokeWidth="1.7" />
  </Svg>
);

// ─── HdChevronLeft ── Flecha izquierda ────────────────────────────────────────
export const HdChevronLeft: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    <path d="M14.8 5.2 Q10.9 8.8 9 12 Q11 15.2 14.9 18.9" strokeWidth="1.7" />
  </Svg>
);

// ─── HdChevronDown ── Flecha abajo ────────────────────────────────────────────
export const HdChevronDown: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    <path d="M5.2 9.3 Q8.8 13.2 12 15.1 Q15.2 13.1 18.9 9.2" strokeWidth="1.7" />
  </Svg>
);

// ─── HdBell ── Notificaciones ─────────────────────────────────────────────────
export const HdBell: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Cuerpo de campana con parte superior orgánica redondeada */}
    <path
      d="M12 3.2 Q12.4 3 13.1 3.5 Q16.9 4.8 17.5 9.2 Q17.9 12.1 18.8 14 Q19.8 16.1 20.1 17 Q20.3 17.9 19.4 18 L4.7 18.1 Q3.7 18.2 3.9 17.1 Q4.2 16.2 5.3 14.1 Q6.2 12.3 6.6 9.3 Q7.1 4.9 10.9 3.5 Q11.5 3.1 12 3.2 Z"
      strokeWidth="1.6"
    />
    {/* Badajo */}
    <path d="M10.5 18.1 Q10.4 20.4 12.1 20.9 Q13.8 21.1 13.6 18.1" strokeWidth="1.5" />
    {/* Varilla */}
    <path d="M12 3.2 Q12.1 2.1 12 1.5" strokeWidth="1.5" />
  </Svg>
);

// ─── HdBuilding ── Tenants / organizaciones ───────────────────────────────────
export const HdBuilding: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Cuerpo del edificio */}
    <path
      d="M4.2 21 L4.1 5.3 Q4 4.1 5.3 4.2 L14.8 4.1 Q16 4 16.1 5.2 L16 21.1"
      strokeWidth="1.6"
    />
    {/* Línea de suelo */}
    <path d="M2.2 21 Q8 20.5 12 21.1 Q16.5 20.6 21.8 21" strokeWidth="1.6" />
    {/* Extensión derecha (más baja) */}
    <path
      d="M16 10.2 Q17.3 10 18.9 10.1 Q20.1 10 20 11.2 L20.1 21"
      strokeWidth="1.5"
    />
    {/* Ventana izquierda */}
    <path
      d="M6.5 7.8 Q6.4 7 7.2 7 L9.3 7.1 Q10 7 10 7.8 L10.1 9.8 Q10.2 10.5 9.3 10.6 L7.1 10.5 Q6.3 10.6 6.4 9.7 Z"
      strokeWidth="1.5"
    />
    {/* Ventana derecha */}
    <path
      d="M11 7.8 Q10.9 7 11.7 7.1 L13.8 7 Q14.5 6.9 14.6 7.7 L14.5 9.7 Q14.6 10.5 13.7 10.6 L11.6 10.5 Q10.8 10.6 10.9 9.7 Z"
      strokeWidth="1.5"
    />
    {/* Puerta */}
    <path
      d="M8.5 21 L8.4 16.8 Q8.3 15.8 10 15.7 Q11.8 15.6 11.7 16.7 L11.8 21"
      strokeWidth="1.5"
    />
  </Svg>
);

// ─── HdActivity ── Ops / actividad ────────────────────────────────────────────
export const HdActivity: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Línea base con pulso de electrocardiograma */}
    <path
      d="M2.3 12.2 Q5 11.8 7.2 12 L8.9 12.1 L10.3 6.5 L12 17.8 L13.5 9.2 L14.8 12.1 Q17.5 12.4 21.8 11.9"
      strokeWidth="1.7"
    />
  </Svg>
);

// ─── HdFileText ── Documentación ──────────────────────────────────────────────
export const HdFileText: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Rectángulo con esquina doblada arriba-derecha */}
    <path
      d="M5.1 3.2 Q4 3.1 4.1 4.4 L4 19.7 Q3.9 21.1 5.3 21 L18.8 21.1 Q20.1 21.2 20 19.8 L20.1 8.3 L15 3.1 Z"
      strokeWidth="1.6"
    />
    {/* Doblez de esquina */}
    <path d="M15.1 3.2 Q15 6.2 14.9 7.8 Q16.5 7.9 20 8.2" strokeWidth="1.5" />
    {/* Líneas de texto */}
    <path d="M7.3 11.8 Q10 11.3 14.5 11.5 Q16.5 11.6 17.2 11.9" strokeWidth="1.5" />
    <path d="M7.2 14.7 Q10.5 14.2 14.8 14.5 Q16 14.6 17.1 14.8" strokeWidth="1.5" />
    <path d="M7.3 17.6 Q9.5 17.1 12.8 17.4 Q14.2 17.5 15.3 17.7" strokeWidth="1.5" />
  </Svg>
);

// ─── HdDatabase ── Catálogos ───────────────────────────────────────────────────
export const HdDatabase: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Elipse superior */}
    <path
      d="M4.2 6.5 Q4 4.9 8 4.2 Q12.1 3.5 16.2 4.3 Q20.1 5 20 6.7 Q20.1 8.4 16 9.1 Q11.9 9.8 8 9 Q4.1 8.3 4.2 6.5 Z"
      strokeWidth="1.6"
    />
    {/* Lados del cilindro — primer segmento */}
    <path d="M4.2 6.5 Q4 9.5 4.1 12.1" strokeWidth="1.6" />
    <path d="M20 6.7 Q20.1 9.6 20 12.1" strokeWidth="1.6" />
    {/* Elipse media */}
    <path
      d="M4.1 12.1 Q4 13.8 8.1 14.5 Q12.2 15.2 16.1 14.4 Q20 13.7 20 12.1"
      strokeWidth="1.6"
    />
    {/* Lados — segundo segmento */}
    <path d="M4.1 12.1 Q4 14.8 4.2 17.6" strokeWidth="1.6" />
    <path d="M20 12.1 Q20.1 14.9 20 17.6" strokeWidth="1.6" />
    {/* Elipse inferior */}
    <path
      d="M4.2 17.6 Q4.1 19.3 8.2 20 Q12.3 20.7 16.2 19.9 Q20.1 19.2 20 17.6"
      strokeWidth="1.6"
    />
  </Svg>
);

// ─── HdCheck ── Marca de verificación ─────────────────────────────────────────
export const HdCheck: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    <path d="M3.5 12.3 Q6.8 15.5 9.2 18.2 Q13.5 12.8 20.8 5.8" strokeWidth="1.8" />
  </Svg>
);

// ─── HdDownload ── Descargar ──────────────────────────────────────────────────
export const HdDownload: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Flecha hacia abajo */}
    <path d="M12.1 3.2 Q11.8 8 12 13.5" strokeWidth="1.7" />
    {/* Cabeza de flecha */}
    <path d="M8.3 10 Q10.5 12.8 12 14.1 Q13.6 12.8 15.8 10.1" strokeWidth="1.7" />
    {/* Línea base */}
    <path d="M4.3 18.8 Q8.5 18.2 12.1 18.5 Q16 18.8 19.8 18.3" strokeWidth="1.7" />
  </Svg>
);

// ─── HdEdit ── Editar / lápiz ─────────────────────────────────────────────────
export const HdEdit: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Cuerpo del lápiz inclinado */}
    <path d="M14.2 3.8 Q16.5 2.9 17.9 4.3 Q19.3 5.7 18.3 7.9 L7.8 18.4 L3.5 20.7 L5.8 16.4 Z" strokeWidth="1.6" />
    {/* Línea de separación borrador */}
    <path d="M15.8 5.2 Q16.8 6.1 17.1 7.3" strokeWidth="1.4" />
  </Svg>
);

// ─── HdTrash ── Eliminar / papelera ───────────────────────────────────────────
export const HdTrash: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Tapa */}
    <path d="M4.3 7.1 Q8 6.6 12.1 6.8 Q16.2 7 19.8 6.9" strokeWidth="1.6" />
    {/* Mango de la tapa */}
    <path d="M9.3 7.1 Q9.1 5.4 9.8 4.9 Q10.4 4.3 11.9 4.2 Q13.5 4.1 14.1 4.8 Q14.8 5.4 14.6 7" strokeWidth="1.5" />
    {/* Cuerpo */}
    <path d="M5.2 7.3 Q5 8.8 5.4 19.1 Q5.3 20.3 6.6 20.8 L17.4 20.9 Q18.8 21 18.7 19.7 L18.9 7.4" strokeWidth="1.6" />
    {/* Líneas internas */}
    <path d="M9.3 10.5 Q9.1 14.5 9.2 17.8" strokeWidth="1.4" />
    <path d="M14.8 10.4 Q14.6 14.4 14.7 17.7" strokeWidth="1.4" />
  </Svg>
);

// ─── HdAlertTriangle ── Advertencia ──────────────────────────────────────────
export const HdAlertTriangle: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Triángulo ligeramente irregular */}
    <path d="M11.9 2.8 Q12.4 2.6 13 3.5 L21.1 18.3 Q21.6 19.3 20.5 19.8 L3.6 19.9 Q2.5 20.1 2.9 18.9 L10.8 3.6 Q11.2 2.9 11.9 2.8 Z" strokeWidth="1.6" />
    {/* Signo ! */}
    <path d="M12 8.5 Q11.8 12.5 12.1 14.2" strokeWidth="1.7" />
    <circle cx="12" cy="16.8" r="0.85" fill="currentColor" strokeWidth="0" />
  </Svg>
);

// ─── HdClock ── Reloj ────────────────────────────────────────────────────────
export const HdClock: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Círculo orgánico */}
    <path d="M12.1 2.3 Q17.8 2.1 20.8 6.2 Q23.8 10.4 21.8 15.2 Q19.8 20.1 14.8 21.5 Q9.7 22.9 5.5 19.6 Q1.3 16.2 2.2 11.1 Q3.1 5.9 8 3.4 Q9.9 2.4 12.1 2.3 Z" strokeWidth="1.6" />
    {/* Manecilla de la hora (~10h) */}
    <path d="M12 12 Q10.1 9.6 9.5 7.5" strokeWidth="1.7" />
    {/* Manecilla de los minutos (~10min) */}
    <path d="M12 12 Q14.8 10.2 16.2 9.8" strokeWidth="1.7" />
    {/* Centro */}
    <circle cx="12" cy="12" r="0.9" fill="currentColor" strokeWidth="0" />
  </Svg>
);

// ─── HdMapPin ── Ubicación ────────────────────────────────────────────────────
export const HdMapPin: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Gota invertida / teardrop */}
    <path d="M12.1 2.4 Q16.5 2.3 18.9 5.8 Q21.3 9.4 19.6 13.1 Q17.9 16.7 12.2 21.8 Q6.5 16.8 4.7 13.2 Q2.9 9.5 5.2 5.9 Q7.5 2.3 12.1 2.4 Z" strokeWidth="1.6" />
    {/* Círculo interno */}
    <circle cx="12" cy="9.5" r="2.8" strokeWidth="1.5" />
  </Svg>
);

// ─── HdUpload ── Subir ────────────────────────────────────────────────────────
export const HdUpload: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Flecha hacia arriba */}
    <path d="M12.1 14.5 Q11.8 9.5 12 4.2" strokeWidth="1.7" />
    {/* Cabeza de flecha */}
    <path d="M8.3 7.8 Q10.5 5 12 3.8 Q13.6 5.1 15.8 7.7" strokeWidth="1.7" />
    {/* Línea base */}
    <path d="M4.3 18.8 Q8.5 18.2 12.1 18.5 Q16 18.8 19.8 18.3" strokeWidth="1.7" />
  </Svg>
);

// ─── HdEye ── Visibilidad ─────────────────────────────────────────────────────
export const HdEye: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Forma almendrada */}
    <path d="M2.4 12.1 Q5.8 6.2 12 6.1 Q18.2 6 21.6 11.9 Q18.3 18.1 12.1 18 Q5.8 17.9 2.4 12.1 Z" strokeWidth="1.6" />
    {/* Pupila */}
    <circle cx="12" cy="12" r="2.8" strokeWidth="1.5" />
    {/* Punto central */}
    <circle cx="12" cy="12" r="0.9" fill="currentColor" strokeWidth="0" />
  </Svg>
);

// ─── HdEyeOff ── Ocultar ─────────────────────────────────────────────────────
export const HdEyeOff: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Parte superior del ojo */}
    <path d="M2.4 12 Q5.8 6.1 12 6 Q13.5 6 14.9 6.5" strokeWidth="1.6" />
    {/* Parte inferior */}
    <path d="M9.1 17.5 Q10.5 18 12.1 18 Q18.2 17.9 21.6 11.9" strokeWidth="1.6" />
    {/* Arco de pupila parcial */}
    <path d="M9.5 9.4 Q9.2 11.8 10.5 13.5" strokeWidth="1.5" />
    {/* Línea diagonal */}
    <path d="M3.8 4.2 Q9.5 10.1 20.3 20.5" strokeWidth="1.7" />
  </Svg>
);

// ─── HdArrowLeft ── Flecha izquierda ─────────────────────────────────────────
export const HdArrowLeft: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Línea horizontal */}
    <path d="M4.2 12.1 Q8.5 11.7 12.5 12 Q16.5 12.3 20 11.9" strokeWidth="1.7" />
    {/* Cabeza de flecha */}
    <path d="M8.5 7.5 Q5.7 9.8 4.1 12 Q5.8 14.3 8.6 16.6" strokeWidth="1.7" />
  </Svg>
);

// ─── HdArrowRight ── Flecha derecha ──────────────────────────────────────────
export const HdArrowRight: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Línea horizontal */}
    <path d="M4.2 12.1 Q8.5 11.7 12.5 12 Q16.5 12.3 20 11.9" strokeWidth="1.7" />
    {/* Cabeza de flecha */}
    <path d="M15.5 7.5 Q18.3 9.8 19.9 12 Q18.2 14.3 15.4 16.6" strokeWidth="1.7" />
  </Svg>
);

// ─── HdSave ── Guardar / disquete ────────────────────────────────────────────
export const HdSave: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Cuerpo del disquete */}
    <path d="M4.2 3.8 Q4 2.8 5.3 3 L17.8 3.1 Q18.8 3 19.8 4.1 L21 5.4 Q21.1 6 21 19.2 Q21.1 20.3 19.8 20.8 L4.3 20.9 Q3.1 21.1 3.2 19.7 L3.1 4.5 Q3 4 4.2 3.8 Z" strokeWidth="1.6" />
    {/* Área de etiqueta */}
    <path d="M7.3 3.1 Q7.2 7.2 7.3 8.8 L16.8 8.9 Q17 8.9 17.1 3.2" strokeWidth="1.5" />
    {/* Cuadrado inferior (área de datos) */}
    <path d="M6.5 13.5 Q6.3 12.8 7.1 12.9 L16.9 13 Q17.7 12.9 17.6 13.7 L17.7 19.3 Q17.8 20 17 19.9 L7 20 Q6.2 20.1 6.3 19.3 Z" strokeWidth="1.5" />
  </Svg>
);

// ─── HdFilter ── Filtrar ──────────────────────────────────────────────────────
export const HdFilter: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Embudo */}
    <path d="M3.2 4.8 Q3 3.9 4.1 3.8 L20 3.9 Q21.1 3.8 21.1 4.8 Q21.2 5.8 20.2 6.8 L14.2 12.8 Q13.8 13.3 13.8 14.2 L13.9 19.8 Q13.9 21 12.5 21.1 L11.5 21.2 Q10.2 21.2 10.2 19.8 L10.1 14.3 Q10.1 13.4 9.7 12.9 L3.8 6.9 Q3 6 3.2 4.8 Z" strokeWidth="1.6" />
  </Svg>
);

// ─── HdSend ── Enviar / papel de avión ───────────────────────────────────────
export const HdSend: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Avión de papel triangular */}
    <path d="M3.2 12.1 L20.8 3.5 L13.2 20.9 L10.5 13.6 Z" strokeWidth="1.6" />
    {/* Línea de doblez */}
    <path d="M10.5 13.6 Q14.5 9.5 20.8 3.5" strokeWidth="1.4" />
  </Svg>
);

// ─── HdLink ── Enlace / cadena ────────────────────────────────────────────────
export const HdLink: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Anillo izquierdo */}
    <path d="M8.2 14.8 Q5.1 15.1 3.5 12.9 Q1.8 10.6 3.2 8.2 Q4.7 5.8 7.8 5.5 L10.5 5.4 Q12.5 5.3 13.5 7 Q14.5 8.8 13.3 10.5 Q12.4 11.8 10.8 12" strokeWidth="1.6" />
    {/* Anillo derecho */}
    <path d="M15.8 9.2 Q18.9 8.9 20.5 11.1 Q22.2 13.4 20.8 15.8 Q19.3 18.2 16.2 18.5 L13.5 18.6 Q11.5 18.7 10.5 17 Q9.5 15.2 10.7 13.5 Q11.6 12.2 13.2 12" strokeWidth="1.6" />
  </Svg>
);

// ─── HdShare ── Compartir ─────────────────────────────────────────────────────
export const HdShare: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Tres puntos / nodos */}
    <circle cx="18.5" cy="5.5" r="2.3" strokeWidth="1.5" />
    <circle cx="5.5" cy="12.1" r="2.3" strokeWidth="1.5" />
    <circle cx="18.5" cy="18.5" r="2.3" strokeWidth="1.5" />
    {/* Líneas conectoras */}
    <path d="M7.6 11.1 Q11.5 8.5 16.4 6.4" strokeWidth="1.5" />
    <path d="M7.6 13.1 Q11.5 15.5 16.4 17.6" strokeWidth="1.5" />
  </Svg>
);

// ─── HdRefresh ── Recargar ────────────────────────────────────────────────────
export const HdRefresh: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Arco circular (~270°) */}
    <path d="M20.5 12 Q20.5 17.5 16.2 20.2 Q11.8 22.9 7.2 20.8 Q2.6 18.7 2.2 13.2 Q1.8 7.7 6.5 5 Q11.2 2.3 15.8 4.8 Q18 6 19.5 8.5" strokeWidth="1.6" />
    {/* Cabeza de flecha */}
    <path d="M16.2 4 L20.2 8.2 L15.4 9.5" strokeWidth="1.6" />
  </Svg>
);

// ─── HdLock ── Candado cerrado ────────────────────────────────────────────────
export const HdLock: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Cuerpo */}
    <path d="M5.1 11.2 Q4.9 10.3 5.8 10.1 L18.3 10 Q19.2 9.9 19.1 10.9 L19.2 20.1 Q19.3 21.1 18.2 21.1 L5.8 21.2 Q4.8 21.3 4.9 20.2 Z" strokeWidth="1.6" />
    {/* Shackle (arco U) */}
    <path d="M8.2 10.2 Q8 7.5 8.3 6.3 Q9 3.9 12.1 3.8 Q15.2 3.7 15.8 6.2 Q16.2 7.4 16.1 10.1" strokeWidth="1.6" />
    {/* Punto de cerrojo */}
    <circle cx="12.1" cy="15.5" r="1.5" strokeWidth="1.5" />
  </Svg>
);

// ─── HdUnlock ── Candado abierto ──────────────────────────────────────────────
export const HdUnlock: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Cuerpo */}
    <path d="M5.1 11.2 Q4.9 10.3 5.8 10.1 L18.3 10 Q19.2 9.9 19.1 10.9 L19.2 20.1 Q19.3 21.1 18.2 21.1 L5.8 21.2 Q4.8 21.3 4.9 20.2 Z" strokeWidth="1.6" />
    {/* Shackle abierto (desplazado a la derecha) */}
    <path d="M8.2 10.2 Q8 7.5 8.3 6.3 Q9 3.9 12.1 3.8 Q15.2 3.7 15.8 6.2 Q16.2 7.4 16.1 7.8 Q16.2 8.4 18.5 8.3" strokeWidth="1.6" />
    {/* Punto de cerrojo */}
    <circle cx="12.1" cy="15.5" r="1.5" strokeWidth="1.5" />
  </Svg>
);

// ─── HdPackage ── Caja / paquete ──────────────────────────────────────────────
export const HdPackage: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Cuerpo de la caja */}
    <path d="M3.2 7.8 Q3 6.8 4 6.2 L12 2.8 L20.1 6.2 Q21.1 6.8 21 7.9 L21.1 16.2 Q21.2 17.2 20.1 17.9 L12.1 21.2 L4.1 17.9 Q3 17.3 3.1 16.2 Z" strokeWidth="1.6" />
    {/* Línea horizontal central */}
    <path d="M3.2 7.9 Q7.5 9.8 12 10.1 Q16.5 10.4 21 7.9" strokeWidth="1.5" />
    {/* Línea vertical central */}
    <path d="M12 2.8 Q11.8 6.5 12.1 10.1 Q12 14.5 12.1 21.2" strokeWidth="1.5" />
  </Svg>
);

// ─── HdZap ── Rayo / electricidad ────────────────────────────────────────────
export const HdZap: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Rayo zigzag */}
    <path d="M13.2 2.8 Q13.5 2.2 12.8 2.3 L7.5 2.4 Q6.8 2.3 7.1 3.1 L9.8 11.2 L4.5 11.3 Q3.5 11.2 4.1 12.2 L11.8 21.5 Q12.4 22.3 12.5 21.1 L11.2 13.5 L17.5 13.4 Q18.5 13.5 17.9 12.5 Z" strokeWidth="1.6" />
  </Svg>
);

// ─── HdImage ── Imagen ────────────────────────────────────────────────────────
export const HdImage: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Marco */}
    <path d="M3.2 4.8 Q3 3.8 4.2 3.9 L19.9 4 Q21.1 3.9 21 5.1 L21.1 18.9 Q21.2 20.1 19.9 20 L4.2 20.1 Q3 20.2 3.1 18.9 Z" strokeWidth="1.6" />
    {/* Montaña / paisaje interno */}
    <path d="M3.2 16.2 Q6 11.8 9.5 14.2 Q12 15.9 14.8 11.2 Q18 6.2 21 14.5" strokeWidth="1.5" />
    {/* Sol en esquina */}
    <circle cx="7.5" cy="8.5" r="2" strokeWidth="1.4" />
  </Svg>
);

// ─── HdStar ── Estrella ──────────────────────────────────────────────────────
export const HdStar: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Estrella de 5 puntas */}
    <path d="M12.1 2.3 Q12.6 4.5 13.8 7.8 L17.6 7.9 Q19.8 8.1 19.9 8.8 Q20 9.6 18 11.1 L15.6 13.2 Q16.5 16.5 17.1 18.8 Q17.6 19.8 16.9 20.3 Q16.1 20.8 14.2 19.6 L12.1 18.1 L9.9 19.5 Q7.9 20.8 7.2 20.3 Q6.4 19.8 6.9 18.8 L7.8 15.5 Q8.3 13.8 8.5 13.2 L6.1 11.1 Q4.1 9.5 4.2 8.8 Q4.3 8 6.5 7.9 L10.3 7.8 Z" strokeWidth="1.6" />
  </Svg>
);

// ─── HdHome ── Inicio / casa ──────────────────────────────────────────────────
export const HdHome: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Tejado / triángulo */}
    <path d="M2.8 10.8 Q6.5 7 12 3.5 Q17.5 7 21.2 10.8" strokeWidth="1.7" />
    {/* Cuerpo de la casa */}
    <path d="M4.8 10.2 Q4.5 9.8 4.8 10.2 L4.9 19.8 Q4.8 20.8 6 20.9 L18.1 21 Q19.3 21.1 19.2 19.8 L19.3 10.1" strokeWidth="1.6" />
    {/* Puerta */}
    <path d="M9.3 21 L9.2 16 Q9.1 14.8 10.5 14.7 L13.5 14.8 Q14.9 14.7 14.8 16 L14.9 21.1" strokeWidth="1.5" />
  </Svg>
);

// ─── HdSettings ── Alias de HdGear ───────────────────────────────────────────
export const HdSettings: React.FC<IconProps> = HdGear;

// ─── HdInfo ── Información ────────────────────────────────────────────────────
export const HdInfo: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Círculo */}
    <path d="M12.1 2.3 Q17.8 2.1 20.8 6.2 Q23.8 10.4 21.8 15.2 Q19.8 20.1 14.8 21.5 Q9.7 22.9 5.5 19.6 Q1.3 16.2 2.2 11.1 Q3.1 5.9 8 3.4 Q9.9 2.4 12.1 2.3 Z" strokeWidth="1.6" />
    {/* i - punto */}
    <circle cx="12" cy="7.5" r="0.85" fill="currentColor" strokeWidth="0" />
    {/* i - línea */}
    <path d="M12.1 10.5 Q11.8 13.5 12 16.5" strokeWidth="1.7" />
  </Svg>
);

// ─── HdShield ── Escudo ───────────────────────────────────────────────────────
export const HdShield: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Forma de escudo */}
    <path d="M12.1 2.3 Q15.5 3.8 19.8 4.2 Q21 4.3 21.1 5.5 L21 10.8 Q21.1 15.8 17.8 18.9 Q15.5 21.1 12.1 22 Q8.7 21.1 6.4 18.9 Q3.1 15.8 3 10.8 L2.9 5.5 Q3 4.3 4.2 4.2 Q8.5 3.8 12.1 2.3 Z" strokeWidth="1.6" />
  </Svg>
);

// ─── HdPaperclip ── Clip ─────────────────────────────────────────────────────
export const HdPaperclip: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Clip externo */}
    <path d="M21.2 11.5 Q21.1 7.2 18 4.8 Q14.9 2.4 11.2 3.5 Q7.5 4.6 6.2 8.1 L3.5 15.8 Q2.5 19.5 5.2 21.5 Q7.8 23.4 10.8 21.8 Q12.5 20.9 13.5 19.1 L17.8 7.9 Q18.8 5.2 17 3.8 Q15.2 2.4 13.1 3.5 Q11.5 4.3 10.8 6.2 L7.5 15.3 Q6.8 17.2 8.1 18.2 Q9.5 19.2 10.9 18.3 Q11.8 17.8 12.1 16.9 L15 8.9" strokeWidth="1.5" />
  </Svg>
);

// ─── HdExternalLink ── Enlace externo ─────────────────────────────────────────
export const HdExternalLink: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Caja/marco */}
    <path d="M10.2 4.8 Q6 4.5 4.8 4.8 Q3.8 5 3.9 6.1 L4 19.2 Q3.9 20.3 5.1 20.2 L18.2 20.3 Q19.3 20.4 19.2 19.2 L19.3 13.8" strokeWidth="1.6" />
    {/* Flecha saliendo arriba-derecha */}
    <path d="M12.8 3.8 Q15.5 3.6 20.2 3.7 L20.3 9" strokeWidth="1.7" />
    {/* Línea diagonal */}
    <path d="M20.2 3.8 Q16.5 7.2 11.5 12.5" strokeWidth="1.7" />
  </Svg>
);

// ─── HdCopy ── Copiar ─────────────────────────────────────────────────────────
export const HdCopy: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Rectángulo de atrás */}
    <path d="M8.2 6.3 Q8 5.2 9.1 5.1 L18.8 5 Q19.9 4.9 20 6 L20.1 16.8 Q20.2 17.9 19.1 17.8 L17.2 17.9" strokeWidth="1.5" />
    {/* Rectángulo de delante */}
    <path d="M4.2 8.3 Q4 7.2 5.1 7.1 L14.8 7 Q15.9 6.9 16 8 L16.1 18.8 Q16.2 19.9 15.1 19.8 L5.1 19.9 Q4 20 4.1 18.9 Z" strokeWidth="1.6" />
  </Svg>
);

// ─── HdPrinter ── Impresora ───────────────────────────────────────────────────
export const HdPrinter: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Parte superior (papel) */}
    <path d="M7.2 7.1 Q7 3.8 7.3 3.2 Q7.6 2.8 8.3 2.9 L15.8 3 Q16.5 2.9 16.8 3.3 Q17.1 3.8 16.9 7.2" strokeWidth="1.5" />
    {/* Cuerpo de la impresora */}
    <path d="M4.2 7.2 Q3.1 7 3 8.2 L2.9 14.8 Q2.8 15.9 4 15.9 L7.1 16 L7 18.8 Q6.9 19.9 8 20 L16.1 20.1 Q17.2 20.2 17.1 18.9 L17 16 L20.1 15.9 Q21.2 15.9 21.1 14.8 L21 8.1 Q20.9 7 19.8 7.1 Z" strokeWidth="1.6" />
    {/* Papel saliendo */}
    <path d="M8.5 16 Q8.3 18 9.1 19 L15.1 19.1 Q15.9 18.2 15.7 16" strokeWidth="1.4" />
    {/* Puntos del panel */}
    <circle cx="17.5" cy="11" r="0.8" fill="currentColor" strokeWidth="0" />
  </Svg>
);

// ─── HdDollarSign ── Dinero ───────────────────────────────────────────────────
export const HdDollarSign: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Línea vertical */}
    <path d="M12.1 2.2 Q11.8 7 12 12.1 Q12.2 17.2 11.9 22" strokeWidth="1.6" />
    {/* Curva S */}
    <path d="M15.8 6.8 Q15.9 5 14.2 4.2 Q12.5 3.4 10.5 4.1 Q8.5 4.8 8.2 6.8 Q8 8.8 10.5 9.8 Q13.5 10.9 14.8 12.5 Q16.2 14.2 15.5 16.5 Q14.8 18.8 12.3 19.5 Q9.8 20.2 7.8 18.8 Q6.5 18 6.5 16.5" strokeWidth="1.6" />
  </Svg>
);

// ─── HdRuler ── Regla ─────────────────────────────────────────────────────────
export const HdRuler: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Cuerpo de la regla (diagonal) */}
    <path d="M3.5 20.5 Q2.8 19.8 3.5 18.9 L18.9 3.5 Q19.8 2.8 20.5 3.5 Q21.2 4.2 20.5 5.1 L5.1 20.5 Q4.2 21.2 3.5 20.5 Z" strokeWidth="1.5" />
    {/* Marcas de tick */}
    <path d="M7 17 Q8.1 15.9 8.8 15.2" strokeWidth="1.4" />
    <path d="M9.5 14.5 Q10.3 13.7 11.2 12.8" strokeWidth="1.4" />
    <path d="M12 12 Q13.2 10.8 14.5 9.5" strokeWidth="1.4" />
    <path d="M14.5 9.5 Q15.3 8.7 16.2 7.8" strokeWidth="1.4" />
  </Svg>
);

// ─── HdTrendingUp ── Tendencia ascendente ─────────────────────────────────────
export const HdTrendingUp: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Línea ascendente */}
    <path d="M2.5 17.8 Q6.5 14.5 9.5 12.5 Q12.5 10.5 14.8 7.8 Q16.8 5.8 19.5 4.8" strokeWidth="1.7" />
    {/* Cabeza de flecha */}
    <path d="M15.5 4.5 Q17.5 4.3 20 4.8 L19.8 7.5" strokeWidth="1.7" />
  </Svg>
);

// ─── HdDroplet ── Gota de agua ────────────────────────────────────────────────
export const HdDroplet: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Gota */}
    <path d="M12.1 2.5 Q15.8 7.5 17.8 11.5 Q19.8 15.5 18.2 18.1 Q16.5 20.8 12.1 20.9 Q7.7 21 6 18.2 Q4.2 15.5 6.2 11.5 Q8.2 7.5 12.1 2.5 Z" strokeWidth="1.6" />
    {/* Reflejo interior */}
    <path d="M15.2 14.5 Q15.5 12.8 14.5 11.5" strokeWidth="1.3" />
  </Svg>
);

// ─── HdFlame ── Llama ─────────────────────────────────────────────────────────
export const HdFlame: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* Llama exterior */}
    <path d="M12.1 2.3 Q14.5 5.5 14.8 8 Q16.5 5.5 15.8 3.5 Q19.8 6.5 20.8 11.5 Q21.8 16.5 18.5 19.5 Q15.2 22.5 12 22.5 Q8.8 22.5 5.5 19.5 Q2.2 16.5 3.2 11.5 Q4.2 6.5 7.8 4.5 Q7.2 6.5 9.5 8 Q9.5 5.5 12.1 2.3 Z" strokeWidth="1.6" />
    {/* Llama interna */}
    <path d="M12 9.5 Q13.5 11.8 13.8 14.5 Q14 17.5 12 18.5 Q10 17.5 10.2 14.5 Q10.5 11.8 12 9.5 Z" strokeWidth="1.4" />
  </Svg>
);

// ─── HdGrid ── Cuadrícula ─────────────────────────────────────────────────────
export const HdGrid: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <Svg size={size} className={className} style={style}>
    {/* 9 puntos en cuadrícula 3x3 */}
    <circle cx="5" cy="5" r="1.5" fill="currentColor" strokeWidth="0" />
    <circle cx="12" cy="5" r="1.5" fill="currentColor" strokeWidth="0" />
    <circle cx="19" cy="5" r="1.5" fill="currentColor" strokeWidth="0" />
    <circle cx="5" cy="12" r="1.5" fill="currentColor" strokeWidth="0" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" strokeWidth="0" />
    <circle cx="19" cy="12" r="1.5" fill="currentColor" strokeWidth="0" />
    <circle cx="5" cy="19" r="1.5" fill="currentColor" strokeWidth="0" />
    <circle cx="12" cy="19" r="1.5" fill="currentColor" strokeWidth="0" />
    <circle cx="19" cy="19" r="1.5" fill="currentColor" strokeWidth="0" />
  </Svg>
);

// ─── AppIcon ── Componente unificado ──────────────────────────────────────────

export type AppIconName =
  | 'calendar'
  | 'grid'
  | 'waves'
  | 'folder'
  | 'message'
  | 'gear'
  | 'logout'
  | 'users'
  | 'menu'
  | 'close'
  | 'plus'
  | 'search'
  | 'chevron-right'
  | 'chevron-left'
  | 'chevron-down'
  | 'bell'
  | 'building'
  | 'activity'
  | 'file-text'
  | 'database'
  | 'check'
  | 'download'
  | 'edit'
  | 'trash'
  | 'alert-triangle'
  | 'clock'
  | 'map-pin'
  | 'upload'
  | 'eye'
  | 'eye-off'
  | 'arrow-left'
  | 'arrow-right'
  | 'save'
  | 'filter'
  | 'send'
  | 'link'
  | 'share'
  | 'refresh'
  | 'lock'
  | 'unlock'
  | 'package'
  | 'zap'
  | 'image'
  | 'star'
  | 'home'
  | 'settings'
  | 'info'
  | 'shield'
  | 'paperclip'
  | 'external-link'
  | 'copy'
  | 'printer'
  | 'dollar'
  | 'ruler'
  | 'trending-up'
  | 'droplet'
  | 'flame'
  | 'dot-grid';

const iconMap: Record<AppIconName, React.FC<IconProps>> = {
  calendar: HdCalendar,
  grid: HdLayoutGrid,
  waves: HdWaves,
  folder: HdFolderOpen,
  message: HdMessageBubble,
  gear: HdGear,
  logout: HdArrowOut,
  users: HdUsers,
  menu: HdMenu,
  close: HdX,
  plus: HdPlus,
  search: HdSearch,
  'chevron-right': HdChevronRight,
  'chevron-left': HdChevronLeft,
  'chevron-down': HdChevronDown,
  bell: HdBell,
  building: HdBuilding,
  activity: HdActivity,
  'file-text': HdFileText,
  database: HdDatabase,
  check: HdCheck,
  download: HdDownload,
  edit: HdEdit,
  trash: HdTrash,
  'alert-triangle': HdAlertTriangle,
  clock: HdClock,
  'map-pin': HdMapPin,
  upload: HdUpload,
  eye: HdEye,
  'eye-off': HdEyeOff,
  'arrow-left': HdArrowLeft,
  'arrow-right': HdArrowRight,
  save: HdSave,
  filter: HdFilter,
  send: HdSend,
  link: HdLink,
  share: HdShare,
  refresh: HdRefresh,
  lock: HdLock,
  unlock: HdUnlock,
  package: HdPackage,
  zap: HdZap,
  image: HdImage,
  star: HdStar,
  home: HdHome,
  settings: HdSettings,
  info: HdInfo,
  shield: HdShield,
  paperclip: HdPaperclip,
  'external-link': HdExternalLink,
  copy: HdCopy,
  printer: HdPrinter,
  dollar: HdDollarSign,
  ruler: HdRuler,
  'trending-up': HdTrendingUp,
  droplet: HdDroplet,
  flame: HdFlame,
  'dot-grid': HdGrid,
};

export const AppIcon: React.FC<{ name: AppIconName } & IconProps> = ({
  name,
  size = 20,
  className = '',
  style,
}) => {
  const Icon = iconMap[name];
  if (!Icon) return null;
  return <Icon size={size} className={className} style={style} />;
};
