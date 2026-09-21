import test from 'node:test';
import assert from 'node:assert/strict';
import { getPoolWaterVolume, preparePoolWaterVolume, calculateWaterDeliveries } from '../src/utils/poolWaterVolume';
import { calculateProjectFinancials, EMPTY_COSTING, validateCosting } from '../src/utils/projectPricing';
const model={length:8,width:3,depth:1,depthEnd:2,shape:'RECTANGULAR' as const};
test('nuevo modelo calcula y conserva m³ desde dimensiones y profundidad media',()=>{
 const data=preparePoolWaterVolume({...model,waterVolumeM3:999});
 assert.equal(data.waterVolumeM3,36);assert.equal(data.waterVolumeSource,'CALCULATED');
 assert.equal(getPoolWaterVolume({...model,...data}).volumeM3,36);
 assert.equal(preparePoolWaterVolume({...model,length:10,...data}).waterVolumeM3,45);
});
test('folleto prevalece aunque las dimensiones produzcan una estimación diferente',()=>{
 const data=preparePoolWaterVolume({...model,waterVolumeSource:'BROCHURE',waterVolumeM3:31.5});
 assert.equal(getPoolWaterVolume({...model,...data}).volumeM3,31.5);
 assert.equal(preparePoolWaterVolume({...model,...data,length:10}).waterVolumeM3,31.5);
 assert.throws(()=>preparePoolWaterVolume({...model,waterVolumeSource:'BROCHURE',waterVolumeM3:0}));
 assert.throws(()=>preparePoolWaterVolume({...model,waterVolumeSource:'invalid'}));
});
test('formas ovales y circulares reutilizan cálculo geométrico y no volumen rectangular',()=>{
 assert.equal(getPoolWaterVolume({...model,shape:'CIRCULAR',length:4,depth:1,depthEnd:1}).volumeM3,12.567);
 assert.equal(getPoolWaterVolume({...model,shape:'OVAL',length:4,width:2,depth:1,depthEnd:1}).volumeM3,6.284);
});
test('litros de camión calculan viajes completos y excedente, sin redondear primero los m³',()=>{
 assert.deepEqual(calculateWaterDeliveries(36,10000),{liters:36000,trips:4,surplusLiters:4000});
 assert.equal(calculateWaterDeliveries(30,10000).trips,3);
 assert.equal(calculateWaterDeliveries(30.001,10000).trips,4);
 assert.equal(calculateWaterDeliveries(10.1,10100).trips,1);
 assert.equal(calculateWaterDeliveries(36,0).trips,0);
});
test('planificación se guarda sin cobro hasta incluir expresamente el suministro',()=>{
 const costing=validateCosting({...EMPTY_COSTING,waterDelivery:{truckLiters:10000,pricePerTrip:120000,included:false}});
 const p={poolPreset:{...model,waterVolumeSource:'BROCHURE',waterVolumeM3:36},exportSettings:{costing}};
 const row=calculateProjectFinancials(p).lines.find(l=>l.id==='water:delivery')!;
 assert.equal(row.quantity,4);assert.equal(row.capacity,10);assert.equal(row.total,0);
 const withWater=calculateProjectFinancials({...p,exportSettings:{costing:{...costing,waterDelivery:{...costing.waterDelivery!,included:true}}}});
 assert.equal(withWater.lines.find(l=>l.id==='water:delivery')!.total,480000);
 assert.equal(withWater.lines.filter(l=>l.id==='water:delivery').length,1);
 assert.throws(()=>validateCosting({...EMPTY_COSTING,waterDelivery:{truckLiters:0,pricePerTrip:0,included:false}}));
});
