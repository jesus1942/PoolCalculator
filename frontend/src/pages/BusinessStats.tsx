import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectService } from '@/services/projectService';
import type { Project } from '@/types';
import { businessRows, summarizeBusiness, changeLabel, STATUS_NAMES } from '@/utils/businessStats';
import { HdActivity, HdDroplet, HdCheck, HdFolderOpen } from '@/components/ui/HandDrawnIcons';

const number = (n:number) => n.toLocaleString('es-AR', { maximumFractionDigits: 3 });
const money = (n:number) => n.toLocaleString('es-AR', { style:'currency', currency:'ARS', maximumFractionDigits:0 });
const months=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
export function BusinessStats() {
  const [projects,setProjects]=useState<Project[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  const [reload,setReload]=useState(0);
  const [year,setYear]=useState('all');
  const [metric,setMetric]=useState<'completed'|'water'|'amount'>('completed');
  useEffect(()=>{
    let active=true; setLoading(true); setError(false);
    projectService.getAll().then(data=>{if(active)setProjects(data);}).catch(()=>{if(active)setError(true);}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[reload]);
  const rows=useMemo(()=>businessRows(projects),[projects]);
  const years=[...new Set(rows.map(r=>r.year).filter(Number.isFinite))].sort((a,b)=>b-a);
  const selected=year==='all'?rows:rows.filter(r=>r.year===Number(year));
  const summary=summarizeBusiness(selected);
  const previous=summarizeBusiness(rows.filter(r=>r.year===Number(year)-1));
  const historical=summarizeBusiness(rows);
  const canSeeMoney=rows.some(r=>r.amount!==null);
  const format=metric==='amount'?money:number;
  const buckets=year==='all'?years.slice().reverse().map(y=>({label:String(y),current:summarizeBusiness(rows.filter(r=>r.year===y))[metric],previous:null as number|null})):
    months.map((label,m)=>({label,current:summarizeBusiness(selected.filter(r=>r.month===m))[metric],previous:summarizeBusiness(rows.filter(r=>r.year===Number(year)-1&&r.month===m))[metric]}));
  const max=Math.max(1,...buckets.flatMap(b=>[b.current,b.previous||0]));
  const cards=[
    {label:'Instalaciones completadas',value:number(summary.completed),detail:'Obras con estado Completado',delta:changeLabel(summary.completed,previous.completed),icon:HdCheck},
    {label:'Agua en obras completadas',value:`${number(summary.water)} m³`,detail:`${number(summary.water*1000)} litros estimados`,delta:changeLabel(summary.water,previous.water),icon:HdDroplet},
    {label:'Instalaciones en marcha',value:number(summary.active),detail:'Aprobadas + en ejecución',delta:changeLabel(summary.active,previous.active),icon:HdFolderOpen},
    ...(canSeeMoney?[{label:'Importe de instalaciones',value:money(summary.amount),detail:'Presupuestadas, aprobadas, en ejecución y completadas',delta:changeLabel(summary.amount,previous.amount),icon:HdActivity}]:[]),
  ];
  return <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-8" style={{color:'var(--ink)'}}>
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs uppercase tracking-widest" style={{color:'var(--accent)'}}>Tu negocio en perspectiva</p><h1 className="mt-2 text-3xl font-semibold">Estadísticas</h1><p className="mt-2 text-sm" style={{color:'var(--ink-soft)'}}>Instalaciones, agua y evolución económica de tus proyectos.</p></div>
      <button className="rough-panel px-4 py-3 text-sm" disabled={loading} onClick={()=>setReload(n=>n+1)}>Actualizar datos</button>
    </header>
    {loading?<p role="status">Cargando indicadores…</p>:error?<div className="rough-panel p-6" role="alert">No se pudieron cargar los proyectos. <button className="underline" onClick={()=>setReload(n=>n+1)}>Reintentar</button></div>:<>
      <section className="rough-panel rough-panel--accent flex flex-wrap justify-between gap-5 p-5">
        <div><p className="text-xs uppercase tracking-wider">Acumulado histórico</p><p className="mt-2 text-lg font-semibold">{number(historical.completed)} instalaciones completadas · {number(historical.water)} m³ de agua estimada</p><p className="mt-1 text-sm">{number(historical.total)} proyectos registrados en tu acceso actual.</p></div>
        <label className="flex flex-col gap-2 text-sm">Comparar por año de creación<select className="rounded-lg border p-2" style={{background:'var(--card)',color:'var(--ink)'}} value={year} onChange={e=>setYear(e.target.value)}><option value="all">Todo el historial</option>{years.map(y=><option key={y} value={y}>{y} vs. {y-1}</option>)}</select></label>
      </section>
      {!rows.length&&<div className="rough-panel p-6"><h2 className="font-semibold">Tu historial empieza con la primera obra</h2><p className="my-2">Los indicadores se actualizarán con los proyectos que registres.</p><Link className="underline" to="/projects">Ir a Proyectos</Link></div>}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(card=><article key={card.label} className="rough-panel min-w-0 p-5"><card.icon size={23} style={{color:'var(--accent)'}}/><h2 className="mt-4 text-sm">{card.label}</h2><p className="my-2 break-words text-2xl font-semibold">{card.value}</p><p className="text-xs leading-relaxed" style={{color:'var(--ink-soft)'}}>{card.detail}</p>{year!=='all'&&<p className="mt-3 text-xs font-semibold">{card.delta}</p>}</article>)}</section>
      {summary.restricted>0&&<p role="status" className="text-sm">Los importes son parciales: {summary.restricted} proyecto(s) sin permiso para ver datos económicos.</p>}
      <section className="rough-panel p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-semibold">Evolución {year==='all'?'anual':'mensual'}</h2><p className="mt-1 text-xs">Proyectos agrupados por fecha de creación (UTC), con su estado e importe actuales.</p></div><label className="text-sm">Indicador <select className="ml-2 rounded border p-2" style={{background:'var(--card)'}} value={metric} onChange={e=>setMetric(e.target.value as typeof metric)}><option value="completed">Instalaciones completadas</option><option value="water">Agua estimada (m³)</option>{canSeeMoney&&<option value="amount">Importe de instalación (ARS)</option>}</select></label></div>
        <p className="mb-4 text-xs">Verde: {year==='all'?'total del año':year}. {year!=='all'&&`Ocre: ${Number(year)-1}. Comparación de años completos; el año en curso puede estar incompleto.`}</p>
        <div className="space-y-3">{buckets.map(b=><div key={b.label} className="grid grid-cols-[3rem_1fr] items-center gap-3 text-xs"><span>{b.label}</span><div className="space-y-1"><div className="flex items-center gap-2"><div aria-hidden="true" className="h-3 rounded-sm" style={{width:`${b.current/max*65}%`,background:'var(--accent)',minWidth:b.current?3:0}}/><span>{format(b.current)}</span></div>{b.previous!==null&&<div className="flex items-center gap-2"><div aria-hidden="true" className="h-3 rounded-sm" style={{width:`${b.previous/max*65}%`,background:'var(--warm)',minWidth:b.previous?3:0}}/><span>{format(b.previous)} <span className="sr-only">año anterior</span></span></div>}</div></div>)}</div>
      </section>
      <section className="grid gap-4 sm:grid-cols-3"><div className="rough-panel p-5"><h2 className="text-sm">Agua prevista en obras en marcha</h2><p className="mt-2 text-xl font-semibold">{number(summary.projectedWater)} m³</p></div><div className="rough-panel p-5"><h2 className="text-sm">Presupuestos pendientes</h2><p className="mt-2 text-xl font-semibold">{summary.budgeted}</p></div>{canSeeMoney&&<div className="rough-panel p-5"><h2 className="text-sm">Importe de obras completadas</h2><p className="mt-2 text-xl font-semibold">{money(summary.completedAmount)}</p><p className="mt-1 text-xs">Valor de instalación; no equivale a cobros.</p></div>}</section>
      <section className="rough-panel p-5"><h2 className="mb-4 text-xl font-semibold">Proyectos que componen los indicadores</h2><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-3">Proyecto / cliente</th><th className="p-3">Creado</th><th className="p-3">Estado actual</th><th className="p-3">Capacidad de agua</th>{canSeeMoney&&<th className="p-3">Instalación (ARS)</th>}</tr></thead><tbody>{selected.map(r=><tr key={r.project.id} className="border-b"><td className="p-3"><Link className="font-semibold underline" to={`/projects/${r.project.id}`}>{r.project.name}</Link><p className="text-xs">{r.project.clientName}</p></td><td className="whitespace-nowrap p-3">{new Date(r.project.createdAt).toLocaleDateString('es-AR',{timeZone:'UTC'})}</td><td className="p-3">{STATUS_NAMES[r.project.status]}</td><td className="p-3">{r.water?`${number(r.water)} m³`:'Sin datos'}<p className="text-xs">{r.waterSource==='BROCHURE'?'Folleto':'Estimación geométrica'}</p></td>{canSeeMoney&&<td className="whitespace-nowrap p-3">{r.amount===null?'Sin permiso':money(r.amount)}{['DRAFT','CANCELLED'].includes(r.project.status)&&<p className="text-xs">Fuera del acumulado económico</p>}</td>}</tr>)}</tbody></table></div></section>
      <details className="rough-panel p-5 text-sm"><summary className="cursor-pointer font-semibold">Cómo se calculan estos indicadores</summary><div className="mt-3 space-y-2 leading-relaxed"><p>Importes: propuesta de instalación guardada, respetando partidas excluidas y adicionales. No incluye materiales. Borradores y cancelados no se suman. Son valores actuales en pesos nominales; no hay registro de cobros ni ajuste por inflación.</p><p>Agua: suma de la capacidad de las piscinas completadas, desde el folleto o las dimensiones del modelo. Es una estimación de llenado, no un registro de camiones entregados, recargas ni consumo medido. {summary.missingWater} obra(s) completadas sin volumen disponible.</p><p>Comparaciones: fecha de creación del proyecto, no fecha de finalización ni de cobro. Cambiar el estado, modelo o presupuesto modifica los indicadores. Cada proyecto se cuenta una sola vez y sólo se incluyen proyectos a los que tenés acceso.</p></div></details>
    </>}
  </div>;
}
