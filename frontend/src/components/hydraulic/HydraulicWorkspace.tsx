import React, { useMemo, useState } from 'react';
import { PlumbingEditor } from '@/components/PlumbingEditor';
import { HydraulicAnalysisPanel } from '@/components/HydraulicAnalysisPanel';
import { EquipmentSelector } from '@/components/EquipmentSelector';
import { plumbingCalculationService, PlumbingCalculationResult } from '@/services/plumbingCalculationService';
import { getProjectAdditionals, summarizeHydraulicSystem } from '@/utils/projectCosting';
import type { Project } from '@/types';
import {
  HdActivity,
  HdDroplet,
  HdHammer,
  HdPackage,
  HdSettings,
} from '@/components/ui/HandDrawnIcons';

type HydraulicWorkspaceView = 'design' | 'equipment' | 'analysis' | 'materials';

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
  shortLabel: string;
  description: string;
  icon: React.ComponentType<any>;
}> = [
  {
    id: 'design',
    label: 'Diseño',
    shortLabel: 'Diseño',
    description: 'Plano, puntos hidráulicos, recorridos y cabecera.',
    icon: HdHammer,
  },
  {
    id: 'equipment',
    label: 'Equipos',
    shortLabel: 'Equipos',
    description: 'Bombas, filtros, calefacción y equipamiento asociado.',
    icon: HdSettings,
  },
  {
    id: 'analysis',
    label: 'Cálculo',
    shortLabel: 'Cálculo',
    description: 'TDH, caudal, pérdidas y comprobación de bomba.',
    icon: HdActivity,
  },
  {
    id: 'materials',
    label: 'Materiales',
    shortLabel: 'Materiales',
    description: 'Caños, accesorios y cantidades derivadas del diseño.',
    icon: HdPackage,
  },
];

const formatMeters = (value: number) =>
  `${Number.isFinite(value) ? value.toLocaleString('es-AR', { maximumFractionDigits: 1 }) : '0'} m`;

const HydraulicMaterialsPanel: React.FC<{ project: Project }> = ({ project }) => {
  const calculation = useMemo<PlumbingCalculationResult | null>(() => {
    const preset = project.poolPreset;
    if (!preset) return null;

    try {
      const additionals = getProjectAdditionals(project);
      const hydraulicSummary = summarizeHydraulicSystem(project, additionals) as any;
      const totals = hydraulicSummary?.total || {};
      const plumbingConfig = (project.plumbingConfig || {}) as any;
      const hydrojetCount = Number(totals.hydrojets || 0);
      const vacuumCount = Number(
        totals.vacuumIntakes || totals.vacuum || (preset.hasVacuumIntake ? 1 : 0),
      );
      const bottomDrainCount = Number(totals.bottomDrains || totals.drains || 0);

      return plumbingCalculationService.calculatePipeRequirements({
        poolLength: Number(preset.length || 0),
        poolWidth: Number(preset.width || 0),
        distanceToEquipment: Math.max(0, Number(plumbingConfig.distanceToEquipment || 0)),
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
      <div className="rough-panel p-5 sm:p-6">
        <div className="relative flex items-start gap-3">
          <HdPackage size={20} style={{ color: 'var(--ink-soft)' }} />
          <div>
            <h3 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>Materiales hidráulicos</h3>
            <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
              Primero configurá el modelo y el diseño hidráulico del proyecto.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const fittingGroups = [
    {
      label: 'Codos 90°',
      rows: calculation.fittings.elbows90.map((item) => ({ detail: item.diameter, quantity: item.quantity })),
    },
    {
      label: 'Codos 45°',
      rows: calculation.fittings.elbows45.map((item) => ({ detail: item.diameter, quantity: item.quantity })),
    },
    {
      label: 'Tees',
      rows: calculation.fittings.tees.map((item) => ({ detail: item.diameter, quantity: item.quantity })),
    },
    {
      label: 'Reducciones',
      rows: calculation.fittings.reducers.map((item) => ({ detail: `${item.fromDiameter} → ${item.toDiameter}`, quantity: item.quantity })),
    },
    {
      label: 'Adaptadores',
      rows: calculation.fittings.adapters.map((item) => ({ detail: `${item.diameter} · rosca ${item.threadSize}`, quantity: item.quantity })),
    },
    {
      label: 'Válvulas',
      rows: calculation.fittings.valves.map((item) => ({ detail: `${item.diameter} · ${item.type}`, quantity: item.quantity })),
    },
    {
      label: 'Uniones',
      rows: calculation.fittings.couplings.map((item) => ({ detail: item.diameter, quantity: item.quantity })),
    },
  ].filter((group) => group.rows.some((row) => row.quantity > 0));

  const pipeSystem = ((project.plumbingConfig as any)?.pipeSystem || 'PVC').toString();

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rough-panel rough-panel--soft p-4">
          <p className="relative text-[11px] uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>Caño estimado</p>
          <p className="relative mt-2 text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
            {formatMeters(calculation.summary.totalMeters)}
          </p>
        </div>
        <div className="rough-panel rough-panel--soft p-4">
          <p className="relative text-[11px] uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>Accesorios</p>
          <p className="relative mt-2 text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
            {calculation.summary.totalAccessories}
          </p>
        </div>
        <div className="rough-panel rough-panel--soft p-4">
          <p className="relative text-[11px] uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>Distancia crítica</p>
          <p className="relative mt-2 text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
            {formatMeters(calculation.summary.maxDistance)}
          </p>
        </div>
        <div className="rough-panel rough-panel--soft p-4">
          <p className="relative text-[11px] uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>Sistema</p>
          <p className="relative mt-2 text-lg font-semibold" style={{ color: 'var(--ink)' }}>{pipeSystem}</p>
        </div>
      </div>

      <section className="rough-panel p-4 sm:p-6">
        <div className="relative mb-4 flex items-center gap-3">
          <HdDroplet size={20} style={{ color: 'var(--accent)' }} />
          <div>
            <h3 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>Tuberías por circuito</h3>
            <p className="text-xs sm:text-sm" style={{ color: 'var(--ink-soft)' }}>
              Se recalculan desde la configuración actual del proyecto.
            </p>
          </div>
        </div>

        <div className="relative divide-y" style={{ borderColor: 'var(--hair)' }}>
          {calculation.pipeRequirements.map((requirement, index) => (
            <div key={`${requirement.lineType}-${index}`} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold" style={{ color: 'var(--ink)' }}>{requirement.description}</p>
                  <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
                    {requirement.diameter} · {requirement.accessoryCount} punto(s)
                  </p>
                </div>
                <span className="shrink-0 font-mono text-lg font-semibold" style={{ color: 'var(--accent)' }}>
                  {formatMeters(requirement.totalMeters)}
                </span>
              </div>
              {requirement.recommendations.length > 0 && (
                <div className="mt-3 space-y-1">
                  {requirement.recommendations.map((recommendation) => (
                    <p key={recommendation} className="text-xs leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
                      {recommendation}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rough-panel p-4 sm:p-6">
        <div className="relative mb-4">
          <h3 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>Accesorios calculados</h3>
          <p className="mt-1 text-xs sm:text-sm" style={{ color: 'var(--ink-soft)' }}>
            La lista se actualiza al modificar el diseño hidráulico.
          </p>
        </div>

        <div className="relative space-y-4">
          {fittingGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-soft)' }}>
                {group.label}
              </p>
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
    <section className="space-y-4 sm:space-y-6">
      <div className="rough-panel p-4 sm:p-5">
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>
              Proyecto hidráulico
            </p>
            <h2 className="mt-1 text-xl font-semibold sm:text-2xl" style={{ color: 'var(--ink)' }}>
              Diseño, equipos y cálculo en un solo lugar
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
              El plano hidráulico es la fuente de trabajo del proyecto. Los equipos, el análisis y los materiales se consultan desde esta misma sección.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto">
            {VIEW_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = option.id === activeView;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setActiveView(option.id)}
                  className="min-h-11 rounded-xl px-3 py-2.5 text-left transition-colors sm:min-w-[108px]"
                  style={{
                    border: `1.4px solid ${isActive ? 'var(--accent)' : 'var(--hair-strong)'}`,
                    backgroundColor: isActive ? 'var(--accent-2)' : 'var(--card2)',
                    color: isActive ? 'var(--accent)' : 'var(--ink-soft)',
                  }}
                  aria-pressed={isActive}
                >
                  <span className="flex items-center gap-2">
                    <Icon size={17} />
                    <span className="text-sm font-semibold">{option.shortLabel}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative mt-4 rough-dashed pt-3">
          <p className="text-xs sm:text-sm" style={{ color: 'var(--ink-soft)' }}>
            <span className="font-semibold" style={{ color: 'var(--ink)' }}>{activeOption.label}:</span>{' '}
            {activeOption.description}
          </p>
        </div>
      </div>

      {activeView === 'design' && (
        <PlumbingEditor
          project={project}
          onSave={onSave}
          onAutoSave={onAutoSave}
        />
      )}

      {activeView === 'equipment' && (
        <EquipmentSelector
          projectId={projectId}
          selectedEquipment={(project as any).additionals || []}
          onUpdate={() => void onReloadProject()}
        />
      )}

      {activeView === 'analysis' && (
        <HydraulicAnalysisPanel projectId={projectId} />
      )}

      {activeView === 'materials' && (
        <HydraulicMaterialsPanel project={project} />
      )}
    </section>
  );
};
