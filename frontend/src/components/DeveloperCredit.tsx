import React from 'react';
import { MessageCircle, Globe, MapPin } from 'lucide-react';

const WHATSAPP_NUMBER = '5492804018359';
const WHATSAPP_GREETING = encodeURIComponent(
  '¡Hola Jesús! Vi tu sistema Pool Installer y me gustaría contactarte.'
);
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_GREETING}`;

interface DeveloperCreditProps {
  variant?: 'full' | 'compact' | 'inline';
  className?: string;
}

export const DeveloperCredit: React.FC<DeveloperCreditProps> = ({ variant = 'full', className = '' }) => {
  if (variant === 'inline') {
    return (
      <span className={className}>
        Desarrollado por{' '}
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors underline-offset-2 hover:underline"
        >
          Jesús Olguín
        </a>{' '}
        · Domotics &amp; IoT Solutions
      </span>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        <p className="text-xs text-zinc-600">Sistema desarrollado por</p>
        <p className="text-sm font-medium text-zinc-300">Jesús Olguín</p>
        <p className="text-[11px] text-zinc-500 -mt-1">Domotics &amp; IoT Solutions</p>
        <div className="flex items-center gap-2 mt-1">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-xs text-green-300 transition-all hover:scale-105"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </a>
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/5 border border-cyan-500/20 text-xs text-cyan-400/70 cursor-default"
            title="Web del desarrollador próximamente"
          >
            <Globe className="w-3.5 h-3.5" />
            Web próximamente
          </span>
        </div>
      </div>
    );
  }

  // Full variant
  return (
    <div className={className}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-cyan-500/30 flex items-center justify-center text-white font-bold text-sm">
          JO
        </div>
        <div>
          <p className="text-white font-medium leading-tight">Jesús Olguín</p>
          <p className="text-zinc-500 text-xs">Domotics &amp; IoT Solutions</p>
        </div>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-zinc-500 mb-3">
        <MapPin className="w-3 h-3" />
        Puerto Madryn, Chubut · Argentina 🇦🇷
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/15 hover:bg-green-500/25 border border-green-500/40 text-xs text-green-300 font-medium transition-all hover:scale-105 hover:shadow-lg hover:shadow-green-500/20"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Contactar por WhatsApp
        </a>
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/5 border border-cyan-500/20 text-xs text-cyan-400/70"
          title="Sitio personal en construcción"
        >
          <Globe className="w-3.5 h-3.5" />
          Web próximamente
        </span>
      </div>
    </div>
  );
};

export const developerWhatsappUrl = WHATSAPP_URL;
