export type AutomaticProgressStageState = 'pending' | 'in_progress' | 'completed';

export interface AutomaticProgressTimelineItem {
  id?: string;
  type?: 'PROJECT_UPDATE' | 'AGENDA_EVENT' | 'AGENDA_MESSAGE' | string;
  title?: string;
  description?: string | null;
  category?: string | null;
  event?: {
    status?: string | null;
    type?: string | null;
    title?: string | null;
    location?: string | null;
  } | null;
}

export interface AutomaticProgressStage {
  category: string;
  label: string;
  percent: number;
  state: AutomaticProgressStageState;
  weight: number;
  taskCount: number;
  evidence: string[];
}

export interface AutomaticProjectProgress {
  percent: number;
  evidenceCount: number;
  stages: AutomaticProgressStage[];
  stageByCategory: Record<string, AutomaticProgressStage>;
}

type TaskLike = {
  name?: string;
  description?: string;
  estimatedHours?: number;
  status?: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  excavation: 'Excavación',
  floor: 'Solado y colocación',
  hydraulic: 'Hidráulica',
  electrical: 'Eléctrica',
  tiles: 'Losetas',
  finishes: 'Terminaciones',
  additionals: 'Adicionales',
  other: 'Otros',
};

const CATEGORY_ORDER = ['excavation', 'floor', 'hydraulic', 'electrical', 'tiles', 'finishes', 'additionals', 'other'];

const CATEGORY_RANK: Record<string, number> = {
  excavation: 0,
  floor: 1,
  hydraulic: 2,
  electrical: 2,
  tiles: 3,
  finishes: 4,
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  excavation: [
    'excavacion', 'excavar', 'pozo', 'terreno', 'replanteo', 'marcacion',
    'movimiento de suelo', 'movimiento suelo', 'retiro de suelo',
  ],
  floor: [
    'solado', 'cama', 'nivelacion', 'compactacion', 'base', 'asentamiento',
    'traslado', 'izaje', 'pasada', 'pasar piscina', 'colocacion de piscina',
    'colocacion piscina', 'posicionamiento de piscina', 'casco de piscina',
  ],
  hydraulic: [
    'hidraul', 'caneria', 'cañeria', 'skimmer', 'retorno', 'barrefondo',
    'desague', 'desagüe', 'filtro', 'bomba', 'hidrojet', 'fuga',
    'prueba hidraulica', 'cabecera', 'impulsion', 'succion',
  ],
  electrical: [
    'electric', 'tablero', 'iluminacion', 'luminaria', 'luces', 'luz led',
    'cableado', 'disyuntor', 'termica', 'térmica', 'puesta a tierra',
  ],
  tiles: [
    'loseta', 'losetas', 'baldosa', 'vereda', 'solarium', 'pegado',
    'pastina', 'marmolina', 'coronamiento',
  ],
  finishes: [
    'terminacion', 'terminaciones', 'limpieza final', 'puesta en marcha',
    'llenado', 'prueba final', 'entrega final', 'entrega de obra',
  ],
  additionals: ['adicional', 'extra', 'accesorio adicional'],
};

const normalize = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const safeTasks = (value: unknown): TaskLike[] => {
  if (Array.isArray(value)) return value as TaskLike[];
  if (value && typeof value === 'object') return [value as TaskLike];
  return [];
};

const stateFromPercent = (percent: number): AutomaticProgressStageState => {
  if (percent >= 99.5) return 'completed';
  if (percent > 0) return 'in_progress';
  return 'pending';
};

const legacyTaskFraction = (task: TaskLike) => {
  if (task.status === 'completed') return 1;
  if (task.status === 'in_progress') return 0.45;
  return 0;
};

const getTimelineStrength = (item: AutomaticProgressTimelineItem) => {
  if (item.type === 'AGENDA_MESSAGE') return 0;

  if (item.type === 'AGENDA_EVENT') {
    const status = normalize(item.event?.status).toUpperCase();
    if (status === 'DONE') return 1;
    if (status === 'IN_PROGRESS') return 0.55;
    return 0;
  }

  if (item.type === 'PROJECT_UPDATE') {
    const category = normalize(item.category).toUpperCase();
    if (category === 'MILESTONE') return 1;
    if (category === 'DELIVERY') return 0.9;
    if (category === 'INSPECTION') return 0.8;
    if (category === 'PROGRESS') return 0.6;
    return 0;
  }

  return 0;
};

const itemText = (item: AutomaticProgressTimelineItem) =>
  normalize([
    item.title,
    item.description,
    item.event?.title,
    item.event?.location,
  ].filter(Boolean).join(' '));

const classifyCategories = (text: string) => {
  const matches: string[] = [];
  Object.entries(CATEGORY_KEYWORDS).forEach(([category, keywords]) => {
    if (keywords.some((keyword) => text.includes(normalize(keyword)))) matches.push(category);
  });
  return matches;
};

const summarizeEvidence = (item: AutomaticProgressTimelineItem) => {
  if (item.type === 'AGENDA_EVENT') {
    const status = item.event?.status ? ` · ${item.event.status}` : '';
    return `Agenda: ${item.event?.title || item.title || 'evento'}${status}`;
  }
  return `Timeline: ${item.title || 'actualización'}`;
};

export function calculateAutomaticProjectProgress(
  project: { status?: string; tasks?: unknown },
  timelineItems: AutomaticProgressTimelineItem[] = []
): AutomaticProjectProgress {
  const tasks = (project.tasks && typeof project.tasks === 'object' ? project.tasks : {}) as Record<string, unknown>;
  const categories = Array.from(new Set([...CATEGORY_ORDER, ...Object.keys(tasks)]));

  const stageMap = new Map<string, AutomaticProgressStage>();

  categories.forEach((category) => {
    const categoryTasks = safeTasks(tasks[category]);
    const taskWeight = categoryTasks.reduce((sum, task) => sum + Math.max(0.5, Number(task.estimatedHours || 0)), 0);
    const fallbackWeight = categoryTasks.length || (CATEGORY_RANK[category] !== undefined ? 1 : 0.5);
    const weight = taskWeight > 0 ? taskWeight : fallbackWeight;

    let legacyWeighted = 0;
    let legacyWeight = 0;
    categoryTasks.forEach((task) => {
      const taskHours = Math.max(0.5, Number(task.estimatedHours || 0));
      legacyWeighted += legacyTaskFraction(task) * taskHours;
      legacyWeight += taskHours;
    });

    const legacyPercent = legacyWeight > 0 ? (legacyWeighted / legacyWeight) * 100 : 0;

    stageMap.set(category, {
      category,
      label: CATEGORY_LABELS[category] || category,
      percent: legacyPercent,
      state: stateFromPercent(legacyPercent),
      weight,
      taskCount: categoryTasks.length,
      evidence: legacyPercent > 0 ? ['Historial previo de tareas'] : [],
    });
  });

  timelineItems.forEach((item) => {
    const strength = getTimelineStrength(item);
    if (strength <= 0) return;

    const text = itemText(item);
    const matchedCategories = classifyCategories(text);
    if (matchedCategories.length === 0) return;

    matchedCategories.forEach((category) => {
      const stage = stageMap.get(category);
      if (!stage) return;
      const evidencePercent = strength * 100;
      if (evidencePercent > stage.percent) stage.percent = evidencePercent;
      const evidence = summarizeEvidence(item);
      if (!stage.evidence.includes(evidence)) stage.evidence.push(evidence);
    });
  });

  if (project.status === 'COMPLETED') {
    stageMap.forEach((stage) => {
      stage.percent = 100;
      if (!stage.evidence.includes('Proyecto marcado como completado')) {
        stage.evidence.push('Proyecto marcado como completado');
      }
    });
  }

  // Si un hito constructivo posterior está confirmado, las etapas que necesariamente
  // debieron ocurrir antes se consideran completas. Hidráulica y eléctrica comparten
  // rango porque pueden ejecutarse en paralelo.
  let highestCompletedRank = -1;
  stageMap.forEach((stage) => {
    const rank = CATEGORY_RANK[stage.category];
    if (rank !== undefined && stage.percent >= 99.5) highestCompletedRank = Math.max(highestCompletedRank, rank);
  });

  if (highestCompletedRank > 0) {
    stageMap.forEach((stage) => {
      const rank = CATEGORY_RANK[stage.category];
      if (rank !== undefined && rank < highestCompletedRank && stage.percent < 100) {
        stage.percent = 100;
        if (!stage.evidence.includes('Inferido por secuencia constructiva')) {
          stage.evidence.push('Inferido por secuencia constructiva');
        }
      }
    });
  }

  const stages = categories
    .map((category) => stageMap.get(category)!)
    .filter(Boolean)
    .map((stage) => ({
      ...stage,
      percent: Math.max(0, Math.min(100, stage.percent)),
      state: stateFromPercent(stage.percent),
    }))
    .filter((stage) => stage.taskCount > 0 || stage.evidence.length > 0)
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));

  const totalWeight = stages.reduce((sum, stage) => sum + Math.max(0.5, stage.weight), 0);
  const weightedProgress = stages.reduce(
    (sum, stage) => sum + (stage.percent / 100) * Math.max(0.5, stage.weight),
    0
  );
  const percent = totalWeight > 0 ? (weightedProgress / totalWeight) * 100 : 0;

  const stageByCategory = Object.fromEntries(stages.map((stage) => [stage.category, stage]));
  const evidenceCount = new Set(stages.flatMap((stage) => stage.evidence)).size;

  return {
    percent: project.status === 'COMPLETED' ? 100 : Math.max(0, Math.min(100, percent)),
    evidenceCount,
    stages,
    stageByCategory,
  };
}
