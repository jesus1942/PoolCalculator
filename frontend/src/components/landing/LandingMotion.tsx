import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Un único controlador para carruseles: botones, teclado y gesto horizontal. */
export function useLandingCarousel(count: number) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const current = count ? Math.min(index, count - 1) : 0;

  const select = (next: number) => {
    if (!count) return;
    setDirection(next >= current ? 1 : -1);
    setIndex((next + count) % count);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    // No interceptar la edición de formularios contenidos en una tarjeta.
    if ((event.target as HTMLElement).matches('input, textarea, select')) return;
    const targets: Record<string, number> = {
      ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: count - 1,
    };
    if (event.key in targets) {
      event.preventDefault();
      select(targets[event.key]);
    }
  };

  return {
    index: current, direction, select,
    previous: () => select(current - 1), next: () => select(current + 1),
    handlers: {
      onKeyDown,
      onTouchStart: (event: React.TouchEvent) => {
        touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      },
      onTouchEnd: (event: React.TouchEvent) => {
        if (!touch.current || !event.changedTouches.length) return;
        const dx = event.changedTouches[0].clientX - touch.current.x;
        const dy = event.changedTouches[0].clientY - touch.current.y;
        if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) select(current + (dx < 0 ? 1 : -1));
        touch.current = null;
      },
    },
  };
}

/** Controles visibles y sin reproducción automática que distraiga la lectura. */
export function CarouselControls({ index, count, previous, next, label }: {
  index: number; count: number; previous: () => void; next: () => void; label: string;
}) {
  return (
    <div className="pl-carousel-controls">
      <button type="button" onClick={previous} disabled={count < 2} aria-label={`Anterior: ${label}`}><ChevronLeft size={20} /></button>
      <span aria-live="polite" aria-atomic="true">{String(index + 1).padStart(2, '0')} <span>/ {String(count).padStart(2, '0')}</span></span>
      <button type="button" onClick={next} disabled={count < 2} aria-label={`Siguiente: ${label}`}><ChevronRight size={20} /></button>
    </div>
  );
}

/** Da profundidad a la tarjeta sin inclinar el texto más de cuatro grados. */
export function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef<number>(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const reset = () => {
    cancelAnimationFrame(frame.current);
    ref.current?.style.setProperty('--tilt-x', '0deg');
    ref.current?.style.setProperty('--tilt-y', '0deg');
  };
  return (
    <div className={`pl-tilt ${className}`} ref={ref} onPointerLeave={reset}
      onPointerMove={(event) => {
        if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 7;
        const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * -7;
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => {
          ref.current?.style.setProperty('--tilt-x', `${y}deg`);
          ref.current?.style.setProperty('--tilt-y', `${x}deg`);
        });
      }}>{children}</div>
  );
}

/** Revela una sección una sola vez; el contenido nunca depende de la animación. */
export function LandingReveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (!ref.current || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setEntered(true); observer.disconnect(); }
    }, { threshold: 0.08 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`pl-reveal ${className}`} data-entered={entered}>{children}</div>;
}
