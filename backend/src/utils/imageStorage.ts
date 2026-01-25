import fs from 'fs';
import path from 'path';
import { isCloudinaryConfigured, uploadImageBuffer } from '../config/cloudinary';

type StoreImageOptions = {
  folder: string;
  localDir?: string;
  filenamePrefix?: string;
};

const uploadsRoot = path.join(__dirname, '../../uploads');

const ensureDir = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const sanitizeBase = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    .slice(0, 60) || 'image';

const buildLocalFilename = (prefix: string, originalname: string) => {
  const ext = path.extname(originalname) || '.jpg';
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `${sanitizeBase(prefix)}-${uniqueSuffix}${ext}`;
};

export const storeImageBuffer = async (
  buffer: Buffer,
  originalname: string,
  options: StoreImageOptions
): Promise<string> => {
  if (isCloudinaryConfigured) {
    const publicId = `${sanitizeBase(options.filenamePrefix || 'image')}-${Date.now()}`;
    const result = await uploadImageBuffer(buffer, {
      folder: options.folder,
      public_id: publicId,
      resource_type: 'image',
    });
    return result.secure_url;
  }

  const localDir = options.localDir ? options.localDir.replace(/^\/+/, '') : '';
  const targetDir = localDir ? path.join(uploadsRoot, localDir) : uploadsRoot;
  ensureDir(targetDir);
  const filename = buildLocalFilename(options.filenamePrefix || 'image', originalname);
  const filePath = path.join(targetDir, filename);
  fs.writeFileSync(filePath, buffer);

  return localDir ? `/uploads/${localDir}/${filename}` : `/uploads/${filename}`;
};

export const storeImageFile = async (
  file: Express.Multer.File,
  options: StoreImageOptions
): Promise<string> => {
  return storeImageBuffer(file.buffer, file.originalname, options);
};

export const storeLocalFile = async (
  filePath: string,
  options: StoreImageOptions
): Promise<string> => {
  const buffer = fs.readFileSync(filePath);
  const originalname = path.basename(filePath);
  return storeImageBuffer(buffer, originalname, options);
};
