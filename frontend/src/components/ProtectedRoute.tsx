import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const ArgFlag: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 90 60" className={className} style={{ display: 'block' }}>
    <rect width="90" height="20" fill="#74ACDF"/>
    <rect y="20" width="90" height="20" fill="#ffffff"/>
    <rect y="40" width="90" height="20" fill="#74ACDF"/>
    <g transform="translate(45,30)">
      <path d="M-1.3 -8 L0 -14 L1.3 -8 Z" fill="#F6B40E"/>
      <path d="M-1.3 -8 L0 -14 L1.3 -8 Z" fill="#F6B40E" transform="rotate(45)"/>
      <path d="M-1.3 -8 L0 -14 L1.3 -8 Z" fill="#F6B40E" transform="rotate(90)"/>
      <path d="M-1.3 -8 L0 -14 L1.3 -8 Z" fill="#F6B40E" transform="rotate(135)"/>
      <path d="M-1.3 -8 L0 -14 L1.3 -8 Z" fill="#F6B40E" transform="rotate(180)"/>
      <path d="M-1.3 -8 L0 -14 L1.3 -8 Z" fill="#F6B40E" transform="rotate(225)"/>
      <path d="M-1.3 -8 L0 -14 L1.3 -8 Z" fill="#F6B40E" transform="rotate(270)"/>
      <path d="M-1.3 -8 L0 -14 L1.3 -8 Z" fill="#F6B40E" transform="rotate(315)"/>
      <path d="M-1 -8 Q-2.8 -11 0 -13 Q2.8 -11 1 -8 Z" fill="#F6B40E" transform="rotate(22.5)"/>
      <path d="M-1 -8 Q-2.8 -11 0 -13 Q2.8 -11 1 -8 Z" fill="#F6B40E" transform="rotate(67.5)"/>
      <path d="M-1 -8 Q-2.8 -11 0 -13 Q2.8 -11 1 -8 Z" fill="#F6B40E" transform="rotate(112.5)"/>
      <path d="M-1 -8 Q-2.8 -11 0 -13 Q2.8 -11 1 -8 Z" fill="#F6B40E" transform="rotate(157.5)"/>
      <path d="M-1 -8 Q-2.8 -11 0 -13 Q2.8 -11 1 -8 Z" fill="#F6B40E" transform="rotate(202.5)"/>
      <path d="M-1 -8 Q-2.8 -11 0 -13 Q2.8 -11 1 -8 Z" fill="#F6B40E" transform="rotate(247.5)"/>
      <path d="M-1 -8 Q-2.8 -11 0 -13 Q2.8 -11 1 -8 Z" fill="#F6B40E" transform="rotate(292.5)"/>
      <path d="M-1 -8 Q-2.8 -11 0 -13 Q2.8 -11 1 -8 Z" fill="#F6B40E" transform="rotate(337.5)"/>
      <circle r="5.6" fill="#F6B40E" stroke="#85340A" strokeWidth="0.3"/>
      <circle r="3.9" fill="none" stroke="#85340A" strokeWidth="0.25"/>
    </g>
  </svg>
);

const Star: React.FC<{ delay?: string }> = ({ delay = '0s' }) => (
  <svg
    viewBox="0 0 24 24" fill="#FBBF24" className="w-8 h-8"
    style={{
      filter: 'drop-shadow(0 0 8px rgba(251,191,36,.7))',
      animation: `star-glow-pr 2.8s ease-in-out ${delay} infinite`,
    }}
  >
    <path d="M12 2l2.6 7.9H23l-6.8 5 2.6 7.9L12 18.7l-6.8 4.1 2.6-7.9L1 9.9h8.4L12 2z"/>
  </svg>
);

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6"
           style={{ background: 'radial-gradient(ellipse at 50% 60%, #0d1a2e 0%, #080c14 70%)' }}>
        <style>{`
          @keyframes star-glow-pr {
            0%,100%{transform:scale(1);filter:drop-shadow(0 0 8px rgba(251,191,36,.5))}
            50%{transform:scale(1.12);filter:drop-shadow(0 0 18px rgba(251,191,36,.9))}
          }
          @keyframes wave-pr-l {
            0%,100%{transform:rotate(-4deg) skewX(0)}
            50%{transform:rotate(-4.8deg) skewX(2.8deg)}
          }
          @keyframes wave-pr-r {
            0%,100%{transform:rotate(4deg) skewX(0)}
            50%{transform:rotate(4.8deg) skewX(-2.8deg)}
          }
        `}</style>

        <div className="flex gap-3">
          <Star delay="0s" />
          <Star delay="0.22s" />
          <Star delay="0.44s" />
        </div>

        <div className="flex gap-6">
          <div style={{ animation: 'wave-pr-l 3.2s ease-in-out infinite', borderRadius: 3, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,.5)' }}>
            <ArgFlag className="w-28 h-auto" />
          </div>
          <div style={{ animation: 'wave-pr-r 3.2s ease-in-out 0.55s infinite', borderRadius: 3, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,.5)' }}>
            <ArgFlag className="w-28 h-auto" />
          </div>
        </div>

        <p className="text-xs tracking-widest text-white/20 uppercase">Pool Installer</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};
