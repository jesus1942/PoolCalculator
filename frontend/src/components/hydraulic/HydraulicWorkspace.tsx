import React, { useMemo, useState } from 'react';
import { PlumbingEditor } from '@/components/PlumbingEditor';
import { HydraulicAnalysisPanel } from '@/components/HydraulicAnalysisPanel';
import { EquipmentSelector } from '@/components/EquipmentSelector';
import { TechnicalPoolScene } from '@/components/visual/TechnicalPoolScene';
import { plumbingCalculationService, PlumbingCalculationResult } from '@/services/plumbingCalculationService';
import { getProjectAdditionals, summarizeHydraulicSystem } from '@/utils/projectCosting';
import type { Project } from '@/types';
import {
  HdActivity,
  HdDroplet,
  HdHammer,
  HdPackage,
  HdSettings,
  HdWaves,
} from '@/components/ui/HandDrawnIcons';

type HydraulicWorkspaceView = 'design' | 'three' | 'equipment' | 'analysis' | 'materials';

interface HydraulicWorkspaceProps {
  project: Project;
  projectId: string;
  onSave: (plumbingConfig: any) => void | Promise<void>;
  onAutoSave?: (plumbingConfig: any) => void | Promise<void>;
  onReloadProject: () => void | Promise<void>;
}

const VIEW_OPTIONS: Array<{
  id: HydraulicWorkspaceView;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
}> = [
  { id: 'design', label: 'Diseño', description: 'Plano, puntos, recorridos y cabecera.', icon: HdHammer },
  { id: 'three', label: '3D', description: 'Lectura espacial del casco, circuitos y equipos.', icon: HdWaves },
  { id: 'equipment', label: 'Equipos', description: 'Bombas, filtros y calefacción.', icon: HdSettings },
  { id: 'analysis', label: 'Cálculo', description: 'TDH, caudal, pérdidas y bomba.', icon: HdActivity },
  { id: 'materials', label: 'Materiales', description: 'Caños, accesorios y cantidades.', icon: HdPackage },
];

const formatMeters = (value: number) =>
  `${Number.isFinite(value) ? value.toLocaleString('es-AR', { maximumFractionDigits: 1 }) : '0'} m`;

const HydraulicMaterialsPanel: React.FC<{ project: Project }> = ({ project }) => {
  const calculation = useMemo<PlumbingCalculationResult | null>(() => {
    const preset = project.poolPreset;
    if (!preset) return null;

    try {
      const additionals = getProjectAdditionals(project);
      const summary = summarizeHydraulicSystem(project, additionals) as any;
      const totals = summary?.total || {};
      const config = (project.plumbingConfig || {}) as any;
      const hydrojetCount = Number(totals.hydrojets || 0);
      const vacuumCount = Number(totals.vacuumIntakes || (preset.hasVacuumIntake ? 1 : 0));
      const bottomDrainCount = Number(totals.bottomDrains || 0);

      return plumbingCalculationService.calculatePipeRequirements({
        poolLength: Number(preset.length || 0),
        poolWidth: Number(preset.width || 0),
        distanceToEquipment: Math.max(0, Number(config.distanceToEquipment || 0)),
        skimmerCount: Number(totals.skimmers || 0),
        returnCount: Number(totals.returns || 0),
        hotWaterReturnCount: Number(totals.hotWaterReturns || 0),
        hydrojetCount,
        hasBottomDrain: Boolean(preset.hasBottomDrain || bottomDrainCount > 0),
        hasVacuumIntake: Boolean(preset.hasVacuumIntake || vacuumCount > 0),
        vacuumIntakeCount: vacuumCount,
        additionalSkimmers: 0,
        additionalReturns: 0,
        additionalHotWaterReturns: 0,
        additionalHydrojets: 0,
        additionalDrains: 0,
        hydrojetPumpCount: Number(totals.hydrojetPumps || (hydrojetCount > 0 ? 1 : 0)),
        hydrojetSuctionCount: Number(totals.hydrojetSuctions || (hydrojetCount > 0 ? 1 : 0)),
        hydrojetAirIntakeCount: Number(totals.hydrojetAirIntakes || hydrojetCount),
      });
    } catch (error) {
      console.error('[HydraulicWorkspace] No se pudieron calcular materiales:', error);
      return null;
    }
  }, [project]);

  if (!calculation) {
    return (
      <div className="rough-panel p-5">
        <div className="relative flex items-start gap-3">
          <HdPackage size={20} style={{ color: 'var(--ink-soft)' }} />
          <div>
            <h3 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>Materiales hidráulicos</h3>
            <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>Primero configurá el modelo y el diseño hidráulico.</p>
          </div>
        </div>
      </div>
    );
  }

  const fittingGroups = [
    { label: 'Codos 90°', rows: calculation.fittings.elbows90.map((item) => ({ detail: item.diameter, quantity: item.quantity })) },
    { label: 'Codos 45°', rows: calculation.fittings.elbows45.map((item) => ({ detail: item.diameter, quantity: item.quantity })) },
    { label: 'Tees', rows: calculation.fittings.tees.map((item) => ({ detail: item.diameter, quantity: item.quantity })) },
    { label: 'Reducciones', rows: calculation.fittings.reducers.map((item) => ({ detail: `${item.fromDiameter} → ${item.toDiameter}`, quantity: item.quantity })) },
    { label: 'Adaptadores', rows: calculation.fittings.adapters.map((item) => ({ detail: `${item.diameter} · rosca ${item.threadSize}`, quantity: item.quantity })) },
    { label: 'Válvulas', rows: calculation.fittings.valves.map((item) => ({ detail: `${item.diameter} · ${item.type}`, quantity: item.quantity })) },
    { label: 'Uniones', rows: calculation.fittings.couplings.map((item) => ({ detail: item.diameter, quantity: item.quantity })) },
  ].filter((group) => group.rows.some((row) => row.quantity > 0));

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Caño estimado', value: formatMeters(calculation.summary.totalMeters) },
          { label: 'Accesorios', value: String(calculation.summary.totalAccessories) },
          { label: 'Distancia crítica', value: formatMeters(calculation.summary.maxDistance) },
          { label: 'Sistema', value: String((project.plumbingConfig as any)?.pipeSystem || 'PVC') },
        ].map((item) => (
          <div key={item.label} className="rough-panel rough-panel--soft p-4">
            <p className="relative text-[10px] uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>{item.label}</p>
            <p className="relative mt-2 text-xl font-semibold sm:text-2xl" style={{ color: 'var(--ink)' }}>{item.value}</p>
          </div>
        ))}
      </div>

      <section className="rough-panel p-4 sm:p-6">
        <div className="relative mb-4 flex items-center gap-3">
          <HdDroplet size={20} style={{ color: 'var(--accent)' }} />
          <div>
            <h3 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>Tuberías por circuito</h3>
            <p className="text-xs sm:text-sm" style={{ color: 'var(--ink-soft)' }}>Se recalculan desde la configuración actual.</p>
          </div>
        </div>
        <div className="relative divide-y" style={{ borderColor: 'var(--hair)' }}>
          {calculation.pipeRequirements.map((requirement, index) => (
            <div key={`${requirement.lineType}-${index}`} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold" style={{ color: 'var(--ink)' }}>{requirement.description}</p>
                  <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>{requirement.diameter} · {requirement.accessoryCount} punto(s)</p>
                </div>
                <span className="shrink-0 font-mono text-lg font-semibold" style={{ color: 'var(--accent)' }}>{formatMeters(requirement.totalMeters)}</span>
              </div>
              {requirement.recommendations.length > 0 && (
                <div className="mt-3 space-y-1">
                  {requirement.recommendations.map((recommendation) => (
                    <p key={recommendation} className="text-xs leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{recommendation}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rough-panel p-4 sm:p-6">
        <h3 className="relative text-base font-semibold" style={{ color: 'var(--ink)' }}>Accesorios calculados</h3>
        <div className="relative mt-4 space-y-4">
          {fittingGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>{group.label}</p>
              <div className="space-y-2">
                {group.rows.filter((row) => row.quantity > 0).map((row) => (
                  <div key={`${group.label}-${row.detail}`} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 break-words" style={{ color: 'var(--ink)' }}>{row.detail}</span>
                    <span className="shrink-0 font-mono font-semibold" style={{ color: 'var(--accent)' }}>{row.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="rough-dashed pt-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span style={{ color: 'var(--ink)' }}>Adhesivo / insumo de unión</span>
              <span className="font-mono font-semibold" style={{ color: 'var(--accent)' }}>
                {calculation.fittings.adhesive.quantity} {calculation.fittings.adhesive.unit}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const HydraulicThreeView: React.FC<{ project: Project }> = ({ project }) => {
  const summary = useMemo(() => summarizeHydraulicSystem(project, getProjectAdditionals(project)) as any, [project]);
  const totals = summary?.total || {};
  const preset = project.poolPreset;

  return (
    <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
      <div className="rough-panel min-h-[360px] overflow-hidden sm:min-h-[520px]">
        <div className="relative h-full min-h-[360px] sm:min-h-[520px]">
          <div className="absolute left-4 top-4 z-10">
            <span className="rough-chip" style={{ color: 'var(--accent)' }}>VISTA 3D TÉCNICA</span>
          </div>
          <TechnicalPoolScene className="h-full min-h-[360px] sm:min-h-[520px]" />
          <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-10">
            <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>
              Arrastrá el puntero sobre la escena para cambiar levemente el ángulo. La vista 2D sigue siendo la fuente editable del diseño.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="rough-panel p-4">
          <p className="relative text-[10px] uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Casco</p>
          <h3 className="relative mt-1 text-base font-semibold" style={{ color: 'var(--ink)' }}>{preset?.name || 'Piscina del proyecto'}</h3>
          {preset && (
            <p className="relative mt-2 font-mono text-sm" style={{ color: 'var(--ink-soft)' }}>
              {preset.length} × {preset.width} × {preset.depth} m
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Skimmers', value: totals.skimmers || 0 },
            { label: 'Retornos', value: totals.returns || 0 },
            { label: 'Hidrojets', value: totals.hydrojets || 0 },
            { label: 'Aspiración', value: totals.vacuumIntakes || 0 },
          ].map((item) => (
            <div key={item.label} className="rough-panel rough-panel--soft p-3">
              <p className="relative text-[10px] uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>{item.label}</p>
              <p className="relative mt-1 text-2xl font-semibold" style={{ color: 'var(--ink)' }}>{item.value}</p>
            </div>
          ))}
        </div>
        <div className="rough-panel rough-panel--accent p-4">
          <p className="relative text-sm font-semibold" style={{ color: 'var(--ink)' }}>Vista sincronizada en evolución</p>
          <p className="relative mt-2 text-xs leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
            Esta primera versión representa casco, succión, impulsión, bomba y filtro. El siguiente nivel será leer los recorridos editados del plano para reproducir cada tramo real en 3D.
          </p>
        </div>
      </div>
    </div>
  );
};

export const HydraulicWorkspace: React.FC<HydraulicWorkspaceProps> = ({
  project,
  projectId,
  onSave,
  onAutoSave,
  onReloadProject,
}) => {
  const [activeView, setActiveView] = useState<HydraulicWorkspaceView>('design');
  const activeOption = VIEW_OPTIONS.find((option) => option.id === activeView) || VIEW_OPTIONS[0];

  return (
    <section className="hydraulic-workspace-mobile space-y-4 sm:space-y-6">
      <div className="rough-panel p-4 sm:p-5">
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>Proyecto hidráulico</p>
            <h2 className="mt-1 text-xl font-semibold sm:text-2xl" style={{ color: 'var(--ink)' }}>Diseño y cálculo en un solo lugar</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
              El plano es la fuente de trabajo. La vista 3D, los equipos, el análisis y los materiales leen el mismo proyecto.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            {VIEW_OPTIONS.map((option) => {
              const Icon = option.icon;
              const selected = option.id === activeView;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setActiveView(option.id)}
                  className="min-h-11 rounded-xl px-3 py-2.5 text-left"
                  style={{
                    border: `1.4px solid ${selected ? 'var(--accent)' : 'var(--hair-strong)'}`,
                    backgroundColor: selected ? 'var(--accent-2)' : 'var(--card2)',
                    color: selected ? 'var(--accent)' : 'var(--ink-soft)',
                  }}
                  aria-pressed={selected}
                >
                  <span className="flex items-center gap-2">
                    <Icon size={17} />
                    <span className="text-sm font-semibold">{option.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative mt-4 rough-dashed pt-3">
          <p className="text-xs sm:text-sm" style={{ color: 'var(--ink-soft)' }}>
            <span className="font-semibold" style={{ color: 'var(--ink)' }}>{activeOption.label}:</span> {activeOption.description}
          </p>
        </div>
      </div>

      {activeView === 'design' && <PlumbingEditor project={project} onSave={onSave} onAutoSave={onAutoSave} />}
      {activeView === 'three' && <HydraulicThreeView project={project} />}
      {activeView === 'equipment' && (
        <EquipmentSelector
          projectId={projectId}
          selectedEquipment={(project as any).additionals || []}
          onUpdate={() => void onReloadProject()}
        />
      )}
      {activeView === 'analysis' && <HydraulicAnalysisPanel projectId={projectId} />}
      {activeView === 'materials' && <HydraulicMaterialsPanel project={project} />}
    </section>
  );
};
