import test from 'node:test';
import assert from 'node:assert/strict';
import { restoreStaticRoute } from '../src/utils/staticRoute.ts';

test('restaura enlaces directos en Pages preservando consulta y capítulo', () => {
  assert.equal(restoreStaticRoute({ pathname: '/PoolCalculator/', hash: '#/demo/historia' }, '/PoolCalculator/'), '/PoolCalculator/demo/historia');
  assert.equal(restoreStaticRoute({ pathname: '/PoolCalculator/', hash: '#/client-login?returnUrl=%2Ftimeline%2Fejemplo#ayuda' }, '/PoolCalculator/'), '/PoolCalculator/client-login?returnUrl=%2Ftimeline%2Fejemplo#ayuda');
});

test('admite raíz del servidor y conserva anchors o rutas ya resueltas', () => {
  assert.equal(restoreStaticRoute({ pathname: '/', hash: '#/demo/historia' }, '/'), '/demo/historia');
  assert.equal(restoreStaticRoute({ pathname: '/PoolCalculator/', hash: '#contact' }, '/PoolCalculator/'), null);
  assert.equal(restoreStaticRoute({ pathname: '/PoolCalculator/demo/historia', hash: '#capitulo-1' }, '/PoolCalculator/'), null);
});

test('rechaza salida del base path, destinos externos y fragmentos inválidos', () => {
  for (const hash of ['#//otro.example', '#/../fuera', '#/%2e%2e/fuera', '#/\\otro.example', '#/mal%ZZ', '#/ruta\nrota']) {
    assert.equal(restoreStaticRoute({ pathname: '/PoolCalculator/', hash }, '/PoolCalculator/'), null, hash);
  }
});
