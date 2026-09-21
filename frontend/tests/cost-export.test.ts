import test from 'node:test';
import assert from 'node:assert/strict';
import { getQuote, renderQuoteTable, renderDetailedCostDocument } from '../src/utils/costExport.ts';
import { calculateProjectFinancials, EMPTY_COSTING } from '../../backend/src/utils/projectPricing.ts';
const project={id:'sample',name:'Proyecto de prueba',clientName:'Cliente de prueba',materialCost:100,laborCost:80,poolPreset:{name:'Otro'},plumbingConfig:{selectedItems:[{id:'pipe',quantity:2,pricePerUnit:10}]},projectAdditionals:[{id:'extra',newQuantity:3,baseQuantity:2,customPricePerUnit:15,customLaborCost:5}],exportSettings:{costing:EMPTY_COSTING}};
test('presupuesto completo y motor comparten exactamente el total',()=>{
 const quote=getQuote(project,{clientPricingMode:'full'});assert.equal(quote.total,calculateProjectFinancials(project).grandTotal);assert.equal(quote.total,220);
});
test('mano de obra y materiales seleccionados se explicitan sin sumar calefacción ficticia',()=>{
 assert.equal(getQuote(project,{clientPricingMode:'labor_only',includeVeredaMaterials:false}).total,85);
 assert.equal(getQuote(project,{clientPricingMode:'labor_only',includeVeredaMaterials:true}).total,185);
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
