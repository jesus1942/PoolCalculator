import assert from 'node:assert/strict';
import { test } from 'node:test';
import prisma from '../src/config/database';
import { pickProjectMutation } from '../src/utils/projectMutation';
import { belongsToOrganization, normalizeMemberIds, usersBelongToOrganization } from '../src/utils/tenantRelations';
import { canAccessConversation, sanitizeConversation } from '../src/utils/conversationAccess';
import { projectUpdateController } from '../src/controllers/projectUpdateController';
import { createCrew } from '../src/controllers/crewController';
import { createAgendaEvent, deleteAgendaChecklistItem, updateAgendaChecklistItem } from '../src/controllers/agendaController';
import { createConversation } from '../src/controllers/conversationController';
import { getShareConfig } from '../src/controllers/projectShareController';
import { syncAgendaConversation } from '../src/services/conversationService';

const actor = { userId: 'user-a', role: 'ADMIN', orgId: 'org-a' };
const foreignProject = { id: 'project-b', userId: 'user-b', organizationId: 'org-b' };

/** Respuesta mínima de Express que permite verificar el resultado sin abrir un servidor. */
const response = () => {
  const res: any = { statusCode: 200, body: undefined };
  res.status = (status: number) => { res.statusCode = status; return res; };
  res.json = (body: unknown) => { res.body = body; return res; };
  return res;
};

/** Los delegates Prisma son proxies; restauramos cada sustitución al terminar el caso. */
const mockMethod = (t: any, target: any, name: string, implementation: (...args: any[]) => any) => {
  const previous = target[name];
  const fn = t.mock.fn(implementation);
  target[name] = fn;
  t.after(() => { target[name] = previous; });
  return fn;
};

test('la actualización de proyecto no permite transferir propietario, empresa ni relaciones', () => {
  assert.deepEqual(pickProjectMutation({
    name: 'Piscina', status: 'APPROVED', tasks: { manual: [] },
    id: 'new-id', userId: 'victim', organizationId: 'other', projectCode: 'stolen',
    user: { connect: { id: 'victim' } }, organization: { connect: { id: 'other' } },
    projectAccesses: { create: { userId: 'attacker' } },
  }), { name: 'Piscina', status: 'APPROVED', tasks: { manual: [] } });
});

test('una organización ausente no equivale a acceso global', () => {
  assert.equal(belongsToOrganization(null, null), false);
  assert.equal(belongsToOrganization('org-a', null), false);
  assert.equal(belongsToOrganization('org-b', 'org-a'), false);
  assert.equal(belongsToOrganization('org-a', 'org-a'), true);
  assert.deepEqual(normalizeMemberIds(['one', 'one', 'two']), ['one', 'two']);
  assert.equal(normalizeMemberIds(['one', 5]), null);
});

test('las personas se validan por membresía real, sin depender de su empresa abierta', async (t) => {
  let query: any;
  mockMethod(t, prisma.organizationMember, 'count', async (args: any) => { query = args; return 1; });
  assert.equal(await usersBelongToOrganization(['member', 'member'], 'org-a'), true);
  assert.deepEqual(query.where, { organizationId: 'org-a', userId: { in: ['member'] } });
  assert.equal(await usersBelongToOrganization(['member'], null), false);
});

test('el administrador no accede a conversaciones de otra empresa aunque figure como participante', () => {
  const conversation = {
    organizationId: 'org-b', createdById: 'user-b',
    participants: [{ userId: actor.userId, isActive: true }],
  };
  assert.equal(canAccessConversation(conversation, actor), false);
  assert.equal(canAccessConversation({ ...conversation, organizationId: 'org-a' }, actor), true);
});

test('una vista previa de conversación no revela mensajes internos a un instalador', () => {
  const conversation = { organizationId: 'org-a', createdById: 'owner', messages: [
    { id: 'private', visibility: 'INTERNAL_ONLY', body: 'privado' },
    { id: 'shared', visibility: 'ALL', body: 'compartido' },
  ] };
  const visible = sanitizeConversation(conversation, { ...actor, role: 'INSTALLER' });
  assert.deepEqual(visible.messages.map((message: any) => message.id), ['shared']);
  assert.equal(conversation.messages.length, 2);
});

test('todas las operaciones de avances rechazan un proyecto de otra empresa antes de escribir', async (t) => {
  mockMethod(t, prisma.project, 'findUnique', async () => foreignProject);
  mockMethod(t, prisma.projectUpdate, 'findUnique', async () => ({ id: 'update-b', projectId: foreignProject.id }));
  const create = mockMethod(t, prisma.projectUpdate, 'create', async () => { throw new Error('No debe escribir'); });
  const update = mockMethod(t, prisma.projectUpdate, 'update', async () => { throw new Error('No debe escribir'); });
  const remove = mockMethod(t, prisma.projectUpdate, 'delete', async () => { throw new Error('No debe escribir'); });
  const list = mockMethod(t, prisma.projectUpdate, 'findMany', async () => { throw new Error('No debe leer'); });
  for (const method of ['getByProject', 'getTimeline', 'getById', 'create', 'update', 'delete'] as const) {
    const res = response();
    await projectUpdateController[method]({
      user: actor, params: { projectId: foreignProject.id, id: 'update-b' }, body: { title: 'Cambio' },
    } as any, res);
    assert.equal(res.statusCode, 403, method);
  }
  assert.equal(create.mock.callCount() + update.mock.callCount() + remove.mock.callCount() + list.mock.callCount(), 0);
});

test('una cuadrilla no se crea parcialmente si se intenta añadir personas ajenas', async (t) => {
  mockMethod(t, prisma.organizationMember, 'count', async () => 0);
  const create = mockMethod(t, prisma.crew, 'create', async () => { throw new Error('No debe crear'); });
  const res = response();
  await createCrew({ user: actor, body: { name: 'Cuadrilla', memberIds: ['outsider'] } } as any, res);
  assert.equal(res.statusCode, 400);
  assert.equal(create.mock.callCount(), 0);
});

test('la agenda rechaza referencias a proyectos ajenos antes de crear el evento', async (t) => {
  mockMethod(t, prisma.project, 'findFirst', async (args: any) => {
    assert.equal(args.where.organizationId, 'org-a');
    return null;
  });
  const create = mockMethod(t, prisma.agendaEvent, 'create', async () => { throw new Error('No debe crear'); });
  const res = response();
  await createAgendaEvent({ user: actor, body: {
    title: 'Visita', projectId: 'project-b', startAt: '2026-10-01T10:00:00Z', endAt: '2026-10-01T11:00:00Z',
  } } as any, res);
  assert.equal(res.statusCode, 403);
  assert.equal(create.mock.callCount(), 0);
});

test('editar o borrar checklist combina el ID del item con su evento autorizado', async (t) => {
  mockMethod(t, prisma.agendaEvent, 'findUnique', async () => ({
    id: 'event-a', ownerId: actor.userId, organizationId: actor.orgId,
  }));
  let updateWhere: any;
  let deleteWhere: any;
  mockMethod(t, prisma.agendaChecklistItem, 'update', async (args: any) => { updateWhere = args.where; return {}; });
  mockMethod(t, prisma.agendaChecklistItem, 'deleteMany', async (args: any) => { deleteWhere = args.where; return { count: 0 }; });
  const req = { user: actor, params: { id: 'event-a', itemId: 'item-b' }, body: { done: true } } as any;
  await updateAgendaChecklistItem(req, response());
  await deleteAgendaChecklistItem(req, response());
  assert.deepEqual(updateWhere, { id: 'item-b', eventId: 'event-a' });
  assert.deepEqual(deleteWhere, updateWhere);
});

test('crear un canal rechaza participantes de otra empresa antes de sincronizar', async (t) => {
  mockMethod(t, prisma.organizationMember, 'count', async () => 1);
  const create = mockMethod(t, prisma.conversation, 'create', async () => { throw new Error('No debe crear'); });
  const res = response();
  await createConversation({ user: actor, body: { title: 'Canal', participantUserIds: ['outsider'] } } as any, res);
  assert.equal(res.statusCode, 400);
  assert.equal(create.mock.callCount(), 0);
});

test('la configuración compartida nunca devuelve el hash de la contraseña del cliente', async (t) => {
  mockMethod(t, prisma.project, 'findUnique', async () => ({ id: 'project-a', userId: actor.userId, organizationId: actor.orgId }));
  mockMethod(t, prisma, '$queryRaw', async () => []);
  mockMethod(t, prisma.agendaEvent, 'findMany', async () => []);
  mockMethod(t, prisma.projectShare, 'findUnique', async () => ({ id: 'share-a', shareToken: 'token', clientPassword: 'secret-hash' }));
  const res = response();
  await getShareConfig({ user: actor, params: { projectId: 'project-a' } } as any, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { id: 'share-a', shareToken: 'token' });
});

test('retirar asignados revoca su participación anterior en la conversación', async (t) => {
  mockMethod(t, prisma.conversation, 'findFirst', async () => ({ id: 'conversation-a' }));
  mockMethod(t, prisma.conversation, 'update', async () => ({ id: 'conversation-a' }));
  let revoked: any;
  mockMethod(t, prisma.conversationParticipant, 'updateMany', async (args: any) => { revoked = args; return { count: 1 }; });
  const upsert = mockMethod(t, prisma.conversationParticipant, 'upsert', async () => ({}));
  await syncAgendaConversation({
    agendaEventId: 'event-a', organizationId: 'org-a', createdById: 'owner', assigneeIds: ['current'],
  });
  assert.deepEqual(revoked, {
    where: { conversationId: 'conversation-a', userId: { notIn: ['owner', 'current'] }, isActive: true },
    data: { isActive: false },
  });
  assert.equal(upsert.mock.callCount(), 2);
});
