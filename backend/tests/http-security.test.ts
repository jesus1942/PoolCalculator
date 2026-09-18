import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import express, { Express } from 'express';
import { allowedOrigins, configureHttpSecurity, createRequestLimiter, httpErrorHandler, installHealthRoutes, notFound, protectPrivateUploads, trustedProxyHops } from '../src/middleware/httpSecurity';

/** Ejecuta solicitudes contra un servidor efímero y siempre cierra sus conexiones. */
async function withServer(app: Express, run: (base: string) => Promise<void>) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert(address && typeof address !== 'string');
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test('CORS admite orígenes exactos, rechaza imitaciones y no filtra configuración', async () => {
  const app = express();
  configureHttpSecurity(app, { NODE_ENV: 'production', FRONTEND_URL: 'https://app.example.com/piscinas', CORS_ORIGINS: 'https://admin.example.com' });
  app.get('/api/test', (_req, res) => res.json({ ok: true }));
  app.use(httpErrorHandler);
  await withServer(app, async (base) => {
    for (const origin of ['https://app.example.com', 'https://admin.example.com', 'https://jesus1942.github.io', 'https://poolcalculator-production.up.railway.app']) {
      const response = await fetch(`${base}/api/test`, { headers: { Origin: origin } });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('access-control-allow-origin'), origin);
      assert.equal(response.headers.get('x-powered-by'), null);
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    }
    for (const origin of ['https://app.example.com.evil.invalid', 'http://localhost:5173', 'https://evil-ngrok.invalid', 'null']) {
      const response = await fetch(`${base}/api/test`, { headers: { Origin: origin } });
      assert.equal(response.status, 403);
      assert.equal(response.headers.get('access-control-allow-origin'), null);
      assert.deepEqual(await response.json(), { error: 'Origen no permitido.' });
    }
    assert.equal((await fetch(`${base}/api/test`)).status, 200);
    const preflight = await fetch(`${base}/api/test`, { method: 'OPTIONS', headers: { Origin: 'https://app.example.com', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'Authorization' } });
    assert.equal(preflight.status, 204);
  });
});

test('la configuración no admite CORS comodín ni confianza proxy ilimitada', () => {
  assert.throws(() => allowedOrigins({ NODE_ENV: 'production', CORS_ORIGINS: '*' }));
  assert.throws(() => allowedOrigins({ NODE_ENV: 'production', CORS_ORIGINS: 'https://*.example.com' }));
  assert.equal(trustedProxyHops({ NODE_ENV: 'production' }), 1);
  assert.equal(trustedProxyHops({ NODE_ENV: 'development' }), 0);
  assert.equal(trustedProxyHops({ TRUST_PROXY_HOPS: '2' }), 2);
  assert.throws(() => trustedProxyHops({ TRUST_PROXY_HOPS: 'true' }));
  assert.throws(() => trustedProxyHops({ TRUST_PROXY_HOPS: '-1' }));
});

test('CORS aplica el dominio guardado, rechaza fallos de lectura y evita BD para health sin Origin', async () => {
  const app = express();
  let configured = 'https://nuevo.example.com/app';
  let reads = 0;
  let failure = false;
  configureHttpSecurity(app, { NODE_ENV: 'production' }, async () => {
    reads++;
    if (failure) throw new Error('secret-database-error');
    return configured;
  });
  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use(httpErrorHandler);
  await withServer(app, async (base) => {
    assert.equal((await fetch(`${base}/health`)).status, 200);
    assert.equal(reads, 0);
    assert.equal((await fetch(`${base}/health`, { headers: { Origin: 'https://nuevo.example.com' } })).status, 200);
    configured = 'https://otro.example.com';
    assert.equal((await fetch(`${base}/health`, { headers: { Origin: 'https://nuevo.example.com' } })).status, 403);
    assert.equal((await fetch(`${base}/health`, { headers: { Origin: 'https://otro.example.com' } })).status, 200);
    failure = true;
    assert.equal((await fetch(`${base}/health`, { headers: { Origin: 'https://otro.example.com' } })).status, 403);
    assert.equal((await fetch(`${base}/health`, { headers: { Origin: 'https://jesus1942.github.io' } })).status, 200);
  });
});

test('el límite agrupa IPv6 y devuelve 429 JSON sin bloquear otras redes', async () => {
  const app = express();
  configureHttpSecurity(app, { NODE_ENV: 'production', TRUST_PROXY_HOPS: '1' });
  app.use('/login', createRequestLimiter(2, 60000));
  app.post('/login', (_req, res) => res.json({ ok: true }));
  await withServer(app, async (base) => {
    for (const ip of ['2001:db8:abcd:100::1', '2001:db8:abcd:100::2']) {
      assert.equal((await fetch(`${base}/login`, { method: 'POST', headers: { 'X-Forwarded-For': ip } })).status, 200);
    }
    const blocked = await fetch(`${base}/login`, { method: 'POST', headers: { 'X-Forwarded-For': '2001:db8:abcd:100::3' } });
    assert.equal(blocked.status, 429);
    assert(blocked.headers.get('retry-after'));
    assert.equal(typeof (await blocked.json()).error, 'string');
    assert.equal((await fetch(`${base}/login`, { method: 'POST', headers: { 'X-Forwarded-For': '2001:db8:abcd:200::1' } })).status, 200);
  });
});

test('el servidor rechaza cuerpos malformados/grandes y oculta errores internos', async () => {
  const app = express();
  configureHttpSecurity(app, { NODE_ENV: 'test' });
  app.post('/api/test', (_req, res) => res.json({ ok: true }));
  app.get('/api/failure', () => { throw new Error('database-password-sensitive'); });
  app.use(notFound, httpErrorHandler);
  await withServer(app, async (base) => {
    const malformed = await fetch(`${base}/api/test`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(malformed.status, 400);
    const oversized = await fetch(`${base}/api/test`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: 'x'.repeat(10 * 1024 * 1024) }) });
    assert.equal(oversized.status, 413);
    const failure = await fetch(`${base}/api/failure`);
    assert.equal(failure.status, 500);
    assert.deepEqual(await failure.json(), { error: 'No se pudo completar la solicitud.' });
    const missing = await fetch(`${base}/api/missing`);
    assert.equal(missing.status, 404);
    assert(missing.headers.get('content-type')?.includes('application/json'));
  });
});

test('los paquetes de proyectos nunca llegan al servidor de archivos públicos', async () => {
  const app = express();
  app.use('/uploads', protectPrivateUploads, (_req, res) => res.json({ public: true }));
  await withServer(app, async (base) => {
    for (const pathname of ['/project-packages/private.json', '/%70roject-packages/private.json', '/project-packages%2fprivate.json', '/folder%2f..%2fproject-packages/private.json']) {
      assert.equal((await fetch(`${base}/uploads${pathname}`)).status, 404);
    }
    assert.equal((await fetch(`${base}/uploads/product-image.png`)).status, 200);
  });
});

test('ready comprueba la base y health mantiene separado el estado del proceso', async () => {
  const app = express();
  let available = true;
  let checks = 0;
  installHealthRoutes(app, async () => { checks++; if (!available) throw new Error('postgres://sensitive'); });
  await withServer(app, async (base) => {
    assert.equal((await fetch(`${base}/health`)).status, 200);
    assert.equal(checks, 0);
    assert.deepEqual(await (await fetch(`${base}/ready`)).json(), { status: 'ready' });
    assert.equal(checks, 1);
    available = false;
    const response = await fetch(`${base}/ready`);
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), { status: 'unavailable' });
  });
});
