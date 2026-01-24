import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import passport from './config/passport';

console.log('[INIT] Iniciando servidor...');

import authRoutes from './routes/authRoutes';
console.log('[INIT] authRoutes cargado');

import poolPresetRoutes from './routes/poolPresetRoutes';
console.log('[INIT] poolPresetRoutes cargado');

import projectRoutes from './routes/projectRoutes';
console.log('[INIT] projectRoutes cargado');

import tilePresetRoutes from './routes/tilePresetRoutes';
console.log('[INIT] tilePresetRoutes cargado');

import accessoryPresetRoutes from './routes/accessoryPresetRoutes';
console.log('[INIT] accessoryPresetRoutes cargado');

import equipmentPresetRoutes from './routes/equipmentPresetRoutes';
console.log('[INIT] equipmentPresetRoutes cargado');

import equipmentRoutes from './routes/equipment';
console.log('[INIT] equipmentRoutes (recomendaciones) cargado');

import constructionMaterialRoutes from './routes/constructionMaterialRoutes';
console.log('[INIT] constructionMaterialRoutes cargado');

import professionRoleRoutes from './routes/professionRoleRoutes';
console.log('[INIT] professionRoleRoutes cargado');

import calculationSettingsRoutes from './routes/calculationSettingsRoutes';
console.log('[INIT] calculationSettingsRoutes cargado');

import plumbingItemRoutes from './routes/plumbingItemRoutes';
console.log('[INIT] plumbingItemRoutes cargado');

import additionalsRoutes from './routes/additionalsRoutes';
console.log('[INIT] additionalsRoutes cargado');

import projectUpdatesRoutes from './routes/projectUpdates';
console.log('[INIT] projectUpdatesRoutes cargado');

import projectShareRoutes from './routes/projectShareRoutes';
console.log('[INIT] projectShareRoutes cargado');

import publicShareRoutes from './routes/publicShareRoutes';
console.log('[INIT] publicShareRoutes cargado');

import passwordResetRoutes from './routes/passwordResetRoutes';
console.log('[INIT] passwordResetRoutes cargado');

import publicContactRoutes from './routes/publicContactRoutes';
console.log('[INIT] publicContactRoutes cargado');

import catalogScraperRoutes from './routes/catalogScraperRoutes';
console.log('[INIT] catalogScraperRoutes cargado');

import professionalCalculationsRoutes from './routes/professionalCalculationsRoutes';
console.log('[INIT] professionalCalculationsRoutes cargado');

import productImageRoutes from './routes/productImageRoutes';
console.log('[INIT] productImageRoutes cargado');

import weatherRoutes from './routes/weatherRoutes';
console.log('[INIT] weatherRoutes cargado');

import agendaRoutes from './routes/agendaRoutes';
console.log('[INIT] agendaRoutes cargado');

import crewRoutes from './routes/crewRoutes';
console.log('[INIT] crewRoutes cargado');

import userRoutes from './routes/userRoutes';
console.log('[INIT] userRoutes cargado');

import docsRoutes from './routes/docsRoutes';
console.log('[INIT] docsRoutes cargado');

import organizationRoutes from './routes/organizationRoutes';
console.log('[INIT] organizationRoutes cargado');

import opsRoutes from './routes/opsRoutes';
console.log('[INIT] opsRoutes cargado');

import { startAgendaReminderEmailService } from './services/agendaReminderEmailService';

dotenv.config();
console.log('[INIT] Variables de entorno cargadas');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar CORS para permitir acceso desde ngrok y localhost
app.use(cors({
  origin: function(origin, callback) {
    // Permitir requests sin origin (como mobile apps o curl)
    if (!origin) return callback(null, true);

    // Permitir localhost y ngrok
    if (
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.includes('ngrok')
    ) {
      return callback(null, true);
    }

    return callback(null, true); // Permitir todos en desarrollo
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(passport.initialize());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/pool-images', express.static(path.join(__dirname, '../public/pool-images')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

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

console.log('[INIT] Configurando middlewares y rutas...');

const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
const frontendIndexPath = path.join(frontendDistPath, 'index.html');

if (fs.existsSync(frontendIndexPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/pool-images')
    ) {
      return next();
    }

    return res.sendFile(frontendIndexPath);
  });
  console.log(`[INIT] Frontend servido desde ${frontendDistPath}`);
} else {
  console.log(`[INIT] Frontend no encontrado en ${frontendDistPath}`);
}

app.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('  BACKEND INICIADO EXITOSAMENTE');
  console.log('========================================');
  console.log(`Servidor: http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`Auth: http://localhost:${PORT}/api/auth`);
  console.log(`Equipment: http://localhost:${PORT}/api/equipment`);
  console.log(`Professional Calculations: http://localhost:${PORT}/api/professional-calculations`);
  console.log(`Product Images: http://localhost:${PORT}/api/products`);
  console.log(`DB: PostgreSQL@localhost:5433`);
  console.log('========================================');
  console.log('');

  startAgendaReminderEmailService();
  console.log('[INIT] Agenda reminders email service iniciado');
});
