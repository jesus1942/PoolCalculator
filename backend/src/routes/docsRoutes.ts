import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const DOCS_ADMIN_EMAIL = 'jesusnatec@gmail.com';

const resolveDocsDir = () => {
  const cwdDocs = path.resolve(process.cwd(), 'docs');
  if (fs.existsSync(cwdDocs)) {
    return cwdDocs;
  }
  return path.resolve(process.cwd(), '..', 'docs');
};

const docsDir = resolveDocsDir();

const requireDocsAdmin = (req: AuthRequest, res: Response, next: () => void) => {
  const role = req.user?.role;
  const email = req.user?.email;
  if ((role !== 'ADMIN' && role !== 'SUPERADMIN') || email !== DOCS_ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Acceso denegado para documentación' });
  }
  return next();
};

const sanitizeDocName = (name: string) => {
  const safeName = path.basename(name);
  if (safeName !== name || !safeName.endsWith('.md')) {
    return null;
  }
  const resolved = path.resolve(docsDir, safeName);
  if (!resolved.startsWith(docsDir + path.sep)) {
    return null;
  }
  return resolved;
};

router.get('/', authenticate, requireDocsAdmin, async (_req, res) => {
  try {
    const entries = await fsp.readdir(docsDir, { withFileTypes: true });
    const docs = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
    return res.json({ docs });
  } catch (error) {
    return res.status(500).json({ error: 'No se pudo leer el directorio de documentación' });
  }
});

router.get('/:name', authenticate, requireDocsAdmin, async (req, res) => {
  const resolved = sanitizeDocName(req.params.name);
  if (!resolved) {
    return res.status(400).json({ error: 'Nombre de archivo inválido' });
  }
  try {
    const content = await fsp.readFile(resolved, 'utf-8');
    return res.json({ name: req.params.name, content });
  } catch (error) {
    return res.status(404).json({ error: 'Documento no encontrado' });
  }
});

router.put('/:name', authenticate, requireDocsAdmin, async (req: AuthRequest, res) => {
  const resolved = sanitizeDocName(req.params.name);
  if (!resolved) {
    return res.status(400).json({ error: 'Nombre de archivo inválido' });
  }
  const content = req.body?.content;
  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'Contenido inválido' });
  }
  try {
    await fsp.access(resolved, fs.constants.F_OK);
    await fsp.writeFile(resolved, content, 'utf-8');
    return res.json({ message: 'Documento actualizado' });
  } catch (error) {
    return res.status(404).json({ error: 'Documento no encontrado' });
  }
});

export default router;
