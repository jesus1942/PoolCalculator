import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const target = process.argv[2];
if (!['backend', 'frontend'].includes(target)) {
  throw new Error('Selecciona backend o frontend para ejecutar las pruebas.');
}

// El proceso de pruebas nunca hereda credenciales ni destinos de producción.
// Sólo conserva las variables que necesita el ejecutable de Node y el sistema.
const env = {};
for (const key of ['PATH', 'HOME', 'USERPROFILE', 'SystemRoot', 'TEMP', 'TMP', 'TMPDIR', 'LANG', 'LC_ALL', 'TZ']) {
  if (process.env[key] !== undefined) env[key] = process.env[key];
}
Object.assign(env, {
  NODE_ENV: 'test',
  JWT_SECRET: 'poolinstaller-unit-tests-only-secret-32-bytes-minimum',
  FRONTEND_URL: 'https://app.example.test',
  // Puerto cerrado: una consulta que no esté simulada debe fallar, nunca llegar a una base real.
  DATABASE_URL: 'postgresql://unit_test:unit_test@127.0.0.1:1/unit_test?connect_timeout=1',
});

const cwd = path.join(projectRoot, target);
const testFiles = readdirSync(path.join(cwd, 'tests'))
  .filter((name) => name.endsWith('.test.ts'))
  .sort()
  .map((name) => path.join('tests', name));
if (!testFiles.length) throw new Error(`No se encontraron pruebas de ${target}.`);

// No usa un shell: las rutas se pasan como argumentos y conserva la salida del runner.
const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...testFiles], {
  cwd,
  env,
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
