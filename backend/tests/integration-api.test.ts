import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import prisma from '../src/config/database';
import router, { publicIntegrations } from '../src/routes/platformIntegrationRoutes';
import { generateToken } from '../src/config/jwt';
import { environmentIntegrationConfig, encryptIntegrationConfig } from '../src/services/platformIntegrationService';

process.env.INTEGRATIONS_ENCRYPTION_KEY = 'b'.repeat(64);

function stub(context: any, target: any, method: string, implementation: (...args: any[]) => any) {
  const previous = target[method];
  target[method] = implementation;
  context.after(() => { target[method] = previous; });
}

async function withServer(run: (base: string) => Promise<void>) {
  const app = express(); app.use(express.json());
  app.use('/api/admin/integrations', router);
  app.get('/api/public/integrations', publicIntegrations);
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  try { await run(`http://127.0.0.1:${(server.address() as any).port}`); }
  finally { await new Promise<void>(resolve => server.close(() => resolve())); }
}

test('API de integraciones rechaza anónimo y administrador de empresa antes de leer secretos', async context => {
  stub(context, prisma.user, 'findUnique', async () => ({ id: 'tenant-user', email: 'tenant@example.test', role: 'ADMIN', sessionVersion: 0 }));
  stub(context, prisma.organizationMember, 'findUnique', async () => ({ role: 'OWNER' }));
  let reads = 0;
  stub(context, prisma.platformIntegrationSetting, 'findUnique', async () => { reads++; return null; });
  const token = generateToken('tenant-user', 'tenant@example.test', 'ADMIN', 'org-a');
  await withServer(async base => {
    assert.equal((await fetch(`${base}/api/admin/integrations`)).status, 401);
    for (const method of ['GET', 'PUT']) {
      const response = await fetch(`${base}/api/admin/integrations`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(method === 'PUT' ? { body: '{}' } : {}) });
      assert.equal(response.status, 403);
    }
    assert.equal((await fetch(`${base}/api/admin/integrations/verify/telegram`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })).status, 403);
  });
  assert.equal(reads, 0);
});

test('SUPERADMIN ve configuración sin secretos, y API pública nunca devuelve IDs ni tokens', async context => {
  const config = environmentIntegrationConfig();
  config.google = { enabled: true, clientId: 'google-client', clientSecret: 'hidden-value', callbackUrl: 'https://api.example.test/api/auth/google/callback' };
  config.general.frontendUrl = 'https://app.example.test';
  config.whatsapp = { ...config.whatsapp, enabled: true, phoneNumber: '5492800000000', accessToken: 'hidden-whatsapp' };
  stub(context, prisma.user, 'findUnique', async () => ({ id: 'owner', email: 'owner@example.test', role: 'SUPERADMIN', sessionVersion: 0 }));
  stub(context, prisma.platformIntegrationSetting, 'findUnique', async () => ({ id: 'global', revision: 2, payload: encryptIntegrationConfig(config) }));
  const token = generateToken('owner', 'owner@example.test', 'SUPERADMIN');
  await withServer(async base => {
    const response = await fetch(`${base}/api/admin/integrations`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
    const body = await response.text();
    assert.ok(!body.includes('hidden-value')); assert.ok(!body.includes('hidden-whatsapp'));
    const publicResponse = await fetch(`${base}/api/public/integrations`);
    assert.deepEqual(await publicResponse.json(), { googleEnabled: true, whatsappUrl: 'https://wa.me/5492800000000' });
  });
});
