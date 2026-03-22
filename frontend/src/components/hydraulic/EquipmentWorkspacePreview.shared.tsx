import React from 'react';
import { Project } from '@/types';
import { getProjectAdditionals, isBaseModelAdditional, summarizeHydraulicSystem } from '@/utils/projectCosting';

export type HydraulicReferenceSide = 'north' | 'south' | 'east' | 'west';

export interface EquipmentWorkspaceNodePosition {
  x: number;
  y: number;
}

export type EquipmentWorkspaceNodeId =
  | 'intake_manifold'
  | 'filtration_pump'
  | 'filter'
  | 'heater_bypass'
  | 'output_manifold'
  | 'hydro_pump';

export type EquipmentWorkspaceLayout = Record<EquipmentWorkspaceNodeId, EquipmentWorkspaceNodePosition>;

export interface HydraulicLayoutDraftLike {
  referenceSide: HydraulicReferenceSide;
  equipmentWorkspaceLayout?: EquipmentWorkspaceLayout;
}

interface EquipmentWorkspaceModule {
  id: string;
  name: string;
  kind: 'pump' | 'filter' | 'heater' | 'valve' | 'manifold' | 'other';
  detail: string;
  accent: string;
  circuit?: 'filtration' | 'hydrojet' | 'general';
}

interface EquipmentWorkspacePumpCandidate {
  id: string;
  name: string;
  power: number;
  flowRate?: number;
  source: 'default' | 'additional';
}

const SIDE_LABELS: Record<HydraulicReferenceSide, string> = {
  north: 'Norte',
  south: 'Sur',
  east: 'Este',
  west: 'Oeste',
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const buildDefaultEquipmentWorkspaceLayout = (): EquipmentWorkspaceLayout => ({
  intake_manifold: { x: 500, y: 300 },
  filtration_pump: { x: 650, y: 300 },
  filter: { x: 840, y: 300 },
  heater_bypass: { x: 1060, y: 300 },
  output_manifold: { x: 1160, y: 338 },
  hydro_pump: { x: 650, y: 610 },
});

const normalizeWorkspaceText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const getPumpPowerScore = (pump: {
  power?: number;
  hp?: number;
  flowRate?: number;
  equipment?: { power?: number; flowRate?: number };
}) => {
  const power = Number(pump.power || pump.equipment?.power || 0);
  const hp = Number((pump as any).hp || 0);
  const flowRate = Number(pump.flowRate || pump.equipment?.flowRate || 0);
  return power > 0 ? power : hp > 0 ? hp * 746 : flowRate > 0 ? flowRate * 100 : 0;
};

export const buildEquipmentWorkspaceModules = (
  project: Project,
  hydraulicSummary: ReturnType<typeof summarizeHydraulicSystem>
): EquipmentWorkspaceModule[] => {
  const modules: EquipmentWorkspaceModule[] = [];
  const preset = project.poolPreset;
  const additionals = getProjectAdditionals(project).filter(
    (additional) => additional && (additional.newQuantity || 0) > 0 && !isBaseModelAdditional(project, additional)
  );
  const pushModule = (module: EquipmentWorkspaceModule) => {
    if (modules.some((item) => item.id === module.id || item.name === module.name)) return;
    modules.push(module);
  };
  const pumpCandidates: EquipmentWorkspacePumpCandidate[] = [];

  if (preset?.defaultPump) {
    pumpCandidates.push({
      id: 'pump-main-default',
      name: preset.defaultPump.name || 'Bomba de filtrado principal',
      power: getPumpPowerScore(preset.defaultPump),
      flowRate: preset.defaultPump.flowRate,
      source: 'default',
    });
  } else {
    pumpCandidates.push({
      id: 'pump-main-default',
      name: 'Bomba de filtrado principal',
      power: 0,
      source: 'default',
    });
  }

  additionals.forEach((additional) => {
    const rawName =
      additional.customName ||
      additional.equipment?.name ||
      additional.accessory?.name ||
      additional.material?.name ||
      'Equipo adicional';
    const name = normalizeWorkspaceText(rawName);
    const quantity = Number(additional.newQuantity || 0);
    if (!name || quantity <= 0) return;

    if (name.includes('bomba') || name.includes('bac200') || additional.equipment?.type === 'PUMP') {
      pumpCandidates.push({
        id: `additional-${additional.id}-pump`,
        name: rawName,
        power: getPumpPowerScore(additional.equipment || additional),
        flowRate: additional.equipment?.flowRate,
        source: 'additional',
      });
    }
  });

  const sortedPumps = [...pumpCandidates].sort((a, b) => b.power - a.power);
  const hydroPumpCandidate = hydraulicSummary.total.hydrojets > 0 && sortedPumps.length > 1
    ? sortedPumps[0]
    : sortedPumps.find((pump) => {
        const name = normalizeWorkspaceText(pump.name);
        return name.includes('hidro') || name.includes('jet') || name.includes('bac200');
      }) || null;
  const filtrationPumpCandidate = sortedPumps.find((pump) => !hydroPumpCandidate || pump.id !== hydroPumpCandidate.id) || sortedPumps[0] || null;

  if (filtrationPumpCandidate) {
    pushModule({
      id: filtrationPumpCandidate.id,
      name: filtrationPumpCandidate.name,
      kind: 'pump',
      detail: filtrationPumpCandidate.flowRate ? `${filtrationPumpCandidate.flowRate} m3/h` : 'Circuito principal',
      accent: '#38bdf8',
      circuit: 'filtration',
    });
  }

  pushModule({
    id: 'filter-main',
    name: preset?.defaultFilter?.name || 'Filtro principal',
    kind: 'filter',
    detail: preset?.defaultFilter?.connectionSize || 'Línea de filtrado',
    accent: '#60a5fa',
    circuit: 'filtration',
  });

  if (hydroPumpCandidate) {
    pushModule({
      id: hydroPumpCandidate.id,
      name: hydroPumpCandidate.name,
      kind: 'pump',
      detail: hydroPumpCandidate.flowRate
        ? `${hydroPumpCandidate.flowRate} m3/h · ${hydraulicSummary.total.hydrojets} hidrojet(s)`
        : `${hydraulicSummary.total.hydrojets} hidrojet(s)`,
      accent: '#f59e0b',
      circuit: 'hydrojet',
    });
  }

  additionals.forEach((additional) => {
    const name = normalizeWorkspaceText(
      additional.customName ||
      additional.equipment?.name ||
      additional.accessory?.name ||
      additional.material?.name ||
      ''
    );
    const rawName =
      additional.customName ||
      additional.equipment?.name ||
      additional.accessory?.name ||
      additional.material?.name ||
      'Equipo adicional';
    const quantity = Number(additional.newQuantity || 0);
    if (!name || quantity <= 0) return;

    if (name.includes('bomba') || name.includes('bac200') || additional.equipment?.type === 'PUMP') return;

    if (name.includes('filtro')) {
      pushModule({
        id: `additional-${additional.id}-filter`,
        name: rawName,
        kind: 'filter',
        detail: `${quantity} unidad(es)`,
        accent: '#60a5fa',
        circuit: 'filtration',
      });
      return;
    }

    if (
      name.includes('calent') ||
      name.includes('intercambiador') ||
      name.includes('heat') ||
      name.includes('caldaia') ||
      name.includes('caldera') ||
      name.includes('boiler') ||
      name.includes('cp70')
    ) {
      pushModule({
        id: `additional-${additional.id}-heater`,
        name: rawName,
        kind: 'heater',
        detail: `${quantity} unidad(es)`,
        accent: '#fb7185',
        circuit: 'general',
      });
    }
  });

  pushModule({
    id: 'manifold-main',
    name: 'Manifold hidráulico',
    kind: 'manifold',
    detail: 'Succión / retorno / hidrojets',
    accent: '#fcd34d',
    circuit: 'general',
  });

  return modules;
};

export const EquipmentWorkspacePreviewShared: React.FC<{
  project: Project;
  hydraulicSummary: ReturnType<typeof summarizeHydraulicSystem>;
  hydraulicLayout: HydraulicLayoutDraftLike;
  distanceToEquipment: number;
  onLayoutChange?: (layout: EquipmentWorkspaceLayout) => void;
  onInteractionCommit?: () => void;
}> = ({ project, hydraulicSummary, hydraulicLayout, distanceToEquipment, onLayoutChange, onInteractionCommit }) => {
  const W = 1400;
  const H = 900;
  const centerX = W / 2;
  const svgRef = React.useRef<SVGSVGElement>(null);
  const dragNodeRef = React.useRef<{ id: EquipmentWorkspaceNodeId; offsetX: number; offsetY: number } | null>(null);
  const modules = React.useMemo(
    () => buildEquipmentWorkspaceModules(project, hydraulicSummary),
    [project, hydraulicSummary]
  );
  const hasHydroPumpModule = modules.some((module) => module.kind === 'pump' && module.circuit === 'hydrojet');
  const hasHeaterModule = modules.some((module) => module.kind === 'heater');
  const filtrationPump = modules.find((module) => module.kind === 'pump' && module.circuit === 'filtration');
  const hydroPump = modules.find((module) => module.kind === 'pump' && module.circuit === 'hydrojet');
  const filterModule = modules.find((module) => module.kind === 'filter');
  const workspaceLayout = React.useMemo(
    () => ({ ...buildDefaultEquipmentWorkspaceLayout(), ...(hydraulicLayout.equipmentWorkspaceLayout || {}) }),
    [hydraulicLayout.equipmentWorkspaceLayout]
  );

  const clampNode = React.useCallback((x: number, y: number) => ({
    x: clamp(x, 220, W - 220),
    y: clamp(y, 170, H - 210),
  }), []);

  const projectPointer = React.useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / Math.max(rect.width, 1)) * W,
      y: ((clientY - rect.top) / Math.max(rect.height, 1)) * H,
    };
  }, []);

  React.useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragNodeRef.current || !onLayoutChange) return;
      const point = projectPointer(event.clientX, event.clientY);
      if (!point) return;
      onLayoutChange({
        ...workspaceLayout,
        [dragNodeRef.current.id]: clampNode(point.x - dragNodeRef.current.offsetX, point.y - dragNodeRef.current.offsetY),
      });
    };
    const stopDragging = () => {
      if (dragNodeRef.current) {
        dragNodeRef.current = null;
        onInteractionCommit?.();
      }
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopDragging);
    window.addEventListener('pointercancel', stopDragging);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopDragging);
      window.removeEventListener('pointercancel', stopDragging);
    };
  }, [clampNode, onInteractionCommit, onLayoutChange, projectPointer, workspaceLayout]);

  const beginNodeDrag = (id: EquipmentWorkspaceNodeId, event: React.PointerEvent<SVGGElement>) => {
    const point = projectPointer(event.clientX, event.clientY);
    if (!point) return;
    const current = workspaceLayout[id];
    dragNodeRef.current = {
      id,
      offsetX: point.x - current.x,
      offsetY: point.y - current.y,
    };
  };

  const valveMarker = (cx: number, cy: number, stroke: string) => (
    <g>
      <circle cx={cx} cy={cy} r="9" fill="#fef3c7" stroke={stroke} strokeWidth="2" />
      <line x1={cx - 5} y1={cy - 5} x2={cx + 5} y2={cy + 5} stroke={stroke} strokeWidth="1.6" />
      <line x1={cx + 5} y1={cy - 5} x2={cx - 5} y2={cy + 5} stroke={stroke} strokeWidth="1.6" />
    </g>
  );

  const intakeManifold = workspaceLayout.intake_manifold;
  const filtrationPumpPos = workspaceLayout.filtration_pump;
  const filterPos = workspaceLayout.filter;
  const heaterBypassPos = workspaceLayout.heater_bypass;
  const outputManifold = workspaceLayout.output_manifold;
  const hydroPumpPos = workspaceLayout.hydro_pump;
  const heaterEntryX = heaterBypassPos.x - 96;
  const heaterLineY = heaterBypassPos.y;
  const heaterBoxX = heaterBypassPos.x - 54;
  const heaterBoxY = heaterBypassPos.y - 150;
  const heaterBoxW = 92;
  const heaterBoxH = 92;
  const heaterPortY = heaterBoxY + heaterBoxH / 2;
  const hasHotWaterReturn = Boolean(project.poolPreset?.hasHotWaterReturn);
  const outputReturnY = hasHotWaterReturn ? outputManifold.y - 26 : outputManifold.y;
  const outputHotReturnY = outputManifold.y + 26;
  const outputManifoldTop = hasHotWaterReturn ? outputReturnY - 18 : outputReturnY - 38;
  const outputManifoldBottom = hasHotWaterReturn ? outputHotReturnY + 18 : outputReturnY + 38;
  const outputApproachX = outputManifold.x - 90;
  const outputEntryX = outputManifold.x - 17;
  const bypassValveX = heaterEntryX + (outputApproachX - heaterEntryX) / 2;
  const heaterInValveY = heaterLineY + (heaterPortY - heaterLineY) / 2;
  const heaterOutValveX = heaterBoxX + heaterBoxW + Math.max(28, (outputApproachX - (heaterBoxX + heaterBoxW)) / 2);
  const heaterOutletRiseX = outputApproachX;

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#020617]">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full">
        <defs>
          <pattern id="equipment-grid-shared" width="36" height="36" patternUnits="userSpaceOnUse">
            <path d="M 36 0 L 0 0 0 36" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
          </pattern>
          <radialGradient id="equipment-glow-shared" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="rgba(245,158,11,0.28)" />
            <stop offset="100%" stopColor="rgba(245,158,11,0.03)" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width={W} height={H} fill="url(#equipment-grid-shared)" />
        <rect x="36" y="36" width={W - 72} height={H - 72} rx="26" fill="rgba(9,9,11,0.88)" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />

        <line x1="320" y1={intakeManifold.y - 52} x2={intakeManifold.x - 16} y2={intakeManifold.y - 52} stroke="#38bdf8" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="356" y1={intakeManifold.y} x2={intakeManifold.x - 16} y2={intakeManifold.y} stroke="#f87171" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="332" y1={intakeManifold.y + 52} x2={intakeManifold.x - 16} y2={intakeManifold.y + 52} stroke="#e879f9" strokeWidth="4.5" strokeLinecap="round" />
        {valveMarker(intakeManifold.x - 50, intakeManifold.y - 52, '#38bdf8')}
        {valveMarker(intakeManifold.x - 50, intakeManifold.y, '#f87171')}
        {valveMarker(intakeManifold.x - 50, intakeManifold.y + 52, '#e879f9')}
        <circle cx="320" cy={intakeManifold.y - 52} r="9" fill="#38bdf8" />
        <circle cx="356" cy={intakeManifold.y} r="9" fill="#f87171" />
        <circle cx="332" cy={intakeManifold.y + 52} r="9" fill="#e879f9" />
        <text x="180" y={intakeManifold.y - 68} fill="#7dd3fc" fontSize="14" fontWeight="700">Skimmer</text>
        <text x="180" y={intakeManifold.y - 16} fill="#fca5a5" fontSize="14" fontWeight="700">Toma de fondo</text>
        <text x="180" y={intakeManifold.y + 36} fill="#f0abfc" fontSize="14" fontWeight="700">Toma de aspiración</text>
        <g style={{ cursor: 'grab' }} onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); beginNodeDrag('intake_manifold', event); }}>
          <rect x={intakeManifold.x - 17} y={intakeManifold.y - 90} width="34" height="180" rx="12" fill="rgba(24,24,27,0.96)" stroke="#7dd3fc" strokeWidth="2.4" />
          <text x={intakeManifold.x} y={intakeManifold.y - 108} fill="#bae6fd" fontSize="16" fontWeight="700" textAnchor="middle">Manifold entrada</text>
        </g>

        <line x1={intakeManifold.x + 17} y1={intakeManifold.y} x2={filtrationPumpPos.x - 70} y2={filtrationPumpPos.y} stroke="#7dd3fc" strokeWidth="4.5" />
        <g style={{ cursor: 'grab' }} onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); beginNodeDrag('filtration_pump', event); }}>
          <circle cx={filtrationPumpPos.x} cy={filtrationPumpPos.y} r="70" fill="url(#equipment-glow-shared)" stroke="rgba(245,158,11,0.55)" strokeWidth="2.8" />
          <polygon
            points={`${filtrationPumpPos.x - 26},${filtrationPumpPos.y + 42} ${filtrationPumpPos.x - 26},${filtrationPumpPos.y - 42} ${filtrationPumpPos.x + 44},${filtrationPumpPos.y}`}
            fill="rgba(245,158,11,0.92)"
            stroke="#fef3c7"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <text x={filtrationPumpPos.x} y={filtrationPumpPos.y + 94} fill="#f4f4f5" fontSize="15" fontWeight="700" textAnchor="middle">{filtrationPump?.name || 'Bomba filtrado'}</text>
        </g>

        <line x1={filtrationPumpPos.x + 70} y1={filtrationPumpPos.y} x2={filterPos.x - 64} y2={filterPos.y} stroke="#7dd3fc" strokeWidth="4.5" />
        <g style={{ cursor: 'grab' }} onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); beginNodeDrag('filter', event); }}>
          <rect x={filterPos.x - 64} y={filterPos.y - 52} width="128" height="104" rx="18" fill="rgba(12,18,34,0.96)" stroke="#60a5fa" strokeWidth="2.4" />
          <text x={filterPos.x} y={filterPos.y - 8} fill="#e0f2fe" fontSize="16" fontWeight="700" textAnchor="middle">{filterModule?.name || 'Filtro'}</text>
          <text x={filterPos.x} y={filterPos.y + 16} fill="#93c5fd" fontSize="12" textAnchor="middle">Entrada / salida</text>
        </g>

        <line x1={filterPos.x + 64} y1={filterPos.y} x2={heaterEntryX} y2={heaterLineY} stroke="#60a5fa" strokeWidth="4.5" />
        {hasHeaterModule && (
          <>
            <g style={{ cursor: 'grab' }} onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); beginNodeDrag('heater_bypass', event); }}>
              <line x1={heaterEntryX} y1={heaterLineY} x2={outputApproachX} y2={heaterLineY} stroke="#60a5fa" strokeWidth="4.5" />
              <line x1={heaterEntryX} y1={heaterLineY} x2={heaterEntryX} y2={heaterPortY} stroke="#fb7185" strokeWidth="4.5" />
              <line x1={heaterEntryX} y1={heaterPortY} x2={heaterBoxX} y2={heaterPortY} stroke="#fb7185" strokeWidth="4.5" />
              <line x1={heaterBoxX + heaterBoxW} y1={heaterPortY} x2={heaterOutletRiseX} y2={heaterPortY} stroke="#fb7185" strokeWidth="4.5" />
              <line x1={heaterOutletRiseX} y1={heaterPortY} x2={heaterOutletRiseX} y2={heaterLineY} stroke="#fb7185" strokeWidth="4.5" />
              <rect x={heaterBoxX} y={heaterBoxY} width={heaterBoxW} height={heaterBoxH} rx="16" fill="rgba(68,14,26,0.9)" stroke="#fb7185" strokeWidth="2.2" />
              <text x={heaterBoxX + heaterBoxW / 2} y={heaterBypassPos.y - 10} fill="#ffe4e6" fontSize="14" fontWeight="700" textAnchor="middle">Calentador</text>
              <text x={heaterBoxX + heaterBoxW / 2} y={heaterBypassPos.y + 12} fill="#fecdd3" fontSize="11" textAnchor="middle">Sistema calefacción</text>
              <circle cx={heaterEntryX} cy={heaterLineY} r="6" fill="#60a5fa" />
              <circle cx={outputApproachX} cy={heaterLineY} r="6" fill="#60a5fa" />
              <circle cx={heaterBoxX} cy={heaterPortY} r="6" fill="#fb7185" />
              <circle cx={heaterBoxX + heaterBoxW} cy={heaterPortY} r="6" fill="#fb7185" />
              <text x={heaterBoxX - 10} y={heaterPortY - 10} fill="#fda4af" fontSize="12" fontWeight="700" textAnchor="end">Entrada</text>
              <text x={heaterBoxX + heaterBoxW + 10} y={heaterPortY - 10} fill="#fda4af" fontSize="12" fontWeight="700">Salida</text>
            </g>
            {valveMarker(heaterEntryX, heaterInValveY, '#fb7185')}
            {valveMarker(bypassValveX, heaterLineY, '#facc15')}
            {valveMarker(heaterOutValveX, heaterPortY, '#fb7185')}
            <text x={bypassValveX} y={heaterLineY - 18} fill="#fde68a" fontSize="12" fontWeight="700" textAnchor="middle">
              Bypass
            </text>
          </>
        )}
        {!hasHeaterModule && (
          <line x1={heaterEntryX} y1={heaterLineY} x2={outputApproachX} y2={heaterLineY} stroke="#60a5fa" strokeWidth="4.5" />
        )}
        {hasHeaterModule && (
          <>
            <circle cx={heaterEntryX} cy={heaterLineY} r="6.5" fill="#60a5fa" />
            <circle cx={outputApproachX} cy={heaterLineY} r="6.5" fill="#60a5fa" />
          </>
        )}
        {heaterLineY !== outputManifold.y && (
          <line x1={outputApproachX} y1={heaterLineY} x2={outputApproachX} y2={outputManifold.y} stroke="#60a5fa" strokeWidth="4.5" />
        )}
        <line x1={outputApproachX} y1={outputManifold.y} x2={outputEntryX} y2={outputManifold.y} stroke="#60a5fa" strokeWidth="4.5" />
        <g style={{ cursor: 'grab' }} onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); beginNodeDrag('output_manifold', event); }}>
          <rect x={outputManifold.x - 17} y={outputManifoldTop} width="34" height={outputManifoldBottom - outputManifoldTop} rx="12" fill="rgba(24,24,27,0.96)" stroke="#86efac" strokeWidth="2.4" />
          <text x={outputManifold.x} y={outputManifoldTop - 18} fill="#bbf7d0" fontSize="16" fontWeight="700" textAnchor="middle">Manifold salida</text>
        </g>
        <line x1={outputManifold.x + 17} y1={outputReturnY} x2="1186" y2={outputReturnY} stroke="#34d399" strokeWidth="4.5" strokeLinecap="round" />
        {valveMarker(outputManifold.x + 60, outputReturnY, '#34d399')}
        <circle cx="1186" cy={outputReturnY} r="9" fill="#34d399" />
        <text x="1198" y={outputReturnY - 18} fill="#86efac" fontSize="14" fontWeight="700">Retornos</text>
        {hasHotWaterReturn && (
          <>
            <line x1={outputManifold.x + 17} y1={outputHotReturnY} x2="1186" y2={outputHotReturnY} stroke="#fb7185" strokeWidth="4.5" strokeLinecap="round" />
            {valveMarker(outputManifold.x + 60, outputHotReturnY, '#fb7185')}
            <circle cx="1186" cy={outputHotReturnY} r="9" fill="#fb7185" />
            <text x="1198" y={outputHotReturnY - 18} fill="#fda4af" fontSize="14" fontWeight="700">Retorno agua caliente</text>
          </>
        )}

        {hasHydroPumpModule && (
          <g style={{ cursor: 'grab' }} onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); beginNodeDrag('hydro_pump', event); }}>
            <circle cx={hydroPumpPos.x} cy={hydroPumpPos.y} r="62" fill="rgba(249,115,22,0.12)" stroke="#f97316" strokeWidth="2.8" />
            <polygon
              points={`${hydroPumpPos.x - 24},${hydroPumpPos.y + 36} ${hydroPumpPos.x - 24},${hydroPumpPos.y - 36} ${hydroPumpPos.x + 36},${hydroPumpPos.y}`}
              fill="rgba(249,115,22,0.92)"
              stroke="#ffedd5"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <line x1="356" y1={hydroPumpPos.y} x2={hydroPumpPos.x - 62} y2={hydroPumpPos.y} stroke="#f97316" strokeWidth="4.5" />
            <circle cx="356" cy={hydroPumpPos.y} r="9" fill="#f97316" />
            <text x="184" y={hydroPumpPos.y - 18} fill="#fdba74" fontSize="14" fontWeight="700">Toma bomba hidrojets</text>
            <text x={hydroPumpPos.x} y={hydroPumpPos.y + 86} fill="#f4f4f5" fontSize="15" fontWeight="700" textAnchor="middle">{hydroPump?.name || 'Bomba hidrojets'}</text>
            <line x1={hydroPumpPos.x + 62} y1={hydroPumpPos.y} x2="1186" y2={hydroPumpPos.y} stroke="#f59e0b" strokeWidth="4.5" strokeDasharray="12 8" />
            {valveMarker(hydroPumpPos.x - 100, hydroPumpPos.y, '#f97316')}
            {valveMarker(hydroPumpPos.x + 100, hydroPumpPos.y, '#f59e0b')}
            <circle cx="1186" cy={hydroPumpPos.y} r="9" fill="#f59e0b" />
            <text x="1040" y={hydroPumpPos.y - 18} fill="#fcd34d" fontSize="14" fontWeight="700">Salida hidrojets</text>
          </g>
        )}

        <text x="84" y="90" fill="#f4f4f5" fontSize="28" fontWeight="700">Workspace de equipo</text>
        <text x="84" y="120" fill="#a1a1aa" fontSize="15">
          Arrastrá manifolds, bomba, filtro, bypass y circuito de hidrojets.
        </text>
        <text x={centerX} y="102" fill="#d4d4d8" fontSize="16" textAnchor="middle">
          {SIDE_LABELS[hydraulicLayout.referenceSide]} · {distanceToEquipment.toFixed(2)} m · vista de detalle
        </text>
      </svg>
    </div>
  );
};
