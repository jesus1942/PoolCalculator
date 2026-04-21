import { API_BASE_URL } from '@/services/api';

/**
 * Construye la URL completa para una imagen del backend
 * @param imageUrl - URL relativa de la imagen (ej: /pool-images/acquam-page-03.png)
 * @returns URL completa apuntando al backend
 */
const normalizeImageUrl = (imageUrl?: string | null): string | undefined => {
  if (!imageUrl) return undefined;

  const trimmedUrl = imageUrl.trim();
  if (!trimmedUrl) return undefined;

  if (trimmedUrl.startsWith('//')) {
    return `https:${trimmedUrl}`;
  }

  if (/^www\./i.test(trimmedUrl)) {
    return `https://${trimmedUrl}`;
  }

  return trimmedUrl;
};

const optimizeCloudinaryUrl = (imageUrl: string): string => {
  const match = imageUrl.match(/^https?:\/\/res\.cloudinary\.com\/([^/]+)\/image\/upload\/(.+)$/);
  if (!match) return imageUrl;

  const [, cloudName, rest] = match;
  const hasTransform = rest.includes('/');
  const transform = 'f_auto,q_auto,c_limit,w_1200';
  const optimizedPath = hasTransform ? rest.replace(/^[^/]+/, (value) => `${transform}/${value}`) : `${transform}/${rest}`;

  return `https://res.cloudinary.com/${cloudName}/image/upload/${optimizedPath}`;
};

export const getImageUrl = (imageUrl?: string | null): string | undefined => {
  const normalizedImageUrl = normalizeImageUrl(imageUrl);
  if (!normalizedImageUrl) return undefined;

  // Si ya es una URL completa, devolverla tal cual
  if (/^https?:\/\//i.test(normalizedImageUrl)) {
    return optimizeCloudinaryUrl(normalizedImageUrl);
  }

  if (normalizedImageUrl.startsWith('/uploads/products/')) {
    return `https://raw.githubusercontent.com/jesus1942/PoolCalculator/main/backend${normalizedImageUrl}`;
  }

  // Obtener la URL base del API
  const API_BASE = API_BASE_URL || 'http://localhost:3000';

  // Si la URL de la imagen empieza con /, quitarla para evitar doble /
  const cleanImageUrl = normalizedImageUrl.startsWith('/')
    ? normalizedImageUrl.substring(1)
    : normalizedImageUrl;

  return `${API_BASE}/${cleanImageUrl}`;
};

/**
 * Construye URLs para múltiples imágenes
 * @param imageUrls - Array de URLs relativas
 * @returns Array de URLs completas
 */
export const getImageUrls = (imageUrls?: string[] | null): string[] => {
  if (!imageUrls || imageUrls.length === 0) return [];

  return imageUrls
    .map(url => getImageUrl(url))
    .filter((url): url is string => url !== undefined);
};

/**
 * Obtiene una imagen placeholder para cuando no hay imagen disponible
 */
export const getPlaceholderImage = (type: 'pool' | 'project' = 'pool'): string => {
  // Puedes agregar imágenes placeholder específicas aquí
  return `https://via.placeholder.com/600x400/3B82F6/FFFFFF?text=${type === 'pool' ? 'Piscina' : 'Proyecto'}`;
};
