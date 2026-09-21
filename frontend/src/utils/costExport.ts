import { calculateProjectFinancials, COST_UNITS, roundMoney } from './projectCosting';
export const escapeCostText = (value: unknown) => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const money = (n:number) => new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
/** Cada documento selecciona partidas del mismo libro; nunca inventa un total alternativo. */
export function getQuote(project:any,settings:any={}) {
  const financials=calculateProjectFinancials(project);
  const full=settings.clientPricingMode==='full';
  const lines=financials.lines.filter(line=>line.included && line.quantity>0)
    .filter(line=>settings.installationMode!=='basic'||!line.id.startsWith('additional:'))
    .filter(line=>settings.includeAdditionalsPricing!==false||!line.id.startsWith('additional:'))
    .filter(line=>full||line.kind!=='material')
    .filter(line=>!Array.isArray(settings.excludedCostLineIds)||!settings.excludedCostLineIds.includes(line.id));
  return {lines,total:roundMoney(lines.reduce((sum,line)=>sum+line.total,0)),revision:financials.settings.revision,
    label:full?'Presupuesto completo con materiales':'Instalación · mano de obra y servicios',
    warnings:financials.warnings};
}
/** La propuesta de instalación nunca toma el modo completo de una configuración antigua. */
export const installationSettings = (settings: any = {}) => ({ ...settings, clientPricingMode: 'labor_only' });

/** Las opciones visuales no cambian el importe; excluir una partida sí cambia el alcance. */
export function renderQuoteTable(project:any,settings:any={clientPricingMode:'full'}) {
  const quote=getQuote(project,settings);
  const detail=settings.showCostDetails!==false;
  const quantity=settings.showCostQuantities!==false;
  const rates=settings.showCostRates!==false;
  const subtotals=settings.showCostSubtotals!==false;
  const headers=['Trabajo / concepto',...(quantity?['Unidad','Cantidad']:[]),...(rates?['Tarifa']:[]),...(subtotals?['Subtotal']:[])];
  const rows=quote.lines.map((line,index)=>`${index===0||quote.lines[index-1].stage!==line.stage?`<tr style="background:#e7eee9;break-after:avoid"><th colspan="${headers.length}" style="padding:10px;text-align:left">${escapeCostText(line.stageLabel)}</th></tr>`:''}<tr style="break-inside:avoid;border-bottom:1px solid #deded4"><td style="padding:9px">${escapeCostText(line.name)}</td>${quantity?`<td>${escapeCostText(COST_UNITS[line.unit])}</td><td style="text-align:right;padding:8px">${line.quantity.toLocaleString('es-AR',{maximumFractionDigits:4})}</td>`:''}${rates?`<td style="text-align:right;padding:8px;white-space:nowrap">${money(line.rate)}</td>`:''}${subtotals?`<td style="text-align:right;padding:8px;white-space:nowrap">${money(line.total)}</td>`:''}</tr>`).join('');
  return `<section class="section cost-ledger"><h2>${settings.clientPricingMode==='full'?'Detalle económico':'Inversión en la instalación'}</h2><p>${escapeCostText(quote.label)} · ARS</p>
  ${detail?`<table style="width:100%;border-collapse:collapse;font-size:11px"><thead style="display:table-header-group"><tr style="background:#285e59;color:white">${headers.map(h=>`<th style="padding:9px;text-align:left">${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`:''}
  <div style="font-size:18px;font-weight:bold;background:#f1f0e8;padding:16px;margin-top:12px">TOTAL COTIZADO <span style="float:right">${money(quote.total)}</span></div>
  ${settings.clientPricingMode!=='full'?'<p>El importe corresponde a los trabajos y servicios de instalación seleccionados. No incluye la provisión ni el precio de materiales o equipos.</p>':''}</section>`;
}
/** Versión de texto que respeta el mismo alcance y las mismas opciones de presentación. */
export function renderQuoteMessage(project:any,settings:any={}) {
  const quote=getQuote(project,settings);
  const detail=settings.showCostDetails===false?'':quote.lines.map((line,index)=>`${index===0||quote.lines[index-1].stage!==line.stage?`\n*${line.stageLabel}*\n`:''}- ${line.name}${settings.showCostQuantities!==false?` · ${line.quantity} ${COST_UNITS[line.unit]}`:''}${settings.showCostRates!==false?` × ${money(line.rate)}`:''}${settings.showCostSubtotals!==false?`: ${money(line.total)}`:''}`).join('\n');
  return `*${quote.label.toUpperCase()}*\n${detail?detail+'\n':''}*TOTAL COTIZADO: ${money(quote.total)}*${settings.clientPricingMode!=='full'?'\nNo incluye provisión de materiales ni equipos.':''}`;
}
/** Presupuesto detallado independiente del editor comercial, apto para PDF/HTML/impresión. */
export function renderDetailedCostDocument(project:any,settings:any={},logo?:string|null) {
  const safeLogo=logo && /^(data:image\/(png|jpeg|webp);base64,|https:\/\/)/.test(logo)?logo:null;
  return `<!doctype html><html lang="es"><head><meta charset="UTF-8"><title>${escapeCostText(settings.title||`Presupuesto · ${project.name}`)}</title><style>@page{size:A4;margin:16mm}body{font:13px/1.55 Arial,sans-serif;color:#243e38;background:#fff;margin:0}.container{max-width:1000px;margin:auto;padding:32px}header{border-bottom:2px solid #285e59;padding-bottom:20px;display:flex;justify-content:space-between;gap:20px}h1{font-size:29px;margin:8px 0}h2{font-size:18px;margin-top:25px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:22px 0}.meta p{margin:0}.terms{white-space:pre-line;border-top:1px solid #ddd;padding-top:18px}footer{font-size:10px;color:#64736b;margin-top:25px}thead{display:table-header-group}tr{break-inside:avoid}@media print{.container{padding:0}*{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style></head><body><main class="container"><header><div><span>POOL INSTALLER · PRESUPUESTO</span><h1>${escapeCostText(settings.title||project.name)}</h1><p>${escapeCostText(settings.subtitle||'Detalle de partidas y alcance económico')}</p></div>${safeLogo?`<img src="${escapeCostText(safeLogo)}" alt="Logo de la empresa" style="max-width:150px;max-height:70px;object-fit:contain">`:''}</header><div class="meta"><p><strong>Cliente</strong><br>${escapeCostText(project.clientName)}</p><p><strong>Referencia</strong><br>${escapeCostText(project.projectCode||project.id)}</p><p><strong>Ubicación</strong><br>${escapeCostText(project.location||'A confirmar')}</p><p><strong>Fecha</strong><br>${new Date().toLocaleDateString('es-AR')}</p></div>${settings.scopeSummary?`<h2>Alcance</h2><p class="terms">${escapeCostText(settings.scopeSummary)}</p>`:''}${renderQuoteTable(project,settings)}${settings.conditions?`<h2>Condiciones comerciales</h2><p class="terms">${escapeCostText(settings.conditions)}</p>`:''}<footer>Documento generado desde el presupuesto guardado de la obra. Cualquier modificación del alcance requiere una nueva revisión.</footer></main></body></html>`;
}
