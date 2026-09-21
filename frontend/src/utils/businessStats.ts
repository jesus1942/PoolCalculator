import type { Project } from '../types';
import { getQuote, installationSettings } from './costExport';
import { getPoolWaterVolume } from '../../../backend/src/utils/poolWaterVolume';

export const STATUS_NAMES: Record<string, string> = { DRAFT: 'Borrador', BUDGETED: 'Presupuestado', APPROVED: 'Aprobado', IN_PROGRESS: 'En ejecución', COMPLETED: 'Completado', CANCELLED: 'Cancelado' };
export function businessRows(projects: Project[]) {
  return [...new Map(projects.map(p => [p.id, p])).values()].map(project => {
    const water = getPoolWaterVolume(project.poolPreset || {}, project.volume);
    return {
      project, year: new Date(project.createdAt).getUTCFullYear(), month: new Date(project.createdAt).getUTCMonth(),
      water: water.volumeM3, waterSource: water.source,
      amount: project.currentUserAccess?.canViewFinancials === true
        ? getQuote(project, installationSettings(project.exportSettings?.templates?.client || {})).total : null,
    };
  });
}
export type BusinessRow = ReturnType<typeof businessRows>[number];
export function summarizeBusiness(rows: BusinessRow[]) {
  const live = rows.filter(r => r.project.status !== 'CANCELLED' && r.project.status !== 'DRAFT');
  const completed = live.filter(r => r.project.status === 'COMPLETED');
  const sum = (items: BusinessRow[]) => Math.round(items.reduce((n,r)=>n+(r.amount ?? 0),0)*100)/100;
  return {
    total: rows.length, completed: completed.length,
    active: live.filter(r => ['APPROVED','IN_PROGRESS'].includes(r.project.status)).length,
    budgeted: live.filter(r=>r.project.status==='BUDGETED').length,
    water: Math.round(completed.reduce((n,r)=>n+r.water,0)*1000)/1000,
    projectedWater: Math.round(live.filter(r=>['APPROVED','IN_PROGRESS'].includes(r.project.status)).reduce((n,r)=>n+r.water,0)*1000)/1000,
    amount: sum(live), completedAmount: sum(completed),
    average: live.filter(r=>r.amount!==null).length ? sum(live)/live.filter(r=>r.amount!==null).length : 0,
    restricted: live.filter(r=>r.amount===null).length,
    missingWater: completed.filter(r=>!r.water).length,
  };
}
export function changeLabel(current: number, previous: number) {
  if (!previous) return current ? 'Sin base anterior' : 'Sin variación';
  const change=(current-previous)/previous*100;
  return `${change>0?'+':''}${change.toLocaleString('es-AR',{maximumFractionDigits:1})}% vs. año anterior`;
}
