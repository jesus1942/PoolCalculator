import assert from 'node:assert/strict';
import { test } from 'node:test';
import prisma from '../src/config/database';
import { isSuperadmin } from '../src/middleware/auth';
import poolRoutes from '../src/routes/poolPresetRoutes';
import tileRoutes from '../src/routes/tilePresetRoutes';
import equipmentPresetRoutes from '../src/routes/equipmentPresetRoutes';
import equipmentRoutes from '../src/routes/equipment';
import accessoryRoutes from '../src/routes/accessoryPresetRoutes';
import materialRoutes from '../src/routes/constructionMaterialRoutes';
import plumbingRoutes from '../src/routes/plumbingItemRoutes';
import productImageRoutes from '../src/routes/productImageRoutes';
import scraperRoutes from '../src/routes/catalogScraperRoutes';
import { updateProfessionRole } from '../src/controllers/professionRoleController';
import { updateCalculationSettings } from '../src/controllers/calculationSettingsController';
import { getPoolPresets, createPoolPreset, updatePoolPreset } from '../src/controllers/poolPresetController';

const response = () => {
  const res: any = { statusCode: 200, body: undefined };
  res.status = (status: number) => { res.statusCode = status; return res; };
  res.json = (body: unknown) => { res.body = body; return res; };
  return res;
};

/** Prisma expone delegates mediante proxy: conservar y restaurar cada método sustituido. */
const mockMethod = (t: any, target: any, name: string, fn: (...args: any[]) => any) => {
  const previous = target[name];
  target[name] = fn;
  t.after(() => { target[name] = previous; });
};

test('cada escritura del catálogo global y cada trabajo de importación exige SUPERADMIN', () => {
  const routers = {
    piscinas: poolRoutes, losetas: tileRoutes, equipos: equipmentRoutes, equiposPreset: equipmentPresetRoutes,
    accesorios: accessoryRoutes, materiales: materialRoutes, plomeria: plumbingRoutes,
    imagenes: productImageRoutes, importacion: scraperRoutes,
  };
  for (const [name, router] of Object.entries(routers)) {
    const preceding: any[] = [];
    for (const layer of (router as any).stack) {
      if (!layer.route) { preceding.push(layer.handle); continue; }
      const route = layer.route;
      if (name !== 'importacion' && Object.keys(route.methods).every((method) => ['get', 'head'].includes(method))) continue;
      const handlers = [...preceding, ...route.stack.map((item: any) => item.handle)];
      assert.ok(handlers.includes(isSuperadmin), `${name} ${route.path} no tiene protección SUPERADMIN`);
      for (const role of ['ADMIN', 'USER', 'INSTALLER', 'VIEWER']) {
        const res = response();
        let nextCalled = false;
        isSuperadmin({ user: { userId: 'tenant-owner', role, orgId: 'tenant' } } as any, res, () => { nextCalled = true; });
        assert.equal(res.statusCode, 403, `${name}: ${role}`);
        assert.equal(nextCalled, false);
      }
    }
  }
});

test('las tarifas personales no aceptan una actualización anidada de usuario ni transfieren propiedad', async (t) => {
  mockMethod(t, prisma.professionRole, 'findUnique', async () => ({ id: 'rate', userId: 'owner' }));
  let mutation: any;
  mockMethod(t, prisma.professionRole, 'update', async (args: any) => { mutation = args; return {}; });
  const res = response();
  await updateProfessionRole({ user: { userId: 'owner', role: 'ADMIN' }, params: { id: 'rate' }, body: {
    name: 'Instalador', hourlyRate: '5000', userId: 'someone-else',
    user: { update: { role: 'SUPERADMIN' } },
  } } as any, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(mutation.data, { name: 'Instalador', hourlyRate: 5000 });
});

test('los parámetros de cálculo no aceptan relaciones Prisma desde el cuerpo de la petición', async (t) => {
  let mutation: any;
  mockMethod(t, prisma.calculationSettings, 'upsert', async (args: any) => { mutation = args; return {}; });
  const res = response();
  await updateCalculationSettings({ user: { userId: 'owner', role: 'ADMIN' }, body: {
    adhesiveKgPerM2: '5', userId: 'victim', id: 'other',
    user: { update: { role: 'SUPERADMIN' } }, unknownSetting: 100,
  } } as any, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(mutation.update, { adhesiveKgPerM2: 5 });
  assert.deepEqual(mutation.create, { adhesiveKgPerM2: 5, userId: 'owner' });
});

test('el catálogo público no consulta el correo personal del autor', async (t) => {
  let query: any;
  mockMethod(t, prisma.poolPreset, 'findMany', async (args: any) => { query = args; return []; });
  await getPoolPresets({} as any, response());
  assert.equal(query.include.user.select.email, undefined);
});

test('crear modelo persiste volumen automático y actualizar preserva capacidad de folleto', async (t) => {
 let created:any,updated:any;
 mockMethod(t,prisma.poolPreset,'create',async ({data}:any)=>{created=data;return data;});
 const res=response();
 await createPoolPreset({user:{userId:'owner',role:'SUPERADMIN'},body:{name:'Modelo prueba',length:'8',width:'3',depth:'1',depthEnd:'2',shape:'RECTANGULAR',waterVolumeSource:'CALCULATED',waterVolumeM3:'999'}} as any,res);
 assert.equal(res.statusCode,201);assert.equal(created.waterVolumeM3,36);
 mockMethod(t,prisma.poolPreset,'findUnique',async()=>({...created,id:'test',additionalImages:[],waterVolumeSource:'BROCHURE',waterVolumeM3:31.5}));
 mockMethod(t,prisma.poolPreset,'update',async ({data}:any)=>{updated=data;return data;});
 await updatePoolPreset({user:{userId:'owner',role:'SUPERADMIN'},params:{id:'test'},body:{length:'10'}} as any,response());
 assert.equal(updated.waterVolumeM3,31.5);assert.equal(updated.waterVolumeSource,'BROCHURE');
 const invalid=response();
 await updatePoolPreset({user:{userId:'owner',role:'SUPERADMIN'},params:{id:'test'},body:{waterVolumeM3:'NaN'}} as any,invalid);
 assert.equal(invalid.statusCode,400);
});
