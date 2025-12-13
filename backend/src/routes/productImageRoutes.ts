/**
 * Rutas para gestión de imágenes de productos
 */

import express from 'express';
import {
  uploadProductImage,
  uploadAdditionalImages,
  deleteProductImage,
  deleteAdditionalImage,
  saveProductImageUrl,
  saveAdditionalImageUrls,
  upload
} from '../controllers/productImageController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * POST /api/products/:productType/:productId/image
 * Sube la imagen principal de un producto
 *
 * productType: 'equipment' | 'tiles' | 'accessories' | 'materials' | 'plumbing'
 * productId: ID del producto
 * Body (form-data): image (file)
 */
router.post(
  '/:productType/:productId/image',
  upload.single('image'),
  uploadProductImage
);

/**
 * POST /api/products/:productType/:productId/additional-images
 * Sube imágenes adicionales (múltiples - máximo 5 a la vez)
 *
 * productType: 'equipment' | 'tiles' | 'accessories' | 'materials' | 'plumbing'
 * productId: ID del producto
 * Body (form-data): images[] (files, máximo 5)
 */
router.post(
  '/:productType/:productId/additional-images',
  upload.array('images', 5), // Máximo 5 imágenes a la vez
  uploadAdditionalImages
);

/**
 * DELETE /api/products/:productType/:productId/image
 * Elimina la imagen principal de un producto
 *
 * productType: 'equipment' | 'tiles' | 'accessories' | 'materials' | 'plumbing'
 * productId: ID del producto
 */
router.delete('/:productType/:productId/image', deleteProductImage);

/**
 * DELETE /api/products/:productType/:productId/additional-images/:imageIndex
 * Elimina una imagen adicional específica
 *
 * productType: 'equipment' | 'tiles' | 'accessories' | 'materials' | 'plumbing'
 * productId: ID del producto
 * imageIndex: Índice de la imagen en el array (0-based)
 */
router.delete('/:productType/:productId/additional-images/:imageIndex', deleteAdditionalImage);

/**
 * POST /api/products/:productType/:productId/image-url
 * Guarda la URL de una imagen externa como imagen principal
 *
 * productType: 'equipment' | 'tiles' | 'accessories' | 'materials' | 'plumbing'
 * productId: ID del producto
 * Body (JSON): { imageUrl: string }
 */
router.post('/:productType/:productId/image-url', saveProductImageUrl);

/**
 * POST /api/products/:productType/:productId/additional-image-urls
 * Guarda URLs de imágenes externas como imágenes adicionales
 *
 * productType: 'equipment' | 'tiles' | 'accessories' | 'materials' | 'plumbing'
 * productId: ID del producto
 * Body (JSON): { imageUrls: string[] } (máximo 5 URLs)
 */
router.post('/:productType/:productId/additional-image-urls', saveAdditionalImageUrls);

export default router;
