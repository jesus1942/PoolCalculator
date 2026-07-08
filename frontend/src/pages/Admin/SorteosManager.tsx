import React, { useEffect, useMemo, useState } from 'react';
import { HdRefresh, HdSparkles, HdAlertTriangle } from '@/components/ui/HandDrawnIcons';
import { useAuth } from '@/context/AuthContext';
import { loteriaService, type ResultadoJuego, type SorteosResponse } from '@/services/loteriaService';

// Pestaña privada del superadmin: últimos sorteos de Quini 6 y Loto Plus.
// Diseño mobile-first: tarjetas apiladas, bolillas grandes y botón de refresco.

const ESTILOS_JUEGO: Record<'QUINI6' | 'LOTO', { titulo: string; bolilla: string; borde: string }> = {
  QUINI6: {
    titulo: 'Quini 6',
    bolilla: 'bg-cyan-500/20 border-cyan-400/50 text-cyan-100',
    borde: 'border-cyan-500/30',
  },
  LOTO: {
    titulo: 'Loto Plus',
    bolilla: 'bg-amber-500/20 border-amber-400/50 text-amber-100',
    borde: 'border-amber-500/30',
  },
};

const TarjetaJuego: React.FC<{ resultado: ResultadoJuego }> = ({ resultado }) => {
  const estilo = ESTILOS_JUEGO[resultado.juego];

  return (
    <section className={`rounded-2xl border ${estilo.borde} bg-zinc-900/60 p-4 sm:p-6`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold text-white">{estilo.titulo}</h2>
        <div className="text-xs text-zinc-400">
          {resultado.sorteo && <span>Sorteo Nº {resultado.sorteo}</span>}
          {resultado.sorteo && resultado.fecha && <span> · </span>}
          {resultado.fecha && <span>{resultado.fecha}</span>}
        </div>
      </div>

      {!resultado.ok ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          <HdAlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            No se pudieron obtener los resultados ahora ({resultado.error || 'fuente sin datos'}).
            Probá el botón Actualizar en un rato.
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {(resultado.modalidades || []).map((modalidad) => (
            <div key={modalidad.nombre}>
              <p className="mb-2 text-[11px] uppercase tracking-wider text-zinc-400">{modalidad.nombre}</p>
              <div className="flex flex-wrap gap-2">
                {modalidad.numeros.map((numero, index) => (
                  <span
                    key={`${modalidad.nombre}-${index}`}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-base font-semibold sm:h-11 sm:w-11 ${estilo.bolilla}`}
                  >
                    {String(numero).padStart(2, '0')}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {resultado.fuente && (
            <p className="text-[11px] text-zinc-500">Fuente: {resultado.fuente}</p>
          )}
        </div>
      )}
    </section>
  );
};

export const SorteosManager: React.FC = () => {
  const { user } = useAuth();
  const isSuperadmin = useMemo(() => user?.role === 'SUPERADMIN', [user]);

  const [data, setData] = useState<SorteosResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const respuesta = await loteriaService.ultimos(refresh);
      setData(respuesta);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudieron cargar los sorteos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSuperadmin) return;
    cargar();
  }, [isSuperadmin]);

  if (!isSuperadmin) {
    return (
      <div className="min-h-screen px-4 py-10 text-zinc-200 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-8 shadow-xl">
          <h1 className="text-xl font-semibold">Acceso restringido</h1>
          <p className="mt-3 text-zinc-300">Esta sección es exclusiva del superadmin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 text-zinc-100 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl space-y-4 sm:space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-white">
              <HdSparkles size={22} />
              Sorteos
            </h1>
            <p className="text-sm text-zinc-300">Últimos resultados de Quini 6 y Loto Plus.</p>
          </div>
          <button
            onClick={() => cargar(true)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700/70 px-3 py-2 text-sm text-zinc-300 transition hover:border-zinc-500/70 hover:text-white"
          >
            <HdRefresh size={16} className={loading ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading && !data ? (
          <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/60 p-8 text-center text-sm text-zinc-400">
            Buscando los últimos sorteos...
          </div>
        ) : data ? (
          <>
            <TarjetaJuego resultado={data.quini6} />
            <TarjetaJuego resultado={data.loto} />
            <p className="text-center text-[11px] text-zinc-500">
              Actualizado: {new Date(data.actualizado).toLocaleString('es-AR')} · Resultados informativos: verificá siempre en la fuente oficial antes de cobrar.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
};
