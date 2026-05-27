import React from 'react';

/**
 * WeatherIcon — iconos de clima dibujados a mano, animados, se adaptan al contenedor.
 * Uso: <WeatherIcon code={0} isNight className="w-12 h-12 text-white" />
 */

interface WeatherIconProps {
  code: number;
  isNight?: boolean;
  className?: string;
}

// ─── nube compartida (path reutilizable) ───────────────────────────────────────
const CLOUD = 'M 9 34 Q 8 25 15 24 Q 14 15 22 15 Q 25 9 31 12 Q 38 8 40 15 Q 46 15 45 24 Q 46 33 39 34 Z';
const CLOUD_SM = 'M 5 20 Q 4 14 10 13 Q 10 8 16 8 Q 18 5 22 7 Q 27 4 28 8 Q 33 8 33 14 Q 34 20 28 21 Z';

// ─── Estilos CSS de animaciones ────────────────────────────────────────────────
const A = {
  sol: `
    @keyframes w-spin { to { transform: rotate(360deg); } }
    @keyframes w-pulse { 0%,100%{opacity:.7} 50%{opacity:1} }
    .wr { animation: w-spin 22s linear infinite; transform-origin: 24px 24px; }
    .wc { animation: w-pulse 2.5s ease-in-out infinite; }
  `,
  luna: `
    @keyframes w-glow { 0%,100%{opacity:.75} 50%{opacity:1} }
    @keyframes w-blink { 0%,100%{opacity:.15} 50%{opacity:.9} }
    .wm { animation: w-glow 3s ease-in-out infinite; }
    .ws1 { animation: w-blink 2s 0s ease-in-out infinite; }
    .ws2 { animation: w-blink 2s .7s ease-in-out infinite; }
    .ws3 { animation: w-blink 2s 1.3s ease-in-out infinite; }
  `,
  parcial: `
    @keyframes w-peek { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-2px,-2px)} }
    @keyframes w-sway { 0%,100%{transform:translateX(0)} 50%{transform:translateX(3px)} }
    .wpk { animation: w-peek 3s ease-in-out infinite; transform-origin: 32px 14px; }
    .wcl { animation: w-sway 5s ease-in-out infinite; }
  `,
  nublado: `
    @keyframes w-drift { 0%,100%{transform:translateX(0)} 50%{transform:translateX(3px)} }
    .wdr { animation: w-drift 5s ease-in-out infinite; }
  `,
  niebla: `
    @keyframes w-fog { 0%,100%{opacity:.35;transform:translateX(-4px)} 50%{opacity:.8;transform:translateX(4px)} }
    .wfg { animation: w-fog 4s ease-in-out infinite; }
  `,
  lluvia: `
    @keyframes w-drop { 0%{transform:translateY(-4px);opacity:.4} 50%{opacity:1} 100%{transform:translateY(5px);opacity:.4} }
    .wrd { animation: w-drop 1.4s ease-in-out infinite; }
  `,
  tormenta: `
    @keyframes w-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-2px)} 75%{transform:translateX(2px)} }
    @keyframes w-bolt { 0%,42%,58%,100%{opacity:1} 50%{opacity:.04} }
    .wsk { animation: w-shake .55s ease-in-out infinite; }
    .wbt { animation: w-bolt 2s ease-in-out infinite; }
  `,
  nieve: `
    @keyframes w-flake { 0%,100%{transform:translateY(-3px) rotate(-6deg)} 50%{transform:translateY(3px) rotate(6deg)} }
    .wsn { animation: w-flake 2.8s ease-in-out infinite; }
  `,
  rayo: `
    @keyframes w-flash { 0%,40%,60%,100%{opacity:1} 50%{opacity:.05;filter:brightness(2)} }
    .wfl { animation: w-flash 1.6s ease-in-out infinite; }
  `,
};

// ─── SVG base (hereda currentColor del padre) ──────────────────────────────────
const W = ({
  css,
  children,
}: {
  css: string;
  children: React.ReactNode;
}) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: '100%', height: '100%', display: 'block' }}
    aria-hidden
  >
    <style>{css}</style>
    {children}
  </svg>
);

// ─── SOL ───────────────────────────────────────────────────────────────────────
const Sol = () => (
  <W css={A.sol}>
    {/* rayos que giran */}
    <g className="wr" strokeWidth="1.7">
      <path d="M24 6 Q24.4 9 24 12" />
      <path d="M24 36 Q23.6 39 24 42" />
      <path d="M6 24 Q9 24.4 12 24" />
      <path d="M36 24 Q39 23.6 42 24" />
      <path d="M11.5 11.5 Q13.3 13 14.8 14.8" />
      <path d="M33.2 33.2 Q34.7 35 36.5 36.5" />
      <path d="M36.5 11.5 Q34.7 13 33.2 14.8" />
      <path d="M14.8 33.2 Q13 34.7 11.5 36.5" />
    </g>
    {/* núcleo */}
    <circle cx="24" cy="24" r="8.5" strokeWidth="1.8" className="wc" />
  </W>
);

// ─── LUNA ──────────────────────────────────────────────────────────────────────
const Luna = () => (
  <W css={A.luna}>
    {/* creciente dibujado a mano */}
    <path
      className="wm"
      d="M27 9 Q40 17 40 28 Q40 38 28 42 Q18 45 13 38 Q20 38 24 32 Q29 25 27 17 Q26 13 27 9 Z"
      strokeWidth="1.7"
    />
    {/* estrellas */}
    <circle cx="9" cy="13" r="1.2" className="ws1" strokeWidth="1.4" />
    <circle cx="40" cy="9" r="1" className="ws2" strokeWidth="1.4" />
    <circle cx="36" cy="40" r="1.2" className="ws3" strokeWidth="1.4" />
  </W>
);

// ─── PARCIALMENTE NUBLADO ──────────────────────────────────────────────────────
const Parcial = () => (
  <W css={A.parcial}>
    {/* mini sol que se asoma — animado */}
    <g className="wpk" strokeWidth="1.5">
      <circle cx="32" cy="14" r="5.5" />
      <path d="M32 5 Q32.3 7 32 9" />
      <path d="M32 19 Q31.7 21 32 23" />
      <path d="M23 14 Q25 14.3 27 14" />
      <path d="M37 14 Q39 13.7 41 14" />
      <path d="M25.5 7.5 Q26.8 8.8 27.8 9.8" />
      <path d="M36.2 18.2 Q37.5 19.5 38.5 20.5" />
      <path d="M38.5 7.5 Q37.2 8.8 36.2 9.8" />
      <path d="M27.8 18.2 Q26.5 19.5 25.5 20.5" />
    </g>
    {/* nube delante */}
    <g className="wcl" strokeWidth="1.7">
      <path d={CLOUD_SM} />
    </g>
  </W>
);

// ─── NUBLADO ───────────────────────────────────────────────────────────────────
const Nublado = () => (
  <W css={A.nublado}>
    {/* nube de fondo más pequeña */}
    <path
      className="wdr"
      d="M 5 34 Q 4 26 10 25 Q 10 18 17 18 Q 19 13 24 15 Q 30 11 31 17 Q 36 17 36 24 Q 37 32 31 33 Z"
      strokeWidth="1.5"
      opacity="0.5"
    />
    {/* nube principal */}
    <path className="wdr" d={CLOUD} strokeWidth="1.8" />
  </W>
);

// ─── NIEBLA ────────────────────────────────────────────────────────────────────
const Niebla = () => (
  <W css={A.niebla}>
    <g className="wfg" strokeWidth="1.8">
      <path d="M 6 14 Q 13 12 20 14 Q 27 16 34 14 Q 39 12 43 14" />
      <path d="M 8 21 Q 15 19 22 21 Q 29 23 36 21 Q 40 19 44 21" />
      <path d="M 5 28 Q 12 26 20 28 Q 28 30 36 28 Q 41 26 44 28" />
      <path d="M 9 35 Q 16 33 24 35 Q 32 37 39 35 Q 42 33 45 35" />
    </g>
  </W>
);

// ─── LLUVIA ────────────────────────────────────────────────────────────────────
const Lluvia = () => (
  <W css={A.lluvia}>
    <path d={CLOUD} strokeWidth="1.8" />
    {/* gotas — diagonales dibujadas a mano */}
    <g className="wrd" strokeWidth="1.6">
      <path d="M 13 38 Q 12.5 40 12 43" />
      <path d="M 20 38 Q 19.5 40 19 43" />
      <path d="M 27 38 Q 26.5 40 26 43" />
      <path d="M 34 38 Q 33.5 40 33 43" />
      <path d="M 16.5 41 Q 16 43 15.5 46" />
      <path d="M 23.5 41 Q 23 43 22.5 46" />
      <path d="M 30.5 41 Q 30 43 29.5 46" />
    </g>
  </W>
);

// ─── TORMENTA ──────────────────────────────────────────────────────────────────
const Tormenta = () => (
  <W css={A.tormenta}>
    <g className="wsk">
      {/* nube oscura */}
      <path d={CLOUD} strokeWidth="1.8" />
      {/* rayo */}
      <polyline
        className="wbt"
        points="28,34 22,41 26,41 20,48"
        strokeWidth="2.2"
      />
    </g>
  </W>
);

// ─── NIEVE ─────────────────────────────────────────────────────────────────────
const Nieve = () => (
  <W css={A.nieve}>
    <path d={CLOUD} strokeWidth="1.8" />
    <g className="wsn" strokeWidth="1.6">
      {/* 3 copos — asteriscos a mano */}
      {/* copo 1 */}
      <line x1="14" y1="38" x2="14" y2="44" />
      <line x1="11" y1="39.5" x2="17" y2="42.5" />
      <line x1="11" y1="42.5" x2="17" y2="39.5" />
      {/* copo 2 */}
      <line x1="24" y1="38" x2="24" y2="44" />
      <line x1="21" y1="39.5" x2="27" y2="42.5" />
      <line x1="21" y1="42.5" x2="27" y2="39.5" />
      {/* copo 3 */}
      <line x1="34" y1="38" x2="34" y2="44" />
      <line x1="31" y1="39.5" x2="37" y2="42.5" />
      <line x1="31" y1="42.5" x2="37" y2="39.5" />
    </g>
  </W>
);

// ─── RAYO (tormenta eléctrica fuerte) ──────────────────────────────────────────
const Rayo = () => (
  <W css={A.rayo}>
    <polyline
      className="wfl"
      points="30,4 18,24 26,24 14,44"
      strokeWidth="2.4"
    />
  </W>
);

// ─── TERMÓMETRO (fallback) ─────────────────────────────────────────────────────
const Termometro = () => (
  <W css="">
    <rect x="21" y="6" width="6" height="24" rx="3" strokeWidth="1.6" />
    <circle cx="24" cy="35" r="6.5" strokeWidth="1.6" />
    {[0, 1, 2, 3].map(i => (
      <path key={i} d={`M27 ${10 + i * 6} Q29 ${10 + i * 6} 31 ${10 + i * 6}`} strokeWidth="1.4" />
    ))}
  </W>
);

// ─── Componente principal ──────────────────────────────────────────────────────
export const WeatherIcon: React.FC<WeatherIconProps> = ({
  code,
  isNight = false,
  className = 'w-10 h-10',
}) => {
  const Icon = resolveIcon(code, isNight);
  return (
    <span className={`inline-flex items-center justify-center shrink-0 ${className}`}>
      <Icon />
    </span>
  );
};

function resolveIcon(code: number, isNight: boolean): React.FC {
  if (code === 0 && isNight) return Luna;
  if (code === 0) return Sol;
  if (code <= 2) return Parcial;
  if (code === 3) return Nublado;
  if (code >= 45 && code <= 48) return Niebla;
  if (code >= 51 && code <= 65) return Lluvia;
  if (code >= 71 && code <= 86) return Nieve;
  if (code >= 95) return Rayo;
  if (code >= 80) return Tormenta;
  return Termometro;
}

// ─── Alias legacy ─────────────────────────────────────────────────────────────
export const AnimatedWeatherIcon: React.FC<{
  weatherCode: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isNightTime?: boolean;
}> = ({ weatherCode, size = 'md', isNightTime = false }) => {
  const sizeClass = { sm: 'w-10 h-10', md: 'w-14 h-14', lg: 'w-18 h-18', xl: 'w-22 h-22' }[size];
  return <WeatherIcon code={weatherCode} isNight={isNightTime} className={sizeClass} />;
};
