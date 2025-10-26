import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
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

console.log('[INIT] Configurando middlewares y rutas...');

app.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('  BACKEND INICIADO EXITOSAMENTE');
  console.log('========================================');
  console.log(`Servidor: http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`Auth: http://localhost:${PORT}/api/auth`);
  console.log(`Equipment: http://localhost:${PORT}/api/equipment`);
  console.log(`DB: PostgreSQL@localhost:5433`);
  console.log('========================================');
  console.log('');
});
