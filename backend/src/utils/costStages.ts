/** Etapas de presentación del presupuesto; no modifican tarifas ni dependencias técnicas. */
export const COST_STAGES = {
  scope:'Alcance general',
  excavation:'1. Replanteo y excavación',
  base:'2. Preparación de base',
  placement:'3. Colocación del casco',
  hydraulic:'4. Instalación hidráulica',
  electrical:'5. Instalación eléctrica e iluminación',
  paving:'6. Losetas y vereda',
  finishes:'7. Rellenos y terminaciones',
  delivery:'8. Pruebas y entrega',
  supplies:'Materiales y suministros',
  other:'Otros trabajos y servicios',
} as const;
export type CostStage = keyof typeof COST_STAGES;
type StageLine = {id:string;name:string;kind:string;source?:string;stage?:CostStage};
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
/** Respeta la etapa elegida; para datos anteriores infiere por trabajo y categoría de origen. */
export function getCostStage(line: StageLine): CostStage {
  if(line.stage && Object.prototype.hasOwnProperty.call(COST_STAGES,line.stage)) return line.stage;
  if(line.kind==='material') return 'supplies';
  const name=normalize(line.name);
  if(/pruebas.*entrega|entrega tecnica|puesta en marcha/.test(name)) return 'delivery';
  if(/replanteo|marcacion|excavacion|perfilado|compactacion/.test(name)) return 'excavation';
  if(/geomembrana|cama de apoyo|preparacion de base|solado/.test(name)) return 'base';
  if(/posicionamiento|nivelacion.*casco|colocacion.*casco/.test(name)) return 'placement';
  if(/loseta|vereda|remate|borde perimetral/.test(name)) return 'paving';
  if(/relleno|terminacion|limpieza/.test(name)) return 'finishes';
  if(/luces|luz|electrica|cableado|iluminacion/.test(name)) return 'electrical';
  if(/hidraulica|caneria|cabecera|bomba|filtro|skimmer|retorno|hidrojet/.test(name)) return 'hydraulic';
  const category=line.id.split(':')[1];
  const categories:Record<string,CostStage>={excavation:'excavation',floor:'base',hydraulic:'hydraulic',electrical:'electrical',tiles:'paving',finishes:'finishes'};
  if(line.id.startsWith('task:')&&categories[category]) return categories[category];
  if(line.id==='base:labor'||/instalacion base|servicio base/.test(name)) return 'scope';
  return 'other';
}
const withinStage=(line:StageLine)=>{
  const name=normalize(line.name);
  if(/replanteo|marcacion/.test(name)) return 0;
  if(/excavacion|perfilado/.test(name)) return 1;
  if(/compactacion/.test(name)) return 2;
  if(/primera vuelta|colocacion.*loseta|vereda/.test(name)) return 0;
  if(/ajuste|corte|remate/.test(name)) return 1;
  return 0;
};
/** Orden estable: mantiene el orden original cuando las partidas comparten prioridad. */
export function sortCostLines<T extends StageLine>(lines:T[]) {
  const order=Object.keys(COST_STAGES);
  return lines.map(line=>({...line,stage:getCostStage(line),stageLabel:COST_STAGES[getCostStage(line)]})).sort((a,b)=>order.indexOf(a.stage)-order.indexOf(b.stage)||withinStage(a)-withinStage(b));
}
