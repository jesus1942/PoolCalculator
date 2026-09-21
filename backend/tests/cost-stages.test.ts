import test from 'node:test';
import assert from 'node:assert/strict';
import { sortCostLines, getCostStage } from '../src/utils/costStages';
import { calculateProjectFinancials, EMPTY_COSTING, validateCosting } from '../src/utils/projectPricing';
const names=['Colocación de geomembrana','Cama de apoyo y preparación de base','Posicionamiento y nivelación del casco','Primera vuelta de loseta perimetral','Ajustes y cortes de remate de primera vuelta','Rellenos, terminación y limpieza técnica','Pruebas hidráulicas, eléctricas y entrega técnica','Instalación hidráulica base en casco','Tendido y pegado de cañerías hidráulicas','Montaje de cabecera hidráulica básica','Instalación de 2 luces y canalizaciones','Cableado, comando y pruebas eléctricas','Replanteo y marcación de obra','Excavación y perfilado del pozo','Nivelación y compactación final','Colocación de losetas y vereda'];
test('ordena el detalle enviado por el usuario por etapas sin perder trabajos',()=>{
 const lines=names.map((name,i)=>({id:String(i),name,kind:'labor',total:i*100}));
 const ordered=sortCostLines(lines);
 assert.deepEqual(ordered.slice(0,3).map(l=>l.name),names.slice(12,15));
 assert.equal(ordered.at(-1)!.name,names[6]);
 assert.equal(ordered.find(l=>l.name===names[2])!.stage,'placement');
 assert.equal(ordered.find(l=>l.name===names[15])!.stage,'paving');
 assert.equal(ordered.length,names.length);
 assert.equal(ordered.reduce((s,l)=>s+l.total,0),lines.reduce((s,l)=>s+l.total,0));
 assert.deepEqual(lines.map(l=>l.name),names);
});
test('la etapa explícita validada se conserva y una etapa desconocida se rechaza',()=>{
 const settings=validateCosting({...EMPTY_COSTING,overrides:{'base:labor':{stage:'delivery'}}});
 const result=calculateProjectFinancials({poolPreset:{name:'Otro'},laborCost:100,exportSettings:{costing:settings}});
 assert.equal(result.lines.find(l=>l.id==='base:labor')!.stage,'delivery');
 assert.throws(()=>validateCosting({...EMPTY_COSTING,overrides:{'base:labor':{stage:'invalid'}}}));
 assert.equal(getCostStage({id:'manual:x',name:'Material',kind:'material'}),'supplies');
});
