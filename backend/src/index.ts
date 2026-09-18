// La configuración se carga antes de importar servicios que leen variables al iniciar.
import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import passport from './config/passport';
import prisma from './config/database';
import platformIntegrationRoutes, { publicIntegrations } from './routes/platformIntegrationRoutes';
import { configureHttpSecurity, installPublicRateLimits, protectPrivateUploads, installHealthRoutes, notFound, httpErrorHandler } from './middleware/httpSecurity';
import { getIntegrationConfig } from './services/platformIntegrationService';
import authRoutes from './routes/authRoutes';
import poolPresetRoutes from './routes/poolPresetRoutes';
import projectRoutes from './routes/projectRoutes';
import tilePresetRoutes from './routes/tilePresetRoutes';
import accessoryPresetRoutes from './routes/accessoryPresetRoutes';
import equipmentPresetRoutes from './routes/equipmentPresetRoutes';
import equipmentRoutes from './routes/equipment';
import constructionMaterialRoutes from './routes/constructionMaterialRoutes';
import professionRoleRoutes from './routes/professionRoleRoutes';
import calculationSettingsRoutes from './routes/calculationSettingsRoutes';
import plumbingItemRoutes from './routes/plumbingItemRoutes';
import additionalsRoutes from './routes/additionalsRoutes';
import projectUpdatesRoutes from './routes/projectUpdates';
import projectShareRoutes from './routes/projectShareRoutes';
import publicShareRoutes from './routes/publicShareRoutes';
import passwordResetRoutes from './routes/passwordResetRoutes';
import publicContactRoutes from './routes/publicContactRoutes';
import catalogScraperRoutes from './routes/catalogScraperRoutes';
import professionalCalculationsRoutes from './routes/professionalCalculationsRoutes';
import productImageRoutes from './routes/productImageRoutes';
import weatherRoutes from './routes/weatherRoutes';
import agendaRoutes from './routes/agendaRoutes';
import crewRoutes from './routes/crewRoutes';
import userRoutes from './routes/userRoutes';
import docsRoutes from './routes/docsRoutes';
import organizationRoutes from './routes/organizationRoutes';
import opsRoutes from './routes/opsRoutes';
import conversationRoutes from './routes/conversationRoutes';
import { startAgendaReminderEmailService } from './services/agendaReminderEmailService';

export const app = express();
const PORT = process.env.PORT || 5000;

configureHttpSecurity(app, process.env, async () => (await getIntegrationConfig()).general.frontendUrl);
installPublicRateLimits(app);
app.use(passport.initialize());
app.use('/uploads', protectPrivateUploads, express.static(path.join(__dirname, '../uploads')));
app.use('/pool-images', express.static(path.join(__dirname, '../public/pool-images')));

installHealthRoutes(app, () => prisma.$queryRaw`SELECT 1`);

app.use('/api/auth', authRoutes);
app.use('/api/pool-presets', poolPresetRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tile-presets', tilePresetRoutes);
app.use('/api/accessory-presets', accessoryPresetRoutes);
app.use('/api/equipment-presets', equipmentPresetRoutes);
app.use('/api/equipment', equipmentRoutes); // Nueva ruta para recomendaciones
app.use('/api/construction-materials', constructionMaterialRoutes);
app.use('/api/profession-roles', professionRoleRoutes);
app.use('/api/calculation-settings', calculationSettingsRoutes);
app.use('/api/plumbing-items', plumbingItemRoutes);
app.use('/api/additionals', additionalsRoutes);
app.use('/api/project-updates', projectUpdatesRoutes);
app.use('/api/project-share', projectShareRoutes);
app.use('/api/public/timeline', publicShareRoutes);
app.use('/api/password-reset', passwordResetRoutes);
app.use('/api', publicContactRoutes); // Rutas públicas de contacto
app.use('/api/catalog-scraper', catalogScraperRoutes); // Scraping de catálogos
app.use('/api/professional-calculations', professionalCalculationsRoutes); // Cálculos profesionales hidráulicos y eléctricos
app.use('/api/products', productImageRoutes); // Gestión de imágenes de productos
app.use('/api', weatherRoutes); // Clima (proxy Open-Meteo)
app.use('/api/agenda', agendaRoutes); // Agenda pro
app.use('/api/crews', crewRoutes); // Crews
app.use('/api', userRoutes); // Usuarios
app.use('/api/docs', docsRoutes); // Documentación interna
app.use('/api/organizations', organizationRoutes); // Organizaciones
app.use('/api/admin/ops', opsRoutes); // Observabilidad backend/db
app.use('/api/conversations', conversationRoutes); // Conversaciones internas reutilizables
app.use('/api/admin/integrations', platformIntegrationRoutes);
app.get('/api/public/integrations', publicIntegrations);

const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
const frontendIndexPath = path.join(frontendDistPath, 'index.html');

if (fs.existsSync(frontendIndexPath)) {
  app.use(express.static(frontendDistPath, {
    etag: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('service-worker.js') || filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        return;
      }

      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return;
      }

      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }));

  app.get('/service-worker.js', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res.sendFile(path.join(frontendDistPath, 'service-worker.js'));
  });

  app.get('/manifest.json', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    return res.sendFile(path.join(frontendDistPath, 'manifest.json'));
  });

  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/pool-images')
    ) {
      return next();
    }

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res.sendFile(frontendIndexPath);
  });
  console.log(`[INIT] Frontend servido desde ${frontendDistPath}`);
} else {
  console.log(`[INIT] Frontend no encontrado en ${frontendDistPath}`);
}

// Los errores de API no deben terminar convertidos en el HTML de la aplicación.
app.use(notFound);
app.use(httpErrorHandler);

/** Importar la aplicación permite verificarla sin abrir puertos ni ejecutar recordatorios. */
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[INIT] Servidor listo en puerto ${PORT}`);
    startAgendaReminderEmailService();
  });
}

export default app;
