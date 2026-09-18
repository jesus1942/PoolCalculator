import test from 'node:test';
import assert from 'node:assert/strict';
import { passwordValidationError, userFromSessionToken } from '../src/utils/session.ts';

// Estos tokens sólo ejercitan la lectura local: la firma siempre la valida el servidor.
const payload = { userId: 'u-test', email: 'prueba@example.test', role: 'ADMIN', orgId: 'tenant-test', name: 'Jesús Olguín', exp: 4_102_444_800 };
const tokenFor = (value: Record<string, unknown>) => `header.${Buffer.from(JSON.stringify(value)).toString('base64url')}.signature`;

test('la sesión admite nombres Unicode en un JWT base64url', () => {
  assert.equal(userFromSessionToken(tokenFor(payload)).name, 'Jesús Olguín');
});

test('la sesión conserva la empresa del token', () => {
  assert.equal(userFromSessionToken(tokenFor(payload)).currentOrgId, 'tenant-test');
});

test('un token malformado no puede restaurar una sesión', () => {
  assert.throws(() => userFromSessionToken('bad'));
});

test('un token vencido no puede restaurar una sesión', () => {
  assert.throws(() => userFromSessionToken(tokenFor({ ...payload, exp: 1 })));
});

test('un rol desconocido no puede restaurar una sesión', () => {
  assert.throws(() => userFromSessionToken(tokenFor({ ...payload, role: 'UNKNOWN' })));
});

test('las contraseñas nuevas requieren ocho caracteres', () => {
  assert.equal(passwordValidationError('corto'), 'La contraseña debe tener al menos 8 caracteres');
});

test('una contraseña válida permite continuar', () => {
  assert.equal(passwordValidationError('password8'), null);
});

test('el límite de bcrypt cuenta bytes, incluidos caracteres Unicode', () => {
  assert.notEqual(passwordValidationError('á'.repeat(37)), null);
});

test('el límite de 72 bytes permite la contraseña sin truncarla', () => {
  assert.equal(passwordValidationError('a'.repeat(72)), null);
});
