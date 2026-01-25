import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { storeLocalFile } from '../src/utils/imageStorage';

type ModelConfig = {
  name: string;
  folder: string;
  prefix: string;
  imageField?: string;
  additionalField?: string;
};

const prisma = new PrismaClient();
const uploadsRoot = path.join(__dirname, '../uploads');

const modelConfigs: ModelConfig[] = [
  { name: 'poolPreset', folder: 'pool-presets', prefix: 'pool', imageField: 'imageUrl', additionalField: 'additionalImages' },
  { name: 'equipmentPreset', folder: 'products/equipment', prefix: 'equipment', imageField: 'imageUrl', additionalField: 'additionalImages' },
  { name: 'tilePreset', folder: 'products/tiles', prefix: 'tiles', imageField: 'imageUrl', additionalField: 'additionalImages' },
  { name: 'accessoryPreset', folder: 'products/accessories', prefix: 'accessories', imageField: 'imageUrl', additionalField: 'additionalImages' },
  { name: 'constructionMaterialPreset', folder: 'products/materials', prefix: 'materials', imageField: 'imageUrl', additionalField: 'additionalImages' },
  { name: 'plumbingItem', folder: 'products/plumbing', prefix: 'plumbing', imageField: 'imageUrl', additionalField: 'additionalImages' },
];

const resolveLocalPath = (url: string) => {
  const trimmed = url.replace(/^\/+/, '');
  return path.join(__dirname, '..', trimmed);
};

const isUploadUrl = (url: string) => url.startsWith('/uploads/');

const migrateImageUrl = async (url: string, folder: string, prefix: string) => {
  if (!isUploadUrl(url)) return url;
  const localPath = resolveLocalPath(url);
  if (!fs.existsSync(localPath)) {
    console.warn(`[MIGRATE] Archivo no encontrado: ${localPath}`);
    return url;
  }

  return storeLocalFile(localPath, {
    folder,
    localDir: '',
    filenamePrefix: prefix,
  });
};

const migrateModel = async (config: ModelConfig) => {
  const model = (prisma as any)[config.name];
  if (!model) {
    console.warn(`[MIGRATE] Modelo no encontrado: ${config.name}`);
    return;
  }

  const records = await model.findMany();
  for (const record of records) {
    const data: Record<string, any> = {};

    if (config.imageField && record[config.imageField]) {
      data[config.imageField] = await migrateImageUrl(
        record[config.imageField],
        config.folder,
        config.prefix
      );
    }

    if (config.additionalField && Array.isArray(record[config.additionalField])) {
      data[config.additionalField] = await Promise.all(
        record[config.additionalField].map((url: string) =>
          migrateImageUrl(url, config.folder, config.prefix)
        )
      );
    }

    if (Object.keys(data).length > 0) {
      await model.update({
        where: { id: record.id },
        data,
      });
    }
  }
};

const migrateAgendaMessages = async () => {
  const messages = await prisma.agendaMessage.findMany();
  for (const message of messages) {
    const images = Array.isArray(message.images) ? message.images : [];
    const updatedImages = await Promise.all(
      images.map((url: string) => migrateImageUrl(url, 'agenda', 'agenda'))
    );

    if (JSON.stringify(images) !== JSON.stringify(updatedImages)) {
      await prisma.agendaMessage.update({
        where: { id: message.id },
        data: { images: updatedImages },
      });
    }
  }
};

const run = async () => {
  console.log('[MIGRATE] Iniciando migracion de uploads a Cloudinary...');

  if (!fs.existsSync(uploadsRoot)) {
    console.warn(`[MIGRATE] Carpeta uploads no existe: ${uploadsRoot}`);
  }

  for (const config of modelConfigs) {
    console.log(`[MIGRATE] Procesando ${config.name}...`);
    await migrateModel(config);
  }

  console.log('[MIGRATE] Procesando AgendaMessage...');
  await migrateAgendaMessages();

  console.log('[MIGRATE] Migracion completada.');
};

run()
  .catch((error) => {
    console.error('[MIGRATE] Error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
