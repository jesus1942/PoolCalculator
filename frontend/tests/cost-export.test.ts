import test from 'node:test';
import assert from 'node:assert/strict';
import { getQuote, installationSettings, renderQuoteMessage, renderQuoteTable, renderDetailedCostDocument } from '../src/utils/costExport.ts';
import { calculateProjectFinancials, EMPTY_COSTING } from '../../backend/src/utils/projectPricing.ts';
const project={id:'sample',name:'Proyecto de prueba',clientName:'Cliente de prueba',materialCost:100,laborCost:80,poolPreset:{name:'Otro'},plumbingConfig:{selectedItems:[{id:'pipe',quantity:2,pricePerUnit:10}]},projectAdditionals:[{id:'extra',newQuantity:3,baseQuantity:2,customPricePerUnit:15,customLaborCost:5}],exportSettings:{costing:EMPTY_COSTING}};
test('presupuesto completo y motor comparten exactamente el total',()=>{
 const quote=getQuote(project,{clientPricingMode:'full'});assert.equal(quote.total,calculateProjectFinancials(project).grandTotal);assert.equal(quote.total,220);
});
test('instalación excluye todos los materiales incluso con opciones antiguas',()=>{
 assert.equal(getQuote(project,{clientPricingMode:'labor_only',includeVeredaMaterials:false}).total,85);
 assert.equal(getQuote(project,{clientPricingMode:'labor_only',includeVeredaMaterials:true}).total,85);
});
test('las exclusiones del documento seleccionan partidas, no inventan importes',()=>{
 assert.equal(getQuote(project,{clientPricingMode:'full',installationMode:'basic'}).total,200);
 assert.equal(getQuote(project,{clientPricingMode:'full',includeAdditionalsPricing:false}).total,200);
});
test('los totales manuales antiguos de la plantilla no reemplazan Costos',()=>{
 assert.equal(getQuote(project,{clientPricingMode:'full',values:{totalCost:1,laborCost:1}}).total,220);
});
test('el HTML de partidas y condiciones escapa contenido y conserva el total',()=>{
 const p={...project,name:'<script>alert(1)</script>',exportSettings:{costing:{...EMPTY_COSTING,overrides:{'base:labor':{name:'<img src=x onerror=alert(1)>'}}}}};
 const html=renderDetailedCostDocument(p,{clientPricingMode:'full',conditions:'<iframe src=x>'});
 assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<iframe'));assert.ok(!html.includes('<img src=x'));assert.ok(html.includes('220,00'));assert.ok(html.includes('&lt;iframe'));
 assert.ok(renderQuoteTable(p,{clientPricingMode:'full'}).includes('TOTAL COTIZADO'));
});

test('configuración antigua completa nunca convierte una propuesta de instalación en venta de materiales',()=>{
 const settings=installationSettings({clientPricingMode:'full',includeVeredaMaterials:true});
 const quote=getQuote(project,settings);
 assert.equal(quote.total,85);assert.ok(quote.lines.every(line=>line.kind!=='material'));
 assert.equal(getQuote(project).total,85);
});
test('selección lateral cambia sólo la cotización, no el libro de costos',()=>{
 const settings=installationSettings({excludedCostLineIds:['base:labor']});
 assert.equal(getQuote(project,settings).total,5);
 assert.equal(getQuote(project,installationSettings()).total,85);
 assert.equal(getQuote(project,{clientPricingMode:'full'}).total,220);
});
test('ocultar detalle conserva total sin revelar tarifas ni conceptos en HTML y texto',()=>{
 const settings=installationSettings({showCostDetails:false});
 const html=renderQuoteTable(project,settings), message=renderQuoteMessage(project,settings);
 assert.ok(!html.includes('<table'));assert.ok(html.includes('85,00'));
 assert.ok(!message.includes('×'));assert.ok(message.includes('85,00'));
 assert.ok(!html.includes('220,00'));
});
test('columnas de cantidades, tarifas y subtotales son independientes del cálculo',()=>{
 const html=renderQuoteTable(project,installationSettings({showCostQuantities:false,showCostRates:false,showCostSubtotals:false}));
 assert.ok(html.includes('<table'));assert.ok(!html.includes('>Tarifa<'));assert.ok(!html.includes('>Subtotal<'));assert.ok(!html.includes('>Cantidad<'));assert.ok(html.includes('85,00'));
});
test('aumentar luces y superficie aumenta únicamente los servicios en la propuesta',()=>{
 const p={...project,projectAdditionals:[{id:'light',baseQuantity:2,newQuantity:4,customPricePerUnit:1000,customLaborCost:50}],exportSettings:{costing:{...EMPTY_COSTING,items:[{id:'manual:walk',name:'Colocación de vereda',kind:'labor',unit:'M2',quantity:20,rate:10,source:'Preset',included:true}]}}};
 assert.equal(getQuote(p,installationSettings()).total,380);
 assert.equal(getQuote({...p,projectAdditionals:[{...p.projectAdditionals[0],newQuantity:5}]},installationSettings()).total,430);
 assert.equal(getQuote(p,{clientPricingMode:'full'}).total,2500);
});
