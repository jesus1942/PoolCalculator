import test from 'node:test';
import assert from 'node:assert/strict';
import { upsertCostPreset, mergeSavedPreset } from '../src/utils/costPresets.ts';
import { EMPTY_COSTING, validateCosting, type CostLine } from '../../backend/src/utils/projectPricing.ts';
const tile:CostLine={id:'tiles:labor',name:'Colocación de losetas y vereda',kind:'labor',unit:'M2',quantity:11.700256,rate:65000.00000000002,source:'Cómputo de losetas',included:true};
test('guardar desde una partida genera un preset persistible en la categoría de veredas',()=>{
 const {settings,preset}=upsertCostPreset(EMPTY_COSTING,tile,'manual:preset');
 const reloaded=validateCosting(JSON.parse(JSON.stringify(settings)));
 assert.equal(reloaded.presets[0].category,'Veredas y terminaciones');
 assert.equal(reloaded.presets[0].quantity,12);assert.equal(reloaded.presets[0].rate,65000);
 assert.equal(preset.id,'manual:preset');assert.equal(reloaded.items.length,0);
});
test('guardar repetidamente la misma partida actualiza sin duplicar el preset',()=>{
 const first=upsertCostPreset(EMPTY_COSTING,tile,'manual:one');
 const second=upsertCostPreset(first.settings,{...tile,rate:70000},'manual:two');
 assert.equal(second.settings.presets.length,1);assert.equal(second.preset.id,'manual:one');assert.equal(second.preset.rate,70000);
});
test('guardar sólo el preset conserva el borrador de partidas y actualiza la revisión',()=>{
 const draft={...EMPTY_COSTING,overrides:{'tiles:labor':{rate:80000}}};
 const prepared=upsertCostPreset(EMPTY_COSTING,tile,'manual:one');
 assert.deepEqual(prepared.settings.overrides,{});
 const merged=mergeSavedPreset(draft,{...prepared.settings,revision:1},prepared.preset);
 assert.equal(merged.revision,1);assert.equal(merged.overrides['tiles:labor'].rate,80000);
 assert.equal(merged.presets.length,1);
});
