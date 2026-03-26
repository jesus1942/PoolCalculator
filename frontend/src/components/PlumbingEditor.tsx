import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Project } from '@/types';
import { plumbingItemService, PlumbingItem } from '@/services/plumbingItemService';
import { plumbingCalculationService, PlumbingCalculationResult } from '@/services/plumbingCalculationService';
import { getProjectAdditionals, isBaseModelAdditional, summarizeHydraulicSystem } from '@/utils/projectCosting';
import { Save, Plus, Trash2, Search, Calculator, AlertTriangle, ScanLine } from 'lucide-react';

interface PlumbingEditorProps {
  project: Project;
  onSave: (plumbingConfig: any) => void;
  onAutoSave?: (plumbingConfig: any) => void;
}

interface SelectedItem {
  itemId: string;
  itemName: string;
  quantity: number;
  diameter?: string;
  category: string;
  pricePerUnit: number;
}

type HydraulicReferenceSide = 'north' | 'south' | 'east' | 'west';
type HydraulicPointSide = HydraulicReferenceSide | 'internal_wall';
type HydraulicPointKind = 'skimmer' | 'return' | 'hydrojet' | 'hydrojet_suction' | 'vacuum' | 'bottom_drain';

interface HydraulicPointDraft {
  id: string;
  kind: HydraulicPointKind;
  label: string;
  side: HydraulicPointSide;
  offsetMeters: number;
  depthMeters: number;
}

interface HydraulicLayoutDraft {
  referenceSide: HydraulicReferenceSide;
  equipmentOffsetMeters: number;
  equipmentHeightFromZero: number;
  equipmentBaseHeightFromFloor: number;
  equipmentWorkspaceLayout?: EquipmentWorkspaceLayout;
  points: HydraulicPointDraft[];
}

type EquipmentWorkspaceNodeId =
  | 'intake_manifold'
  | 'filtration_pump'
  | 'filter'
  | 'heater_bypass'
  | 'output_manifold'
  | 'hydro_pump';

interface EquipmentWorkspaceNodePosition {
  x: number;
  y: number;
}

type EquipmentWorkspaceLayout = Record<EquipmentWorkspaceNodeId, EquipmentWorkspaceNodePosition>;

const POINT_KIND_LABELS: Record<HydraulicPointKind, string> = {
  skimmer: 'Skimmer',
  return: 'Retorno',
  hydrojet: 'Hidrojet',
  hydrojet_suction: 'Toma bomba hidrojets',
  vacuum: 'Toma aspiradora',
  bottom_drain: 'Toma de fondo',
};

const PIPE_LANE_ORDER: Record<HydraulicPointKind, number> = {
  skimmer: 0,
  return: 1,
  hydrojet: 2,
  hydrojet_suction: 3,
  vacuum: 4,
  bottom_drain: 5,
};

const SIDE_OPTIONS: Array<{ value: HydraulicReferenceSide; label: string }> = [
  { value: 'north', label: 'Norte' },
  { value: 'south', label: 'Sur' },
  { value: 'east', label: 'Este' },
  { value: 'west', label: 'Oeste' },
];

const POINT_SIDE_OPTIONS: Array<{ value: HydraulicPointSide; label: string }> = [
  ...SIDE_OPTIONS,
  { value: 'internal_wall', label: 'Pared interna' },
];

const SIDE_LABELS: Record<HydraulicReferenceSide, string> = {
  north: 'Norte',
  south: 'Sur',
  east: 'Este',
  west: 'Oeste',
};

const POINT_SIDE_LABELS: Record<HydraulicPointSide, string> = {
  ...SIDE_LABELS,
  internal_wall: 'Pared interna',
};

const EQUIPMENT_SIDE: HydraulicReferenceSide = 'north';
const RETURNS_SIDE: HydraulicReferenceSide = 'south';
const VACUUM_SIDE: HydraulicReferenceSide = 'west';
const getSideSpanMeters = (side: HydraulicReferenceSide, poolLength: number, poolWidth: number) =>
  side === 'north' || side === 'south' ? poolWidth : poolLength;

const buildHydrojetSuctionPoint = (poolWidth: number, depthStart: number): HydraulicPointDraft => ({
  id: 'hydrojet-suction-1',
  kind: 'hydrojet_suction',
  label: 'Toma bomba hidrojets',
  side: 'north',
  offsetMeters: Number((poolWidth * 0.72).toFixed(2)),
  depthMeters: Number(Math.min(0.62, depthStart * 0.48).toFixed(2)),
});

const buildDefaultEquipmentWorkspaceLayout = (): EquipmentWorkspaceLayout => ({
  intake_manifold: { x: 500, y: 300 },
  filtration_pump: { x: 650, y: 300 },
  filter: { x: 840, y: 300 },
  heater_bypass: { x: 1060, y: 300 },
  output_manifold: { x: 1160, y: 338 },
  hydro_pump: { x: 650, y: 610 },
});

const buildDefaultHydraulicLayout = (project: Project, hydraulicSummary: ReturnType<typeof summarizeHydraulicSystem>): HydraulicLayoutDraft => {
  const preset = project.poolPreset;
  const poolLength = preset?.length || 0;
  const poolWidth = preset?.width || 0;
  const depthStart = preset?.depth || 1.4;
  const depthEnd = preset?.depthEnd || depthStart;
  const points: HydraulicPointDraft[] = [];

  const pushPoints = (
    count: number,
    kind: HydraulicPointKind,
    labelPrefix: string,
    side: HydraulicReferenceSide,
    span: number,
    depthMeters: number,
  ) => {
    if (count <= 0) return;
    const spacing = count === 1 ? span / 2 : span / (count + 1);
    for (let index = 0; index < count; index += 1) {
      points.push({
        id: `${kind}-${index + 1}`,
        kind,
        label: `${labelPrefix} ${index + 1}`,
        side,
        offsetMeters: Number(((index + 1) * spacing).toFixed(2)),
        depthMeters: Number(depthMeters.toFixed(2)),
      });
    }
  };

  const pushHydrojetPattern = (count: number) => {
    if (count <= 0) return;

    // Skimmer a la izquierda (north) y zona de escaleras/playa humeda al lado opuesto (south).
    // Por eso los hidrojets se concentran del lado derecho y sus cercanias.
    const southRun = [
      { side: 'south' as HydraulicReferenceSide, offset: poolWidth * 0.2, depth: Math.min(0.52, depthStart * 0.42) },
      { side: 'south' as HydraulicReferenceSide, offset: poolWidth * 0.38, depth: Math.min(0.52, depthStart * 0.42) },
      { side: 'south' as HydraulicReferenceSide, offset: poolWidth * 0.62, depth: Math.min(0.52, depthStart * 0.42) },
      { side: 'south' as HydraulicReferenceSide, offset: poolWidth * 0.82, depth: Math.min(0.52, depthStart * 0.42) },
    ];

    const eastWestEdges = [
      { side: 'east' as HydraulicReferenceSide, offset: poolLength * 0.72, depth: Math.min(0.48, depthStart * 0.38) },
      { side: 'east' as HydraulicReferenceSide, offset: poolLength * 0.88, depth: Math.min(0.48, depthStart * 0.38) },
      { side: 'west' as HydraulicReferenceSide, offset: poolLength * 0.72, depth: Math.min(0.48, depthStart * 0.38) },
      { side: 'west' as HydraulicReferenceSide, offset: poolLength * 0.88, depth: Math.min(0.48, depthStart * 0.38) },
    ];

    const layout = [...eastWestEdges, ...southRun].slice(0, count);
    layout.forEach((entry, index) => {
      points.push({
        id: `hydrojet-${index + 1}`,
        kind: 'hydrojet',
        label: `Hidrojet ${index + 1}`,
        side: entry.side,
        offsetMeters: Number(entry.offset.toFixed(2)),
        depthMeters: Number(entry.depth.toFixed(2)),
      });
    });
  };

  // Criterio segun esquema constructivo real:
  // - Norte real = cabecera angosta izquierda del dibujo
  // - Skimmer en esa cabecera norte
  // - Retornos e hidrojets del lado contrario al skimmer
  // - Aspiradora en un lateral longitudinal independiente
  pushPoints(hydraulicSummary.total.skimmers, 'skimmer', 'Skimmer', EQUIPMENT_SIDE, poolWidth, 0.12);
  pushPoints(hydraulicSummary.total.returns, 'return', 'Retorno', RETURNS_SIDE, poolWidth, Math.min(0.45, depthStart * 0.35));
  pushHydrojetPattern(hydraulicSummary.total.hydrojets);
  if (hydraulicSummary.total.hydrojets > 0) {
    points.push(buildHydrojetSuctionPoint(poolWidth, depthStart));
  }

  if (preset?.hasVacuumIntake) {
    points.push({
      id: 'vacuum-1',
      kind: 'vacuum',
      label: 'Toma aspiradora 1',
      side: VACUUM_SIDE,
      offsetMeters: Number((poolLength * 0.35).toFixed(2)),
      depthMeters: Number(Math.min(0.35, depthStart * 0.25).toFixed(2)),
    });
  }

  if (preset?.hasBottomDrain) {
    points.push({
      id: 'bottom-drain-1',
      kind: 'bottom_drain',
      label: 'Toma de fondo 1',
      side: EQUIPMENT_SIDE,
      offsetMeters: Number((poolWidth / 2).toFixed(2)),
      depthMeters: Number(depthEnd.toFixed(2)),
    });
  }

  return {
    referenceSide: EQUIPMENT_SIDE,
    equipmentOffsetMeters: Number((poolWidth / 2).toFixed(2)),
    equipmentHeightFromZero: 0,
    equipmentBaseHeightFromFloor: 0,
    equipmentWorkspaceLayout: buildDefaultEquipmentWorkspaceLayout(),
    points,
  };
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const HydraulicCssPreview: React.FC<{
  project: Project;
  hydraulicLayout: HydraulicLayoutDraft;
  distanceToEquipment: number;
  activePointId?: string | null;
  onPointSelect?: (pointId: string) => void;
  onPointMove?: (pointId: string, updates: Partial<HydraulicPointDraft>) => void;
  onEquipmentMove?: (updates: { referenceSide: HydraulicReferenceSide; equipmentOffsetMeters: number; distanceToEquipment: number }) => void;
  onInteractionCommit?: () => void;
  onOpenEquipmentWorkspace?: () => void;
}> = ({ project, hydraulicLayout, distanceToEquipment, activePointId, onPointSelect, onPointMove, onEquipmentMove, onInteractionCommit, onOpenEquipmentWorkspace }) => {
  const preset = project.poolPreset;
  const poolLength = preset?.length || 8;
  const poolWidth = preset?.width || 4;
  const depthStart = preset?.depth || 1.4;
  const shellRef = React.useRef<SVGSVGElement>(null);
  const dragPointIdRef = React.useRef<string | null>(null);
  const dragEquipmentRef = React.useRef(false);
  const dragWorkspaceRef = React.useRef<{ startClientX: number; startClientY: number; startPanX: number; startPanY: number } | null>(null);
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [workspaceZoom, setWorkspaceZoom] = useState(1);
  const [workspacePan, setWorkspacePan] = useState({ x: 0, y: 0 });
  const [isPanMode, setIsPanMode] = useState(false);
  const SVG_W = 960;
  const SVG_H = 700;
  const PAD_X = 140;
  const PAD_Y = 90;
  const drawW = SVG_W - PAD_X * 2;
  const drawH = SVG_H - PAD_Y * 2;
  const scale = Math.min(drawW / Math.max(poolLength, 0.01), drawH / Math.max(poolWidth, 0.01));
  const metersToSvg = React.useCallback((meters: number) => meters * scale, [scale]);
  const poolW = poolLength * scale;
  const poolH = poolWidth * scale;
  const poolX = (SVG_W - poolW) / 2;
  const poolY = (SVG_H - poolH) / 2;
  const oppositeSideDepth = Math.min(metersToSvg(1), poolW * 0.35);
  const oppositeSideHalfH = poolH / 2;
  const internalWallSpanMeters = 1;
  const internalWallXStart = poolX + poolW - oppositeSideDepth;
  const internalWallXEnd = poolX + poolW;
  const internalWallY = poolY + oppositeSideHalfH;
  const workspaceMarginX = Math.max(metersToSvg(4.8), 280);
  const workspaceMarginY = Math.max(metersToSvg(3.4), 220);
  const workspaceMinX = -workspaceMarginX;
  const workspaceMinY = -workspaceMarginY;
  const workspaceW = SVG_W + workspaceMarginX * 2;
  const workspaceH = SVG_H + workspaceMarginY * 2;
  const equipmentSideSpan = getSideSpanMeters(hydraulicLayout.referenceSide, poolLength, poolWidth);
  const equipmentOffsetRatio = clamp(hydraulicLayout.equipmentOffsetMeters / Math.max(equipmentSideSpan, 0.01), 0, 1);
  const viewBoxW = workspaceW / workspaceZoom;
  const viewBoxH = workspaceH / workspaceZoom;
  const centeredViewBoxX = workspaceMinX + (workspaceW - viewBoxW) / 2;
  const centeredViewBoxY = workspaceMinY + (workspaceH - viewBoxH) / 2;
  const viewBoxX = clamp(centeredViewBoxX + workspacePan.x, workspaceMinX, workspaceMinX + workspaceW - viewBoxW);
  const viewBoxY = clamp(centeredViewBoxY + workspacePan.y, workspaceMinY, workspaceMinY + workspaceH - viewBoxH);
  const hydraulicSummary = React.useMemo(
    () => summarizeHydraulicSystem(project, getProjectAdditionals(project)),
    [project]
  );
  const equipmentWorkspaceModules = React.useMemo(
    () => buildEquipmentWorkspaceModules(project, hydraulicSummary),
    [project, hydraulicSummary]
  );
  const hasHydroPumpModule = equipmentWorkspaceModules.some((module) => module.kind === 'pump' && module.circuit === 'hydrojet');

  const colors: Record<HydraulicPointKind, { dot: string; ring: string; glow: string }> = {
    skimmer: { dot: '#38bdf8', ring: 'rgba(56, 189, 248, 0.28)', glow: '0 0 0 7px rgba(56, 189, 248, 0.16)' },
    return: { dot: '#34d399', ring: 'rgba(52, 211, 153, 0.28)', glow: '0 0 0 7px rgba(52, 211, 153, 0.16)' },
    hydrojet: { dot: '#f59e0b', ring: 'rgba(245, 158, 11, 0.3)', glow: '0 0 0 7px rgba(245, 158, 11, 0.16)' },
    hydrojet_suction: { dot: '#f97316', ring: 'rgba(249, 115, 22, 0.3)', glow: '0 0 0 7px rgba(249, 115, 22, 0.16)' },
    vacuum: { dot: '#e879f9', ring: 'rgba(232, 121, 249, 0.3)', glow: '0 0 0 7px rgba(232, 121, 249, 0.16)' },
    bottom_drain: { dot: '#f87171', ring: 'rgba(248, 113, 113, 0.3)', glow: '0 0 0 7px rgba(248, 113, 113, 0.16)' },
  };

  const pointToSvg = React.useCallback((point: HydraulicPointDraft) => {
    if (point.side === 'internal_wall') {
      const ratio = clamp(point.offsetMeters / Math.max(internalWallSpanMeters, 0.01), 0, 1);
      return {
        x: internalWallXEnd - oppositeSideDepth * ratio,
        y: internalWallY,
      };
    }

    const ratio = clamp(
      point.offsetMeters / Math.max(point.side === 'north' || point.side === 'south' ? poolWidth : poolLength, 0.01),
      0,
      1
    );

    if (point.side === 'north') return { x: poolX, y: poolY + poolH * ratio };
    if (point.side === 'south') return { x: poolX + poolW, y: poolY + poolH * ratio };
    if (point.side === 'east') return { x: poolX + poolW * ratio, y: poolY };
    return { x: poolX + poolW * ratio, y: poolY + poolH };
  }, [internalWallSpanMeters, internalWallXEnd, internalWallY, oppositeSideDepth, poolH, poolW, poolX, poolY, poolLength, poolWidth]);

  const equipmentDistanceSvg = Math.max(metersToSvg(distanceToEquipment), metersToSvg(0.8));
  const equipmentAnchor = hydraulicLayout.referenceSide === 'north'
    ? { x: poolX - equipmentDistanceSvg, y: poolY + poolH * equipmentOffsetRatio }
    : hydraulicLayout.referenceSide === 'south'
      ? { x: poolX + poolW + equipmentDistanceSvg, y: poolY + poolH * equipmentOffsetRatio }
      : hydraulicLayout.referenceSide === 'east'
        ? { x: poolX + poolW * equipmentOffsetRatio, y: poolY - equipmentDistanceSvg }
        : { x: poolX + poolW * equipmentOffsetRatio, y: poolY + poolH + equipmentDistanceSvg };
  const equipmentSymbolRadius = Math.max(metersToSvg(0.48), 40);

  const pointPipeRoute = React.useCallback((point: HydraulicPointDraft) => {
    const pos = pointToSvg(point);
    const match = point.id.match(/-(\d+)$/);
    const sequence = match ? Number(match[1]) - 1 : 0;
    const laneMeters = 0.65 + PIPE_LANE_ORDER[point.kind] * 0.18 + sequence * 0.08;
    const outsideGap = Math.max(metersToSvg(laneMeters), 44);
    const outerLeft = poolX - outsideGap;
    const outerRight = poolX + poolW + outsideGap;
    const outerTop = poolY - outsideGap;
    const outerBottom = poolY + poolH + outsideGap;

    const exitPoint =
      point.side === 'north'
        ? { x: outerLeft, y: pos.y }
        : point.side === 'south'
          ? { x: outerRight, y: pos.y }
          : point.side === 'east'
            ? { x: pos.x, y: outerTop }
            : point.side === 'west'
              ? { x: pos.x, y: outerBottom }
              : { x: outerRight, y: pos.y };

    const route = [pos, exitPoint];

    if (point.side === 'internal_wall') {
      route.push({ x: outerRight, y: pos.y });
      route.push({ x: outerRight, y: equipmentAnchor.y });
    } else if (
      (point.side === 'north' && hydraulicLayout.referenceSide === 'south') ||
      (point.side === 'south' && hydraulicLayout.referenceSide === 'north')
    ) {
      const useTop = ((pos.y + equipmentAnchor.y) / 2) < (poolY + poolH / 2);
      const perimeterY = useTop ? outerTop : outerBottom;
      route.push({ x: exitPoint.x, y: perimeterY });
      route.push({ x: hydraulicLayout.referenceSide === 'north' ? outerLeft : outerRight, y: perimeterY });
      route.push({ x: hydraulicLayout.referenceSide === 'north' ? outerLeft : outerRight, y: equipmentAnchor.y });
    } else if (
      (point.side === 'east' && hydraulicLayout.referenceSide === 'west') ||
      (point.side === 'west' && hydraulicLayout.referenceSide === 'east')
    ) {
      const useLeft = ((pos.x + equipmentAnchor.x) / 2) < (poolX + poolW / 2);
      const perimeterX = useLeft ? outerLeft : outerRight;
      route.push({ x: perimeterX, y: exitPoint.y });
      route.push({ x: perimeterX, y: hydraulicLayout.referenceSide === 'east' ? outerTop : outerBottom });
      route.push({ x: equipmentAnchor.x, y: hydraulicLayout.referenceSide === 'east' ? outerTop : outerBottom });
    } else if (point.side !== hydraulicLayout.referenceSide) {
      if (
        (point.side === 'east' && hydraulicLayout.referenceSide === 'north') ||
        (point.side === 'north' && hydraulicLayout.referenceSide === 'east')
      ) {
        route.push({ x: outerLeft, y: outerTop });
      } else if (
        (point.side === 'east' && hydraulicLayout.referenceSide === 'south') ||
        (point.side === 'south' && hydraulicLayout.referenceSide === 'east')
      ) {
        route.push({ x: outerRight, y: outerTop });
      } else if (
        (point.side === 'west' && hydraulicLayout.referenceSide === 'north') ||
        (point.side === 'north' && hydraulicLayout.referenceSide === 'west')
      ) {
        route.push({ x: outerLeft, y: outerBottom });
      } else if (
        (point.side === 'west' && hydraulicLayout.referenceSide === 'south') ||
        (point.side === 'south' && hydraulicLayout.referenceSide === 'west')
      ) {
        route.push({ x: outerRight, y: outerBottom });
      }
    }

    if (hydraulicLayout.referenceSide === 'north' || hydraulicLayout.referenceSide === 'south') {
      route.push({ x: hydraulicLayout.referenceSide === 'north' ? outerLeft : outerRight, y: equipmentAnchor.y });
    } else {
      route.push({ x: equipmentAnchor.x, y: hydraulicLayout.referenceSide === 'east' ? outerTop : outerBottom });
    }

    route.push(equipmentAnchor);
    return route;
  }, [equipmentAnchor, hydraulicLayout.referenceSide, metersToSvg, pointToSvg, poolH, poolW, poolX, poolY]);

  const collectorRouteToEquipment = React.useCallback((start: { x: number; y: number }, kind: HydraulicPointKind) => {
    const laneMeters = kind === 'hydrojet' ? 1.45 : 1.05;
    const outsideGap = Math.max(metersToSvg(laneMeters), kind === 'hydrojet' ? 74 : 58);
    const outerLeft = poolX - outsideGap;
    const outerRight = poolX + poolW + outsideGap;
    const outerTop = poolY - outsideGap;
    const outerBottom = poolY + poolH + outsideGap;
    const route = [start];

    if (hydraulicLayout.referenceSide === 'south') {
      route.push({ x: Math.max(start.x, outerRight), y: start.y });
      route.push({ x: Math.max(start.x, outerRight), y: equipmentAnchor.y });
    } else if (hydraulicLayout.referenceSide === 'north') {
      const perimeterY = start.y <= poolY + poolH / 2 ? outerTop : outerBottom;
      route.push({ x: Math.max(start.x, outerRight), y: perimeterY });
      route.push({ x: outerLeft, y: perimeterY });
      route.push({ x: outerLeft, y: equipmentAnchor.y });
    } else if (hydraulicLayout.referenceSide === 'east') {
      route.push({ x: start.x, y: outerTop });
      route.push({ x: equipmentAnchor.x, y: outerTop });
    } else {
      route.push({ x: start.x, y: outerBottom });
      route.push({ x: equipmentAnchor.x, y: outerBottom });
    }

    route.push(equipmentAnchor);
    return route;
  }, [equipmentAnchor, hydraulicLayout.referenceSide, metersToSvg, poolH, poolW, poolX, poolY]);

  const returnPoints = hydraulicLayout.points
    .filter((point) => point.kind === 'return')
    .sort((a, b) => a.offsetMeters - b.offsetMeters);
  const returnCollectorGap = Math.max(metersToSvg(1.05), 58);
  const returnCollectorX = poolX + poolW + returnCollectorGap;
  const returnCollectorNodes = returnPoints.map((point) => ({
    point,
    pos: pointToSvg(point),
  }));
  const returnCollectorAnchor =
    returnCollectorNodes.find(({ point }) => point.id === 'return-4') ||
    returnCollectorNodes[Math.min(3, Math.max(returnCollectorNodes.length - 1, 0))] ||
    null;
  const returnCollectorStartY = returnCollectorNodes.length > 0 ? Math.min(...returnCollectorNodes.map(({ pos }) => pos.y)) : null;
  const returnCollectorEndY = returnCollectorNodes.length > 0 ? Math.max(...returnCollectorNodes.map(({ pos }) => pos.y)) : null;
  const returnCollectorRoute = returnCollectorAnchor
    ? collectorRouteToEquipment({ x: returnCollectorX, y: returnCollectorAnchor.pos.y }, 'return')
    : [];
  const hydrojetPoints = hydraulicLayout.points
    .filter((point) => point.kind === 'hydrojet')
    .sort((a, b) => a.offsetMeters - b.offsetMeters);
  const hydrojetCollectorGap = Math.max(metersToSvg(1.45), 74);
  const hydrojetCollectorX = poolX + poolW + hydrojetCollectorGap;
  const hydrojetCollectorNodes = hydrojetPoints.map((point) => ({
    point,
    pos: pointToSvg(point),
  }));
  const hydrojetCollectorAnchor =
    hydrojetCollectorNodes.find(({ point }) => point.id === 'hydrojet-4') ||
    hydrojetCollectorNodes[Math.min(3, Math.max(hydrojetCollectorNodes.length - 1, 0))] ||
    null;
  const hydrojetCollectorStartY = hydrojetCollectorNodes.length > 0 ? Math.min(...hydrojetCollectorNodes.map(({ pos }) => pos.y)) : null;
  const hydrojetCollectorEndY = hydrojetCollectorNodes.length > 0 ? Math.max(...hydrojetCollectorNodes.map(({ pos }) => pos.y)) : null;
  const hydrojetCollectorRoute = hydrojetCollectorAnchor
    ? collectorRouteToEquipment({ x: hydrojetCollectorX, y: hydrojetCollectorAnchor.pos.y }, 'hydrojet')
    : [];
  const projectPointerToEquipment = React.useCallback((clientX: number, clientY: number) => {
    const shell = shellRef.current;
    if (!shell) return null;

    const rect = shell.getBoundingClientRect();
    const svgX = viewBoxX + ((clientX - rect.left) / Math.max(rect.width, 1)) * viewBoxW;
    const svgY = viewBoxY + ((clientY - rect.top) / Math.max(rect.height, 1)) * viewBoxH;
    const distances = [
      { side: 'north' as HydraulicReferenceSide, value: Math.abs(svgX - poolX) },
      { side: 'south' as HydraulicReferenceSide, value: Math.abs(svgX - (poolX + poolW)) },
      { side: 'east' as HydraulicReferenceSide, value: Math.abs(svgY - poolY) },
      { side: 'west' as HydraulicReferenceSide, value: Math.abs(svgY - (poolY + poolH)) },
    ];
    const nearest = distances.reduce((best, current) => current.value < best.value ? current : best, distances[0]);

    if (nearest.side === 'north' || nearest.side === 'south') {
      const clampedY = clamp(svgY, poolY, poolY + poolH);
      const offsetMeters = Number((((clampedY - poolY) / Math.max(poolH, 1)) * poolWidth).toFixed(2));
      const distanceMeters = Number(Math.max(Math.abs(svgX - (nearest.side === 'north' ? poolX : poolX + poolW)) / scale, 0.6).toFixed(2));
      return { referenceSide: nearest.side, equipmentOffsetMeters: offsetMeters, distanceToEquipment: distanceMeters };
    }

    const clampedX = clamp(svgX, poolX, poolX + poolW);
    const offsetMeters = Number((((clampedX - poolX) / Math.max(poolW, 1)) * poolLength).toFixed(2));
    const distanceMeters = Number(Math.max(Math.abs(svgY - (nearest.side === 'east' ? poolY : poolY + poolH)) / scale, 0.6).toFixed(2));
    return { referenceSide: nearest.side, equipmentOffsetMeters: offsetMeters, distanceToEquipment: distanceMeters };
  }, [poolH, poolLength, poolW, poolWidth, poolX, poolY, scale, viewBoxH, viewBoxW, viewBoxX, viewBoxY]);

  const projectPointerToPoint = React.useCallback((clientX: number, clientY: number) => {
    const shell = shellRef.current;
    if (!shell) return null;

    const rect = shell.getBoundingClientRect();
    const x = clamp(viewBoxX + ((clientX - rect.left) / Math.max(rect.width, 1)) * viewBoxW, poolX, poolX + poolW);
    const y = clamp(viewBoxY + ((clientY - rect.top) / Math.max(rect.height, 1)) * viewBoxH, poolY, poolY + poolH);
    const isNearInternalWall =
      x >= internalWallXStart - 18 &&
      x <= internalWallXEnd + 18 &&
      Math.abs(y - internalWallY) <= 26;

    if (isNearInternalWall) {
      const clampedX = clamp(x, internalWallXStart, internalWallXEnd);
      return {
        side: 'internal_wall',
        offsetMeters: Number((((internalWallXEnd - clampedX) / Math.max(oppositeSideDepth, 1)) * internalWallSpanMeters).toFixed(2)),
      };
    }

    const distances = [
      { side: 'north' as HydraulicReferenceSide, value: Math.abs(x - poolX) },
      { side: 'south' as HydraulicReferenceSide, value: Math.abs(x - (poolX + poolW)) },
      { side: 'east' as HydraulicReferenceSide, value: Math.abs(y - poolY) },
      { side: 'west' as HydraulicReferenceSide, value: Math.abs(y - (poolY + poolH)) },
      {
        side: 'internal_wall' as HydraulicPointSide,
        value: x >= internalWallXStart - 12 && x <= internalWallXEnd + 12
          ? Math.abs(y - internalWallY)
          : Number.POSITIVE_INFINITY,
      },
    ];
    const nearest = distances.reduce((best, current) => current.value < best.value ? current : best, distances[0]);

    if (nearest.side === 'north' || nearest.side === 'south') {
      return {
        side: nearest.side,
        offsetMeters: Number((((y - poolY) / Math.max(poolH, 1)) * poolWidth).toFixed(2)),
      };
    }

    if (nearest.side === 'internal_wall') {
      const clampedX = clamp(x, internalWallXStart, internalWallXEnd);
      return {
        side: 'internal_wall',
        offsetMeters: Number((((internalWallXEnd - clampedX) / Math.max(oppositeSideDepth, 1)) * internalWallSpanMeters).toFixed(2)),
      };
    }

    return {
      side: nearest.side,
      offsetMeters: Number((((x - poolX) / Math.max(poolW, 1)) * poolLength).toFixed(2)),
    };
  }, [internalWallSpanMeters, internalWallXEnd, internalWallXStart, internalWallY, oppositeSideDepth, poolH, poolLength, poolW, poolWidth, poolX, poolY, viewBoxH, viewBoxW, viewBoxX, viewBoxY]);

  React.useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (dragWorkspaceRef.current) {
        const deltaX = ((dragWorkspaceRef.current.startClientX - event.clientX) / Math.max(shellRef.current?.getBoundingClientRect().width || 1, 1)) * viewBoxW;
        const deltaY = ((dragWorkspaceRef.current.startClientY - event.clientY) / Math.max(shellRef.current?.getBoundingClientRect().height || 1, 1)) * viewBoxH;
        setWorkspacePan({
          x: dragWorkspaceRef.current.startPanX + deltaX,
          y: dragWorkspaceRef.current.startPanY + deltaY,
        });
        return;
      }

      if (dragPointIdRef.current && onPointMove) {
        const projected = projectPointerToPoint(event.clientX, event.clientY);
        if (!projected) return;
        onPointMove(dragPointIdRef.current, projected);
        return;
      }

      if (dragEquipmentRef.current && onEquipmentMove) {
        const projectedEquipment = projectPointerToEquipment(event.clientX, event.clientY);
        if (!projectedEquipment) return;
        onEquipmentMove(projectedEquipment);
      }
    };

    const stopDragging = () => {
      const shouldCommit = Boolean(dragPointIdRef.current || dragEquipmentRef.current);
      dragPointIdRef.current = null;
      dragEquipmentRef.current = false;
      dragWorkspaceRef.current = null;
      if (shouldCommit) {
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
  }, [onEquipmentMove, onInteractionCommit, onPointMove, projectPointerToEquipment, projectPointerToPoint, viewBoxH, viewBoxW]);

  const sideBreakdown = POINT_SIDE_OPTIONS.map((side) => ({
    side,
    points: hydraulicLayout.points.filter((point) => point.side === side.value),
  }));

  return (
    <div className={`grid gap-4 ${showSidePanel ? 'xl:grid-cols-[minmax(0,1fr)_300px]' : 'grid-cols-1'}`}>
      <div className="rounded-[28px] border border-zinc-800 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_34%),linear-gradient(145deg,#050816,#0b1120_50%,#111827)] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.42)]">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/70">Vista CSS / CAD</p>
            <h4 className="mt-1 text-lg font-semibold text-white">Planta hidráulica inmersiva</h4>
            <p className="mt-1 max-w-xl text-sm text-zinc-400">La cabecera se mueve por lateral, los puntos respetan su posición y la escena responde a la geometría cargada.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/70">Referencia</p>
              <p className="mt-1 text-sm font-semibold text-white">{SIDE_LABELS[hydraulicLayout.referenceSide]}</p>
              <p className="text-xs text-zinc-400">Distancia {distanceToEquipment.toFixed(2)} m</p>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-950 px-3 py-2">
              <button
                type="button"
                onClick={() => setWorkspaceZoom((prev) => clamp(Number((prev - 0.2).toFixed(2)), 1, 2.4))}
                className="rounded border border-zinc-700 px-2 py-1 text-sm text-zinc-200 hover:border-zinc-500"
              >
                -
              </button>
              <span className="min-w-[56px] text-center text-sm font-medium text-white">{Math.round(workspaceZoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setWorkspaceZoom((prev) => clamp(Number((prev + 0.2).toFixed(2)), 1, 2.4))}
                className="rounded border border-zinc-700 px-2 py-1 text-sm text-zinc-200 hover:border-zinc-500"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => {
                  setWorkspaceZoom(1);
                  setWorkspacePan({ x: 0, y: 0 });
                }}
                className="rounded border border-zinc-700 px-2 py-1 text-sm text-zinc-200 hover:border-zinc-500"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setIsPanMode((prev) => !prev)}
                className={`rounded border px-2 py-1 text-sm ${
                  isPanMode
                    ? 'border-cyan-400 bg-cyan-400/15 text-cyan-100'
                    : 'border-zinc-700 text-zinc-200 hover:border-zinc-500'
                }`}
              >
                {isPanMode ? 'Mover vista: ON' : 'Mover vista'}
              </button>
              <button
                type="button"
                onClick={() => setShowSidePanel((prev) => !prev)}
                className="rounded border border-zinc-700 px-2 py-1 text-sm text-zinc-200 hover:border-zinc-500"
              >
                {showSidePanel ? 'Ocultar panel' : 'Mostrar panel'}
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[#020617]">
          <svg
            ref={shellRef}
            viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxW} ${viewBoxH}`}
            className={`block h-auto w-full ${isPanMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
            onPointerDown={(event) => {
              if (!isPanMode) return;
              if (event.target !== event.currentTarget) return;
              event.preventDefault();
              dragWorkspaceRef.current = {
                startClientX: event.clientX,
                startClientY: event.clientY,
                startPanX: workspacePan.x,
                startPanY: workspacePan.y,
              };
            }}
          >
            <defs>
              <pattern id="hyd-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                <path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
              </pattern>
              <linearGradient id="pool-water" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.85" />
                <stop offset="70%" stopColor="#1d4ed8" stopOpacity="0.88" />
                <stop offset="100%" stopColor="#172554" stopOpacity="0.95" />
              </linearGradient>
            </defs>

            <rect
              x={workspaceMinX}
              y={workspaceMinY}
              width={workspaceW}
              height={workspaceH}
              fill="url(#hyd-grid)"
              opacity="0.45"
              onPointerDown={(event) => {
                if (!isPanMode) return;
                event.preventDefault();
                event.stopPropagation();
                dragWorkspaceRef.current = {
                  startClientX: event.clientX,
                  startClientY: event.clientY,
                  startPanX: workspacePan.x,
                  startPanY: workspacePan.y,
                };
              }}
            />

            <text x={poolX - 70} y={poolY + poolH / 2} fill="#d4d4d8" fontSize="14" fontWeight="700" textAnchor="middle" transform={`rotate(-90 ${poolX - 70} ${poolY + poolH / 2})`}>
              NORTE
            </text>
            <text x={poolX + poolW + 70} y={poolY + poolH / 2} fill="#d4d4d8" fontSize="14" fontWeight="700" textAnchor="middle" transform={`rotate(90 ${poolX + poolW + 70} ${poolY + poolH / 2})`}>
              SUR
            </text>
            <text x={poolX + poolW / 2} y={poolY - 44} fill="#d4d4d8" fontSize="14" fontWeight="700" textAnchor="middle">
              ESTE
            </text>
            <text x={poolX + poolW / 2} y={poolY + poolH + 54} fill="#d4d4d8" fontSize="14" fontWeight="700" textAnchor="middle">
              OESTE
            </text>

            <rect x={poolX} y={poolY} width={poolW} height={poolH} fill="url(#pool-water)" stroke="rgba(224,242,254,0.9)" strokeWidth="3" />
            <rect x={poolX + 14} y={poolY + 14} width={poolW - 28} height={poolH - 28} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />

            <rect
              x={poolX + poolW - oppositeSideDepth}
              y={poolY + oppositeSideHalfH}
              width={oppositeSideDepth}
              height={oppositeSideHalfH}
              fill="rgba(224,242,254,0.18)"
              stroke="rgba(224,242,254,0.4)"
              strokeWidth="1.5"
            />
            <text x={poolX + poolW - oppositeSideDepth + 12} y={poolY + oppositeSideHalfH + 24} fill="#e0f2fe" fontSize="12" fontWeight="700">
              PLAYA HUMEDA
            </text>

            <rect
              x={poolX + poolW - oppositeSideDepth}
              y={poolY}
              width={oppositeSideDepth}
              height={oppositeSideHalfH}
              fill="rgba(240,249,255,0.16)"
              stroke="rgba(224,242,254,0.4)"
              strokeWidth="1.5"
            />
            <line
              x1={internalWallXStart}
              y1={internalWallY}
              x2={internalWallXEnd}
              y2={internalWallY}
              stroke="rgba(224,242,254,0.95)"
              strokeWidth="2.4"
              strokeDasharray="10 6"
            />
            {[0, 1, 2].map((step) => {
              const treadInset = (2 - step) * 14;
              const stepX = poolX + poolW - oppositeSideDepth + treadInset;
              const stepW = oppositeSideDepth - treadInset;
              return (
                <g key={step}>
                  <rect
                    x={stepX}
                    y={poolY}
                    width={stepW}
                    height={oppositeSideHalfH}
                    rx="2"
                    fill="rgba(255,255,255,0.16)"
                    stroke="rgba(224,242,254,0.68)"
                    strokeWidth="1.6"
                  />
                  <line
                    x1={stepX}
                    y1={poolY}
                    x2={stepX}
                    y2={poolY + oppositeSideHalfH}
                    stroke="rgba(224,242,254,0.9)"
                    strokeWidth="1.8"
                  />
                  <rect
                    x={stepX}
                    y={poolY}
                    width="5"
                    height={oppositeSideHalfH}
                    fill="rgba(8,47,73,0.32)"
                  />
                </g>
              );
            })}
            <text x={poolX + poolW - oppositeSideDepth + 12} y={poolY + 24} fill="#e0f2fe" fontSize="12" fontWeight="700">
              ESCALERAS
            </text>

            <line x1={hydraulicLayout.referenceSide === 'north' ? poolX : hydraulicLayout.referenceSide === 'south' ? poolX + poolW : equipmentAnchor.x}
              y1={hydraulicLayout.referenceSide === 'east' ? poolY : hydraulicLayout.referenceSide === 'west' ? poolY + poolH : equipmentAnchor.y}
              x2={equipmentAnchor.x}
              y2={equipmentAnchor.y}
              stroke="#fbbf24"
              strokeWidth="4"
              strokeDasharray="10 8"
              strokeLinecap="round"
            />

            <g
              style={{ cursor: 'grab' }}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                dragEquipmentRef.current = true;
              }}
              onDoubleClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onOpenEquipmentWorkspace?.();
              }}
            >
              <circle
                cx={equipmentAnchor.x}
                cy={equipmentAnchor.y}
                r={equipmentSymbolRadius + 10}
                fill="rgba(245,158,11,0.08)"
                stroke="rgba(252,211,77,0.22)"
                strokeWidth="2"
              />
              <circle
                cx={equipmentAnchor.x}
                cy={equipmentAnchor.y}
                r={equipmentSymbolRadius}
                fill="rgba(24,24,27,0.96)"
                stroke="rgba(245,158,11,0.55)"
                strokeWidth="2.4"
              />
              <polygon
                points={`${equipmentAnchor.x - equipmentSymbolRadius * 0.42},${equipmentAnchor.y + equipmentSymbolRadius * 0.52} ${equipmentAnchor.x - equipmentSymbolRadius * 0.42},${equipmentAnchor.y - equipmentSymbolRadius * 0.52} ${equipmentAnchor.x + equipmentSymbolRadius * 0.62},${equipmentAnchor.y}`}
                fill="rgba(245,158,11,0.92)"
                stroke="#fef3c7"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <text x={equipmentAnchor.x} y={equipmentAnchor.y + equipmentSymbolRadius + 20} fill="#fff" fontSize="16" fontWeight="700" textAnchor="middle">Equipo</text>
              <text x={equipmentAnchor.x} y={equipmentAnchor.y + equipmentSymbolRadius + 40} fill="#d4d4d8" fontSize="12" textAnchor="middle">
                {SIDE_LABELS[hydraulicLayout.referenceSide]} · {distanceToEquipment.toFixed(1)} m
              </text>
              <text x={equipmentAnchor.x} y={equipmentAnchor.y - equipmentSymbolRadius - 16} fill="#fde68a" fontSize="10" fontWeight="700" textAnchor="middle">
                Doble click para expandir
              </text>
            </g>

            {returnCollectorStartY !== null && returnCollectorEndY !== null && (
              <g>
                {returnCollectorNodes.map(({ point, pos }) => {
                  const isActive = activePointId === point.id;
                  const isCollectorAnchor = returnCollectorAnchor?.point.id === point.id;
                  return (
                    isCollectorAnchor ? null : (
                      <line
                        key={`return-branch-${point.id}`}
                        x1={pos.x}
                        y1={pos.y}
                        x2={returnCollectorX}
                        y2={pos.y}
                        stroke={colors.return.dot}
                        strokeOpacity={isActive ? 1 : 0.5}
                        strokeWidth={isActive ? 2.8 : 1.8}
                        strokeLinecap="round"
                      />
                    )
                  );
                })}
                <line
                  x1={returnCollectorX}
                  y1={returnCollectorStartY}
                  x2={returnCollectorX}
                  y2={returnCollectorEndY}
                  stroke={colors.return.dot}
                  strokeOpacity="0.85"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
                {returnCollectorAnchor && (
                  <line
                    x1={returnCollectorAnchor.pos.x}
                    y1={returnCollectorAnchor.pos.y}
                    x2={returnCollectorX}
                    y2={returnCollectorAnchor.pos.y}
                    stroke={colors.return.dot}
                    strokeOpacity="1"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                )}
                <polyline
                  points={returnCollectorRoute.map((node) => `${node.x},${node.y}`).join(' ')}
                  fill="none"
                  stroke={colors.return.dot}
                  strokeOpacity="0.85"
                  strokeWidth="2.4"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </g>
            )}

            {hydrojetCollectorStartY !== null && hydrojetCollectorEndY !== null && (
              <g>
                {hydrojetCollectorNodes.map(({ point, pos }) => {
                  const isActive = activePointId === point.id;
                  const isCollectorAnchor = hydrojetCollectorAnchor?.point.id === point.id;
                  return (
                    isCollectorAnchor ? null : (
                      <line
                        key={`hydrojet-branch-${point.id}`}
                        x1={pos.x}
                        y1={pos.y}
                        x2={hydrojetCollectorX}
                        y2={pos.y}
                        stroke={colors.hydrojet.dot}
                        strokeOpacity={isActive ? 1 : 0.5}
                        strokeWidth={isActive ? 2.8 : 1.8}
                        strokeLinecap="round"
                      />
                    )
                  );
                })}
                <line
                  x1={hydrojetCollectorX}
                  y1={hydrojetCollectorStartY}
                  x2={hydrojetCollectorX}
                  y2={hydrojetCollectorEndY}
                  stroke={colors.hydrojet.dot}
                  strokeOpacity="0.85"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
                {hydrojetCollectorAnchor && (
                  <line
                    x1={hydrojetCollectorAnchor.pos.x}
                    y1={hydrojetCollectorAnchor.pos.y}
                    x2={hydrojetCollectorX}
                    y2={hydrojetCollectorAnchor.pos.y}
                    stroke={colors.hydrojet.dot}
                    strokeOpacity="1"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                )}
                <polyline
                  points={hydrojetCollectorRoute.map((node) => `${node.x},${node.y}`).join(' ')}
                  fill="none"
                  stroke={colors.hydrojet.dot}
                  strokeOpacity="0.85"
                  strokeWidth="2.4"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </g>
            )}

            {hydraulicLayout.points.map((point) => {
              const palette = colors[point.kind];
              const pos = pointToSvg(point);
              const route = pointPipeRoute(point);
              const isActive = activePointId === point.id;
              return (
                <g key={point.id}>
                  {point.kind !== 'return' && point.kind !== 'hydrojet' && (
                    <polyline
                      points={route.map((node) => `${node.x},${node.y}`).join(' ')}
                      fill="none"
                      stroke={palette.dot}
                      strokeOpacity={isActive ? 1 : 0.42}
                      strokeWidth={isActive ? 2.8 : 1.8}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  )}
                  <circle cx={pos.x} cy={pos.y} r={isActive ? 12 : 9} fill="transparent" stroke={palette.ring} strokeWidth="1.5" />
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={isActive ? 6 : 5}
                    fill={palette.dot}
                    stroke="#fff"
                    strokeWidth="1.5"
                    style={{ cursor: 'grab' }}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      dragPointIdRef.current = point.id;
                      onPointSelect?.(point.id);
                    }}
                    onClick={() => onPointSelect?.(point.id)}
                  />
                  {isActive && (
                    <text x={pos.x + 12} y={pos.y - 10} fill="#fff" fontSize="12" fontWeight="700">
                      {point.label}
                    </text>
                  )}
                </g>
              );
            })}

            <text x={poolX + 18} y={poolY + 26} fill="#ecfeff" fontSize="13" fontWeight="700">
              {poolLength.toFixed(2)} m x {poolWidth.toFixed(2)} m
            </text>
          </svg>
        </div>
      </div>

      {showSidePanel && <div className="space-y-4">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Laterales</p>
          <div className="mt-4 space-y-3">
            {sideBreakdown.map(({ side, points }) => (
              <div key={side.value} className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-white">{side.label}</p>
                  <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">{points.length} punto(s)</span>
                </div>
                {points.length === 0 ? (
                  <p className="mt-2 text-sm text-zinc-500">Sin carga técnica.</p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {points.map((point) => (
                      <span
                        key={point.id}
                        className="inline-flex items-center gap-2 rounded-full border bg-zinc-950/80 px-3 py-1 text-xs text-zinc-200"
                        style={{ borderColor: colors[point.kind].ring }}
                      >
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[point.kind].dot }} />
                        {POINT_KIND_LABELS[point.kind]} {point.offsetMeters.toFixed(1)} m
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Leyenda</p>
          <div className="mt-4 space-y-3">
            {(Object.keys(POINT_KIND_LABELS) as HydraulicPointKind[]).map((kind) => (
              <div key={kind} className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 px-3 py-2">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: colors[kind].dot, boxShadow: colors[kind].glow }} />
                  <span className="text-sm text-zinc-200">{POINT_KIND_LABELS[kind]}</span>
                </div>
                <span className="text-xs text-zinc-500">{hydraulicLayout.points.filter((point) => point.kind === kind).length}</span>
              </div>
            ))}
          </div>
        </div>
      </div>}
    </div>
  );
};

const HydraulicLayoutPreview: React.FC<{
  project: Project;
  hydraulicLayout: HydraulicLayoutDraft;
  distanceToEquipment: number;
}> = ({ project, hydraulicLayout, distanceToEquipment }) => {
  const [selectedSide, setSelectedSide] = useState<HydraulicReferenceSide>(hydraulicLayout.referenceSide);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(hydraulicLayout.points[0]?.id || null);
  const planCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const profileCanvasRef = React.useRef<HTMLCanvasElement>(null);

  const colors: Record<HydraulicPointKind, string> = {
    skimmer: '#38bdf8',
    return: '#34d399',
    hydrojet: '#f59e0b',
    hydrojet_suction: '#f97316',
    vacuum: '#e879f9',
    bottom_drain: '#f87171',
  };

  useEffect(() => {
    setSelectedSide(hydraulicLayout.referenceSide);
  }, [hydraulicLayout.referenceSide]);

  useEffect(() => {
    const sidePoints = hydraulicLayout.points.filter((point) => point.side === selectedSide);
    if (sidePoints.length === 0) {
      setSelectedPointId(null);
      return;
    }
    if (!selectedPointId || !sidePoints.some((point) => point.id === selectedPointId)) {
      setSelectedPointId(sidePoints[0].id);
    }
  }, [hydraulicLayout.points, selectedSide, selectedPointId]);

  useEffect(() => {
    const canvas = planCanvasRef.current;
    if (!canvas) return;

    const W = 920, H = 620;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const preset = project.poolPreset;
    const poolLength = preset?.length || 8;
    const poolWidth = preset?.width || 4;
    const MONO = '"Courier New", monospace';
    const WALL_T = 12;
    const TB_H = 52;
    const HDR_H = 68;

    const drawLeft = 56, drawTop = HDR_H, drawRight = W - 22, drawBottom = H - TB_H;
    const drawW = drawRight - drawLeft, drawH = drawBottom - drawTop;
    const scale = Math.min((drawW - 80) / Math.max(poolLength, 0.1), (drawH - 80) / Math.max(poolWidth, 0.1));
    const poolW = poolLength * scale, poolH = poolWidth * scale;
    const poolLeft = drawLeft + (drawW - poolW) / 2;
    const poolTop = drawTop + (drawH - poolH) / 2;
    const poolRight = poolLeft + poolW, poolBottom = poolTop + poolH;
    const wetDeckWidth = poolW * 0.24;
    const stairsWidth = poolW * 0.18;
    const lowerBandHeight = poolH * 0.22;

    const arrowHead = (ax: number, ay: number, dx: number, dy: number, sz = 7) => {
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux = dx / len, uy = dy / len, px = -uy, py = ux;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - ux * sz + px * sz * 0.42, ay - uy * sz + py * sz * 0.42);
      ctx.lineTo(ax - ux * sz - px * sz * 0.42, ay - uy * sz - py * sz * 0.42);
      ctx.closePath();
      ctx.fill();
    };

    const dimH = (x1: number, x2: number, y: number, label: string, above = true) => {
      const off = above ? -18 : 18;
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 0.9; ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(x1, y); ctx.lineTo(x1, y + off);
      ctx.moveTo(x2, y); ctx.lineTo(x2, y + off);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x1, y + off); ctx.lineTo(x2, y + off);
      ctx.stroke();
      arrowHead(x1, y + off, -1, 0); arrowHead(x2, y + off, 1, 0);
      ctx.font = `700 10px ${MONO}`; ctx.textAlign = 'center'; ctx.fillStyle = '#94a3b8';
      ctx.fillText(label, (x1 + x2) / 2, y + off + (above ? -5 : 13));
      ctx.textAlign = 'left';
    };

    const dimV = (x: number, y1: number, y2: number, label: string, toLeft = true) => {
      const off = toLeft ? -18 : 18;
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 0.9; ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(x, y1); ctx.lineTo(x + off, y1);
      ctx.moveTo(x, y2); ctx.lineTo(x + off, y2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + off, y1); ctx.lineTo(x + off, y2);
      ctx.stroke();
      arrowHead(x + off, y1, 0, -1); arrowHead(x + off, y2, 0, 1);
      ctx.save();
      ctx.translate(x + off + (toLeft ? -12 : 12), (y1 + y2) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.font = `700 10px ${MONO}`; ctx.textAlign = 'center'; ctx.fillStyle = '#94a3b8';
      ctx.fillText(label, 0, 0);
      ctx.restore();
    };

    ctx.fillStyle = '#070c18'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(148,163,184,0.07)';
    for (let gx = drawLeft + 14; gx < drawRight; gx += 22) {
      for (let gy = drawTop + 12; gy < drawBottom; gy += 22) {
        ctx.beginPath(); ctx.arc(gx, gy, 0.75, 0, Math.PI * 2); ctx.fill();
      }
    }

    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.strokeRect(14, 14, W - 28, H - 28);
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1;
    [[14, HDR_H, W - 14, HDR_H], [14, H - TB_H, W - 14, H - TB_H]].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    });

    ctx.fillStyle = '#e2e8f0'; ctx.font = `700 15px ${MONO}`; ctx.textAlign = 'left';
    ctx.fillText('PLANTA TÉCNICA HIDRÁULICA', drawLeft + 4, 38);
    ctx.fillStyle = '#64748b'; ctx.font = `11px ${MONO}`;
    ctx.fillText(`Vista superior · Piscina ${poolLength.toFixed(2)} m × ${poolWidth.toFixed(2)} m · Equipo: ${SIDE_LABELS[hydraulicLayout.referenceSide].toUpperCase()} (${distanceToEquipment.toFixed(2)} m)`, drawLeft + 4, 57);
    ctx.fillStyle = '#1e3a5f';
    ctx.beginPath(); ctx.roundRect(W - 110, 18, 86, 36, 6); ctx.fill();
    ctx.fillStyle = '#93c5fd'; ctx.font = `700 10px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillText('PLANTA', W - 66, 33); ctx.fillText('HIDRÁULICA', W - 66, 47);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#1e293b'; ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.rect(poolLeft - WALL_T, poolTop - WALL_T, poolW + WALL_T * 2, poolH + WALL_T * 2); ctx.fill(); ctx.stroke();
    ctx.save();
    ctx.beginPath(); ctx.rect(poolLeft - WALL_T, poolTop - WALL_T, poolW + WALL_T * 2, poolH + WALL_T * 2); ctx.clip();
    ctx.beginPath(); ctx.rect(poolLeft, poolTop, poolW, poolH);
    ctx.restore();

    const hatchStrip = (x: number, y: number, w: number, h: number) => {
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      ctx.fillStyle = '#263548'; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(148,163,184,0.28)'; ctx.lineWidth = 0.7;
      for (let i = -h; i < w + h; i += 6) {
        ctx.beginPath(); ctx.moveTo(x + i, y); ctx.lineTo(x + i + h, y + h); ctx.stroke();
      }
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    };
    hatchStrip(poolLeft - WALL_T, poolTop - WALL_T, poolW + WALL_T * 2, WALL_T);
    hatchStrip(poolLeft - WALL_T, poolBottom, poolW + WALL_T * 2, WALL_T);
    hatchStrip(poolLeft - WALL_T, poolTop, WALL_T, poolH);
    hatchStrip(poolRight, poolTop, WALL_T, poolH);

    const waterGrad = ctx.createLinearGradient(poolLeft, poolTop, poolRight, poolBottom);
    waterGrad.addColorStop(0, 'rgba(14,165,233,0.32)');
    waterGrad.addColorStop(1, 'rgba(30,64,175,0.24)');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(poolLeft, poolTop, poolW, poolH);
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1.5;
    ctx.strokeRect(poolLeft, poolTop, poolW, poolH);
    ctx.strokeStyle = 'rgba(56,189,248,0.10)'; ctx.lineWidth = 1;
    for (let i = 0; i < poolW + poolH; i += 18) {
      ctx.beginPath(); ctx.moveTo(poolLeft + i, poolTop); ctx.lineTo(poolLeft, poolTop + i); ctx.stroke();
    }

    ctx.fillStyle = 'rgba(224,242,254,0.18)';
    ctx.strokeStyle = 'rgba(224,242,254,0.35)';
    ctx.lineWidth = 1;
    ctx.fillRect(poolLeft, poolBottom - lowerBandHeight, wetDeckWidth, lowerBandHeight);
    ctx.strokeRect(poolLeft, poolBottom - lowerBandHeight, wetDeckWidth, lowerBandHeight);
    ctx.fillStyle = '#e0f2fe';
    ctx.font = `700 9px ${MONO}`;
    ctx.fillText('PLAYA HUMEDA', poolLeft + 10, poolBottom - lowerBandHeight + 16);

    const stairsX = poolRight - stairsWidth;
    ctx.fillStyle = 'rgba(240,249,255,0.18)';
    ctx.strokeStyle = 'rgba(224,242,254,0.35)';
    ctx.fillRect(stairsX, poolBottom - lowerBandHeight, stairsWidth, lowerBandHeight);
    ctx.strokeRect(stairsX, poolBottom - lowerBandHeight, stairsWidth, lowerBandHeight);
    [0, 1, 2].forEach((step) => {
      const stepInset = step * (stairsWidth * 0.18);
      const stepHeight = lowerBandHeight * 0.28;
      const y = poolBottom - lowerBandHeight + step * stepHeight;
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(stairsX + stepInset, y, stairsWidth - stepInset, stepHeight);
      ctx.strokeStyle = 'rgba(224,242,254,0.3)';
      ctx.strokeRect(stairsX + stepInset, y, stairsWidth - stepInset, stepHeight);
    });
    ctx.fillStyle = '#e0f2fe';
    ctx.fillText('ESCALERAS', stairsX + 8, poolBottom - lowerBandHeight + 16);

    dimH(poolLeft, poolRight, poolTop - WALL_T, `${poolLength.toFixed(2)} m`, true);
    dimV(poolLeft - WALL_T, poolTop, poolBottom, `${poolWidth.toFixed(2)} m`, true);

    const sideLabel = (side: HydraulicReferenceSide, label: string) => {
      const isRef = side === hydraulicLayout.referenceSide;
      ctx.font = `${isRef ? '700' : '500'} 11px ${MONO}`;
      ctx.fillStyle = isRef ? '#f1f5f9' : '#64748b';
      ctx.textAlign = 'center';
      if (side === 'north') ctx.fillText(label, poolLeft - WALL_T - 28, (poolTop + poolBottom) / 2 + 4);
      if (side === 'south') ctx.fillText(label, poolRight + WALL_T + 28, (poolTop + poolBottom) / 2 + 4);
      if (side === 'east') ctx.fillText(label, (poolLeft + poolRight) / 2, poolTop - WALL_T - 26);
      if (side === 'west') ctx.fillText(label, (poolLeft + poolRight) / 2, poolBottom + WALL_T + 22);
      ctx.textAlign = 'left';
    };
    (['north', 'south', 'east', 'west'] as HydraulicReferenceSide[]).forEach((s) => sideLabel(s, SIDE_LABELS[s].toUpperCase()));

    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (hydraulicLayout.referenceSide === 'north') { ctx.moveTo(poolLeft - WALL_T, poolTop - WALL_T); ctx.lineTo(poolLeft - WALL_T, poolBottom + WALL_T); }
    if (hydraulicLayout.referenceSide === 'south') { ctx.moveTo(poolRight + WALL_T, poolTop - WALL_T); ctx.lineTo(poolRight + WALL_T, poolBottom + WALL_T); }
    if (hydraulicLayout.referenceSide === 'east') { ctx.moveTo(poolLeft - WALL_T, poolTop - WALL_T); ctx.lineTo(poolRight + WALL_T, poolTop - WALL_T); }
    if (hydraulicLayout.referenceSide === 'west') { ctx.moveTo(poolLeft - WALL_T, poolBottom + WALL_T); ctx.lineTo(poolRight + WALL_T, poolBottom + WALL_T); }
    ctx.stroke();

    const eqOff = Math.max(60, distanceToEquipment * scale * 0.9);
    const EQW = 112, EQH = 56;
    const eqPos = hydraulicLayout.referenceSide === 'north'
      ? { x: poolLeft - WALL_T - eqOff - EQW, y: (poolTop + poolBottom) / 2 - EQH / 2 }
      : hydraulicLayout.referenceSide === 'south'
        ? { x: poolRight + WALL_T + eqOff, y: (poolTop + poolBottom) / 2 - EQH / 2 }
        : hydraulicLayout.referenceSide === 'east'
          ? { x: (poolLeft + poolRight) / 2 - EQW / 2, y: poolTop - WALL_T - eqOff - EQH }
          : { x: (poolLeft + poolRight) / 2 - EQW / 2, y: poolBottom + WALL_T + eqOff };

    const poolEdgePt = hydraulicLayout.referenceSide === 'north'
      ? { x: poolLeft - WALL_T, y: (poolTop + poolBottom) / 2 }
      : hydraulicLayout.referenceSide === 'south'
        ? { x: poolRight + WALL_T, y: (poolTop + poolBottom) / 2 }
        : hydraulicLayout.referenceSide === 'east'
          ? { x: (poolLeft + poolRight) / 2, y: poolTop - WALL_T }
          : { x: (poolLeft + poolRight) / 2, y: poolBottom + WALL_T };
    const eqCenterPt = { x: eqPos.x + EQW / 2, y: eqPos.y + EQH / 2 };
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.setLineDash([7, 5]);
    ctx.beginPath(); ctx.moveTo(poolEdgePt.x, poolEdgePt.y); ctx.lineTo(eqCenterPt.x, eqCenterPt.y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#fbbf24'; ctx.font = `700 9px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillText(`${distanceToEquipment.toFixed(2)} m`, (poolEdgePt.x + eqCenterPt.x) / 2, (poolEdgePt.y + eqCenterPt.y) / 2 - 7);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#18181b'; ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(eqPos.x, eqPos.y, EQW, EQH, 10); ctx.fill(); ctx.stroke();
    const pCX = eqPos.x + EQW / 2, pCY = eqPos.y + EQH / 2;
    ctx.fillStyle = '#292524'; ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(pCX, pCY, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath(); ctx.moveTo(pCX - 7, pCY - 8); ctx.lineTo(pCX + 9, pCY); ctx.lineTo(pCX - 7, pCY + 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fef3c7'; ctx.font = `700 8px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillText('EQUIPO', pCX, eqPos.y - 5);
    ctx.textAlign = 'left';

    hydraulicLayout.points.forEach((point) => {
      const ratio = (point.side === 'north' || point.side === 'south')
        ? point.offsetMeters / Math.max(poolWidth, 0.01)
        : point.offsetMeters / Math.max(poolLength, 0.01);
      let px = 0, py = 0;
      if (point.side === 'north') { px = poolLeft; py = poolTop + poolH * ratio; }
      if (point.side === 'south') { px = poolRight; py = poolTop + poolH * ratio; }
      if (point.side === 'east') { px = poolLeft + poolW * ratio; py = poolTop; }
      if (point.side === 'west') { px = poolLeft + poolW * ratio; py = poolBottom; }
      const col = colors[point.kind];
      const isSel = point.id === selectedPointId;
      const r = isSel ? 6 : 4;

      ctx.strokeStyle = isSel ? `${col}` : `${col}66`;
      ctx.lineWidth = isSel ? 1.5 : 0.8;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(eqCenterPt.x, eqCenterPt.y); ctx.stroke();

      if (isSel) {
        ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(px, py, r + 5, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#0a0e1a'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px - r * 0.55, py); ctx.lineTo(px + r * 0.55, py);
      ctx.moveTo(px, py - r * 0.55); ctx.lineTo(px, py + r * 0.55);
      ctx.stroke();
      if (isSel) {
        ctx.fillStyle = '#e2e8f0'; ctx.font = `700 9px ${MONO}`; ctx.textAlign = 'center';
        ctx.fillText(point.label, px, py - r - 7);
        ctx.textAlign = 'left';
      }
    });

    const NAX = drawRight - 40, NAY = drawTop + 44;
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(NAX, NAY + 18); ctx.lineTo(NAX, NAY - 18); ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath(); ctx.moveTo(NAX, NAY - 18); ctx.lineTo(NAX - 7, NAY + 4); ctx.lineTo(NAX + 7, NAY + 4); ctx.closePath(); ctx.fill();
    ctx.font = `700 11px ${MONO}`; ctx.textAlign = 'center'; ctx.fillStyle = '#e2e8f0';
    ctx.fillText('N', NAX, NAY + 30);
    ctx.beginPath(); ctx.arc(NAX, NAY, 22, 0, Math.PI * 2); ctx.strokeStyle = '#475569'; ctx.lineWidth = 1; ctx.stroke();
    ctx.textAlign = 'left';

    const SBX = drawLeft + 8, SBY = drawBottom - 14;
    const scaleBarM = Math.max(1, Math.round(poolLength / 3));
    const scaleBarPx = scaleBarM * scale;
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(SBX, SBY); ctx.lineTo(SBX + scaleBarPx, SBY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(SBX, SBY - 4); ctx.lineTo(SBX, SBY + 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(SBX + scaleBarPx, SBY - 4); ctx.lineTo(SBX + scaleBarPx, SBY + 4); ctx.stroke();
    ctx.fillStyle = '#64748b'; ctx.font = `9px ${MONO}`;
    ctx.fillText(`${scaleBarM} m`, SBX + scaleBarPx / 2 - 8, SBY - 7);

    const TBY = H - TB_H + 8;
    ctx.fillStyle = '#64748b'; ctx.font = `700 9px ${MONO}`;
    ctx.fillText('PROYECTO:', drawLeft + 4, TBY + 13);
    ctx.fillStyle = '#cbd5e1'; ctx.font = `9px ${MONO}`;
    ctx.fillText(`Piscina ${poolLength.toFixed(2)} × ${poolWidth.toFixed(2)} m`, drawLeft + 62, TBY + 13);
    ctx.fillStyle = '#64748b'; ctx.font = `700 9px ${MONO}`;
    ctx.fillText('REF. EQUIPO:', drawLeft + 4, TBY + 27);
    ctx.fillStyle = '#cbd5e1'; ctx.font = `9px ${MONO}`;
    ctx.fillText(`Lateral ${SIDE_LABELS[hydraulicLayout.referenceSide].toUpperCase()} · ${distanceToEquipment.toFixed(2)} m`, drawLeft + 62, TBY + 27);
    ctx.fillStyle = '#64748b'; ctx.font = `700 9px ${MONO}`;
    ctx.fillText('PUNTOS:', drawLeft + 4, TBY + 41);
    ctx.fillStyle = '#cbd5e1'; ctx.font = `9px ${MONO}`;
    ctx.fillText(`${hydraulicLayout.points.length} bocas hidráulicas`, drawLeft + 62, TBY + 41);
    (Object.keys(colors) as HydraulicPointKind[]).forEach((kind, i) => {
      const cnt = hydraulicLayout.points.filter((p) => p.kind === kind).length;
      if (cnt === 0) return;
      const lx = W - 340 + i * 68;
      if (lx > W - 30) return;
      ctx.fillStyle = colors[kind];
      ctx.beginPath(); ctx.arc(lx + 5, TBY + 20, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#94a3b8'; ctx.font = `9px ${MONO}`;
      ctx.fillText(`${POINT_KIND_LABELS[kind].slice(0, 8)} (${cnt})`, lx + 13, TBY + 24);
    });
  }, [project, hydraulicLayout, selectedSide, selectedPointId, distanceToEquipment]);

  useEffect(() => {
    const canvas = profileCanvasRef.current;
    if (!canvas) return;

    const W = 920, H = 680;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const preset = project.poolPreset;
    const poolLength = preset?.length || 8;
    const poolWidth = preset?.width || 4;
    const depthStart = preset?.depth || 1.4;
    const depthEnd = preset?.depthEnd || depthStart;
    const sideSpan = selectedSide === 'north' || selectedSide === 'south' ? poolWidth : poolLength;
    const sidePoints = hydraulicLayout.points.filter((p) => p.side === selectedSide);
    const selectedPoint = sidePoints.find((p) => p.id === selectedPointId) || sidePoints[0];
    const maxDepth = Math.max(
      depthStart,
      depthEnd,
      0.5,
      hydraulicLayout.equipmentHeightFromZero + hydraulicLayout.equipmentBaseHeightFromFloor + 0.4,
      ...hydraulicLayout.points.map((p) => p.depthMeters)
    );
    const MONO = '"Courier New", monospace';
    const WALL_T = 12;
    const FLOOR_T = 10;

    const HDR_H = 70, TB_H = 58, AXIS_W = 78, EQ_ZONE = 190;
    const drawLeft = AXIS_W;
    const drawTop = HDR_H;
    const drawRight = W - EQ_ZONE - 18;
    const drawBottom = H - TB_H;
    const drawW = drawRight - drawLeft;
    const drawH = drawBottom - drawTop;

    const EARTH_H = 38;
    const zeroY = drawTop + EARTH_H;
    const yForDepth = (d: number) => zeroY + (d / Math.max(maxDepth, 0.01)) * (drawH - EARTH_H - 16);
    const xForOffset = (o: number) => drawLeft + (o / Math.max(sideSpan, 0.01)) * drawW;

    const floorStartY = yForDepth(depthStart);
    const floorEndY = yForDepth(depthEnd);
    const equipCX = W - EQ_ZONE / 2 - 8;
    const equipTopY = yForDepth(Math.max(0, hydraulicLayout.equipmentHeightFromZero));
    const EQ_W = 120, EQ_H = 64;

    const arrowHead = (ax: number, ay: number, dx: number, dy: number, sz = 7) => {
      const l = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux = dx / l, uy = dy / l, px = -uy, py = ux;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - ux * sz + px * sz * 0.4, ay - uy * sz + py * sz * 0.4);
      ctx.lineTo(ax - ux * sz - px * sz * 0.4, ay - uy * sz - py * sz * 0.4);
      ctx.closePath();
      ctx.fill();
    };

    const dimVLeft = (x: number, y1: number, y2: number, label: string, offX = 28) => {
      const tx = x - offX;
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 0.9; ctx.fillStyle = '#475569';
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x - 4, y1); ctx.lineTo(tx + 2, y1);
      ctx.moveTo(x - 4, y2); ctx.lineTo(tx + 2, y2);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx, y1); ctx.lineTo(tx, y2); ctx.stroke();
      arrowHead(tx, y1, 0, -1, 6); arrowHead(tx, y2, 0, 1, 6);
      ctx.save();
      ctx.translate(tx - 13, (y1 + y2) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.font = `700 10px ${MONO}`; ctx.textAlign = 'center'; ctx.fillStyle = '#94a3b8';
      ctx.fillText(label, 0, 0);
      ctx.restore();
    };

    const dimVRight = (x: number, y1: number, y2: number, label: string, offX = 28) => {
      const tx = x + offX;
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 0.9; ctx.fillStyle = '#475569';
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x + 4, y1); ctx.lineTo(tx - 2, y1);
      ctx.moveTo(x + 4, y2); ctx.lineTo(tx - 2, y2);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx, y1); ctx.lineTo(tx, y2); ctx.stroke();
      arrowHead(tx, y1, 0, -1, 6); arrowHead(tx, y2, 0, 1, 6);
      ctx.save();
      ctx.translate(tx + 13, (y1 + y2) / 2);
      ctx.rotate(Math.PI / 2);
      ctx.font = `700 10px ${MONO}`; ctx.textAlign = 'center'; ctx.fillStyle = '#94a3b8';
      ctx.fillText(label, 0, 0);
      ctx.restore();
    };

    const dimHAbove = (x1: number, x2: number, y: number, label: string, offY = 20) => {
      const ty = y - offY;
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 0.9; ctx.fillStyle = '#475569';
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x1, y - 4); ctx.lineTo(x1, ty + 2);
      ctx.moveTo(x2, y - 4); ctx.lineTo(x2, ty + 2);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x1, ty); ctx.lineTo(x2, ty); ctx.stroke();
      arrowHead(x1, ty, -1, 0, 6); arrowHead(x2, ty, 1, 0, 6);
      ctx.font = `700 10px ${MONO}`; ctx.textAlign = 'center'; ctx.fillStyle = '#94a3b8';
      ctx.fillText(label, (x1 + x2) / 2, ty - 5);
      ctx.textAlign = 'left';
    };

    const concreteFill = (path: () => void, baseColor = '#1e293b', hatchColor = 'rgba(148,163,184,0.30)') => {
      ctx.save(); path(); ctx.clip();
      ctx.fillStyle = baseColor; path(); ctx.fill();
      ctx.strokeStyle = hatchColor; ctx.lineWidth = 0.7;
      for (let i = -H; i < W + H; i += 7) {
        ctx.beginPath(); ctx.moveTo(i, drawTop); ctx.lineTo(i + H, drawTop + H); ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.5; path(); ctx.stroke();
    };

    const drawSymbol = (kind: HydraulicPointKind, cx: number, cy: number, col: string, isSel: boolean) => {
      const r = isSel ? 7 : 5;
      if (isSel) {
        ctx.strokeStyle = `${col}55`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, r + 10, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, r + 5, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 1;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 2) {
          ctx.beginPath();
          ctx.moveTo(cx + (r + 5) * Math.cos(a), cy + (r + 5) * Math.sin(a));
          ctx.lineTo(cx + (r + 9) * Math.cos(a), cy + (r + 9) * Math.sin(a));
          ctx.stroke();
        }
      }
      ctx.fillStyle = col;
      if (kind === 'skimmer') {
        ctx.beginPath();
        ctx.arc(cx, cy, r, Math.PI, 0);
        ctx.lineTo(cx + r, cy); ctx.lineTo(cx - r, cy);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = isSel ? '#f8fafc' : col; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.stroke();
      } else if (kind === 'return') {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#030712'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy); ctx.lineTo(cx + 4, cy);
        ctx.moveTo(cx + 2, cy - 3); ctx.lineTo(cx + 5, cy); ctx.lineTo(cx + 2, cy + 3);
        ctx.stroke();
        ctx.strokeStyle = isSel ? '#f8fafc' : col; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      } else if (kind === 'hydrojet') {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#030712'; ctx.lineWidth = 1.5;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 2) {
          ctx.beginPath();
          ctx.moveTo(cx + r * 0.35 * Math.cos(a), cy + r * 0.35 * Math.sin(a));
          ctx.lineTo(cx + r * 0.85 * Math.cos(a), cy + r * 0.85 * Math.sin(a));
          ctx.stroke();
        }
        ctx.strokeStyle = isSel ? '#f8fafc' : col; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      } else if (kind === 'hydrojet_suction') {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#030712'; ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy - 4); ctx.lineTo(cx + 5, cy);
        ctx.lineTo(cx - 5, cy + 4);
        ctx.stroke();
        ctx.strokeStyle = isSel ? '#f8fafc' : col; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      } else if (kind === 'vacuum') {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        ctx.setLineDash([3, 3]); ctx.strokeStyle = isSel ? '#f8fafc' : col; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.PI / 4);
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.rect(-r * 0.78, -r * 0.78, r * 1.56, r * 1.56); ctx.fill();
        ctx.strokeStyle = isSel ? '#f8fafc' : col; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.restore();
        ctx.strokeStyle = '#030712'; ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx - 4, cy - 4); ctx.lineTo(cx + 4, cy + 4);
        ctx.moveTo(cx + 4, cy - 4); ctx.lineTo(cx - 4, cy + 4);
        ctx.stroke();
      }
    };

    ctx.fillStyle = '#060b14'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(148,163,184,0.08)';
    for (let gx = AXIS_W + 12; gx < W - 12; gx += 22) {
      for (let gy = HDR_H + 12; gy < H - TB_H; gy += 22) {
        ctx.beginPath(); ctx.arc(gx, gy, 0.75, 0, Math.PI * 2); ctx.fill();
      }
    }

    ctx.strokeStyle = '#2d3748'; ctx.lineWidth = 2; ctx.strokeRect(12, 12, W - 24, H - 24);
    ctx.strokeStyle = '#1a2332'; ctx.lineWidth = 1;
    const lines: [number, number, number, number][] = [
      [12, HDR_H, W - 12, HDR_H],
      [12, H - TB_H, W - 12, H - TB_H],
      [AXIS_W, HDR_H, AXIS_W, H - TB_H],
      [W - EQ_ZONE - 18, HDR_H, W - EQ_ZONE - 18, H - TB_H],
    ];
    lines.forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    });

    ctx.fillStyle = '#e2e8f0'; ctx.font = `700 14px ${MONO}`; ctx.textAlign = 'left';
    ctx.fillText(`SECCIÓN TRANSVERSAL  ·  LATERAL ${SIDE_LABELS[selectedSide].toUpperCase()}`, AXIS_W + 8, 36);
    ctx.fillStyle = '#4b6280'; ctx.font = `10px ${MONO}`;
    ctx.fillText(`Pendiente de fondo · Cotas hidráulicas · Equipo de filtrado  ·  Longitud: ${sideSpan.toFixed(2)} m  ·  Profundidad máx: ${maxDepth.toFixed(2)} m`, AXIS_W + 8, 55);
    ctx.fillStyle = '#14243e';
    ctx.beginPath(); ctx.roundRect(W - EQ_ZONE - 12, 16, 84, 36, 5); ctx.fill();
    ctx.fillStyle = '#60a5fa'; ctx.font = `700 9px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillText('SECCIÓN', W - EQ_ZONE + 30, 30);
    ctx.fillStyle = '#93c5fd'; ctx.font = `9px ${MONO}`;
    ctx.fillText(`LAT-${SIDE_LABELS[selectedSide].slice(0, 1).toUpperCase()}`, W - EQ_ZONE + 30, 44);
    ctx.textAlign = 'left';

    ctx.save();
    ctx.translate(18, (drawTop + drawBottom) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = `9px ${MONO}`; ctx.fillStyle = '#4b6280'; ctx.textAlign = 'center';
    ctx.fillText('PROFUNDIDAD (m)', 0, 0);
    ctx.restore();
    const maxStep = Math.ceil(maxDepth * 10) / 10;
    for (let step = 0; step <= maxStep + 0.01; step += 0.2) {
      const ty = yForDepth(step);
      if (ty < drawTop || ty > drawBottom + 2) continue;
      const isMajor = Math.round(step * 10) % 4 === 0;
      ctx.strokeStyle = isMajor ? 'rgba(71,85,105,0.45)' : 'rgba(30,41,59,0.7)';
      ctx.lineWidth = isMajor ? 0.8 : 0.5;
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(drawLeft, ty); ctx.lineTo(drawRight, ty); ctx.stroke();
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(AXIS_W - (isMajor ? 8 : 4), ty); ctx.lineTo(AXIS_W, ty); ctx.stroke();
      if (isMajor) {
        ctx.fillStyle = '#64748b'; ctx.font = `10px ${MONO}`; ctx.textAlign = 'right';
        ctx.fillText(step.toFixed(1), AXIS_W - 11, ty + 3.5);
      }
    }
    ctx.textAlign = 'left';

    ctx.save();
    ctx.beginPath(); ctx.rect(drawLeft, drawTop, drawW, EARTH_H); ctx.clip();
    ctx.fillStyle = 'rgba(87,75,64,0.20)'; ctx.fillRect(drawLeft, drawTop, drawW, EARTH_H);
    ctx.strokeStyle = 'rgba(120,113,108,0.40)'; ctx.lineWidth = 0.8;
    for (let i = -EARTH_H; i < drawW + EARTH_H; i += 9) {
      ctx.beginPath();
      ctx.moveTo(drawLeft + i, drawTop + EARTH_H);
      ctx.lineTo(drawLeft + i + EARTH_H * 0.6, drawTop);
      ctx.stroke();
    }
    ctx.restore();

    ctx.strokeStyle = '#6b5f53'; ctx.lineWidth = 2; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(drawLeft, zeroY); ctx.lineTo(drawRight, zeroY); ctx.stroke();
    ctx.fillStyle = '#78716c';
    ctx.beginPath();
    ctx.moveTo(drawLeft + 6, zeroY);
    ctx.lineTo(drawLeft + 15, zeroY - 9);
    ctx.lineTo(drawLeft + 24, zeroY);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a8a29e'; ctx.font = `700 10px ${MONO}`;
    ctx.fillText('±0.00', drawLeft + 28, zeroY - 2);

    concreteFill(() => {
      ctx.beginPath();
      ctx.rect(drawLeft, zeroY, WALL_T, floorStartY - zeroY);
    });
    concreteFill(() => {
      ctx.beginPath();
      ctx.rect(drawRight - WALL_T, zeroY, WALL_T, floorEndY - zeroY);
    });
    concreteFill(() => {
      ctx.beginPath();
      ctx.moveTo(drawLeft, floorStartY);
      ctx.lineTo(drawRight, floorEndY);
      ctx.lineTo(drawRight, floorEndY + FLOOR_T);
      ctx.lineTo(drawLeft, floorStartY + FLOOR_T);
      ctx.closePath();
    });

    const waterGrad = ctx.createLinearGradient(drawLeft, zeroY, drawLeft, Math.max(floorStartY, floorEndY));
    waterGrad.addColorStop(0, 'rgba(14,165,233,0.28)');
    waterGrad.addColorStop(0.5, 'rgba(30,64,175,0.20)');
    waterGrad.addColorStop(1, 'rgba(15,23,42,0.16)');
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(drawLeft + WALL_T, zeroY);
    ctx.lineTo(drawRight - WALL_T, zeroY);
    ctx.lineTo(drawRight - WALL_T, floorEndY);
    ctx.lineTo(drawLeft + WALL_T, floorStartY);
    ctx.closePath();
    ctx.fillStyle = waterGrad; ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(125,211,252,0.45)'; ctx.lineWidth = 1;
    for (let wx = drawLeft + WALL_T + 24; wx < drawRight - WALL_T - 24; wx += 44) {
      ctx.beginPath();
      ctx.moveTo(wx, zeroY + 7);
      ctx.bezierCurveTo(wx + 7, zeroY + 3, wx + 15, zeroY + 11, wx + 22, zeroY + 7);
      ctx.stroke();
    }
    const depthShade = ctx.createLinearGradient(drawLeft + WALL_T, zeroY, drawLeft + WALL_T, Math.max(floorStartY, floorEndY));
    depthShade.addColorStop(0, 'transparent');
    depthShade.addColorStop(1, 'rgba(8,47,73,0.18)');
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(drawLeft + WALL_T, zeroY); ctx.lineTo(drawRight - WALL_T, zeroY);
    ctx.lineTo(drawRight - WALL_T, floorEndY); ctx.lineTo(drawLeft + WALL_T, floorStartY);
    ctx.closePath();
    ctx.fillStyle = depthShade; ctx.fill();
    ctx.restore();

    dimHAbove(drawLeft + WALL_T, drawRight - WALL_T, zeroY - EARTH_H + 4, `${sideSpan.toFixed(2)} m`, 14);
    dimVLeft(drawLeft, zeroY, floorStartY, `${depthStart.toFixed(2)} m`, 30);
    if (Math.abs(depthEnd - depthStart) > 0.08) {
      dimVRight(drawRight, zeroY, floorEndY, `${depthEnd.toFixed(2)} m`, 30);
    }

    if (Math.abs(depthEnd - depthStart) > 0.05) {
      const midX = (drawLeft + drawRight) / 2;
      const midY = (floorStartY + floorEndY) / 2 + FLOOR_T / 2 + 10;
      const angle = Math.atan2(floorEndY - floorStartY, drawRight - drawLeft);
      const ARROW = 30;
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(midX - ARROW * Math.cos(angle), midY - ARROW * Math.sin(angle));
      ctx.lineTo(midX + ARROW * Math.cos(angle), midY + ARROW * Math.sin(angle));
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      arrowHead(midX + ARROW * Math.cos(angle), midY + ARROW * Math.sin(angle), Math.cos(angle), Math.sin(angle), 7);
      const pct = ((depthEnd - depthStart) / sideSpan * 100).toFixed(1);
      ctx.font = `700 9px ${MONO}`; ctx.textAlign = 'center'; ctx.fillStyle = '#94a3b8';
      ctx.fillText(`PENDIENTE ${pct}%`, midX, midY - 6);
      ctx.textAlign = 'left';
    }

    sidePoints.forEach((point) => {
      const px = xForOffset(point.offsetMeters);
      const py = yForDepth(point.depthMeters);
      const isSel = point.id === selectedPoint?.id;
      const col = colors[point.kind];

      ctx.strokeStyle = isSel ? `${col}bb` : `${col}44`;
      ctx.lineWidth = isSel ? 1.8 : 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(px, zeroY); ctx.lineTo(px, py); ctx.stroke();
      ctx.setLineDash([]);

      if (isSel) {
        const dimOff = 20;
        const dirRight = px + dimOff < drawRight - WALL_T - 30;
        const annX = dirRight ? px + dimOff + 6 : px - dimOff - 50;
        ctx.strokeStyle = '#475569'; ctx.lineWidth = 0.8; ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.moveTo(px + (dirRight ? 3 : -3), py); ctx.lineTo(px + (dirRight ? dimOff : -dimOff), py);
        ctx.moveTo(px + (dirRight ? 3 : -3), zeroY); ctx.lineTo(px + (dirRight ? dimOff : -dimOff), zeroY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(px + (dirRight ? dimOff : -dimOff), zeroY);
        ctx.lineTo(px + (dirRight ? dimOff : -dimOff), py);
        ctx.stroke();
        arrowHead(px + (dirRight ? dimOff : -dimOff), zeroY, 0, -1, 5);
        arrowHead(px + (dirRight ? dimOff : -dimOff), py, 0, 1, 5);
        ctx.font = `700 10px ${MONO}`; ctx.fillStyle = '#e2e8f0'; ctx.textAlign = dirRight ? 'left' : 'right';
        ctx.fillText(`${point.depthMeters.toFixed(2)} m`, annX, (zeroY + py) / 2 + 4);

        ctx.font = `700 10px ${MONO}`; ctx.fillStyle = '#e2e8f0'; ctx.textAlign = 'center';
        ctx.fillText(`${point.offsetMeters.toFixed(2)} m`, px, zeroY + EARTH_H - 6);

        ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 1; ctx.fillStyle = '#f8fafc';
        ctx.beginPath(); ctx.moveTo(px, py - 16); ctx.lineTo(px, py - 24); ctx.stroke();
        ctx.font = `700 11px ${MONO}`; ctx.textAlign = 'center';
        ctx.fillText(point.label, px, py - 28);
        ctx.textAlign = 'left';
      } else {
        ctx.font = `9px ${MONO}`; ctx.fillStyle = col; ctx.textAlign = 'center';
        ctx.fillText(POINT_KIND_LABELS[point.kind].split(' ')[0], px, py - 14);
        ctx.textAlign = 'left';
      }

      drawSymbol(point.kind, px, py, col, isSel);
    });

    if (sidePoints.length === 0) {
      ctx.fillStyle = '#334155'; ctx.font = `11px ${MONO}`; ctx.textAlign = 'center';
      ctx.fillText('SIN BOCAS ASIGNADAS A ESTE LATERAL', (drawLeft + drawRight) / 2, (zeroY + floorStartY) / 2);
      ctx.textAlign = 'left';
    }

    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5; ctx.setLineDash([7, 5]);
    ctx.beginPath(); ctx.moveTo(drawRight, zeroY); ctx.lineTo(W - EQ_ZONE, zeroY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#fbbf24';
    arrowHead(W - EQ_ZONE, zeroY, 1, 0, 7);
    ctx.font = `700 10px ${MONO}`; ctx.textAlign = 'center'; ctx.fillStyle = '#fbbf24';
    ctx.fillText(`${distanceToEquipment.toFixed(2)} m`, (drawRight + W - EQ_ZONE) / 2, zeroY - 9);
    ctx.textAlign = 'left';

    const eqLeft = W - EQ_ZONE + 8;
    const eqBoxX = eqLeft + (EQ_ZONE - 16 - EQ_W) / 2;
    const eqBoxY = equipTopY - EQ_H / 2;
    ctx.fillStyle = '#18181b'; ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(eqBoxX, eqBoxY, EQ_W, EQ_H, 10); ctx.fill(); ctx.stroke();
    const pCX = eqBoxX + EQ_W / 2, pCY = eqBoxY + EQ_H / 2;
    ctx.fillStyle = '#1c1917'; ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(pCX, pCY, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(pCX - 8, pCY - 9); ctx.lineTo(pCX + 10, pCY); ctx.lineTo(pCX - 8, pCY + 9);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fef3c7'; ctx.font = `700 8px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillText('EQUIPO', pCX, eqBoxY - 16);
    ctx.fillText('FILTRADO', pCX, eqBoxY - 6);
    ctx.textAlign = 'left';

    if (Math.abs(hydraulicLayout.equipmentHeightFromZero) > 0.01) {
      const dimEqX = eqLeft + 10;
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 0.8; ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(dimEqX, zeroY); ctx.lineTo(dimEqX, equipTopY); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = '#64748b';
      arrowHead(dimEqX, zeroY, 0, -1, 5); arrowHead(dimEqX, equipTopY, 0, 1, 5);
      ctx.font = `9px ${MONO}`; ctx.fillStyle = '#94a3b8';
      ctx.fillText(`Cota ${hydraulicLayout.equipmentHeightFromZero.toFixed(2)} m`, dimEqX + 5, (zeroY + equipTopY) / 2 + 4);
    }
    if (Math.abs(hydraulicLayout.equipmentBaseHeightFromFloor) > 0.01) {
      const equipBaseY = yForDepth(Math.max(0, hydraulicLayout.equipmentHeightFromZero + hydraulicLayout.equipmentBaseHeightFromFloor));
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 0.8; ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(eqBoxX + EQ_W - 4, eqBoxY + EQ_H); ctx.lineTo(eqBoxX + EQ_W - 4, equipBaseY); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = '#64748b'; ctx.font = `9px ${MONO}`;
      ctx.fillText(`Base ${hydraulicLayout.equipmentBaseHeightFromFloor.toFixed(2)} m`, eqBoxX, equipBaseY + 14);
    }

    const scaleM = Math.max(0.5, Math.round(sideSpan / 4 * 2) / 2);
    const scalePx = (scaleM / Math.max(sideSpan, 0.01)) * drawW;
    const SBX = drawLeft + 8, SBY = drawBottom - 12;
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(SBX, SBY); ctx.lineTo(SBX + scalePx, SBY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(SBX, SBY - 4); ctx.lineTo(SBX, SBY + 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(SBX + scalePx, SBY - 4); ctx.lineTo(SBX + scalePx, SBY + 4); ctx.stroke();
    ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.rect(SBX, SBY - 3, scalePx / 2, 6); ctx.fill();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 0.8; ctx.strokeRect(SBX, SBY - 3, scalePx, 6);
    ctx.fillStyle = '#94a3b8'; ctx.font = `9px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillText('0', SBX, SBY - 6);
    ctx.fillText(`${scaleM.toFixed(1)} m`, SBX + scalePx, SBY - 6);
    ctx.textAlign = 'left';

    const TBY = H - TB_H + 8;
    const col1 = '#4b6280', col2 = '#c1cfe0';
    const tbCols: [string, string, number][] = [
      ['PROYECTO:', `Piscina ${poolLength.toFixed(2)} m × ${poolWidth.toFixed(2)} m`, 0],
      ['LATERAL:', `${SIDE_LABELS[selectedSide].toUpperCase()} · ${sidePoints.length} boca(s)`, 220],
      ['COTAS:', `Inicio ${depthStart.toFixed(2)} m · Fin ${depthEnd.toFixed(2)} m · Máx ${maxDepth.toFixed(2)} m`, 440],
    ];
    tbCols.forEach(([label, value, ox]) => {
      ctx.fillStyle = col1; ctx.font = `700 9px ${MONO}`;
      ctx.fillText(label, AXIS_W + 8 + ox, TBY + 14);
      ctx.fillStyle = col2; ctx.font = `9px ${MONO}`;
      ctx.fillText(value, AXIS_W + 8 + ox, TBY + 28);
    });
    let legX = W - EQ_ZONE - 12;
    (Object.keys(colors) as HydraulicPointKind[]).reverse().forEach((kind) => {
      const cnt = sidePoints.filter((p) => p.kind === kind).length;
      if (cnt === 0) return;
      legX -= 80;
      if (legX < 500) return;
      ctx.fillStyle = colors[kind];
      ctx.beginPath(); ctx.arc(legX + 5, TBY + 20, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#94a3b8'; ctx.font = `9px ${MONO}`;
      ctx.fillText(`${POINT_KIND_LABELS[kind].slice(0, 9)} (${cnt})`, legX + 13, TBY + 24);
    });
  }, [project, hydraulicLayout, selectedSide, selectedPointId, distanceToEquipment]);

  const sidePoints = hydraulicLayout.points.filter((point) => point.side === selectedSide);
  const selectedPoint = sidePoints.find((point) => point.id === selectedPointId) || sidePoints[0] || null;
  const pointVerticalDelta = selectedPoint
    ? Number((hydraulicLayout.equipmentHeightFromZero + selectedPoint.depthMeters).toFixed(2))
    : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Lateral activo</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SIDE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedSide(option.value)}
                  className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                    selectedSide === option.value
                      ? 'border-zinc-200 bg-zinc-100 text-zinc-950'
                      : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Puntos del lateral</p>
            <div className="mt-3 space-y-2">
              {sidePoints.length === 0 && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-400">
                  No hay puntos cargados sobre este lateral.
                </div>
              )}
              {sidePoints.map((point) => (
                <button
                  key={point.id}
                  type="button"
                  onClick={() => setSelectedPointId(point.id)}
                  className={`w-full rounded-xl border p-3 text-left transition-colors ${
                    selectedPointId === point.id
                      ? 'border-zinc-200 bg-zinc-100 text-zinc-950'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-100 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{point.label}</span>
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: colors[point.kind] }}
                    />
                  </div>
                  <p className={`mt-1 text-xs ${selectedPointId === point.id ? 'text-zinc-600' : 'text-zinc-400'}`}>
                    {point.offsetMeters.toFixed(2)} m sobre lateral · profundidad {point.depthMeters.toFixed(2)} m
                  </p>
                </button>
              ))}
            </div>
          </div>

          {selectedPoint && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Punto seleccionado</p>
              <p className="mt-2 text-lg font-semibold text-white">{selectedPoint.label}</p>
              <div className="mt-3 space-y-2 text-sm text-zinc-300">
                <div className="flex justify-between">
                  <span>Tipo</span>
                  <span>{POINT_KIND_LABELS[selectedPoint.kind]}</span>
                </div>
                <div className="flex justify-between">
                  <span>Lateral</span>
                  <span>{POINT_SIDE_OPTIONS.find((item) => item.value === selectedPoint.side)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span>Offset</span>
                  <span>{selectedPoint.offsetMeters.toFixed(2)} m</span>
                </div>
                <div className="flex justify-between">
                  <span>Profundidad</span>
                  <span>{selectedPoint.depthMeters.toFixed(2)} m</span>
                </div>
                <div className="flex justify-between">
                  <span>Cota equipo vs punto</span>
                  <span>{pointVerticalDelta.toFixed(2)} m</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
            <canvas ref={planCanvasRef} className="block w-full" />
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
            <canvas ref={profileCanvasRef} className="block w-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

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

const buildEquipmentWorkspaceModules = (
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

const EquipmentWorkspacePreview: React.FC<{
  project: Project;
  hydraulicSummary: ReturnType<typeof summarizeHydraulicSystem>;
  hydraulicLayout: HydraulicLayoutDraft;
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
          <pattern id="equipment-grid" width="36" height="36" patternUnits="userSpaceOnUse">
            <path d="M 36 0 L 0 0 0 36" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
          </pattern>
          <radialGradient id="equipment-glow" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="rgba(245,158,11,0.28)" />
            <stop offset="100%" stopColor="rgba(245,158,11,0.03)" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width={W} height={H} fill="url(#equipment-grid)" />
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
          <circle cx={filtrationPumpPos.x} cy={filtrationPumpPos.y} r="70" fill="url(#equipment-glow)" stroke="rgba(245,158,11,0.55)" strokeWidth="2.8" />
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

export const PlumbingEditor: React.FC<PlumbingEditorProps> = ({ project, onSave, onAutoSave }) => {
  const [plumbingItems, setPlumbingItems] = useState<PlumbingItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [distanceToEquipment, setDistanceToEquipment] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [pipeCalculation, setPipeCalculation] = useState<PlumbingCalculationResult | null>(null);
  const [calculationMode, setCalculationMode] = useState<'automatic' | 'manual'>('automatic');
  const [showTechnicalPreview, setShowTechnicalPreview] = useState(false);
  const [showEquipmentWorkspace, setShowEquipmentWorkspace] = useState(false);
  const [floatingSelectedPointId, setFloatingSelectedPointId] = useState<string | null>(null);
  const hasLoadedConfigRef = React.useRef(false);
  const autoSaveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestHydraulicConfigRef = React.useRef<any>(null);
  const hydraulicSummary = React.useMemo(
    () => summarizeHydraulicSystem(project, getProjectAdditionals(project)),
    [project]
  );
  const [hydraulicLayout, setHydraulicLayout] = useState<HydraulicLayoutDraft>(() =>
    buildDefaultHydraulicLayout(project, hydraulicSummary)
  );

  const ensureHydraulicLayout = React.useCallback((layout: HydraulicLayoutDraft) => {
    const poolLength = project.poolPreset?.length || 8;
    const poolWidth = project.poolPreset?.width || 4;
    const depthStart = project.poolPreset?.depth || 1.4;
    const normalizedPoints = [...(layout.points || [])];
    const hasHydrojetSuctionPoint = normalizedPoints.some((point) => point.kind === 'hydrojet_suction');

    if (hydraulicSummary.total.hydrojets > 0 && !hasHydrojetSuctionPoint) {
      normalizedPoints.push(buildHydrojetSuctionPoint(poolWidth, depthStart));
    }

    return {
      ...layout,
      equipmentOffsetMeters: typeof layout.equipmentOffsetMeters === 'number'
        ? layout.equipmentOffsetMeters
        : Number((getSideSpanMeters(layout.referenceSide, poolLength, poolWidth) / 2).toFixed(2)),
      equipmentWorkspaceLayout: {
        ...buildDefaultEquipmentWorkspaceLayout(),
        ...(layout.equipmentWorkspaceLayout || {}),
      },
      points: normalizedPoints,
    };
  }, [hydraulicSummary.total.hydrojets, project.poolPreset?.depth, project.poolPreset?.length, project.poolPreset?.width]);

  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const parseDiameterMm = (value?: string) => {
    if (!value) return 0;
    const mmMatch = value.match(/(\d+(\.\d+)?)\s*mm/i);
    if (mmMatch) return Number(mmMatch[1]);
    const inchMatch = value.match(/(\d+(\.\d+)?)\s*"/);
    if (inchMatch) return Number(inchMatch[1]) * 25.4;
    return 0;
  };

  const buildSelectedItem = (item: PlumbingItem, quantity: number): SelectedItem => ({
    itemId: item.id,
    itemName: item.name,
    quantity,
    diameter: item.diameter,
    category: item.category,
    pricePerUnit: item.pricePerUnit,
  });

  const findCatalogItem = (matcher: (item: PlumbingItem) => boolean) =>
    plumbingItems.find(matcher);

  const getAutomaticSelection = React.useMemo(() => {
    if (!pipeCalculation || plumbingItems.length === 0) return [] as SelectedItem[];

    const automaticItems: SelectedItem[] = [];
    const pushItem = (item: PlumbingItem | undefined, quantity: number) => {
      if (!item || quantity <= 0) return;
      const existing = automaticItems.find((entry) => entry.itemId === item.id);
      if (existing) {
        existing.quantity += quantity;
      } else {
        automaticItems.push(buildSelectedItem(item, quantity));
      }
    };

    pipeCalculation.pipeRequirements.forEach((requirement) => {
      const targetDiameter = parseDiameterMm(requirement.diameter);
      const pipeItem = findCatalogItem((item) =>
        item.category === 'PIPE' &&
        parseDiameterMm(item.diameter) === targetDiameter
      );

      if (pipeItem) {
        const baseLength = pipeItem.length && pipeItem.length > 0 ? pipeItem.length : 6;
        const quantity = pipeItem.unit.toLowerCase().includes('m')
          ? Math.ceil(requirement.totalMeters)
          : Math.ceil(requirement.totalMeters / baseLength);
        pushItem(pipeItem, quantity);
      }
    });

    pipeCalculation.fittings.elbows90.forEach((entry) => {
      const targetDiameter = parseDiameterMm(entry.diameter);
      const elbow90 = findCatalogItem((item) => {
        const name = normalize(item.name);
        return item.category === 'FITTING' &&
          parseDiameterMm(item.diameter) === targetDiameter &&
          name.includes('codo') &&
          name.includes('90');
      });
      pushItem(elbow90, entry.quantity);
    });

    pipeCalculation.fittings.elbows45.forEach((entry) => {
      const targetDiameter = parseDiameterMm(entry.diameter);
      const elbow45 = findCatalogItem((item) => {
        const name = normalize(item.name);
        return item.category === 'FITTING' &&
          parseDiameterMm(item.diameter) === targetDiameter &&
          name.includes('codo') &&
          name.includes('45');
      });
      pushItem(elbow45, entry.quantity);
    });

    pipeCalculation.fittings.tees.forEach((entry) => {
      const targetDiameter = parseDiameterMm(entry.diameter);
      const teeItem = findCatalogItem((item) => {
        const name = normalize(item.name);
        return item.category === 'FITTING' &&
          parseDiameterMm(item.diameter) === targetDiameter &&
          (name.includes('tee') || name.includes('te '));
      });
      pushItem(teeItem, entry.quantity);
    });

    pipeCalculation.fittings.couplings.forEach((entry) => {
      const targetDiameter = parseDiameterMm(entry.diameter);
      const couplingItem = findCatalogItem((item) => {
        const name = normalize(item.name);
        return item.category === 'FITTING' &&
          parseDiameterMm(item.diameter) === targetDiameter &&
          (name.includes('cupla') || name.includes('copla') || name.includes('union'));
      });
      pushItem(couplingItem, entry.quantity);
    });

    pipeCalculation.fittings.reducers.forEach((entry) => {
      const fromDiameter = parseDiameterMm(entry.fromDiameter);
      const toDiameter = parseDiameterMm(entry.toDiameter);
      const reducerItem = findCatalogItem((item) => {
        const name = normalize(item.name);
        const itemDiameter = normalize(item.diameter || '');
        return item.category === 'FITTING' &&
          (name.includes('redu') || name.includes('buje')) &&
          (itemDiameter.includes(String(Math.round(fromDiameter))) || name.includes(String(Math.round(fromDiameter)))) &&
          (itemDiameter.includes(String(Math.round(toDiameter))) || name.includes(String(Math.round(toDiameter))));
      });
      pushItem(reducerItem, entry.quantity);
    });

    pipeCalculation.fittings.adapters.forEach((entry) => {
      const targetDiameter = parseDiameterMm(entry.diameter);
      const normalizedThread = normalize(entry.threadSize);
      const adapterItem = findCatalogItem((item) => {
        const name = normalize(item.name);
        return item.category === 'FITTING' &&
          (name.includes('manguito') || name.includes('adaptador') || name.includes('buje rosca')) &&
          parseDiameterMm(item.diameter) === targetDiameter &&
          name.includes(normalizedThread.replace(/\s+/g, ''));
      });
      pushItem(adapterItem, entry.quantity);
    });

    pipeCalculation.fittings.valves.forEach((entry) => {
      const desired = normalize(entry.type);
      const targetDiameter = parseDiameterMm(entry.diameter);
      const valveItem = findCatalogItem((item) => {
        const name = normalize(item.name);
        return item.category === 'VALVE' &&
          (targetDiameter === 0 || parseDiameterMm(item.diameter) === targetDiameter) &&
          (name.includes(desired) || (desired.includes('check') && name.includes('check')) || (desired.includes('bola') && name.includes('bola')));
      });
      pushItem(valveItem, entry.quantity);
    });

    const adhesiveItem = findCatalogItem((item) => {
      const name = normalize(item.name);
      return (item.category === 'ACCESSORY' || item.category === 'FITTING') &&
        (name.includes('pegamento') || name.includes('adhesivo') || name.includes('cemento pvc') || name.includes('solvente'));
    });
    if (adhesiveItem) {
      const quantity = adhesiveItem.unit.toLowerCase().includes('lt')
        ? Math.ceil(pipeCalculation.fittings.adhesive.quantity)
        : Math.max(1, Math.ceil(pipeCalculation.summary.totalMeters / 45));
      pushItem(adhesiveItem, quantity);
    }

    return automaticItems;
  }, [pipeCalculation, plumbingItems]);

  useEffect(() => {
    loadPlumbingItems();
    loadExistingConfig();
  }, []);

  useEffect(() => {
    calculatePipes();
  }, [distanceToEquipment, project]);

  const calculatePipes = () => {
    try {
      const calculation = plumbingCalculationService.calculateFromProject(project, distanceToEquipment);
      setPipeCalculation(calculation);
    } catch (error) {
      console.error('Error calculating pipes:', error);
    }
  };

  const loadPlumbingItems = async () => {
    try {
      const items = await plumbingItemService.getAll();
      setPlumbingItems(items);
    } catch (error) {
      console.error('Error al cargar items de plomería:', error);
    }
  };

  const loadExistingConfig = () => {
    if (project.plumbingConfig && typeof project.plumbingConfig === 'object') {
      const config = project.plumbingConfig as any;
      if (config.selectedItems) {
        setSelectedItems(config.selectedItems);
      }
      if (config.distanceToEquipment) {
        setDistanceToEquipment(config.distanceToEquipment);
      }
      if (config.hydraulicLayout) {
        setHydraulicLayout(ensureHydraulicLayout(config.hydraulicLayout));
      }
    }
    hasLoadedConfigRef.current = true;
  };

  useEffect(() => {
    if (project.plumbingConfig && typeof project.plumbingConfig === 'object' && (project.plumbingConfig as any).hydraulicLayout) return;
    setHydraulicLayout(buildDefaultHydraulicLayout(project, hydraulicSummary));
  }, [project, hydraulicSummary]);

  const updateHydraulicPoint = (pointId: string, updates: Partial<HydraulicPointDraft>) => {
    setHydraulicLayout((prev) => ({
      ...prev,
      points: prev.points.map((point) => point.id === pointId ? { ...point, ...updates } : point),
    }));
  };

  const updateEquipmentPosition = (updates: { referenceSide: HydraulicReferenceSide; equipmentOffsetMeters: number; distanceToEquipment: number }) => {
    setHydraulicLayout((prev) => ({
      ...prev,
      referenceSide: updates.referenceSide,
      equipmentOffsetMeters: updates.equipmentOffsetMeters,
    }));
    setDistanceToEquipment(updates.distanceToEquipment);
  };

  const updateEquipmentWorkspaceLayout = React.useCallback((layout: EquipmentWorkspaceLayout) => {
    setHydraulicLayout((prev) => ({
      ...prev,
      equipmentWorkspaceLayout: layout,
    }));
  }, []);

  React.useEffect(() => {
    if (!floatingSelectedPointId && hydraulicLayout.points[0]?.id) {
      setFloatingSelectedPointId(hydraulicLayout.points[0].id);
      return;
    }
    if (floatingSelectedPointId && !hydraulicLayout.points.some((point) => point.id === floatingSelectedPointId)) {
      setFloatingSelectedPointId(hydraulicLayout.points[0]?.id || null);
    }
  }, [hydraulicLayout.points, floatingSelectedPointId]);

  const getPointVerticalDistanceToEquipment = (point: HydraulicPointDraft) =>
    Number((hydraulicLayout.equipmentHeightFromZero + point.depthMeters).toFixed(2));

  const handleAddItem = (item: PlumbingItem) => {
    const existing = selectedItems.find((si) => si.itemId === item.id);
    if (existing) {
      setSelectedItems(selectedItems.map((si) =>
        si.itemId === item.id ? { ...si, quantity: si.quantity + 1 } : si
      ));
    } else {
      setSelectedItems([...selectedItems, {
        itemId: item.id,
        itemName: item.name,
        quantity: 1,
        diameter: item.diameter,
        category: item.category,
        pricePerUnit: item.pricePerUnit,
      }]);
    }
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setSelectedItems(selectedItems.filter((si) => si.itemId !== itemId));
    } else {
      setSelectedItems(selectedItems.map((si) =>
        si.itemId === itemId ? { ...si, quantity } : si
      ));
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems(selectedItems.filter((si) => si.itemId !== itemId));
  };

  const handleSave = () => {
    const config = {
      distanceToEquipment,
      selectedItems: calculationMode === 'automatic' ? getAutomaticSelection : selectedItems,
      hydraulicLayout,
    };
    onSave(config);
  };

  const persistedHydraulicFingerprint = React.useMemo(() => {
    if (!project.plumbingConfig || typeof project.plumbingConfig !== 'object') {
      return '';
    }

    const config = project.plumbingConfig as any;
    return JSON.stringify({
      distanceToEquipment: config.distanceToEquipment ?? 5,
      hydraulicLayout: config.hydraulicLayout ? ensureHydraulicLayout(config.hydraulicLayout) : null,
    });
  }, [ensureHydraulicLayout, project.plumbingConfig]);

  React.useEffect(() => {
    latestHydraulicConfigRef.current = {
      distanceToEquipment,
      selectedItems: calculationMode === 'automatic' ? getAutomaticSelection : selectedItems,
      hydraulicLayout,
    };
  }, [calculationMode, distanceToEquipment, getAutomaticSelection, hydraulicLayout, selectedItems]);

  React.useEffect(() => () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
  }, []);

  const handleHydraulicInteractionCommit = React.useCallback(() => {
    if (!onAutoSave) return;
    if (!hasLoadedConfigRef.current) return;

    const nextConfig = latestHydraulicConfigRef.current;
    if (!nextConfig) return;

    const nextFingerprint = JSON.stringify({
      distanceToEquipment: nextConfig.distanceToEquipment,
      hydraulicLayout: nextConfig.hydraulicLayout,
    });

    if (nextFingerprint === persistedHydraulicFingerprint) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      onAutoSave(latestHydraulicConfigRef.current);
    }, 250);
  }, [onAutoSave, persistedHydraulicFingerprint]);

  const filteredItems = plumbingItems.filter((item) => {
    const matchesSearch = !searchTerm ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.diameter?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = !categoryFilter || item.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const categoryOptions = [
    { value: '', label: 'Todas las categorías' },
    { value: 'PIPE', label: 'Cañería' },
    { value: 'FITTING', label: 'Accesorios' },
    { value: 'VALVE', label: 'Válvulas' },
    { value: 'ACCESSORY', label: 'Otros' },
  ];

  const totalCost = selectedItems.reduce((sum, item) =>
    sum + (item.quantity * item.pricePerUnit), 0
  );

  return (
    <div className="space-y-6">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-1.5 flex gap-2 shadow-[0_12px_32px_rgba(0,0,0,0.22)]">
        <button
          onClick={() => setCalculationMode('automatic')}
          className={`flex-1 px-6 py-4 rounded-lg font-medium transition-all ${
            calculationMode === 'automatic'
              ? 'bg-zinc-100 text-zinc-950 shadow-md'
              : 'text-zinc-300 hover:bg-zinc-900'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Calculator size={20} />
            <span className="text-base">Cálculo Automático</span>
          </div>
          <p className="text-sm mt-1 opacity-90">Recomendado - Calcula caños automáticamente</p>
        </button>
        <button
          onClick={() => setCalculationMode('manual')}
          className={`flex-1 px-6 py-4 rounded-lg font-medium transition-all ${
            calculationMode === 'manual'
              ? 'bg-zinc-100 text-zinc-950 shadow-md'
              : 'text-zinc-300 hover:bg-zinc-900'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Search size={20} />
            <span className="text-base">Selección Manual</span>
          </div>
          <p className="text-sm mt-1 opacity-90">Selecciona items específicos del catálogo</p>
        </button>
      </div>

      <Card className="bg-zinc-950 border border-zinc-800 text-zinc-100">
        <h3 className="text-xl font-semibold text-white mb-4">Información del Sistema Hidráulico</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
            <p className="text-base text-zinc-300 mb-1">Skimmers</p>
            <p className="text-3xl font-bold text-white">{hydraulicSummary.total.skimmers}</p>
            <p className="text-sm text-zinc-400 mt-2">
              Base {hydraulicSummary.base.skimmers}
              {hydraulicSummary.added.skimmers > 0 ? ` + ${hydraulicSummary.added.skimmers} agregado(s)` : ''}
            </p>
          </div>

          <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
            <p className="text-base text-zinc-300 mb-1">Retornos</p>
            <p className="text-3xl font-bold text-white">{hydraulicSummary.total.returns}</p>
            <p className="text-sm text-zinc-400 mt-2">
              Base {hydraulicSummary.base.returns}
              {hydraulicSummary.added.returns > 0 ? ` + ${hydraulicSummary.added.returns} agregado(s)` : ''}
            </p>
          </div>

          <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
            <p className="text-base text-zinc-300 mb-1">Hidrojets</p>
            <p className="text-3xl font-bold text-white">{hydraulicSummary.total.hydrojets}</p>
            <p className="text-sm text-zinc-400 mt-2">
              Extra hidráulico
              {hydraulicSummary.total.hydrojets > 0 ? ` · ${hydraulicSummary.total.hydrojets} configurado(s)` : ' · sin hidrojets'}
            </p>
          </div>
        </div>

        {(hydraulicSummary.added.items.length > 0 || hydraulicSummary.total.hydrojets > 0) && (
          <div className="mb-6 rounded-xl border border-emerald-800/60 bg-emerald-950/30 p-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300 mb-3">Agregados detectados en el proyecto</p>
            <div className="flex flex-wrap gap-2">
              {hydraulicSummary.total.hydrojets > 0 && (
                <span className="rounded-full border border-amber-700/70 bg-amber-900/30 px-3 py-1 text-sm text-amber-100">
                  Hidrojets extra x{hydraulicSummary.total.hydrojets}
                </span>
              )}
              {hydraulicSummary.added.items.map((item, index) => (
                <span key={`${item.kind}-${item.name}-${index}`} className="rounded-full border border-emerald-700/70 bg-emerald-900/40 px-3 py-1 text-sm text-emerald-100">
                  {item.name} x{item.quantity}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Input
              type="number"
              label="Distancia a Cabecera/Equipo (metros)"
              value={distanceToEquipment}
              onChange={(e) => setDistanceToEquipment(parseFloat(e.target.value) || 0)}
              min={0}
              step={0.5}
            />
            <p className="text-sm text-zinc-400 mt-2">Distancia desde el borde de la piscina hasta donde estará el equipo de filtrado</p>
          </div>
          <div>
            <Input
              type="number"
              step={0.05}
              label="Altura del equipo respecto a nivel 0"
              value={hydraulicLayout.equipmentHeightFromZero}
              onChange={(e) => setHydraulicLayout((prev) => ({
                ...prev,
                equipmentHeightFromZero: parseFloat(e.target.value) || 0,
              }))}
            />
            <p className="text-sm text-zinc-400 mt-2">Usamos el borde superior de la piscina como nivel 0. Positivo si el equipo queda más alto.</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Lateral de referencia"
            options={SIDE_OPTIONS}
            value={hydraulicLayout.referenceSide}
            onChange={(e) => setHydraulicLayout((prev) => ({
              ...prev,
              referenceSide: e.target.value as HydraulicReferenceSide,
            }))}
          />
          <Input
            type="number"
            step={0.05}
            label="Offset del equipo sobre lateral"
            value={hydraulicLayout.equipmentOffsetMeters}
            onChange={(e) => setHydraulicLayout((prev) => ({
              ...prev,
              equipmentOffsetMeters: parseFloat(e.target.value) || 0,
            }))}
          />
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            type="number"
            step={0.05}
            label="Altura base del equipo desde piso técnico"
            value={hydraulicLayout.equipmentBaseHeightFromFloor}
            onChange={(e) => setHydraulicLayout((prev) => ({
              ...prev,
              equipmentBaseHeightFromFloor: parseFloat(e.target.value) || 0,
            }))}
          />
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Equipo editable</p>
            <p className="mt-2 text-sm text-zinc-300">
              Arrastralo en la vista flotante para cambiar lateral, offset sobre el borde y distancia real al equipo.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h4 className="font-semibold text-white">Datos técnicos de trazado</h4>
              <p className="text-sm text-zinc-400 mt-1">Cargá lateral, distancia y profundidad de cada boca o retorno para avanzar después al cálculo real de ramales y alturas.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500 uppercase tracking-wide">{hydraulicLayout.points.length} puntos</span>
              <button
                type="button"
                onClick={() => setShowTechnicalPreview(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 hover:border-zinc-500"
              >
                <ScanLine size={16} />
                Vista técnica flotante
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {hydraulicLayout.points.map((point) => (
              <div key={point.id} className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_160px_160px_180px] gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                <div>
                  <p className="font-medium text-white">{point.label}</p>
                  <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wide">{point.kind.replace('_', ' ')}</p>
                </div>
                <Select
                  label="Lateral"
                  options={POINT_SIDE_OPTIONS}
                  value={point.side}
                  onChange={(e) => updateHydraulicPoint(point.id, {
                    side: e.target.value as HydraulicPointSide,
                    offsetMeters: e.target.value === 'internal_wall'
                      ? Number((internalWallSpanMeters / 2).toFixed(2))
                      : point.offsetMeters,
                  })}
                />
                <Input
                  type="number"
                  step={0.05}
                  label="Distancia sobre lateral"
                  value={point.offsetMeters}
                  onChange={(e) => updateHydraulicPoint(point.id, { offsetMeters: parseFloat(e.target.value) || 0 })}
                />
                <div>
                  <Input
                    type="number"
                    step={0.05}
                    label="Profundidad desde nivel 0"
                    value={point.depthMeters}
                    onChange={(e) => updateHydraulicPoint(point.id, { depthMeters: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="mt-1 text-[11px] text-zinc-500">Cota equipo vs punto: {getPointVerticalDistanceToEquipment(point)} m</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="bg-zinc-950 border border-zinc-800 text-zinc-100">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-white">Esquema de Instalación Hidráulica</h3>
            <p className="mt-2 max-w-2xl text-base text-zinc-300">
              La planta hidráulica quedó concentrada en una ventana flotante para trabajar con más espacio y sin ensuciar el editor principal.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setShowTechnicalPreview(true)}
            className="shrink-0"
          >
            <ScanLine size={16} className="mr-2" />
            Abrir ventana flotante
          </Button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Referencia</p>
            <p className="mt-2 text-lg font-semibold text-white">{SIDE_LABELS[hydraulicLayout.referenceSide]}</p>
            <p className="mt-1 text-sm text-zinc-400">Equipo a {distanceToEquipment.toFixed(2)} m</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Puntos cargados</p>
            <p className="mt-2 text-lg font-semibold text-white">{hydraulicLayout.points.length}</p>
            <p className="mt-1 text-sm text-zinc-400">Bocas hidráulicas editables</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Geometría</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {project.poolPreset?.length?.toFixed(2)} m x {project.poolPreset?.width?.toFixed(2)} m
            </p>
            <p className="mt-1 text-sm text-zinc-400">Playa húmeda y escaleras en la ventana flotante</p>
          </div>
        </div>
      </Card>

      {calculationMode === 'automatic' && pipeCalculation && (
        <Card className="bg-zinc-950 border border-zinc-800 text-zinc-100">
          <div className="flex items-center gap-2 mb-4">
            <Calculator size={20} className="text-zinc-200" />
            <h3 className="text-xl font-semibold text-white">Cálculo Automático de Caños</h3>
          </div>

          <>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                <p className="text-base text-zinc-300 mb-1">Distancia Máxima</p>
                <p className="text-3xl font-bold text-white">{pipeCalculation.summary.maxDistance}m</p>
                <p className="text-sm text-zinc-400 mt-1">Desde extremo más alejado</p>
              </div>
              <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                <p className="text-base text-zinc-300 mb-1">Total Accesorios</p>
                <p className="text-3xl font-bold text-white">{pipeCalculation.summary.totalAccessories}</p>
                <p className="text-sm text-zinc-400 mt-1">Skimmers, retornos, etc.</p>
              </div>
              <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                <p className="text-base text-zinc-300 mb-1">Total Caños</p>
                <p className="text-3xl font-bold text-white">{pipeCalculation.summary.totalMeters}m</p>
                <p className="text-sm text-zinc-400 mt-1">Metros lineales estimados</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-lg text-white mb-2">Desglose por Tipo de Línea</h4>
              {pipeCalculation.pipeRequirements.map((req, index) => (
                <div key={index} className="border border-zinc-800 rounded-xl p-4 bg-zinc-900">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-1 text-xs font-medium rounded bg-zinc-800 text-zinc-200">
                          {req.lineType}
                        </span>
                        <h5 className="font-medium text-base text-white">{req.description}</h5>
                      </div>
                      <p className="text-base text-zinc-300">
                        Diámetro recomendado: <strong>{req.diameter}</strong>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-white">{req.totalMeters}m</p>
                      <p className="text-sm text-zinc-400">{req.accessoryCount} × {req.metersPerAccessory.toFixed(1)}m</p>
                    </div>
                  </div>

                  {req.recommendations.length > 0 && (
                    <div className="mt-3 p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={16} className="text-zinc-300 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-zinc-200 mb-1">Recomendaciones:</p>
                          <ul className="text-sm text-zinc-300 space-y-1">
                            {req.recommendations.map((rec, idx) => (
                              <li key={idx}>• {rec}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
              <p className="text-base text-zinc-100 font-medium mb-2">Cómo se calculan estos valores:</p>
              <ul className="text-sm text-zinc-300 space-y-1.5">
                <li>• Se toma la distancia desde el extremo más alejado de la piscina hasta el equipo</li>
                <li>• Se calcula por cada accesorio (skimmer, retorno, hidrojet, etc.)</li>
                <li>• Se incluye un 15% adicional para codos, subidas y conexiones</li>
                <li>• Los diámetros se recomiendan según la cantidad de accesorios en cada línea</li>
                <li>• Se consideran tanto los accesorios del preset como los adicionales agregados</li>
              </ul>
            </div>
          </>
        </Card>
      )}

      {calculationMode === 'manual' && (
        <>
          <Card className="bg-zinc-950 border border-zinc-800 text-zinc-100">
            <h3 className="text-xl font-semibold text-white mb-4">Catálogo de Plomería</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="relative">
                <Input
                  placeholder="Buscar por nombre o diámetro..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>

              <Select
                options={categoryOptions}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              />
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredItems.length === 0 ? (
                <p className="text-center text-zinc-400 text-base py-8">
                  No se encontraron items. Configurá items de plomería en Settings.
                </p>
              ) : (
                filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 border border-zinc-800 rounded-xl bg-zinc-900 hover:bg-zinc-900/80"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-base text-white">{item.name}</p>
                      <p className="text-base text-zinc-300">
                        {item.diameter && `Ø ${item.diameter} · `}
                        {item.category} · ${item.pricePerUnit.toLocaleString('es-AR')}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddItem(item)}
                    >
                      <Plus size={14} className="mr-1" />
                      Agregar
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="bg-zinc-950 border border-zinc-800 text-zinc-100">
            <h3 className="text-xl font-semibold text-white mb-4">Items Seleccionados</h3>

            {selectedItems.length === 0 ? (
              <p className="text-center text-zinc-400 text-base py-8">
                No hay items seleccionados. Agregá items del catálogo arriba.
              </p>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {selectedItems.map((item) => (
                    <div
                      key={item.itemId}
                      className="flex items-center justify-between p-4 border border-zinc-800 rounded-xl bg-zinc-900"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-base text-white">{item.itemName}</p>
                        <p className="text-base text-zinc-300">
                          {item.diameter && `Ø ${item.diameter} · `}
                          ${item.pricePerUnit.toLocaleString('es-AR')} × {item.quantity} = ${(item.pricePerUnit * item.quantity).toLocaleString('es-AR')}
                        </p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleUpdateQuantity(item.itemId, parseInt(e.target.value) || 0)}
                          min={1}
                          className="w-20"
                        />
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleRemoveItem(item.itemId)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-zinc-800 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-lg text-white">Total Plomería:</span>
                    <span className="text-2xl font-bold text-white">
                      ${totalCost.toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>
              </>
            )}
          </Card>
        </>
      )}

      {calculationMode === 'automatic' && (
        <Card className="bg-zinc-950 border border-zinc-800 text-zinc-100">
          <h3 className="text-xl font-semibold text-white mb-4">Selección automática sugerida</h3>
          {getAutomaticSelection.length === 0 ? (
            <p className="text-sm text-zinc-400">No se encontraron ítems del catálogo para materializar el cálculo automático.</p>
          ) : (
            <div className="space-y-3">
              {getAutomaticSelection.map((item) => (
                <div key={item.itemId} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <div>
                    <p className="font-medium text-white">{item.itemName}</p>
                    <p className="text-sm text-zinc-400">{item.diameter ? `Ø ${item.diameter} · ` : ''}{item.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-white">{item.quantity}</p>
                    <p className="text-xs text-zinc-500">{item.pricePerUnit.toLocaleString('es-AR')} c/u</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <div className="flex justify-end space-x-3">
        <Button onClick={handleSave}>
          <Save size={16} className="mr-2" />
          {calculationMode === 'automatic' ? 'Guardar Configuración Automática' : 'Guardar Configuración'}
        </Button>
      </div>

      {showTechnicalPreview && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            onClick={() => setShowTechnicalPreview(false)}
          />
          <div className="relative z-[1101] h-[96vh] w-[98vw] overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <div>
                <h3 className="text-2xl font-bold text-white">Vista Técnica Hidráulica</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  La vista se actualiza al instante mientras cambiás laterales, distancias, profundidades y cota del equipo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTechnicalPreview(false)}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 hover:border-zinc-500"
              >
                Cerrar
              </button>
            </div>
            <div className="h-[calc(96vh-96px)] overflow-y-auto p-6">
              <HydraulicCssPreview
                project={project}
                hydraulicLayout={hydraulicLayout}
                distanceToEquipment={distanceToEquipment}
                activePointId={floatingSelectedPointId}
                onPointSelect={setFloatingSelectedPointId}
                onPointMove={updateHydraulicPoint}
                onEquipmentMove={updateEquipmentPosition}
                onInteractionCommit={handleHydraulicInteractionCommit}
                onOpenEquipmentWorkspace={() => setShowEquipmentWorkspace(true)}
              />
            </div>
          </div>
        </div>
      , document.body)}

      {showEquipmentWorkspace && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[1110] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            onClick={() => setShowEquipmentWorkspace(false)}
          />
          <div className="relative z-[1111] h-[98vh] w-[99vw] overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <div>
                <h3 className="text-2xl font-bold text-white">Workspace del Equipo</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  Espacio ampliado para dibujar bombas, válvulas, entradas y salidas del equipo con comodidad.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEquipmentWorkspace(false)}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 hover:border-zinc-500"
              >
                Cerrar
              </button>
            </div>
            <div className="h-[calc(98vh-96px)] overflow-y-auto p-6">
              <EquipmentWorkspacePreview
                project={project}
                hydraulicSummary={hydraulicSummary}
                hydraulicLayout={hydraulicLayout}
                distanceToEquipment={distanceToEquipment}
                onLayoutChange={updateEquipmentWorkspaceLayout}
                onInteractionCommit={handleHydraulicInteractionCommit}
              />
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
};
