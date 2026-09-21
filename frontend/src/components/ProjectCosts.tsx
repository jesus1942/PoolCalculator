import React, { useEffect, useMemo, useState } from 'react';
import { Project } from '@/types';
import { calculateProjectFinancials, COST_UNITS, getCosting, validateCosting, type CostLine, type CostingSettings } from '@/utils/projectCosting';
import api from '@/services/api';
import '@/theme/project-costs.css';

interface Props { project: Project; canEdit?: boolean; onReload?: () => void | Promise<void>; onDirtyChange?: (dirty: boolean) => void; }
const kinds = { material: 'Materiales', labor: 'Mano de obra', machine: 'Máquinas', transport: 'Transporte' };
const money = (n: number) => new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:2}).format(n);
const preset = (name: string,unit: CostLine['unit'],kind: CostLine['kind'],capacity?: number): CostLine => ({id:`manual:${name}`,name,unit,kind,quantity:1,rate:0,source:'Preset de Costos',included:true,...(capacity ? {capacity}:{})});
const PRESETS = [
  preset('Trabajo por hora','HOUR','labor'),preset('Cuadrilla · horas hombre','HH','labor'),preset('Equipo · horas máquina','HM','machine'),
  preset('Trabajo por superficie','M2','labor'),preset('Trabajo por metro lineal','ML','labor'),preset('Trabajo por unidad','UNIT','labor'),
  preset('Jornada de trabajo','DAY','labor'),preset('Material por volumen','M3','material'),
  preset('Agua · camionada','LOAD','material'),preset('Arena · camionada','LOAD','material'),preset('Piedra · camionada','LOAD','material'),
  preset('Arena por m³','M3','material'),preset('Piedra por m³','M3','material'),preset('Flete por viaje','UNIT','transport'),preset('Servicio a precio global','FIXED','labor'),
];

/** Editor único de partidas. Los borradores no alteran el presupuesto hasta guardar. */
export const ProjectCosts: React.FC<Props> = ({project,canEdit=false,onReload,onDirtyChange}) => {
  const [draft,setDraft] = useState<CostingSettings>(() => getCosting(project));
  const [dirty,setDirty] = useState(false);
  const [saving,setSaving] = useState(false);
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');
  const [choice,setChoice] = useState('0');
  const [filter,setFilter] = useState('all');
  const [people,setPeople] = useState(2);
  const [hours,setHours] = useState(8);
  const [volume,setVolume] = useState(0);
  const [capacity,setCapacity] = useState(0);
  const [rate,setRate] = useState(0);
  const [supply,setSupply] = useState('Agua');
  useEffect(() => { if (!dirty) setDraft(getCosting(project)); },[project]);
  useEffect(() => { onDirtyChange?.(dirty); },[dirty,onDirtyChange]);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => {if(dirty){event.preventDefault();event.returnValue='';}}; window.addEventListener('beforeunload',warn); return () => window.removeEventListener('beforeunload',warn); },[dirty]);
  const financials = useMemo(() => calculateProjectFinancials({...project,exportSettings:{...(project.exportSettings as any),costing:draft}}),[project,draft]);
  const options = [...PRESETS,...draft.presets];
  const change = (next: CostingSettings) => {setDraft(next);setDirty(true);setMessage('');setError('');};
  /** Actualiza una partida manual o registra un ajuste explícito sobre su fuente. */
  const edit = (line: CostLine,patch: Partial<CostLine>) => {
    if(line.id.startsWith('manual:')) change({...draft,items:draft.items.map(item => item.id === line.id ? {...item,...patch}:item)});
    else change({...draft,overrides:{...draft.overrides,[line.id]:{...draft.overrides[line.id],...patch}}});
  };
  const add = (line: CostLine) => change({...draft,items:[...draft.items,{...line,id:`manual:${crypto.randomUUID()}`} ]});
  /** Guardado validado y versionado; un conflicto conserva el borrador en pantalla. */
  const save = async () => {
    if(saving) return;
    setSaving(true);setError('');
    try {
      const payload=validateCosting(draft);
      const {data}=await api.put(`/projects/${project.id}/costing`,payload);
      setDraft(data);setDirty(false);onDirtyChange?.(false);setMessage('Costos guardados. Las exportaciones usarán estos importes.');
      await onReload?.();
    } catch(e:any) {setError(e.response?.data?.error || e.message || 'No se pudieron guardar los costos.');}
    finally {setSaving(false);}
  };
  const reset = () => {setDraft(getCosting(project));setDirty(false);setMessage('Borrador descartado.');setError('');};
  const numeric = (value:string) => value === '' ? 0 : Number(value);
  return <div className="pcost">
    <header className="pcost-heading"><div><p className="pcost-eyebrow">EL PRESUPUESTO, EN UN SOLO LUGAR</p><h2>Costos de la obra</h2><p>Cantidades × tarifas. Cada partida indica de dónde sale y si entra en el total.</p></div><span className="pcost-revision">Revisión {draft.revision} · ARS</span></header>
    <div className="pcost-summary" aria-live="polite"><div><span>Materiales y suministros</span><strong>{money(financials.totalMaterialCost)}</strong></div><div><span>Mano de obra y servicios</span><strong>{money(financials.totalLaborCost)}</strong></div><div className="pcost-total"><span>{dirty?'Total del borrador':'Total del presupuesto'}</span><strong>{money(financials.grandTotal)}</strong></div></div>
    {error && <p role="alert" className="pcost-warning">{error}</p>}{message && <p role="status">{message}</p>}
    <section className="pcost-panel"><h3>1. Criterio de mano de obra</h3><label>Origen del precio base<select disabled={!canEdit || saving} value={draft.laborMode} onChange={e=>change({...draft,laborMode:e.target.value as any})}><option value="legacy">Conservar criterio del proyecto (tarifa de modelo o tareas)</option><option value="tasks">Calcular desde las tareas, sin sumar la tarifa del modelo</option></select></label><p>Las tarifas por rol se copian al generar tareas; cambiar un rol no revaloriza trabajos ya presupuestados. Los ajustes de esta tabla tienen prioridad para esta obra.</p>
    {financials.warnings.length>0 && <details><summary>Revisiones del presupuesto ({financials.warnings.length})</summary><ul>{financials.warnings.map((warning,index)=><li key={index}>{warning}</li>)}</ul></details>}</section>
    <section className="pcost-panel"><div className="pcost-section-title"><h3>2. Partidas del presupuesto</h3><label>Mostrar<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Todas las partidas</option>{Object.entries(kinds).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label></div>
    <p>Desmarcá una partida si está incluida en otra. Una tarifa de $0 se respeta; no se reemplaza con el precio del catálogo.</p>
    <fieldset disabled={!canEdit || saving}><div className="pcost-table-wrap"><table><thead><tr><th>Incluir</th><th>Concepto y origen</th><th>Tipo</th><th>Unidad</th><th>Cantidad</th><th>Tarifa ARS</th><th>Subtotal</th><th>Ajustes</th></tr></thead><tbody>{financials.lines.filter(line=>filter==='all'||line.kind===filter).map(line=><tr key={line.id} className={!line.included?'pcost-excluded':''}>
    <td><input type="checkbox" aria-label={`Incluir ${line.name}`} checked={line.included} onChange={e=>edit(line,{included:e.target.checked})}/></td>
    <td><input aria-label={`Concepto ${line.name}`} value={line.name} onChange={e=>edit(line,{name:e.target.value})}/><small>{line.source}{draft.overrides[line.id]?' · Ajustado en Costos':''}{line.capacity?` · ${line.capacity} m³/camionada`:''}</small></td>
    <td><select aria-label={`Tipo de ${line.name}`} value={line.kind} onChange={e=>edit(line,{kind:e.target.value as any})}>{Object.entries(kinds).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></td>
    <td><select aria-label={`Unidad de ${line.name}`} value={line.unit} onChange={e=>edit(line,{unit:e.target.value as any})}>{Object.entries(COST_UNITS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></td>
    <td><input type="number" min="0" step="0.01" aria-label={`Cantidad de ${line.name}`} value={line.quantity} onChange={e=>edit(line,{quantity:numeric(e.target.value)})}/></td>
    <td><input type="number" min="0" step="0.01" aria-label={`Tarifa de ${line.name}`} value={line.rate} onChange={e=>edit(line,{rate:numeric(e.target.value)})}/></td><td className="pcost-money">{money(line.total)}</td>
    <td><div className="pcost-row-actions">{line.id.startsWith('manual:')?<button type="button" onClick={()=>change({...draft,items:draft.items.filter(item=>item.id!==line.id)})}>Quitar</button>:draft.overrides[line.id] && <button type="button" onClick={()=>{const next={...draft.overrides};delete next[line.id];change({...draft,overrides:next});}}>Restaurar origen</button>}<button type="button" onClick={()=>change({...draft,presets:[...draft.presets,{...line,id:`manual:${crypto.randomUUID()}`,source:'Preset guardado de esta obra'}]})}>Guardar preset</button></div></td>
    </tr>)}</tbody></table></div></fieldset></section>
    {canEdit && <section className="pcost-panel"><h3>3. Presets y cantidades</h3><p>Los presets definen la unidad; completá tu tarifa real. Se guardan en esta obra. No se agregan costos automáticamente.</p><fieldset disabled={saving}>
    <div className="pcost-controls"><label>Preset<select value={choice} onChange={e=>setChoice(e.target.value)}>{options.map((item,index)=><option key={index} value={index}>{item.name} · {COST_UNITS[item.unit]}</option>)}</select></label><button type="button" onClick={()=>add(options[Number(choice)])}>Agregar partida</button></div>
    <div className="pcost-tools"><div><h4>Horas hombre / máquina</h4><p>2 personas × 8 horas = 16 horas hombre. Para máquinas, ingresá la cantidad de equipos y horas de uso.</p><label>Personas o equipos<input type="number" min="1" value={people} onChange={e=>setPeople(numeric(e.target.value))}/></label><label>Horas por persona/equipo<input type="number" min="0" step="0.25" value={hours} onChange={e=>setHours(numeric(e.target.value))}/></label><div className="pcost-controls"><button type="button" disabled={people<=0||hours<=0} onClick={()=>add({...preset('Cuadrilla · horas hombre','HH','labor'),quantity:people*hours})}>Agregar {people*hours} HH</button><button type="button" disabled={people<=0||hours<=0} onClick={()=>add({...preset('Equipos · horas máquina','HM','machine'),quantity:people*hours})}>Agregar {people*hours} HM</button></div></div>
    <div><h4>Suministros por camionada</h4><p>Se redondea hacia arriba la cantidad de viajes. La tarifa es por camionada completa, no por m³.</p><label>Suministro<select value={supply} onChange={e=>setSupply(e.target.value)}>{['Agua','Arena','Piedra'].map(s=><option key={s}>{s}</option>)}</select></label><div className="pcost-controls"><label>Necesidad (m³)<input type="number" min="0" step="0.01" value={volume} onChange={e=>setVolume(numeric(e.target.value))}/></label><label>Capacidad (m³/viaje)<input type="number" min="0.01" step="0.01" value={capacity} onChange={e=>setCapacity(numeric(e.target.value))}/></label><label>Precio por viaje (ARS)<input type="number" min="0" step="0.01" value={rate} onChange={e=>setRate(numeric(e.target.value))}/></label></div><button type="button" disabled={capacity<=0||volume<=0||rate<0} onClick={()=>add({...preset(`${supply} · camionada`,'LOAD','material',capacity),quantity:Math.ceil(volume/capacity),rate})}>Agregar {capacity>0?Math.ceil(volume/capacity):0} camionadas</button></div></div></fieldset></section>}
    {canEdit && <div className="pcost-save"><span>{dirty?'Tenés cambios sin guardar.':'Los importes guardados alimentan Vista General y Exportar.'}</span><button type="button" disabled={!dirty||saving} onClick={reset}>Descartar borrador</button><button className="pcost-primary" type="button" disabled={!dirty||saving} onClick={save}>{saving?'Guardando…':'Guardar costos'}</button></div>}
  </div>;
};
