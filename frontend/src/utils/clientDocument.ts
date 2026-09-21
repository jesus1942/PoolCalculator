import { parseFragment, serialize } from 'parse5';
import { installationSettings, renderQuoteTable } from './costExport';
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const attr=(node:any,name:string)=>node.attrs?.find((item:any)=>item.name===name)?.value || '';
const text=(node:any):string=>node.nodeName==='#text'?node.value:(node.childNodes||[]).map(text).join(' ');
/** Reconoce bloques generados actuales y anteriores sin borrar tablas comerciales ajenas. */
function sectionKey(node:any):string {
  const explicit=attr(node,'data-project-section');
  if(explicit) return explicit;
  const classes=attr(node,'class').split(/\s+/);
  if(classes.includes('cost-ledger')||classes.includes('cost-section')) return 'costs';
  if(!['div','section'].includes(node.tagName)) return '';
  const heading=(node.childNodes||[]).find((child:any)=>/^h[1-6]$/.test(child.tagName||''));
  const label=normalize(heading?text(heading):'');
  if(['detalle economico','inversion en la instalacion','inversion','resumen de costos','costos de instalacion'].includes(label)) return 'costs';
  if(label==='resumen del proyecto') return 'header';
  if(label==='alcance') return 'includes';
  if(label==='condiciones comerciales') return 'conditions';
  if(label==='adicionales incluidos') return 'additionals';
  return '';
}
/** Elimina copias congeladas del bloque económico y coloca una sola versión vigente. */
export function reconcileClientDocument(html:string, pricingHtml:string, sections:Record<string,boolean>={}, position:'top'|'bottom'='bottom') {
  const root:any=parseFragment(html);
  const clean=(parent:any)=>{
    parent.childNodes=(parent.childNodes||[]).filter((node:any)=>{
      const key=sectionKey(node);
      if(key==='costs'||(key&&sections[key]===false)) return false;
      clean(node);return true;
    });
  };
  clean(root);
  if(sections.costs!==false&&pricingHtml) {
    const nodes:any[]=(parseFragment(pricingHtml) as any).childNodes;
    nodes.forEach(node=>{node.parentNode=root;});
    if(position==='top') root.childNodes.unshift(...nodes); else root.childNodes.push(...nodes);
  }
  return serialize(root);
}
/** La misma composición alimenta vista previa, HTML y el documento de impresión PDF. */
export function renderCustomClientDocument(project:any,settings:any,html:string) {
  const current=installationSettings(settings);
  const sections={...current.sections,additionals:current.sections?.additionals!==false&&current.showRecommendedInstallationBox!==false};
  return reconcileClientDocument(html,renderQuoteTable(project,current),sections,current.pricingPosition);
}
/** El texto editable contiene un marcador, nunca una copia de los importes calculados. */
export function clientDocumentEditorBody(html:string) {
  return reconcileClientDocument(html,'<section data-project-section="costs" contenteditable="false" style="padding:16px;background:#e7eee9;border:1px dashed #285e59">Detalle económico automático. Elegí las columnas y partidas desde Precios; se actualizan en la vista previa y el PDF.</section>');
}
