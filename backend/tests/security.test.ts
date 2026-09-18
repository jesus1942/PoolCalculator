import { afterEach, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import prisma from '../src/config/database';
import { authenticate } from '../src/middleware/auth';
import { generateToken, verifyToken, signOAuthState, verifyOAuthState } from '../src/config/jwt';
import { buildProjectAccessProfileFromContext, canManageOrganization, sanitizeProjectForAccess } from '../src/utils/projectAccess';
import { ensureOrganizationInTransaction, OrganizationAccessError } from '../src/utils/authOrganization';
import { normalizeEmail, validNewPassword } from '../src/utils/authValidation';
import { createUser } from '../src/controllers/userController';
import { resetPassword, verifyResetToken } from '../src/controllers/passwordResetController';
import { matchesOAuthState } from '../src/controllers/googleAuthController';

// Todas las consultas están sustituidas: las regresiones no usan servicios reales.
const restores: Array<() => void> = [];
const stub = (target: any, key: string, implementation: (...args: any[]) => any) => {
  const previous = target[key];
  const replacement = mock.fn(implementation);
  target[key] = replacement;
  restores.push(() => { target[key] = previous; });
  return replacement;
};
afterEach(() => { restores.splice(0).reverse().forEach((restore) => restore()); mock.restoreAll(); });
const response = () => {
  const res: any = { statusCode: 200, body: undefined };
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (body: unknown) => { res.body = body; return res; };
  return res;
};
const actor = { userId: 'owner-a', role: 'ADMIN', orgId: 'org-a' };
const project = { id: 'project-b', userId: 'owner-b', organizationId: 'org-b' };
const authRequest = (method = 'GET', originalUrl = '/api/projects') => ({
  headers: { authorization: `Bearer ${generateToken('user-a', 'user@example.test', 'SUPERADMIN', 'org-a')}` },
  method, originalUrl,
} as any);

test('tenant ADMIN cannot access foreign projects, including ownership and explicit grants', () => {
  const context = { assignedProjectIds: new Set(['project-b']), explicitByProjectId: new Map([['project-b', { projectId: 'project-b', canEdit: true, canViewFinancials: true, allowedTabs: ['overview'] }]]) };
  for (const role of ['ADMIN', 'USER', 'INSTALLER', 'VIEWER']) {
    assert.equal(buildProjectAccessProfileFromContext(project, { ...actor, role, userId: project.userId }, context).canAccess, false);
  }
  assert.equal(buildProjectAccessProfileFromContext(project, { ...actor, role: 'SUPERADMIN' }).canAccess, true);
  assert.equal(buildProjectAccessProfileFromContext({ ...project, organizationId: 'org-a' }, actor).canAccess, true);
  assert.equal(buildProjectAccessProfileFromContext({ ...project, organizationId: null }, actor).canAccess, false);
});

test('read-only project ownership cannot write and shared editing cannot delete', () => {
  const sameOrgProject = { ...project, organizationId: 'org-a' };
  const viewer = buildProjectAccessProfileFromContext(sameOrgProject, { ...actor, userId: 'owner-b', role: 'VIEWER' });
  assert.equal(viewer.canAccess, true);
  assert.equal(viewer.canEdit, false);
  assert.equal(viewer.canDelete, false);
  const context = { assignedProjectIds: new Set<string>(), explicitByProjectId: new Map([['project-b', { projectId: 'project-b', canEdit: true, canViewFinancials: false, allowedTabs: ['overview'] }]]) };
  const installer = buildProjectAccessProfileFromContext(sameOrgProject, { ...actor, role: 'INSTALLER' }, context);
  assert.equal(installer.canEdit, true);
  assert.equal(installer.canDelete, false);
  const result = sanitizeProjectForAccess({ materialCost: 800, nested: [{ pricePerUnit: 100, quantity: 2 }] }, installer);
  assert.equal(result.materialCost, 0);
  assert.deepEqual(result.nested, [{ pricePerUnit: 0, quantity: 2 }]);
});

test('organization administration checks actual membership rather than global ADMIN', async () => {
  stub(prisma.organizationMember, 'findUnique', async () => ({ role: 'MEMBER' }));
  assert.equal(await canManageOrganization(actor), false);
  assert.equal(await canManageOrganization({ ...actor, orgId: null }), false);
  assert.equal(await canManageOrganization({ ...actor, role: 'SUPERADMIN' }), true);
});

test('deleted accounts and revoked memberships invalidate signed sessions', async () => {
  const userMock = stub(prisma.user, 'findUnique', async () => null);
  let nextCalled = false;
  let res = response();
  await authenticate(authRequest(), res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
  userMock.mock.mockImplementation(async () => ({ id: 'user-a', email: 'user@example.test', role: 'ADMIN', sessionVersion: 0 }));
  stub(prisma.organizationMember, 'findUnique', async () => null);
  res = response();
  await authenticate(authRequest(), res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

test('session cannot retain SUPERADMIN or ADMIN privileges after role/membership changes', async () => {
  stub(prisma.user, 'findUnique', async () => ({ id: 'user-a', email: 'user@example.test', role: 'ADMIN', sessionVersion: 0 }));
  stub(prisma.organizationMember, 'findUnique', async () => ({ role: 'MEMBER' }));
  const req = authRequest();
  let called = false;
  await authenticate(req, response(), () => { called = true; });
  assert.equal(called, true);
  assert.equal(req.user.role, 'USER');
});

test('organization owner gets tenant administration without platform privilege', async () => {
  stub(prisma.user, 'findUnique', async () => ({ id: 'user-a', email: 'user@example.test', role: 'USER', sessionVersion: 0 }));
  stub(prisma.organizationMember, 'findUnique', async () => ({ role: 'OWNER' }));
  const req = authRequest();
  await authenticate(req, response(), () => {});
  assert.equal(req.user.role, 'ADMIN');
  assert.equal(req.user.orgId, 'org-a');
});

test('VIEWER membership blocks mutation even with a previously administrative JWT', async () => {
  stub(prisma.user, 'findUnique', async () => ({ id: 'user-a', email: 'user@example.test', role: 'ADMIN', sessionVersion: 0 }));
  stub(prisma.organizationMember, 'findUnique', async () => ({ role: 'VIEWER' }));
  const res = response();
  let called = false;
  await authenticate(authRequest('DELETE'), res, () => { called = true; });
  assert.equal(res.statusCode, 403);
  assert.equal(called, false);
  await authenticate(authRequest('POST', '/api/organizations/switch'), response(), () => { called = true; });
  assert.equal(called, true);
});

test('installer path prefix cannot accidentally authorize adjacent endpoints', async () => {
  stub(prisma.user, 'findUnique', async () => ({ id: 'user-a', email: 'user@example.test', role: 'INSTALLER', sessionVersion: 0 }));
  stub(prisma.organizationMember, 'findUnique', async () => ({ role: 'MEMBER' }));
  const res = response();
  await authenticate(authRequest('GET', '/api/projects-admin'), res, () => assert.fail('unexpected access'));
  assert.equal(res.statusCode, 403);
});

test('login never recreates a revoked installer membership', async () => {
  let created = false;
  const tx: any = {
    user: { findUniqueOrThrow: async () => ({ id: 'installer', name: 'Installer', currentOrgId: 'revoked-org', role: 'INSTALLER' }) },
    organizationMember: { findUnique: async () => null, findFirst: async () => null, create: async () => { created = true; } },
    organization: { create: async () => { created = true; } },
  };
  await assert.rejects(ensureOrganizationInTransaction(tx, 'installer'), OrganizationAccessError);
  assert.equal(created, false);
});

test('creating a tenant user cannot attach or rename an account from another tenant', async () => {
  stub(prisma.organizationMember, 'findUnique', async ({ where }: any) => where.organizationId_userId.userId === actor.userId ? { role: 'OWNER' } : null);
  stub(prisma.organization, 'findUnique', async () => ({ id: 'org-a' }));
  stub(prisma.user, 'findFirst', async () => ({ id: 'foreign-installer', role: 'INSTALLER' }));
  const update = stub(prisma.user, 'update', async () => assert.fail('foreign user modified'));
  const res = response();
  await createUser({ user: actor, body: { email: 'foreign@example.test', name: 'Replacement', role: 'INSTALLER', password: 'valid-new-password' } } as any, res);
  assert.equal(res.statusCode, 403);
  assert.equal(update.mock.callCount(), 0);
});

test('reset token lookup uses a digest and two concurrent redemptions change password only once', async () => {
  const token = 'a'.repeat(64);
  const digest = crypto.createHash('sha256').update(token).digest('hex');
  stub(prisma.passwordResetToken, 'findUnique', async ({ where }: any) => {
    assert.equal(where.token, digest);
    assert.notEqual(where.token, token);
    return { id: 'reset-id', token: digest, userId: 'user-a', used: false, expiresAt: new Date(Date.now() + 60_000) };
  });
  let consumed = false;
  let passwordUpdates = 0;
  const tx: any = {
    passwordResetToken: { updateMany: async ({ where }: any) => {
      if (!where.id) return { count: 0 };
      assert.equal(where.used, false);
      assert.equal(where.token, digest);
      if (consumed) return { count: 0 };
      consumed = true;
      return { count: 1 };
    } },
    user: { update: async ({ data }: any) => { assert.deepEqual(data.sessionVersion, { increment: 1 }); passwordUpdates++; return {}; } },
  };
  stub(prisma, '$transaction', async (fn: any) => fn(tx));
  const one = response();
  const two = response();
  await Promise.all([resetPassword({ body: { token, newPassword: 'new-password-123' } } as any, one), resetPassword({ body: { token, newPassword: 'other-password-123' } } as any, two)]);
  assert.deepEqual([one.statusCode, two.statusCode].sort(), [200, 400]);
  assert.equal(passwordUpdates, 1);
  const verified = response();
  await verifyResetToken({ query: { token } } as any, verified);
  assert.equal(verified.body.valid, true);
});

test('OAuth state is browser-bound, signed, expiring, and not a usable session token', () => {
  const state = signOAuthState('b'.repeat(64));
  assert.equal(verifyOAuthState(state), true);
  assert.throws(() => verifyToken(state));
  assert.equal(matchesOAuthState({ query: { state }, headers: { cookie: `poolinstaller_oauth_state=${state}` } } as any), true);
  assert.equal(matchesOAuthState({ query: { state }, headers: {} } as any), false);
  assert.equal(matchesOAuthState({ query: { state }, headers: { cookie: `poolinstaller_oauth_state=${signOAuthState('c'.repeat(64))}` } } as any), false);
  assert.equal(verifyOAuthState(state.slice(0, -8) + 'tampered'), false);
  const expired = jwt.sign({ nonce: 'b'.repeat(64) }, process.env.JWT_SECRET || 'secret-key-change-in-production', { algorithm: 'HS256', expiresIn: -1, audience: 'google-oauth-state' });
  assert.equal(verifyOAuthState(expired), false);
});

test('credentials enforce types and bcrypt byte length, and session JWT forbids algorithm changes', () => {
  assert.equal(normalizeEmail(' Name@Example.Test '), 'name@example.test');
  assert.equal(normalizeEmail({ email: 'name@example.test' }), null);
  assert.equal(validNewPassword('1234567'), false);
  assert.equal(validNewPassword('🔐'.repeat(19)), false);
  assert.equal(validNewPassword('correct-password'), true);
  const otherAlgorithm = jwt.sign({ userId: 'user-a', email: 'user@example.test', role: 'ADMIN', orgId: 'org-a' }, process.env.JWT_SECRET || 'secret-key-change-in-production', { algorithm: 'HS384' });
  assert.throws(() => verifyToken(otherAlgorithm));
});

test('password change invalidates all previously issued access tokens', async () => {
  stub(prisma.user, 'findUnique', async () => ({ id: 'user-a', email: 'user@example.test', role: 'ADMIN', sessionVersion: 1 }));
  const res = response();
  await authenticate(authRequest(), res, () => assert.fail('revoked token accepted'));
  assert.equal(res.statusCode, 401);
});

test('business-rule update rejects nested identity changes and foreign ownership', async () => {
  const { updateBusinessRule } = await import('../src/controllers/additionalsController');
  const lookup = stub(prisma.businessRule, 'findFirst', async ({ where }: any) => {
    assert.equal(where.userId, actor.userId);
    return { id: 'rule-a', userId: actor.userId };
  });
  const update = stub(prisma.businessRule, 'update', async () => assert.fail('unexpected write'));
  let res = response();
  await updateBusinessRule({ user: actor, params: { id: 'rule-a' }, body: { user: { update: { role: 'SUPERADMIN' } } } } as any, res);
  assert.equal(res.statusCode, 400);
  lookup.mock.mockImplementation(async () => null);
  res = response();
  await updateBusinessRule({ user: actor, params: { id: 'rule-foreign' }, body: { name: 'Changed' } } as any, res);
  assert.equal(res.statusCode, 404);
  assert.equal(update.mock.callCount(), 0);
});

test('additional lookup cannot expose items from a foreign project', async () => {
  const { getProjectAdditionals } = await import('../src/controllers/additionalsController');
  stub(prisma.project, 'findUnique', async () => project);
  const lookup = stub(prisma.projectAdditional, 'findMany', async () => assert.fail('foreign items queried'));
  const res = response();
  await getProjectAdditionals({ user: actor, params: { projectId: project.id } } as any, res);
  assert.equal(res.statusCode, 404);
  assert.equal(lookup.mock.callCount(), 0);
});
