import React from 'react';

interface AnimatedWeatherIconProps {
  weatherCode: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isNightTime?: boolean;
}

export const AnimatedWeatherIcon: React.FC<AnimatedWeatherIconProps> = ({
  weatherCode,
  size = 'md',
  isNightTime = false,
}) => {
  const sizes = {
    sm: 'text-5xl',
    md: 'text-6xl',
    lg: 'text-7xl',
    xl: 'text-8xl',
  };

  const iconSize = sizes[size];

  // Despejado (0) - Sol o Luna animados
  if (weatherCode === 0) {
    if (isNightTime) {
      return (
        <div className={`${iconSize} relative inline-block`}>
          <style>{`
            @keyframes moon-glow {
              0%, 100% { filter: drop-shadow(0 0 10px rgba(254, 243, 199, 0.6)); }
              50% { filter: drop-shadow(0 0 20px rgba(254, 243, 199, 0.9)); }
            }
            @keyframes star-twinkle {
              0%, 100% { opacity: 0.3; transform: scale(0.8); }
              50% { opacity: 1; transform: scale(1.2); }
            }
            .moon-animate { animation: moon-glow 3s ease-in-out infinite; }
            .star-1 { animation: star-twinkle 2s ease-in-out infinite; }
            .star-2 { animation: star-twinkle 2s ease-in-out 0.7s infinite; }
            .star-3 { animation: star-twinkle 2s ease-in-out 1.4s infinite; }
          `}</style>
          <div className="moon-animate">🌙</div>
          <div className="absolute -top-1 -right-1 star-1">⭐</div>
          <div className="absolute top-2 -left-2 text-2xl star-2">✨</div>
          <div className="absolute -bottom-1 right-1 text-xl star-3">💫</div>
        </div>
      );
    }
    return (
      <div className={`${iconSize} relative inline-block`}>
        <style>{`
          @keyframes sun-rotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes sun-pulse {
            0%, 100% { filter: drop-shadow(0 0 15px rgba(251, 191, 36, 0.7)); }
            50% { filter: drop-shadow(0 0 30px rgba(251, 191, 36, 1)); }
          }
          .sun-animate {
            animation: sun-rotate 20s linear infinite, sun-pulse 2s ease-in-out infinite;
            display: inline-block;
          }
        `}</style>
        <div className="sun-animate">☀️</div>
      </div>
    );
  }

  // Parcialmente nublado (1-2)
  if (weatherCode >= 1 && weatherCode <= 2) {
    return (
      <div className={`${iconSize} relative inline-block`}>
        <style>{`
          @keyframes cloud-float {
            0%, 100% { transform: translateX(0px) translateY(0px); }
            50% { transform: translateX(5px) translateY(-5px); }
          }
          @keyframes sun-peek {
            0%, 100% { opacity: 0.8; transform: scale(0.9); }
            50% { opacity: 1; transform: scale(1); }
          }
          .cloud-float { animation: cloud-float 4s ease-in-out infinite; }
          .sun-peek {
            animation: sun-peek 3s ease-in-out infinite;
            position: absolute;
            top: -8px;
            right: -8px;
            font-size: 0.6em;
          }
        `}</style>
        <div className="relative">
          <div className="sun-peek">☀️</div>
          <div className="cloud-float">⛅</div>
        </div>
      </div>
    );
  }

  // Nublado (3)
  if (weatherCode === 3) {
    return (
      <div className={`${iconSize} relative inline-block`}>
        <style>{`
          @keyframes clouds-drift {
            0%, 100% { transform: translateX(-3px); }
            50% { transform: translateX(3px); }
          }
          .clouds-drift { animation: clouds-drift 5s ease-in-out infinite; }
        `}</style>
        <div className="clouds-drift">☁️</div>
      </div>
    );
  }

  // Neblina (45-48)
  if (weatherCode >= 45 && weatherCode <= 48) {
    return (
      <div className={`${iconSize} relative inline-block`}>
        <style>{`
          @keyframes fog-wave {
            0%, 100% { opacity: 0.5; transform: translateX(-5px); }
            50% { opacity: 0.8; transform: translateX(5px); }
          }
          .fog-wave { animation: fog-wave 4s ease-in-out infinite; }
        `}</style>
        <div className="fog-wave">🌫️</div>
      </div>
    );
  }

  // Lluvia ligera a moderada (51-63)
  if (weatherCode >= 51 && weatherCode <= 63) {
    return (
      <div className={`${iconSize} relative inline-block`}>
        <style>{`
          @keyframes rain-fall {
            0% { transform: translateY(-5px); opacity: 0.6; }
            50% { opacity: 1; }
            100% { transform: translateY(5px); opacity: 0.6; }
          }
          .rain-fall { animation: rain-fall 1.5s ease-in-out infinite; }
        `}</style>
        <div className="rain-fall">🌧️</div>
      </div>
    );
  }

  // Lluvia fuerte (64-65)
  if (weatherCode >= 64 && weatherCode <= 65) {
    return (
      <div className={`${iconSize} relative inline-block`}>
        <style>{`
          @keyframes heavy-rain {
            0% { transform: translateY(-8px) scale(1.05); }
            50% { transform: translateY(0px) scale(1); }
            100% { transform: translateY(8px) scale(1.05); }
          }
          .heavy-rain { animation: heavy-rain 1s ease-in-out infinite; }
        `}</style>
        <div className="heavy-rain">⛈️</div>
      </div>
    );
  }

  // Nieve (71-86)
  if (weatherCode >= 71 && weatherCode <= 86) {
    return (
      <div className={`${iconSize} relative inline-block`}>
        <style>{`
          @keyframes snow-fall {
            0%, 100% { transform: translateY(-3px) rotate(-5deg); }
            50% { transform: translateY(3px) rotate(5deg); }
          }
          .snow-fall { animation: snow-fall 3s ease-in-out infinite; }
        `}</style>
        <div className="snow-fall">🌨️</div>
      </div>
    );
  }

  // Tormenta (80-99)
  if (weatherCode >= 80) {
    return (
      <div className={`${iconSize} relative inline-block`}>
        <style>{`
          @keyframes storm-shake {
            0%, 100% { transform: translateX(0px); }
            25% { transform: translateX(-3px) rotate(-2deg); }
            75% { transform: translateX(3px) rotate(2deg); }
          }
          @keyframes lightning-flash {
            0%, 45%, 55%, 100% { opacity: 1; }
            50% { opacity: 0.3; filter: brightness(1.5); }
          }
          .storm-shake { animation: storm-shake 0.5s ease-in-out infinite, lightning-flash 2s ease-in-out infinite; }
        `}</style>
        <div className="storm-shake">⚡</div>
      </div>
    );
  }

  // Default
  return <div className={iconSize}>🌡️</div>;
};
