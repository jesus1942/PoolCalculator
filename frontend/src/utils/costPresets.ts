import { normalizeBudgetLine, type CostLine, type CostingSettings } from './projectCosting';

/** Coloca las partidas existentes en una categoría reconocible del catálogo. */
export function getPresetCategory(line: CostLine): string {
  if (line.category) return line.category;
  if (line.kind==='material') return /hidrául|eléctric|caño|cable|luminaria/i.test(`${line.name} ${line.source}`)?'Materiales hidráulicos y eléctricos':'Materiales de obra';
  if (line.kind!=='labor') return 'Máquinas y traslados';
  if (/loseta|vereda|borde|terminaci/i.test(line.name)) return 'Veredas y terminaciones';
  if (/luz|luces|accesorio|adicional|equipo/i.test(line.name)) return 'Luces y accesorios';
  if (line.unit==='FIXED') return 'Instalación base';
  return 'Horas de trabajo';
}
/** Reutiliza el identificador al guardar otra vez el mismo preset: no crea duplicados. */
export function upsertCostPreset(settings: CostingSettings, line: CostLine, newId: string) {
  const category=getPresetCategory(line);
  const existing=settings.presets.find(p=>p.id===line.id) || settings.presets.find(p=>p.name.trim().toLocaleLowerCase()===line.name.trim().toLocaleLowerCase() && p.kind===line.kind && p.unit===line.unit && getPresetCategory(p)===category);
  const preset=normalizeBudgetLine({...line,id:existing?.id || newId,name:line.name.trim(),category,source:'Preset guardado de esta obra',included:true});
  return {preset,settings:{...settings,presets:[...settings.presets.filter(p=>p.id!==preset.id),preset]}};
}
/** Preservar los cambios de partidas aún sin guardar al recibir la revisión del preset. */
export function mergeSavedPreset(draft: CostingSettings, saved: CostingSettings, preset: CostLine): CostingSettings {
  return {...draft,revision:saved.revision,presets:[...draft.presets.filter(p=>p.id!==preset.id),preset]};
}
