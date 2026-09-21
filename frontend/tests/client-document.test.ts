import test from 'node:test';
import assert from 'node:assert/strict';
import { renderCustomClientDocument, clientDocumentEditorBody } from '../src/utils/clientDocument.ts';
import { renderQuoteTable } from '../src/utils/costExport.ts';
const project={name:'Obra de prueba',poolPreset:{name:'Otro'},tasks:{floor:[{id:'base',name:'Trabajo de base',estimatedHours:12,laborCost:780000}]}};
const frozen=`<div class="section"><h2>Alcance</h2><p>Texto personalizado que debe conservarse.</p></div>${renderQuoteTable(project,{clientPricingMode:'labor_only'})}`;
test('reproduce la captura: ocultar cantidades y tarifas elimina columnas de una tabla personalizada congelada',()=>{
 const html=renderCustomClientDocument(project,{showCostQuantities:false,showCostRates:false},frozen);
 assert.ok(!html.includes('hora hombre'));assert.ok(!html.includes('>Cantidad<'));assert.ok(!html.includes('>Tarifa<'));assert.ok(!html.includes('65.000,00'));
 assert.ok(html.includes('780.000,00'));assert.ok(html.includes('Texto personalizado'));
 assert.equal((html.match(/TOTAL COTIZADO/g)||[]).length,1);
});
test('las 16 combinaciones de visibilidad funcionan también con documento personalizado',()=>{
 for(let bits=0;bits<16;bits++) {
  const settings={showCostDetails:!!(bits&1),showCostQuantities:!!(bits&2),showCostRates:!!(bits&4),showCostSubtotals:!!(bits&8)};
  const html=renderCustomClientDocument(project,settings,frozen);
  assert.equal(html.includes('>Cantidad<'),settings.showCostDetails&&settings.showCostQuantities);
  assert.equal(html.includes('>Tarifa<'),settings.showCostDetails&&settings.showCostRates);
  assert.equal(html.includes('>Subtotal<'),settings.showCostDetails&&settings.showCostSubtotals);
  assert.equal(html.includes('Trabajo de base'),settings.showCostDetails);
  assert.equal((html.match(/TOTAL COTIZADO/g)||[]).length,1);
  assert.ok(html.includes('780.000,00'));
 }
});
test('selección de trabajos y recálculo sustituyen importes y filas antiguos sin duplicarlos',()=>{
 const newProject={...project,tasks:{floor:[{id:'base',name:'Trabajo de base',estimatedHours:12,laborCost:900000}]}};
 const current=renderCustomClientDocument(newProject,{},frozen+frozen);
 assert.ok(current.includes('900.000,00'));assert.ok(!current.includes('780.000,00'));assert.equal((current.match(/TOTAL COTIZADO/g)||[]).length,1);
 const excluded=renderCustomClientDocument(project,{excludedCostLineIds:['task:floor:base']},frozen);
 assert.ok(!excluded.includes('Trabajo de base'));assert.ok(!excluded.includes('780.000,00'));
});
test('ocultar sección económica elimina tanto el bloque congelado como el generado',()=>{
 const html=renderCustomClientDocument(project,{sections:{costs:false,includes:false}},frozen);
 assert.ok(!html.includes('TOTAL COTIZADO'));assert.ok(!html.includes('Texto personalizado'));assert.ok(!html.includes('<table'));
});
test('editar y guardar el texto no vuelve a congelar importes y conserva tablas libres',()=>{
 const custom='<p>Nota del instalador</p><table><tr><td>Detalle libre</td></tr></table>';
 const editor=clientDocumentEditorBody(frozen+custom);
 assert.ok(editor.includes('contenteditable="false"'));assert.ok(!editor.includes('780.000,00'));
 const reloaded=JSON.parse(JSON.stringify({useCustomClientBody:true,customBodyHtml:editor,showCostQuantities:false,showCostRates:false}));
 const html=renderCustomClientDocument(project,reloaded,reloaded.customBodyHtml);
 assert.ok(html.includes('Nota del instalador'));assert.ok(html.includes('Detalle libre'));assert.ok(!html.includes('contenteditable'));
 assert.ok(!html.includes('hora hombre'));assert.ok(!html.includes('65.000,00'));
});
test('reconoce bloques económicos de versiones anteriores y respeta posición elegida',()=>{
 const legacy='<div class="section"><h2>Detalle económico</h2><table><tr><td>PRECIO VIEJO</td></tr></table></div><p>Texto propio</p>';
 const html=renderCustomClientDocument(project,{pricingPosition:'top'},legacy);
 assert.ok(!html.includes('PRECIO VIEJO'));assert.ok(html.indexOf('TOTAL COTIZADO')<html.indexOf('Texto propio'));
});
