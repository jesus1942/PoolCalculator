import React from 'react';
import { MessageCircle, Globe, MapPin } from 'lucide-react';
import { publicAssetUrl } from '@/utils/publicAssetUrl';

const WHATSAPP_NUMBER = '5492804018359';
const WHATSAPP_GREETING = encodeURIComponent(
  '¡Hola Jesús! Vi tu sistema Pool Installer y me gustaría contactarte.'
);
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_GREETING}`;
const PORTFOLIO_URL = 'https://portfolio-production-1f23.up.railway.app';

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
          href={PORTFOLIO_URL}
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
        <a
          href={PORTFOLIO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 group"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-black border border-white/10 group-hover:border-cyan-500/40 transition-colors">
            <img src={publicAssetUrl('logo-isotipo.png')} alt="Jesús Olguín" className="h-4 w-auto" />
          </span>
          <span className="text-sm font-medium text-zinc-300 group-hover:text-cyan-400 transition-colors">
            Jesús Olguín
          </span>
        </a>
        <p className="text-[11px] text-zinc-500 -mt-1">Domotics &amp; IoT Solutions</p>
        <div className="flex items-center gap-4 mt-2 text-xs">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-cyan-400 transition-colors group"
          >
            <MessageCircle className="w-3.5 h-3.5 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
            WhatsApp
          </a>
          <span className="text-zinc-700">·</span>
          <a
            href={PORTFOLIO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-cyan-400 transition-colors group"
          >
            <Globe className="w-3.5 h-3.5 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
            Portfolio
          </a>
        </div>
      </div>
    );
  }

  // Full variant
  return (
    <div className={className}>
      <a
        href={PORTFOLIO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 mb-3 group"
      >
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-black border border-white/10 group-hover:border-cyan-500/50 shadow-lg shadow-cyan-500/10 group-hover:shadow-cyan-500/15 transition-all">
          <img src={publicAssetUrl('logo-isotipo.png')} alt="Jesús Olguín" className="h-5 w-auto" />
        </span>
        <div>
          <p className="text-white font-medium leading-tight group-hover:text-cyan-400 transition-colors">
            Jesús Olguín
          </p>
          <p className="text-zinc-500 text-xs">Domotics &amp; IoT Solutions</p>
        </div>
      </a>
      <p className="flex items-center gap-1.5 text-xs text-zinc-500 mb-3">
        <MapPin className="w-3 h-3" />
        Puerto Madryn, Chubut · Argentina
      </p>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-cyan-400 transition-colors group"
        >
          <MessageCircle className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
          WhatsApp
        </a>
        <span className="text-zinc-700">·</span>
        <a
          href={PORTFOLIO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-cyan-400 transition-colors group"
        >
          <Globe className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
          Portfolio
        </a>
      </div>
    </div>
  );
};

export const developerWhatsappUrl = WHATSAPP_URL;
export const developerPortfolioUrl = PORTFOLIO_URL;
