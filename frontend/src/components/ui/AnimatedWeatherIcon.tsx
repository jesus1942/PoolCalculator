import React from 'react';

interface AnimatedWeatherIconProps {
  weatherCode: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isNightTime?: boolean;
}

const sizes = {
  sm: 48,
  md: 56,
  lg: 72,
  xl: 88,
};

// SVG: Sol
const SunSVG = ({ s }: { s: number }) => (
  <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
    <style>{`
      @keyframes sun-spin { from { transform-origin: 24px 24px; transform: rotate(0deg); } to { transform-origin: 24px 24px; transform: rotate(360deg); } }
      @keyframes sun-pulse { 0%,100% { opacity:.7; } 50% { opacity:1; } }
      .sun-rays { animation: sun-spin 20s linear infinite; }
      .sun-glow { animation: sun-pulse 2s ease-in-out infinite; }
    `}</style>
    <g className="sun-rays">
      {[0,45,90,135,180,225,270,315].map(a => (
        <line key={a} x1="24" y1="5" x2="24" y2="11"
          stroke="#FCD34D" strokeWidth="2.5" strokeLinecap="round"
          transform={`rotate(${a} 24 24)`} />
      ))}
    </g>
    <circle cx="24" cy="24" r="9" fill="#FCD34D" className="sun-glow" />
  </svg>
);

// SVG: Luna + estrellas
const MoonSVG = ({ s }: { s: number }) => (
  <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
    <style>{`
      @keyframes moon-glow { 0%,100% { filter: drop-shadow(0 0 4px rgba(254,243,199,.5)); } 50% { filter: drop-shadow(0 0 10px rgba(254,243,199,.9)); } }
      @keyframes star-blink { 0%,100% { opacity:.2; } 50% { opacity:1; } }
      .moon-shape { animation: moon-glow 3s ease-in-out infinite; }
      .st1 { animation: star-blink 2s ease-in-out infinite; }
      .st2 { animation: star-blink 2s ease-in-out .7s infinite; }
      .st3 { animation: star-blink 2s ease-in-out 1.4s infinite; }
    `}</style>
    <path className="moon-shape" d="M28 10a14 14 0 0 1 0 28 16 16 0 0 1 0-28z" fill="#FDE68A" />
    <circle cx="10" cy="14" r="1.5" fill="#FDE68A" className="st1" />
    <circle cx="40" cy="10" r="1.2" fill="#FDE68A" className="st2" />
    <circle cx="38" cy="38" r="1.5" fill="#FDE68A" className="st3" />
  </svg>
);

// SVG: Nublado parcial (sol + nube)
const PartlyCloudySVG = ({ s }: { s: number }) => (
  <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
    <style>{`
      @keyframes sun-peek { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-2px,-2px); } }
      @keyframes cloud-sway { 0%,100% { transform: translateX(0); } 50% { transform: translateX(3px); } }
      .sp { animation: sun-peek 3s ease-in-out infinite; transform-origin: 18px 18px; }
      .cp { animation: cloud-sway 4s ease-in-out infinite; }
    `}</style>
    <g className="sp">
      {[0,60,120,180,240,300].map(a => (
        <line key={a} x1="18" y1="6" x2="18" y2="10"
          stroke="#FCD34D" strokeWidth="2" strokeLinecap="round"
          transform={`rotate(${a} 18 18)`} />
      ))}
      <circle cx="18" cy="18" r="6" fill="#FCD34D" />
    </g>
    <g className="cp">
      <rect x="12" y="28" width="28" height="12" rx="6" fill="#9CA3AF" />
      <circle cx="20" cy="28" r="7" fill="#9CA3AF" />
      <circle cx="30" cy="26" r="8" fill="#9CA3AF" />
    </g>
  </svg>
);

// SVG: Nublado
const CloudySVG = ({ s }: { s: number }) => (
  <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
    <style>{`
      @keyframes cloud-drift { 0%,100% { transform: translateX(-2px); } 50% { transform: translateX(2px); } }
      .cd { animation: cloud-drift 5s ease-in-out infinite; }
    `}</style>
    <g className="cd">
      <rect x="8" y="28" width="32" height="13" rx="6.5" fill="#6B7280" />
      <circle cx="18" cy="27" r="9" fill="#6B7280" />
      <circle cx="30" cy="24" r="10" fill="#9CA3AF" />
      <rect x="14" y="22" width="24" height="18" rx="4" fill="#9CA3AF" />
    </g>
  </svg>
);

// SVG: Niebla
const FogSVG = ({ s }: { s: number }) => (
  <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
    <style>{`
      @keyframes fog-wave { 0%,100% { opacity:.4; transform:translateX(-4px); } 50% { opacity:.8; transform:translateX(4px); } }
      .fw { animation: fog-wave 4s ease-in-out infinite; }
    `}</style>
    <g className="fw" strokeLinecap="round" stroke="#9CA3AF" strokeWidth="2.5">
      <line x1="8" y1="16" x2="40" y2="16" />
      <line x1="12" y1="24" x2="36" y2="24" />
      <line x1="8" y1="32" x2="40" y2="32" />
    </g>
  </svg>
);

// SVG: Lluvia
const RainSVG = ({ s }: { s: number }) => (
  <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
    <style>{`
      @keyframes drop-fall { 0% { transform:translateY(-4px); opacity:.5; } 50% { opacity:1; } 100% { transform:translateY(4px); opacity:.5; } }
      .dr { animation: drop-fall 1.5s ease-in-out infinite; }
    `}</style>
    <g>
      <rect x="8" y="14" width="32" height="13" rx="6.5" fill="#6B7280" />
      <circle cx="18" cy="13" r="7" fill="#6B7280" />
      <circle cx="30" cy="10" r="9" fill="#9CA3AF" />
      <rect x="14" y="8" width="22" height="16" rx="4" fill="#9CA3AF" />
    </g>
    <g className="dr" strokeLinecap="round" stroke="#60A5FA" strokeWidth="2">
      <line x1="16" y1="32" x2="14" y2="39" />
      <line x1="24" y1="32" x2="22" y2="39" />
      <line x1="32" y1="32" x2="30" y2="39" />
    </g>
  </svg>
);

// SVG: Tormenta
const StormSVG = ({ s }: { s: number }) => (
  <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
    <style>{`
      @keyframes storm-shake { 0%,100% { transform:translateX(0); } 25% { transform:translateX(-2px) rotate(-1deg); } 75% { transform:translateX(2px) rotate(1deg); } }
      @keyframes bolt-flash { 0%,40%,60%,100% { opacity:1; } 50% { opacity:.1; } }
      .sk { animation: storm-shake .5s ease-in-out infinite; }
      .bolt { animation: bolt-flash 2s ease-in-out infinite; }
    `}</style>
    <g className="sk">
      <rect x="8" y="10" width="32" height="13" rx="6.5" fill="#4B5563" />
      <circle cx="18" cy="9" r="7" fill="#4B5563" />
      <circle cx="30" cy="6" r="9" fill="#6B7280" />
      <rect x="14" y="4" width="22" height="16" rx="4" fill="#6B7280" />
      <g className="bolt">
        <polyline points="27,22 21,32 25,32 19,44" stroke="#FCD34D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    </g>
  </svg>
);

// SVG: Nieve
const SnowSVG = ({ s }: { s: number }) => (
  <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
    <style>{`
      @keyframes snow-drift { 0%,100% { transform: translateY(-3px) rotate(-5deg); } 50% { transform: translateY(3px) rotate(5deg); } }
      .sn { animation: snow-drift 3s ease-in-out infinite; }
    `}</style>
    <g>
      <rect x="8" y="10" width="32" height="13" rx="6.5" fill="#6B7280" />
      <circle cx="18" cy="9" r="7" fill="#6B7280" />
      <circle cx="30" cy="6" r="9" fill="#9CA3AF" />
      <rect x="14" y="4" width="22" height="16" rx="4" fill="#9CA3AF" />
    </g>
    <g className="sn" stroke="#BAE6FD" strokeWidth="2" strokeLinecap="round">
      <line x1="16" y1="28" x2="16" y2="38" />
      <line x1="11" y1="31" x2="21" y2="35" />
      <line x1="11" y1="35" x2="21" y2="31" />
      <line x1="32" y1="28" x2="32" y2="38" />
      <line x1="27" y1="31" x2="37" y2="35" />
      <line x1="27" y1="35" x2="37" y2="31" />
    </g>
  </svg>
);

// SVG: Rayo / tormenta eléctrica
const LightningSVG = ({ s }: { s: number }) => (
  <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
    <style>{`
      @keyframes lightning-flash { 0%,40%,60%,100% { opacity:1; } 50% { opacity:.1; filter:brightness(2); } }
      .lf { animation: lightning-flash 1.5s ease-in-out infinite; }
    `}</style>
    <polyline className="lf" points="30,4 18,26 26,26 16,44"
      stroke="#FCD34D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

// SVG: Termómetro (default)
const ThermometerSVG = ({ s }: { s: number }) => (
  <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
    <rect x="21" y="6" width="6" height="26" rx="3" fill="#D1D5DB" />
    <circle cx="24" cy="36" r="7" fill="#EF4444" />
    <rect x="22" y="18" width="4" height="18" rx="2" fill="#EF4444" />
    {[0,1,2,3].map(i => (
      <line key={i} x1="27" y1={10 + i * 6} x2="30" y2={10 + i * 6}
        stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
    ))}
  </svg>
);

export const AnimatedWeatherIcon: React.FC<AnimatedWeatherIconProps> = ({
  weatherCode,
  size = 'md',
  isNightTime = false,
}) => {
  const s = sizes[size];

  if (weatherCode === 0) {
    return isNightTime ? <MoonSVG s={s} /> : <SunSVG s={s} />;
  }
  if (weatherCode >= 1 && weatherCode <= 2) return <PartlyCloudySVG s={s} />;
  if (weatherCode === 3) return <CloudySVG s={s} />;
  if (weatherCode >= 45 && weatherCode <= 48) return <FogSVG s={s} />;
  if (weatherCode >= 51 && weatherCode <= 65) return <RainSVG s={s} />;
  if (weatherCode >= 71 && weatherCode <= 86) return <SnowSVG s={s} />;
  if (weatherCode >= 80) return <StormSVG s={s} />;
  if (weatherCode >= 95) return <LightningSVG s={s} />;

  return <ThermometerSVG s={s} />;
};
