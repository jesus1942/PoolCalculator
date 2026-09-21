import { getCommercialInstallationProfile } from './commercialInstallationPricing';

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const getProjectAdditionals = (project: any): any[] =>
  ((project as any)?.additionals || (project as any)?.projectAdditionals || []) as any[];

export const getAdditionalName = (additional: any): string =>
  additional.customName ||
  additional.accessory?.name ||
  additional.equipment?.name ||
  additional.material?.name ||
  'Item adicional';

export const isBaseModelAdditional = (project: any, additional: any): boolean => {
  const poolPreset = (project as any)?.poolPreset;
  const equipmentId = additional?.equipmentId || additional?.equipment?.id;

  if (!poolPreset || !equipmentId) return false;

  return equipmentId === poolPreset.defaultPumpId || equipmentId === poolPreset.defaultFilterId;
};

export const calculateAdditionalCosts = (additionals: any[]) =>
  additionals.reduce(
    (acc, additional) => {
      const quantity = getAdditionalQuantity(additional);
      let materialCost = 0;
      let laborCost = 0;

      if (typeof additional.customPricePerUnit === 'number' && additional.customPricePerUnit >= 0) {
        materialCost = additional.customPricePerUnit * quantity;
      } else if (additional.accessory) {
        materialCost = (additional.accessory.pricePerUnit || 0) * quantity;
      } else if (additional.equipment) {
        materialCost = (additional.equipment.pricePerUnit || 0) * quantity;
      } else if (additional.material) {
        materialCost = (additional.material.pricePerUnit || 0) * quantity;
      }

      if (typeof additional.customLaborCost === 'number' && additional.customLaborCost >= 0) {
        laborCost = additional.customLaborCost * quantity;
      }

      acc.materialCost += materialCost;
      acc.laborCost += laborCost;
      return acc;
    },
    { materialCost: 0, laborCost: 0 }
  );

const getConfigItemName = (item: any) =>
  item?.itemName ||
  item?.name ||
  item?.label ||
  item?.description ||
  '';

export const getTasksLaborCost = (tasks: any, options?: { excludeAdditionals?: boolean }) => {
  const excludeAdditionals = options?.excludeAdditionals ?? false;
  return Object.entries(tasks || {}).reduce((sum: number, [category, categoryTasks]: [string, any]) => {
    if (excludeAdditionals && category === 'additionals') return sum;
    if (!Array.isArray(categoryTasks)) return sum;
    return sum + categoryTasks.reduce((inner: number, task: any) => inner + (task.laborCost || 0), 0);
  }, 0);
};

/** Conserva el criterio comercial existente sin volver a sumar sus componentes. */
const calculateLegacyFinancials = (project: any, _additionalsInput?: any[]) => {
  const tasksLaborCost = getTasksLaborCost(project.tasks, {excludeAdditionals:true});
  const commercial = getCommercialInstallationProfile(project);
  return {
    taskBaseLaborCost: tasksLaborCost,
    baseLaborCost: commercial.baseLaborCost,
    commercialBaseLaborCost: commercial.baseLaborCost,
    commercialPricingSource: commercial.pricingSource,
    commercialPricingRule: commercial.pricingRule,
    additionalsTaskLaborCost: getTasksLaborCost(project.tasks)-tasksLaborCost,
    tileLaborCost: Number(project.materials?.laborBreakdown?.tileInstaller?.cost || 0),
  };
};

/** Motor puro compartido: no consulta DB ni modifica el proyecto recibido. */
export const COST_UNITS = {
  HOUR: 'hora', HH: 'hora hombre', HM: 'hora máquina', DAY: 'jornada',
  KG: 'kg', BAG: 'bolsa', LITER: 'litro', M2: 'm²', ML: 'metro lineal', UNIT: 'unidad', M3: 'm³', LOAD: 'camionada', FIXED: 'global',
} as const;
export type CostUnit = keyof typeof COST_UNITS;
export type CostKind = 'material' | 'labor' | 'machine' | 'transport';
export interface CostLine {
  id: string; name: string; unit: CostUnit; quantity: number; rate: number;
  kind: CostKind; source: string; included: boolean; capacity?: number; category?: string;
}
export interface CostingSettings {
  revision: number; laborMode: 'legacy' | 'tasks';
  overrides: Record<string, Partial<CostLine>>; items: CostLine[]; presets: CostLine[];
}
export const EMPTY_COSTING: CostingSettings = { revision: 0, laborMode: 'legacy', overrides: {}, items: [], presets: [] };
const amount = (v: unknown) => { const n = typeof v === 'number' || typeof v === 'string' ? Number(v) : 0; return Number.isFinite(n) && n >= 0 ? n : 0; };
export const roundMoney = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
/** Sólo se cobran unidades extra: nunca las incluidas por el fabricante. */
export const getAdditionalQuantity = (a: any) => Math.max(0, amount(a.newQuantity) - amount(a.baseQuantity));
export const getCosting = (project: any): CostingSettings => ({ ...EMPTY_COSTING, ...(project.exportSettings?.costing || {}) });

/** Valida importes y unidades antes de persistir; cero es un precio válido. */
export function validateCosting(input: any): CostingSettings {
  if (!input || !Number.isInteger(input.revision) || input.revision < 0 || !['legacy','tasks'].includes(input.laborMode)) throw new Error('Revisión o modo de mano de obra inválido.');
  const cleanLine = (line: any, partial = false): any => {
    if (!line || typeof line !== 'object' || Array.isArray(line)) throw new Error('Partida inválida.');
    const out: any = {};
    for (const key of ['id','name','unit','kind','source','quantity','rate','included','capacity','category']) {
      if (partial && line[key] === undefined) continue;
      const value = line[key];
      if (['capacity','category'].includes(key) && value === undefined) continue;
      if (['quantity','rate','capacity'].includes(key)) {
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1e10 || (key === 'capacity' && value === 0)) throw new Error('Cantidad, tarifa o capacidad inválida.');
      } else if (key === 'unit') { if (!Object.prototype.hasOwnProperty.call(COST_UNITS,value)) throw new Error('Unidad inválida.'); }
      else if (key === 'kind') { if (!['material','labor','machine','transport'].includes(value)) throw new Error('Tipo de costo inválido.'); }
      else if (key === 'included') { if (typeof value !== 'boolean') throw new Error('Estado de partida inválido.'); }
      else if (typeof value !== 'string' || !value.trim() || value.length > 240 || ['__proto__','constructor','prototype'].includes(value)) throw new Error('Nombre o identificador inválido.');
      out[key] = value;
    }
    return out;
  };
  if (!input.overrides || Array.isArray(input.overrides) || typeof input.overrides !== 'object' || Object.keys(input.overrides).length > 1000) throw new Error('Ajustes inválidos.');
  const overrides: Record<string, Partial<CostLine>> = {};
  for (const [id,value] of Object.entries(input.overrides)) {
    if (!id || id.length > 240 || ['__proto__','constructor','prototype'].includes(id)) throw new Error('Identificador inválido.');
    const clean = cleanLine(value,true);
    delete clean.id; delete clean.source;
    overrides[id] = clean;
  }
  const list = (value: any) => {
    if (!Array.isArray(value) || value.length > 500) throw new Error('Demasiadas partidas.');
    const lines = value.map(v => cleanLine(v));
    if (new Set(lines.map(l => l.id)).size !== lines.length) throw new Error('Hay identificadores duplicados.');
    if (lines.some(l => !l.id.startsWith('manual:'))) throw new Error('Identificador de partida manual inválido.');
    return lines;
  };
  return { revision: input.revision, laborMode: input.laborMode, overrides, items: list(input.items), presets: list(input.presets) };
}

/** Traduce fuentes guardadas a partidas trazables, sin inventar tarifas de mercado. */
export function calculateProjectFinancials(project: any, additionalsInput?: any[]) {
  const legacy = calculateLegacyFinancials(project, additionalsInput);
  const settings = getCosting(project);
  const rows: CostLine[] = [];
  const add = (id: string,name: string,kind: CostKind,quantity: number,rate: number,source: string,unit: CostUnit = 'UNIT') => rows.push({id,name,kind,quantity:amount(quantity),rate:amount(rate),source,unit,included:true});
  const materialNames: Record<string,string> = {adhesive:'Adhesivo',cement:'Cemento de vereda',sand:'Arena de vereda',gravel:'Piedra de vereda',whiteCement:'Cemento blanco',marmolina:'Marmolina',wireMesh:'Malla de vereda',waterproofing:'Impermeabilizante',geomembrane:'Geomembrana',electroweldedMesh:'Malla de apoyo',sandForBed:'Arena de relleno',cementBags:'Cemento de apoyo',drainStone:'Piedra de drenaje'};
  const normalizeUnit = (unit:string): CostUnit => /m[³3]/.test(unit)?'M3':/m[²2]/.test(unit)?'M2':/bolsa/.test(unit)?'BAG':unit==='kg'?'KG':/^(m|ml|metro|metros)$/i.test(unit)?'ML':'UNIT';
  const materials = project.materials || {};
  const details = Object.entries(materialNames).filter(([key])=>amount(materials[key]?.quantity)>0).map(([key,name])=>({id:`base:material:${key}`,name,quantity:amount(materials[key].quantity),cost:amount(materials[key].cost),unit:normalizeUnit(materials[key].unit || '')}));
  (Array.isArray(materials.tiles)?materials.tiles:[]).forEach((tile:any,index:number)=>{if(amount(tile.quantity)>0) details.push({id:`base:tile:${tile.tileId || index}`,name:tile.tileName||'Loseta',quantity:amount(tile.quantity),cost:amount(tile.totalCost ?? tile.cost ?? amount(tile.pricePerUnit)*amount(tile.quantity)),unit:'UNIT'});});
  const detailsTotal=roundMoney(details.reduce((sum,item)=>sum+item.cost,0));
  // No sumar dos representaciones (bolsas/kg, m³/bolsones) ni modificar un total histórico inconsistente.
  if(details.length && detailsTotal <= amount(project.materialCost)+0.01){
    details.forEach(item=>add(item.id,item.name,'material',item.quantity,item.cost/item.quantity,'Cómputo de materiales',item.unit));
    const rest=roundMoney(amount(project.materialCost)-detailsTotal);
    if(rest>0) add('base:materials','Otros materiales incluidos en el cómputo','material',1,rest,'Saldo del cómputo guardado','FIXED');
  }else add('base:materials','Materiales de obra y losetas','material',1,project.materialCost,'Cómputo de materiales','FIXED');
  for (const [key,items,title] of [
    ['plumbing',project.plumbingConfig?.selectedItems,'Hidráulica'],
    ['electrical',project.electricalConfig?.items,'Eléctrica'],
  ] as const) {
    (Array.isArray(items) ? items : []).forEach((item: any,index: number) => add(`${key}:${item.id || item.itemId || index}`,getConfigItemName(item) || title,'material',item.quantity,item.pricePerUnit,title, normalizeUnit(item.unit || '')));
  }
  // No descartar partidas por parecido de nombres: sólo se omite una referencia exacta al mismo catálogo.
  const configItems = [...(Array.isArray(project.plumbingConfig?.selectedItems)?project.plumbingConfig.selectedItems:[]),...(Array.isArray(project.electricalConfig?.items)?project.electricalConfig.items:[])];
  const duplicates: any[] = [];
  const additionals = additionalsInput || getProjectAdditionals(project);
  additionals.forEach((a,index) => {
    const quantity = getAdditionalQuantity(a);
    const id = a.id || String(index);
    const rate = a.customPricePerUnit ?? a.accessory?.pricePerUnit ?? a.equipment?.pricePerUnit ?? a.material?.pricePerUnit ?? 0;
    const catalogIds=[a.accessoryId,a.equipmentId,a.materialId].filter(Boolean);
    const represented=configItems.filter(i=>catalogIds.some(id=>[i.accessoryId,i.equipmentId,i.materialId,i.itemId].includes(id))).reduce((sum,i)=>sum+amount(i.quantity),0);
    const covered=Math.max(0,represented-amount(a.baseQuantity));
    const charged=Math.max(0,quantity-covered);
    if(charged<quantity) duplicates.push(a);
    add(`additional:${id}:material`,getAdditionalName(a),'material',charged,rate,charged<quantity?'Adicional: descontado lo representado en configuración':'Adicional: cantidad extra');
    add(`additional:${id}:labor`,`${getAdditionalName(a)} — mano de obra`,'labor',quantity,a.customLaborCost,'Adicional: cantidad extra');
  });
  const taskEntries = Object.entries(project.tasks || {}).filter(([category,list]) => category !== 'additionals' && Array.isArray(list));
  const useTasks = settings.laborMode === 'tasks' || legacy.commercialPricingSource !== 'model_pricing';
  if (useTasks && taskEntries.some(([,list]) => (list as any[]).length > 0)) {
    taskEntries.forEach(([category,list]) => (list as any[]).forEach((task,index) => {
      // Los costos históricos son importes de tarea. La tarifa se deriva, no se vuelve a aplicar el rol global.
      const hours = amount(task.estimatedHours);
      add(`task:${category}:${task.id || index}`,task.name || 'Tarea','labor',hours || 1,hours ? amount(task.laborCost) / hours : amount(task.laborCost),`Tarea · ${category}`,hours ? 'HH':'FIXED');
    }));
  } else add('base:labor','Instalación base','labor',1,legacy.baseLaborCost,useTasks ? 'Importe guardado':'Tarifa comercial del modelo','FIXED');
  const extraLabor = rows.filter(r => r.id.startsWith('additional:') && r.kind === 'labor').reduce((sum,r) => sum + r.quantity*r.rate,0);
  const taskExtra = amount(legacy.additionalsTaskLaborCost);
  if (taskExtra > extraLabor) add('additional:labor:balance','Mano de obra adicional de tareas (diferencia)','labor',1,taskExtra-extraLabor,'Tareas adicionales: sin duplicar MO por accesorio','FIXED');
  const tileArea=amount(project.materials?.laborBreakdown?.tileInstaller?.area);
  add('tiles:labor','Colocación de losetas y vereda','labor',tileArea||1,tileArea?legacy.tileLaborCost/tileArea:legacy.tileLaborCost,'Cómputo de losetas',tileArea?'M2':'FIXED');
  const warnings: string[] = [];
  const ids = new Set(rows.map(r => r.id));
  if (ids.size !== rows.length) warnings.push('Hay identificadores repetidos en las fuentes. Revisá las partidas antes de exportar.');
  const lines = rows.map(r => ({...r,...settings.overrides[r.id],id:r.id,source:r.source})).concat(settings.items || []).map(r => ({...r,total:r.included ? roundMoney(amount(r.quantity)*amount(r.rate)):0}));
  for (const key of Object.keys(settings.overrides)) if (!ids.has(key)) warnings.push(`El ajuste ${key} ya no tiene una partida de origen; no se suma.`);
  if (duplicates.length) warnings.push(`${duplicates.length} adicional(es) ya representados por su referencia de catálogo en hidráulica/eléctrica; no se cobran dos veces.`);
  if (legacy.commercialPricingSource === 'model_pricing' && settings.laborMode === 'legacy') warnings.push('Instalación base por tarifa comercial del modelo; las tareas base no se suman. Podés elegir costeo por tareas.');
  if (lines.some(r => r.included && r.quantity > 0 && r.rate === 0)) warnings.push('Hay partidas incluidas sin tarifa; revisalas antes de emitir la propuesta.');
  const sum = (predicate: (r: CostLine) => boolean) => roundMoney(lines.filter(predicate).reduce((total,r) => total + r.total,0));
  const totalMaterialCost = sum(r => r.kind === 'material');
  const totalLaborCost = sum(r => r.kind !== 'material');
  const additionalsCosts = {materialCost:sum(r => r.id.startsWith('additional:') && r.kind === 'material'),laborCost:sum(r => r.id.startsWith('additional:') && r.kind !== 'material')};
  const tileLaborCost = sum(r => r.id === 'tiles:labor' && r.kind !== 'material');
  return {...legacy, lines, warnings, settings, additionals, rawAdditionals: additionalsInput || getProjectAdditionals(project), duplicatedAdditionals:duplicates,
    additionalsCosts, duplicatedAdditionalsCosts:calculateAdditionalCosts(duplicates),
    plumbingCosts:sum(r => r.id.startsWith('plumbing:') && r.kind === 'material'),electricalCosts:sum(r => r.id.startsWith('electrical:') && r.kind === 'material'),
    baseMaterialCost:roundMoney(totalMaterialCost-additionalsCosts.materialCost),
    baseLaborCost:roundMoney(totalLaborCost-additionalsCosts.laborCost-tileLaborCost),
    tileLaborCost,totalMaterialCost,totalLaborCost,grandTotal:roundMoney(totalMaterialCost+totalLaborCost)};
}
