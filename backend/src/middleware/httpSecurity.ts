import express, { ErrorRequestHandler, Express, RequestHandler } from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import path from 'path';

type Environment = Record<string, string | undefined>;

const DEPLOYED_ORIGINS = [
  'https://jesus1942.github.io',
  'https://poolcalculator-production.up.railway.app',
];

/** Normaliza la configuración; los comodines y protocolos ajenos a HTTP fallan al iniciar. */
export function allowedOrigins(env: Environment): Set<string> {
  const origins = new Set(DEPLOYED_ORIGINS);
  const configured = [env.FRONTEND_URL || '', ...(env.CORS_ORIGINS || '').split(',')];
  for (const value of configured.map((item) => item.trim()).filter(Boolean)) {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hostname.includes('*')) {
      throw new Error('CORS_ORIGINS y FRONTEND_URL deben contener URLs HTTP(S) sin comodines ni credenciales.');
    }
    origins.add(url.origin);
  }
  if (env.NODE_ENV !== 'production') {
    for (const host of ['localhost', '127.0.0.1']) {
      for (const port of [3000, 5000, 5173]) origins.add(`http://${host}:${port}`);
    }
  }
  return origins;
}

/** Confía únicamente en la cantidad declarada de proxies entre cliente y aplicación. */
export function trustedProxyHops(env: Environment): number {
  const value = env.TRUST_PROXY_HOPS ?? (env.NODE_ENV === 'production' ? '1' : '0');
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new Error('TRUST_PROXY_HOPS debe ser un entero no negativo.');
  }
  return Number(value);
}

/** Instala las políticas HTTP antes de parsear cuerpos o ejecutar controladores. */
export function configureHttpSecurity(app: Express, env: Environment = process.env, getFrontendUrl?: () => Promise<string | undefined>): void {
  const origins = allowedOrigins(env);
  app.disable('x-powered-by');
  app.set('trust proxy', trustedProxyHops(env));
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });
  app.use(cors({
    origin(origin, callback) {
      // Las aplicaciones nativas y comprobaciones de salud pueden omitir Origin.
      if (!origin || origins.has(origin)) return callback(null, true);
      const deny = () => callback(Object.assign(new Error('Origen no permitido.'), { status: 403, code: 'CORS_ORIGIN_DENIED' }));
      if (!getFrontendUrl) return deny();
      // El dominio guardado en Integraciones entra en vigencia sin reiniciar el servidor.
      void getFrontendUrl().then((value) => {
        if (value) {
          const url = new URL(value);
          if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.hostname.includes('*') && url.origin === origin) {
            callback(null, true);
            return;
          }
        }
        deny();
      }).catch(deny);
    },
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true, parameterLimit: 1000 }));
}

/** Usa la agrupación IPv6 segura de express-rate-limit; no confía en un X-Forwarded-For arbitrario. */
export function createRequestLimiter(limit: number, windowMs: number): RequestHandler {
  return rateLimit({
    limit,
    windowMs,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Demasiados intentos. Espera unos minutos y vuelve a intentar.' },
  });
}

/** Cada tipo de operación conserva un contador independiente por cliente. */
export function installPublicRateLimits(app: Express): void {
  app.use(['/api/auth/login', '/api/auth/register'], createRequestLimiter(30, 15 * 60 * 1000));
  app.use('/api/password-reset', createRequestLimiter(20, 60 * 60 * 1000));
  app.use(['/api/contact', '/api/quote-requests', '/api/calculator-inquiry'], createRequestLimiter(10, 15 * 60 * 1000));
}

/** Impide que express.static exponga paquetes de proyectos, incluso con rutas codificadas. */
export const protectPrivateUploads: RequestHandler = (req, res, next) => {
  try {
    const decoded = decodeURIComponent(req.path).replace(/\\/g, '/');
    const normalized = path.posix.normalize(`/${decoded}`).toLowerCase();
    if (normalized === '/project-packages' || normalized.startsWith('/project-packages/')) {
      res.status(404).json({ error: 'Recurso no encontrado.' });
      return;
    }
    next();
  } catch {
    res.status(400).json({ error: 'Ruta inválida.' });
  }
};

/** Separa disponibilidad del proceso de disponibilidad de la base sin revelar configuración. */
export function installHealthRoutes(app: Express, checkDatabase: () => Promise<unknown>): void {
  app.get('/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ status: 'ok' });
  });
  app.get('/ready', async (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      await checkDatabase();
      res.json({ status: 'ready' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });
}

/** Se instala después de las rutas y del fallback de la SPA. */
export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Recurso no encontrado.' });
};

/** Convierte errores de transporte en JSON y no devuelve stack, consultas ni secretos. */
export const httpErrorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) return next(error);
  if (error?.code === 'CORS_ORIGIN_DENIED') {
    res.status(403).json({ error: 'Origen no permitido.' });
  } else if (error?.type === 'entity.too.large' || error?.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ error: 'El contenido supera el tamaño permitido.' });
  } else if (error?.type === 'entity.parse.failed' || error instanceof URIError) {
    res.status(400).json({ error: 'La solicitud contiene datos inválidos.' });
  } else if (typeof error?.code === 'string' && error.code.startsWith('LIMIT_')) {
    res.status(400).json({ error: 'Los archivos enviados no cumplen los límites permitidos.' });
  } else {
    const status = Number.isInteger(error?.status) && error.status >= 400 && error.status < 500 ? error.status : 500;
    res.status(status).json({ error: status < 500 ? 'Solicitud inválida.' : 'No se pudo completar la solicitud.' });
  }
};
