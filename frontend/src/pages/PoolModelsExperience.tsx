import React, { useEffect, useMemo, useState } from 'react';
import { PoolModels } from '@/pages/PoolModels';
import { poolPresetService } from '@/services/poolPresetService';
import type { PoolPreset } from '@/types';
import { getImageUrl } from '@/utils/imageUtils';
import { HdEdit, HdImage, HdSearch, HdWaves } from '@/components/ui/HandDrawnIcons';

const PoolModelsMobile: React.FC<{ onOpenManager: () => void }> = ({ onOpenManager }) => {
  const [models, setModels] = useState<PoolPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let mounted = true;
    poolPresetService.getAll()
      .then((data) => {
        if (mounted) setModels(data);
      })
      .catch((error) => console.error('Error al cargar modelos:', error))
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const visibleModels = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return models;
    return models.filter((model) =>
      [model.name, model.description, model.shape]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    );
  }, [models, query]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>Catálogo</p>
          <h1 className="mt-1 text-2xl font-semibold" style={{ color: 'var(--ink)' }}>Modelos de piscinas</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>{models.length} modelo(s) disponibles</p>
        </div>
        <button
          type="button"
          onClick={onOpenManager}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold"
          style={{ border: '1.4px solid var(--hair-strong)', backgroundColor: 'var(--card)', color: 'var(--ink)' }}
        >
          <HdEdit size={17} />
          Administrar
        </button>
      </div>

      <div className="rough-field mb-5">
        <span className="rough-field__bg" aria-hidden="true" />
        <div className="flex items-center gap-2 px-3">
          <HdSearch size={18} style={{ color: 'var(--ink-soft)' }} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre, forma o descripción"
            className="rough-field__control min-w-0 flex-1 !px-0"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-40 animate-pulse rounded-2xl" style={{ backgroundColor: 'var(--card)' }} />
          ))}
        </div>
      ) : visibleModels.length === 0 ? (
        <div className="rough-panel p-8 text-center">
          <HdWaves size={30} className="relative mx-auto" style={{ color: 'var(--accent)' }} />
          <p className="relative mt-3 text-sm font-semibold" style={{ color: 'var(--ink)' }}>No encontramos modelos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleModels.map((model) => {
            const imageUrl = getImageUrl(model.imageUrl || '');
            const features = [
              model.hasSkimmer ? `Skimmer ×${model.skimmerCount || 1}` : null,
              model.returnsCount ? `Retornos ×${model.returnsCount}` : null,
              model.hasHydroJets ? `Hidrojets ×${model.hydroJetsCount || 0}` : null,
              model.hasVacuumIntake ? `Barrefondo ×${model.vacuumIntakeCount || 1}` : null,
              model.hasBottomDrain ? 'Toma de fondo' : null,
              model.hasLighting ? `Luces ×${model.lightingCount || 0}` : null,
            ].filter(Boolean) as string[];

            return (
              <article key={model.id} className="rough-panel overflow-hidden">
                <div className="relative grid gap-0 sm:grid-cols-[220px_1fr]">
                  <div className="relative aspect-[16/9] overflow-hidden sm:aspect-auto sm:min-h-[190px]">
                    {imageUrl ? (
                      <img src={imageUrl} alt={model.name} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <div className="flex h-full min-h-40 items-center justify-center" style={{ backgroundColor: 'var(--card2)' }}>
                        <HdImage size={32} style={{ color: 'var(--ink-soft)' }} />
                      </div>
                    )}
                    <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 0 1px var(--hair)' }} />
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="break-words text-lg font-semibold" style={{ color: 'var(--ink)' }}>{model.name}</h2>
                        {model.description && (
                          <p className="mt-1 line-clamp-2 text-sm" style={{ color: 'var(--ink-soft)' }}>{model.description}</p>
                        )}
                      </div>
                      <span className="rough-chip shrink-0" style={{ color: 'var(--accent)' }}>
                        {model.shape.toLowerCase().replace('_', ' ')}
                      </span>
                    </div>

                    <div className="rough-dashed mt-4 grid grid-cols-2 gap-3 pt-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>Dimensiones</p>
                        <p className="mt-1 font-mono text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                          {model.length} × {model.width} m
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>Profundidad</p>
                        <p className="mt-1 font-mono text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                          {model.depthEnd && model.depthEnd !== model.depth ? `${model.depth}–${model.depthEnd} m` : `${model.depth} m`}
                        </p>
                      </div>
                    </div>

                    {features.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {features.slice(0, 6).map((feature) => (
                          <span key={feature} className="rough-chip" style={{ color: 'var(--ink-soft)' }}>{feature}</span>
                        ))}
                      </div>
                    )}

                    {(model.defaultPump || model.defaultFilter) && (
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <div className="rough-panel rough-panel--soft p-3">
                          <p className="relative text-[10px] uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>Bomba base</p>
                          <p className="relative mt-1 text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                            {model.defaultPump?.model || model.defaultPump?.name || 'Sin bomba'}
                          </p>
                        </div>
                        <div className="rough-panel rough-panel--soft p-3">
                          <p className="relative text-[10px] uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>Filtro base</p>
                          <p className="relative mt-1 text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                            {model.defaultFilter?.model || model.defaultFilter?.name || 'Sin filtro'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
};

export const PoolModelsExperience: React.FC = () => {
  const [managerMode, setManagerMode] = useState(false);

  if (managerMode) {
    return (
      <div>
        <div className="sticky top-14 z-10 px-4 pt-3 md:hidden">
          <button
            type="button"
            onClick={() => setManagerMode(false)}
            className="min-h-11 w-full rounded-xl px-4 text-sm font-semibold"
            style={{ border: '1.4px solid var(--accent)', backgroundColor: 'var(--accent-2)', color: 'var(--accent)' }}
          >
            Volver al catálogo mobile
          </button>
        </div>
        <PoolModels />
      </div>
    );
  }

  return (
    <>
      <div className="md:hidden">
        <PoolModelsMobile onOpenManager={() => setManagerMode(true)} />
      </div>
      <div className="hidden md:block">
        <PoolModels />
      </div>
    </>
  );
};
