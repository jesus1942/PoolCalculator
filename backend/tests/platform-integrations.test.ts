import test from 'node:test';
import assert from 'node:assert/strict';
import { environmentIntegrationConfig, encryptIntegrationConfig, decryptIntegrationConfig, mergeIntegrationConfig, integrationAdminView, integrationReadiness, saveIntegrationConfig } from '../src/services/platformIntegrationService';
import prisma from '../src/config/database';

process.env.INTEGRATIONS_ENCRYPTION_KEY = 'a'.repeat(64);

test('credenciales cifradas autenticadas: ida y vuelta, IV único y rechazo de alteraciones', () => {
  const config = environmentIntegrationConfig();
  config.google.clientSecret = 'private-google-secret';
  const one = encryptIntegrationConfig(config);
  const two = encryptIntegrationConfig(config);
  assert.notEqual(one, two);
  assert.ok(!one.includes(config.google.clientSecret));
  assert.deepEqual(decryptIntegrationConfig(one), config);
  const parts = one.split('.');
  const cipher = Buffer.from(parts[3], 'base64'); cipher[0] ^= 1; parts[3] = cipher.toString('base64');
  assert.throws(() => decryptIntegrationConfig(parts.join('.')));
});

test('GET oculta todos los secretos y sólo publica si están configurados', () => {
  const config = environmentIntegrationConfig();
  config.google.clientSecret = 'secret-google';
  config.smtp.password = 'secret-smtp';
  config.telegram.botToken = '123:secret';
  const view = integrationAdminView(config, 3);
  assert.equal(view.revision, 3);
  assert.equal(view.config.google.clientSecret, '');
  assert.equal(view.config.smtp.password, '');
  assert.equal(view.config.telegram.botToken, '');
  assert.equal(view.secretsConfigured['smtp.password'], true);
  assert.ok(!JSON.stringify(view).includes('secret-google'));
});

test('vacío conserva secreto, null lo borra, campos desconocidos son rechazados', () => {
  const config = environmentIntegrationConfig();
  config.google.enabled = false;
  config.google.clientSecret = 'keep';
  assert.equal(mergeIntegrationConfig(config, { google: { clientSecret: '' } }).google.clientSecret, 'keep');
  assert.equal(mergeIntegrationConfig(config, { google: { clientSecret: null } }).google.clientSecret, '');
  assert.throws(() => mergeIntegrationConfig(config, { google: { admin: true } }));
  assert.throws(() => mergeIntegrationConfig(config, JSON.parse('{"__proto__":{"polluted":true}}')));
  assert.equal(({} as any).polluted, undefined);
});

test('validación impide puertos, URLs, tokens y activaciones incompletas inválidas', () => {
  const config = environmentIntegrationConfig();
  config.google.enabled = false; config.smtp.enabled = false;
  for (const patch of [
    { smtp: { port: -1 } }, { smtp: { port: 12.5 } },
    { general: { frontendUrl: 'javascript:alert(1)' } },
    { google: { callbackUrl: 'https://name:password@example.com/callback' } },
    { google: { enabled: true, clientId: '', clientSecret: null } },
    { whatsapp: { mode: 'unknown' } }, { whatsapp: { apiVersion: '../secret' } },
    { telegram: { botToken: 'invalid/path' } },
    { smtp: { from: 'x\r\nBCC: invalid' } },
  ]) assert.throws(() => mergeIntegrationConfig(config, patch));
});

test('WhatsApp enlace y Cloud validan requisitos diferentes', () => {
  const config = environmentIntegrationConfig();
  config.whatsapp.phoneNumber = '5492804000000';
  assert.equal(integrationReadiness(config).whatsapp, true);
  config.whatsapp.mode = 'cloud';
  assert.equal(integrationReadiness(config).whatsapp, false);
  config.whatsapp.phoneNumberId = '123'; config.whatsapp.accessToken = 'test'; config.whatsapp.apiVersion = 'v99.0';
  assert.equal(integrationReadiness(config).whatsapp, true);
});

test('versión obsoleta no puede sobrescribir configuración guardada', async () => {
  const original = prisma.platformIntegrationSetting.findUnique;
  (prisma.platformIntegrationSetting as any).findUnique = async () => ({ id: 'global', revision: 5, payload: encryptIntegrationConfig(environmentIntegrationConfig()) });
  try { await assert.rejects(saveIntegrationConfig({}, 4), (error: any) => error.status === 409); }
  finally { prisma.platformIntegrationSetting.findUnique = original; }
});

test('la configuración no se guarda sin clave de cifrado dedicada', () => {
  const previous = process.env.INTEGRATIONS_ENCRYPTION_KEY;
  delete process.env.INTEGRATIONS_ENCRYPTION_KEY;
  try { assert.throws(() => encryptIntegrationConfig(environmentIntegrationConfig()), /INTEGRATIONS_ENCRYPTION_KEY/); }
  finally { process.env.INTEGRATIONS_ENCRYPTION_KEY = previous; }
});


test('contraseñas SMTP conservan espacios y direcciones inválidas no se guardan', () => {
  const config = environmentIntegrationConfig();
  config.smtp.enabled = false;
  const updated = mergeIntegrationConfig(config, { smtp: { password: ' valid password ' } });
  assert.equal(updated.smtp.password, ' valid password ');
  assert.throws(() => mergeIntegrationConfig(config, { smtp: { from: 'not-an-email' } }));
  assert.throws(() => mergeIntegrationConfig(config, { smtp: { adminEmail: 'not-an-email' } }));
  assert.equal(mergeIntegrationConfig(config, { smtp: { from: 'PoolInstaller <test@example.com>' } }).smtp.from, 'PoolInstaller <test@example.com>');
});
