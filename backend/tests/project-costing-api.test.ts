import test from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../src/config/database';
import { saveProjectCosting } from '../src/controllers/projectCostingController';
import { EMPTY_COSTING } from '../src/utils/projectPricing';
const response=()=>{const r:any={statusCode:200};r.status=(n:number)=>{r.statusCode=n;return r;};r.json=(body:any)=>{r.body=body;return r;};return r;};
const mock=(t:any,target:any,key:string,fn:any)=>{const old=target[key];target[key]=t.mock.fn(fn);t.after(()=>{target[key]=old;});return target[key];};
const project={id:'p',userId:'u',organizationId:'org',updatedAt:new Date('2026-09-21'),exportSettings:{templates:{client:{conditions:'Se conserva'}},costing:{...EMPTY_COSTING,revision:3}}};
const actor={userId:'u',orgId:'org',role:'ADMIN'};
const accessMocks=(t:any)=>{mock(t,prisma,'$queryRaw',async()=>[]);mock(t,prisma.agendaEvent,'findMany',async()=>[]);};
test('rechaza costos de otra empresa antes de escribir',async t=>{
 mock(t,prisma.project,'findUnique',async()=>project);const write=mock(t,prisma.project,'updateMany',async()=>({count:1}));const res=response();
 await saveProjectCosting({params:{id:'p'},body:{...EMPTY_COSTING,revision:3},user:{...actor,orgId:'other'}} as any,res);
 assert.equal(res.statusCode,403);assert.equal(write.mock.callCount(),0);
});
test('un conflicto de revisión conserva los costos del servidor',async t=>{
 accessMocks(t);mock(t,prisma.project,'findUnique',async()=>project);const write=mock(t,prisma.project,'updateMany',async()=>({count:1}));const res=response();
 await saveProjectCosting({params:{id:'p'},body:EMPTY_COSTING,user:actor} as any,res);
 assert.equal(res.statusCode,409);assert.equal(write.mock.callCount(),0);
});
test('guarda con comparación atómica y conserva configuración de exportación',async t=>{
 accessMocks(t);mock(t,prisma.project,'findUnique',async()=>project);let args:any;mock(t,prisma.project,'updateMany',async(a:any)=>{args=a;return {count:1};});const res=response();
 await saveProjectCosting({params:{id:'p'},body:{...EMPTY_COSTING,revision:3},user:actor} as any,res);
 assert.equal(res.statusCode,200);assert.equal(res.body.revision,4);assert.deepEqual(args.where,{id:'p',updatedAt:project.updatedAt});assert.deepEqual(args.data.exportSettings.templates,project.exportSettings.templates);
});
test('cambio concurrente del proyecto devuelve409 sin sobrescribir',async t=>{
 accessMocks(t);mock(t,prisma.project,'findUnique',async()=>project);mock(t,prisma.project,'updateMany',async()=>({count:0}));const res=response();
 await saveProjectCosting({params:{id:'p'},body:{...EMPTY_COSTING,revision:3},user:actor} as any,res);assert.equal(res.statusCode,409);
});
