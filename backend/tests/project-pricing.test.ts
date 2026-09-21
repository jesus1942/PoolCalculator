import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateProjectFinancials as price, getAdditionalQuantity, EMPTY_COSTING, validateCosting } from '../src/utils/projectPricing';
import { sanitizeProjectForAccess } from '../src/utils/projectAccess';
const project = (patch:any={}) => ({materialCost:100,laborCost:40,tasks:{},poolPreset:{name:'Otro'},...patch});
const manual = (patch:any={}) => ({id:'manual:one',name:'Partida',kind:'material',unit:'M3',quantity:2,rate:15,source:'Manual',included:true,...patch});

test('cobra únicamente extras y respeta una tarifa explícita de cero',()=>{
  assert.equal(getAdditionalQuantity({newQuantity:4,baseQuantity:2}),2);
  assert.equal(getAdditionalQuantity({newQuantity:1,baseQuantity:2}),0);
  const p=project({projectAdditionals:[{id:'light',baseQuantity:2,newQuantity:4,customPricePerUnit:0,customLaborCost:10,accessory:{pricePerUnit:90}}]});
  assert.equal(price(p).grandTotal,160);
  assert.equal(price(p).additionalsCosts.materialCost,0);
});
test('modelo comercial y tareas son alternativas, no sumandos',()=>{
  const p=project({poolPreset:{name:'Circon'},tasks:{installation:[{id:'t',name:'Trabajo',estimatedHours:10,laborCost:200}]}});
  assert.equal(price(p).baseLaborCost,4_000_000);
  assert.equal(price({...p,exportSettings:{costing:{...EMPTY_COSTING,laborMode:'tasks'}}}).baseLaborCost,200);
});
test('tareas a cero no recuperan por accidente un importe histórico',()=>{
  const p=project({tasks:{installation:[{id:'t',name:'Sin cargo',estimatedHours:2,laborCost:0}]}});
  assert.equal(price(p).totalLaborCost,0);
});
test('material configurado no duplica unidades adicionales y conserva su mano de obra',()=>{
  const p=project({plumbingConfig:{selectedItems:[{id:'p',itemId:'light',quantity:3,pricePerUnit:10}]},projectAdditionals:[{id:'a',accessoryId:'light',baseQuantity:2,newQuantity:4,customPricePerUnit:10,customLaborCost:5}]});
  assert.equal(price(p).additionalsCosts.materialCost,10);
  assert.equal(price(p).additionalsCosts.laborCost,10);
  assert.equal(price(p).grandTotal,190);
});
test('nombres similares no eliminan materiales distintos del presupuesto',()=>{
  const p=project({plumbingConfig:{selectedItems:[{id:'p',name:'Caño grande',quantity:1,pricePerUnit:10}]},projectAdditionals:[{id:'a',customName:'Caño grande',baseQuantity:0,newQuantity:1,customPricePerUnit:20}]});
  assert.equal(price(p).grandTotal,170);
});
test('bolsas/kg y m³/bolsones no se suman dos veces al desglosar materiales',()=>{
  const p=project({materialCost:100,materials:{cement:{quantity:2,unit:'bolsas',cost:40},cementKg:{quantity:50,unit:'kg',cost:40},sandForBed:{quantity:'3',unit:'m³',cost:60},sandForBedBulkBags:{quantity:3,unit:'bolsones',cost:60}}});
  assert.equal(price(p).totalMaterialCost,100);
  assert.equal(price(p).lines.filter(l=>l.kind==='material').length,2);
});
test('un cómputo histórico inconsistente conserva su total sin sumarle el desglose',()=>{
  const p=project({materialCost:100,materials:{cement:{quantity:2,cost:140}}});
  assert.equal(price(p).totalMaterialCost,100);
});
test('ajustes, exclusiones, camionadas y horas máquina concilian con el total',()=>{
  const p=project({exportSettings:{costing:{...EMPTY_COSTING,overrides:{'base:materials':{included:false}},items:[manual({unit:'LOAD',quantity:3,rate:120,capacity:10}),manual({id:'manual:machine',unit:'HM',kind:'machine',quantity:8,rate:30})]}}});
  const costs=price(p);
  assert.equal(costs.totalMaterialCost,360);assert.equal(costs.totalLaborCost,280);assert.equal(costs.grandTotal,640);
  assert.equal(costs.lines.reduce((n,l)=>n+l.total,0),640);
});
test('guardar ajustes no altera fuentes; ajustes sin origen se advierten y no cobran',()=>{
  const p=project({exportSettings:{costing:{...EMPTY_COSTING,overrides:{missing:{rate:999},'base:labor':{rate:0}}}}});
  const copy=JSON.stringify(p);const costs=price(p);
  assert.equal(costs.totalLaborCost,0);assert.equal(JSON.stringify(p),copy);assert.ok(costs.warnings.some(w=>w.includes('ya no tiene')));
});
test('rechaza importes inválidos, unidades desconocidas, IDs duplicados y referencias manipuladas',()=>{
  for(const patch of [{rate:-1},{rate:Infinity},{rate:'20'},{unit:'desconocida'},{capacity:0},{id:'base:materials'}]) assert.throws(()=>validateCosting({...EMPTY_COSTING,items:[manual(patch)]}));
  assert.throws(()=>validateCosting({...EMPTY_COSTING,items:[manual(),manual()]}));
  assert.throws(()=>validateCosting({...EMPTY_COSTING,overrides:JSON.parse('{"__proto__":{"rate":3}}')}));
  assert.equal(validateCosting({...EMPTY_COSTING,items:[manual({rate:0})]}).items[0].rate,0);
});
test('el permiso sin importes no expone el libro de costos ni sus presets',()=>{
  const p=project({exportSettings:{templates:{},costing:{...EMPTY_COSTING,items:[manual()]}}});
  const result=sanitizeProjectForAccess(p,{canAccess:true,canViewFinancials:false,canEdit:false,canDelete:false,allowedTabs:['overview'],source:'assignment'});
  assert.equal(result.exportSettings.costing,undefined);assert.equal(result.totalCost,0);
});
