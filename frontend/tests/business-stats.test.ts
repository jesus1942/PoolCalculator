import test from 'node:test';
import assert from 'node:assert/strict';
import { businessRows, summarizeBusiness, changeLabel } from '../src/utils/businessStats.ts';
const project=(id:string, extra:any={})=>({id,name:id,status:'COMPLETED',createdAt:'2025-12-31T23:00:00Z',volume:25,laborCost:100,materialCost:500,currentUserAccess:{canViewFinancials:true},...extra}) as any;
test('histórico deduplica proyectos y no suma borradores/cancelados ni materiales',()=>{
 const p=project('a');const s=summarizeBusiness(businessRows([p,p,project('b',{status:'CANCELLED'}),project('c',{status:'DRAFT'})]));
 assert.equal(s.total,3);assert.equal(s.completed,1);assert.equal(s.water,25);assert.equal(s.amount,100);
});
test('capacidad del folleto y obras en marcha permanecen separadas del agua completada',()=>{
 const s=summarizeBusiness(businessRows([project('a',{poolPreset:{waterVolumeM3:18.5,waterVolumeSource:'BROCHURE'}}),project('b',{status:'IN_PROGRESS'})]));
 assert.equal(s.water,18.5);assert.equal(s.projectedWater,25);assert.equal(s.active,1);
});
test('montos sin permiso no se reconstruyen ni se convierten en cero visible',()=>{
 const rows=businessRows([project('a',{currentUserAccess:{canViewFinancials:false}}),project('b',{currentUserAccess:undefined})]);
 assert.ok(rows.every(r=>r.amount===null));assert.equal(summarizeBusiness(rows).restricted,2);
});
test('importe respeta exclusiones de la propuesta guardada',()=>{
 const r=businessRows([project('a',{exportSettings:{templates:{client:{excludedCostLineIds:['base:labor']}}}})]);
 assert.equal(summarizeBusiness(r).amount,0);
});
test('comparación usa creación UTC y no última edición; base cero no produce infinito',()=>{
 const r=businessRows([project('a',{updatedAt:'2026-09-21T10:00:00Z'})])[0];
 assert.equal(r.year,2025);assert.equal(r.month,11);assert.equal(changeLabel(5,0),'Sin base anterior');assert.equal(changeLabel(0,0),'Sin variación');assert.match(changeLabel(2,1),/100/);
});
