import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import express from 'express';
import prisma from '../src/config/database';
import {
  createPublicComment,
  exportPublicTimeline,
  getPublicTimeline,
  listPublicComments,
} from '../src/controllers/projectShareController';
import publicShareRoutes from '../src/routes/publicShareRoutes';
import { buildPublicProject, buildPublicTimeline, normalizePublicImages } from '../src/utils/publicTimeline';

const image = 'data:image/jpeg;base64,aGVsbG8=';
const publicUpdate = {
  id: 'public-update', projectId: 'private-project-id', title: 'Un nuevo capítulo',
  description: 'Descripción autorizada', category: 'PROGRESS', images: [image],
  isPublic: true, createdAt: new Date('2026-09-01T12:00:00Z'),
  metadata: { internalNote: 'PRIVATE-METADATA', unitPrice: 999 },
  createdBy: { email: 'private@example.test' },
};
const project = {
  id: 'private-project-id', name: 'La piscina del jardín', clientName: 'Cliente de prueba',
  status: 'IN_PROGRESS', createdAt: new Date('2026-08-01T12:00:00Z'),
  totalCost: 900, materialCost: 700, laborCost: 200,
  clientEmail: 'private@example.test',
  plumbingConfig: { selectedItems: [{ cost: 999, internalNote: 'PRIVATE-CONFIG' }] },
  commercialProfile: { extraPlumbingItems: [{ cost: 999 }] },
  tasks: [{ internalNote: 'PRIVATE-TASK' }],
  projectUpdates: [publicUpdate, { ...publicUpdate, id: 'private-update', title: 'PRIVATE-UPDATE', isPublic: false }],
};
const comments = [{ id: 'comment', authorName: 'Cliente de prueba', kind: 'QUESTION', body: 'Consulta pública', reply: null, repliedAt: null, createdAt: new Date() }];
const makeShare = (showDetails = true, showCosts = false) => ({
  isActive: true, expiresAt: null, showDetails, showCosts, projectId: project.id, project,
  clientUsername: 'PRIVATE-USERNAME', clientPassword: 'PRIVATE-HASH',
});

const response = () => {
  const res: any = { statusCode: 200, body: undefined, headers: {} };
  res.status = (status: number) => { res.statusCode = status; return res; };
  res.json = res.send = (body: unknown) => { res.body = body; return res; };
  res.setHeader = (name: string, value: string) => { res.headers[name] = value; return res; };
  return res;
};
const mockMethod = (t: any, target: any, name: string, implementation: (...args: any[]) => any) => {
  const previous = target[name];
  const fn = t.mock.fn(implementation);
  target[name] = fn;
  t.after(() => { target[name] = previous; });
  return fn;
};

test('el DTO público elimina campos privados incluso si el origen incluye relaciones completas', () => {
  const hidden = buildPublicProject(project, false);
  assert.deepEqual(hidden, {
    name: project.name, clientName: project.clientName, status: project.status, createdAt: project.createdAt,
  });
  assert.deepEqual(buildPublicProject(project, true), { ...hidden, totalCost: 900, materialCost: 700, laborCost: 200 });
  const entries = buildPublicTimeline(project.projectUpdates, true);
  assert.equal(entries.length, 1);
  assert.deepEqual(Object.keys(entries[0]).sort(), ['id', 'type', 'createdAt', 'title', 'description', 'category', 'images'].sort());
  assert.equal(entries[0].description, 'Descripción autorizada');
  assert.deepEqual(entries[0].images, [image]);
  const hiddenEntries = buildPublicTimeline(project.projectUpdates, false);
  assert.equal('description' in hiddenEntries[0], false);
  assert.deepEqual(hiddenEntries[0].images, []);
});

test('las fotos públicas toleran JSON heterogéneo y bloquean protocolos, credenciales y recorridos de rutas', () => {
  const allowed = [image, 'data:image/png;base64,aGVsbG8=', 'data:image/webp;base64,aGVsbG8=',
    'https://images.example.test/pool.jpg', 'http://images.example.test/pool.png',
    '/uploads/photo.jpg', 'pool-images/photo.webp', '/uploads/my%20photo.jpg?v=2'];
  const rejected = [null, 12, {}, ['nested'], '', 'javascript:alert(1)', 'data:text/html;base64,aGVsbG8=',
    'data:image/svg+xml;base64,aGVsbG8=', 'data:image/jpeg;base64,', '//host.example.test/a.png',
    'https://user:secret@images.example.test/a.jpg', 'https://host.example.test/\nphoto.jpg',
    '/uploads/../private.json', '/uploads/%2e%2e/private.json', '/uploads/%252e%252e/private.json',
    '/uploads/project-packages/private.json', '/uploads/%70roject-packages/private.json',
    '/uploads/..\\private.json', '/api/private-image', '/uploads/%00.jpg', '/uploads/%zz.jpg'];
  assert.deepEqual(normalizePublicImages([...allowed, ...rejected, image]), allowed);
  for (const value of [null, {}, 'https://images.example.test/a.jpg']) assert.deepEqual(normalizePublicImages(value), []);
});

test('JSON y CSV respetan los permisos independientes de detalles y costos sin filtrar campos internos', async (t) => {
  let share = makeShare();
  mockMethod(t, prisma.projectShare, 'findUnique', async (query: any) => {
    assert.equal(query.where.shareToken, 'share-token');
    assert.deepEqual(query.select.project.select.projectUpdates.where, { isPublic: true });
    assert.equal(query.select.project.select.projectUpdates.select.metadata, undefined);
    assert.equal(query.select.project.select.plumbingConfig, undefined);
    assert.equal(query.select.clientPassword, undefined);
    return share;
  });
  mockMethod(t, prisma.projectClientComment, 'findMany', async (query: any) => {
    assert.deepEqual(query.where, { projectId: project.id });
    return comments;
  });
  for (const showDetails of [false, true]) {
    for (const showCosts of [false, true]) {
      share = makeShare(showDetails, showCosts);
      const res = response();
      await getPublicTimeline({ params: { shareToken: 'share-token' } } as any, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.project.name, project.name);
      assert.deepEqual(res.body.config, { showCosts, showDetails });
      assert.deepEqual(res.body.comments, comments);
      assert.deepEqual(res.body.updates, res.body.timeline);
      assert.equal(res.body.timeline.length, 1);
      assert.equal('totalCost' in res.body.project, showCosts);
      assert.equal('materialCost' in res.body.project, showCosts);
      assert.equal('laborCost' in res.body.project, showCosts);
      assert.equal('description' in res.body.timeline[0], showDetails);
      assert.deepEqual(res.body.timeline[0].images, showDetails ? [image] : []);
      assert.doesNotMatch(JSON.stringify(res.body), /PRIVATE-|private@example|private-project-id|commercialProfile|metadata|plumbingConfig/);

      const csv = response();
      await exportPublicTimeline({ params: { shareToken: 'share-token' } } as any, csv);
      assert.equal(csv.statusCode, 200);
      assert.equal(csv.headers['Content-Type'], 'text/csv; charset=utf-8');
      assert.equal(csv.body.includes('Descripción autorizada'), showDetails);
      assert.doesNotMatch(csv.body, /PRIVATE-|private@example|900|700|200/);
    }
  }
});

test('enlaces ausentes, desactivados o vencidos bloquean lectura, exportación y comentarios antes de acceder a sus mensajes', async (t) => {
  let share: any = null;
  mockMethod(t, prisma.projectShare, 'findUnique', async () => share);
  const read = mockMethod(t, prisma.projectClientComment, 'findMany', async () => { throw new Error('No debe leer mensajes'); });
  const create = mockMethod(t, prisma.projectClientComment, 'create', async () => { throw new Error('No debe escribir'); });
  for (const [invalidShare, status] of [[null, 404], [{ ...makeShare(), isActive: false }, 404], [{ ...makeShare(), expiresAt: new Date(0) }, 410]] as const) {
    share = invalidShare;
    for (const handler of [getPublicTimeline, exportPublicTimeline, listPublicComments, createPublicComment]) {
      const res = response();
      await handler({ params: { shareToken: 'invalid' }, body: { body: 'Consulta' } } as any, res);
      assert.equal(res.statusCode, status);
    }
  }
  assert.equal(read.mock.callCount() + create.mock.callCount(), 0);
});

test('los comentarios vacíos o excesivos se rechazan antes de escribir', async (t) => {
  mockMethod(t, prisma.projectShare, 'findUnique', async () => makeShare());
  const create = mockMethod(t, prisma.projectClientComment, 'create', async () => { throw new Error('No debe escribir'); });
  for (const body of ['', '   ', null, {}, 'x'.repeat(2001)]) {
    const res = response();
    await createPublicComment({ params: { shareToken: 'share-token' }, body: { body } } as any, res);
    assert.equal(res.statusCode, 400);
  }
  assert.equal(create.mock.callCount(), 0);
});

test('los límites de login y escritura de comentarios son independientes y mantienen la lectura disponible', async (t) => {
  mockMethod(t, prisma.projectShare, 'findUnique', async () => null);
  const app = express();
  app.use(express.json(), publicShareRoutes);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  const post = (route: string) => fetch(`${base}${route}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  });
  try {
    for (let i = 0; i < 30; i++) assert.equal((await post('/login')).status, 400);
    const limitedLogin = await post('/login');
    assert.equal(limitedLogin.status, 429);
    assert.equal(limitedLogin.headers.get('cache-control'), 'private, no-store');
    assert.equal(limitedLogin.headers.get('x-robots-tag'), 'noindex, nofollow');
    for (let i = 0; i < 20; i++) assert.equal((await post('/share-token/comments')).status, 404);
    assert.equal((await post('/share-token/comments')).status, 429);
    assert.equal((await fetch(`${base}/share-token/comments`)).status, 404);
    assert.equal((await fetch(`${base}/share-token`)).status, 404);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
