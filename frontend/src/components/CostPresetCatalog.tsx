import React, { useEffect, useMemo, useState } from 'react';
import { getPresetCategory } from '@/utils/costPresets';
import { normalizeBudgetLine, COST_UNITS, type CostLine } from '@/utils/projectCosting';

const categories = ['Instalación base', 'Luces y accesorios', 'Veredas y terminaciones', 'Horas de trabajo', 'Máquinas y traslados', 'Materiales de obra', 'Materiales hidráulicos y eléctricos'];
const make = (category: string, name: string, unit: CostLine['unit'], kind: CostLine['kind'] = 'labor'): CostLine => ({id:`preset:${name}`, category, name, unit, kind, quantity:1, rate:0, source:'Catálogo de presets', included:true});
const catalog: CostLine[] = [
  make(categories[0], 'Instalación de piscina · servicio base', 'FIXED'),
  make(categories[1], 'Mano de obra · luz adicional', 'UNIT'),
  make(categories[1], 'Mano de obra · accesorio adicional', 'UNIT'),
  make(categories[1], 'Mano de obra · equipo adicional', 'UNIT'),
  make(categories[2], 'Colocación de vereda', 'M2'),
  make(categories[2], 'Colocación de borde', 'ML'),
  make(categories[2], 'Terminación por superficie', 'M2'),
  make(categories[3], 'Trabajo por hora', 'HOUR'),
  make(categories[3], 'Cuadrilla · horas hombre', 'HH'),
  make(categories[3], 'Jornada de trabajo', 'DAY'),
  make(categories[4], 'Equipo · horas máquina', 'HM', 'machine'),
  make(categories[4], 'Traslado por viaje', 'UNIT', 'transport'),
  ...['Agua','Arena','Piedra'].flatMap(name=>[make(categories[5], `${name} por m³`, 'M3','material'), make(categories[5], `${name} · camionada`, 'LOAD','material')]),
  make(categories[5], 'Cemento por bolsa', 'BAG', 'material'),
  make(categories[5], 'Losetas por m²', 'M2', 'material'),
  make(categories[6], 'Caño por metro lineal', 'ML', 'material'),
  make(categories[6], 'Cable por metro lineal', 'ML', 'material'),
  make(categories[6], 'Luminaria por unidad', 'UNIT', 'material'),
  make(categories[6], 'Accesorio por unidad', 'UNIT', 'material'),
];
const kinds = {labor:'Mano de obra', material:'Material', machine:'Máquina', transport:'Transporte'};
const categoryFor = getPresetCategory;
interface Props { saved: CostLine[]; onAdd: (line: CostLine)=>void; focusedPreset: CostLine|null; onSave: (line: CostLine)=>Promise<CostLine|null>; onRemove: (id: string)=>void; }

/** Catálogo reutilizable: editar una tarifa de preset no cambia partidas ya presupuestadas. */
export function CostPresetCatalog({saved,focusedPreset,onAdd,onSave,onRemove}: Props) {
  const [category,setCategory] = useState(categories[0]);
  const [query,setQuery] = useState('');
  const [draft,setDraft] = useState<CostLine>(catalog[0]);
  const [message,setMessage] = useState('');
  useEffect(()=>{if(focusedPreset){setCategory(categoryFor(focusedPreset));setQuery('');setDraft(focusedPreset);setMessage('Preset guardado en esta obra.');}},[focusedPreset]);
  const options=useMemo(()=>[...saved,...catalog].filter(item=>categoryFor(item)===category && item.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())),[saved,category,query]);
  const valid=!!draft.name.trim() && Number.isFinite(draft.quantity) && draft.quantity>0 && Number.isFinite(draft.rate) && draft.rate>=0;
  return <div className="pcost-catalog">
    <div className="pcost-controls"><label>Categoría<select value={category} onChange={e=>{setCategory(e.target.value);setMessage('');}}>{categories.map(name=><option key={name}>{name}</option>)}</select></label><label>Buscar preset<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Luz, vereda, arena…"/></label></div>
    <div className="pcost-preset-list">{options.map(item=><button type="button" key={item.id} aria-pressed={draft.id===item.id} onClick={()=>{setDraft(normalizeBudgetLine({...item}));setMessage('');}}><strong>{item.name}</strong><small>{COST_UNITS[item.unit]} · {item.id.startsWith('manual:')?'Mi tarifa guardada':'Plantilla para definir tarifa'}</small></button>)}{options.length===0&&<p>No hay presets en esta búsqueda.</p>}</div>
    <div className="pcost-preset-editor"><h4>Configurar preset: {draft.name}</h4><div className="pcost-controls">
      <label>Nombre<input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
      <label>Categoría del preset<select value={categoryFor(draft)} onChange={e=>setDraft({...draft,category:e.target.value})}>{categories.map(name=><option key={name}>{name}</option>)}</select></label>
      <label>Tipo<select value={draft.kind} onChange={e=>setDraft({...draft,kind:e.target.value as CostLine['kind']})}>{Object.entries(kinds).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <label>Unidad<select value={draft.unit} onChange={e=>setDraft({...draft,unit:e.target.value as CostLine['unit']})}>{Object.entries(COST_UNITS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <label>Cantidad<input type="number" min="0.01" step="0.01" value={draft.quantity} onChange={e=>setDraft({...draft,quantity:Number(e.target.value)})}/></label>
      <label>Tu tarifa por unidad (ARS)<input type="number" min="0" step="0.01" value={draft.rate} onChange={e=>setDraft({...draft,rate:Number(e.target.value)})}/></label>
    </div><p>Para luces extra, cargá sólo las unidades adicionales. Para vereda, elegí m² o metro lineal según cómo cobrás. No agregues otra partida si ese trabajo ya está incluido en la base o en adicionales.</p>
    <div className="pcost-controls"><button type="button" disabled={!valid} onClick={()=>{onAdd(draft);setMessage('Partida agregada al borrador. Revisá y guardá Costos.');}}>Agregar a la obra</button>
    <button type="button" disabled={!valid} onClick={async()=>{const savedPreset=await onSave(draft);if(savedPreset){setDraft(savedPreset);setMessage('Preset guardado en esta obra.');}else setMessage('No se pudo guardar. Revisá el aviso de Costos.');}}>Guardar mi preset</button>
    {saved.some(item=>item.id===draft.id)&&<button type="button" onClick={()=>{onRemove(draft.id);setDraft(catalog[0]);setMessage('Preset quitado del borrador. Las partidas existentes se conservan.');}}>Eliminar preset</button>}</div>{message&&<p role="status">{message}</p>}</div>
  </div>;
}
