/**
 * Controlador para gestión de imágenes de productos
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// Configurar multer para diferentes tipos de productos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const productType = req.params.productType;
    const uploadPath = path.join(__dirname, `../../uploads/products/${productType}`);

    // Verificar que la carpeta existe
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-');
    cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif, webp)'));
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  },
  fileFilter
});

/**
 * POST /api/products/:productType/:productId/image
 * Sube la imagen principal de un producto
 */
export const uploadProductImage = async (req: Request, res: Response) => {
  try {
    const { productType, productId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
    }

    // Generar URL relativa
    const imageUrl = `/uploads/products/${productType}/${file.filename}`;

    // Actualizar el producto correspondiente
    let updatedProduct;

    switch (productType) {
      case 'equipment':
        // Eliminar imagen anterior si existe
        const oldEquipment = await prisma.equipmentPreset.findUnique({
          where: { id: productId }
        });
        if (oldEquipment?.imageUrl) {
          deleteImageFile(oldEquipment.imageUrl);
        }

        updatedProduct = await prisma.equipmentPreset.update({
          where: { id: productId },
          data: { imageUrl }
        });
        break;

      case 'tiles':
        const oldTile = await prisma.tilePreset.findUnique({
          where: { id: productId }
        });
        if (oldTile?.imageUrl) {
          deleteImageFile(oldTile.imageUrl);
        }

        updatedProduct = await prisma.tilePreset.update({
          where: { id: productId },
          data: { imageUrl }
        });
        break;

      case 'accessories':
        const oldAccessory = await prisma.accessoryPreset.findUnique({
          where: { id: productId }
        });
        if (oldAccessory?.imageUrl) {
          deleteImageFile(oldAccessory.imageUrl);
        }

        updatedProduct = await prisma.accessoryPreset.update({
          where: { id: productId },
          data: { imageUrl }
        });
        break;

      case 'materials':
        const oldMaterial = await prisma.constructionMaterialPreset.findUnique({
          where: { id: productId }
        });
        if (oldMaterial?.imageUrl) {
          deleteImageFile(oldMaterial.imageUrl);
        }

        updatedProduct = await prisma.constructionMaterialPreset.update({
          where: { id: productId },
          data: { imageUrl }
        });
        break;

      case 'plumbing':
        const oldPlumbing = await prisma.plumbingItem.findUnique({
          where: { id: productId }
        });
        if (oldPlumbing?.imageUrl) {
          deleteImageFile(oldPlumbing.imageUrl);
        }

        updatedProduct = await prisma.plumbingItem.update({
          where: { id: productId },
          data: { imageUrl }
        });
        break;

      default:
        // Eliminar archivo subido
        fs.unlinkSync(file.path);
        return res.status(400).json({
          error: 'Tipo de producto no válido. Use: equipment, tiles, accessories, materials, plumbing'
        });
    }

    res.json({
      message: 'Imagen subida exitosamente',
      imageUrl,
      product: updatedProduct
    });
  } catch (error) {
    console.error('Error al subir imagen:', error);

    // Eliminar archivo si hubo error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error('Error al eliminar archivo temporal:', e);
      }
    }

    res.status(500).json({
      error: 'Error al subir imagen',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * POST /api/products/:productType/:productId/additional-images
 * Sube imágenes adicionales (múltiples)
 */
export const uploadAdditionalImages = async (req: Request, res: Response) => {
  try {
    const { productType, productId } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron imágenes' });
    }

    // Generar URLs relativas
    const imageUrls = files.map(file =>
      `/uploads/products/${productType}/${file.filename}`
    );

    // Obtener imágenes actuales y agregar las nuevas
    let currentProduct: any;
    let updatedProduct;

    switch (productType) {
      case 'equipment':
        currentProduct = await prisma.equipmentPreset.findUnique({
          where: { id: productId }
        });
        updatedProduct = await prisma.equipmentPreset.update({
          where: { id: productId },
          data: {
            additionalImages: [
              ...(currentProduct?.additionalImages || []),
              ...imageUrls
            ]
          }
        });
        break;

      case 'tiles':
        currentProduct = await prisma.tilePreset.findUnique({
          where: { id: productId }
        });
        updatedProduct = await prisma.tilePreset.update({
          where: { id: productId },
          data: {
            additionalImages: [
              ...(currentProduct?.additionalImages || []),
              ...imageUrls
            ]
          }
        });
        break;

      case 'accessories':
        currentProduct = await prisma.accessoryPreset.findUnique({
          where: { id: productId }
        });
        updatedProduct = await prisma.accessoryPreset.update({
          where: { id: productId },
          data: {
            additionalImages: [
              ...(currentProduct?.additionalImages || []),
              ...imageUrls
            ]
          }
        });
        break;

      case 'materials':
        currentProduct = await prisma.constructionMaterialPreset.findUnique({
          where: { id: productId }
        });
        updatedProduct = await prisma.constructionMaterialPreset.update({
          where: { id: productId },
          data: {
            additionalImages: [
              ...(currentProduct?.additionalImages || []),
              ...imageUrls
            ]
          }
        });
        break;

      case 'plumbing':
        currentProduct = await prisma.plumbingItem.findUnique({
          where: { id: productId }
        });
        updatedProduct = await prisma.plumbingItem.update({
          where: { id: productId },
          data: {
            additionalImages: [
              ...(currentProduct?.additionalImages || []),
              ...imageUrls
            ]
          }
        });
        break;

      default:
        // Eliminar archivos subidos
        files.forEach(file => fs.unlinkSync(file.path));
        return res.status(400).json({ error: 'Tipo de producto no válido' });
    }

    res.json({
      message: `${files.length} imágenes subidas exitosamente`,
      imageUrls,
      product: updatedProduct
    });
  } catch (error) {
    console.error('Error al subir imágenes adicionales:', error);

    // Eliminar archivos si hubo error
    if (req.files) {
      (req.files as Express.Multer.File[]).forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (e) {
          console.error('Error al eliminar archivo temporal:', e);
        }
      });
    }

    res.status(500).json({
      error: 'Error al subir imágenes',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * DELETE /api/products/:productType/:productId/image
 * Elimina la imagen principal de un producto
 */
export const deleteProductImage = async (req: Request, res: Response) => {
  try {
    const { productType, productId } = req.params;

    let product: any;
    let updatedProduct;

    switch (productType) {
      case 'equipment':
        product = await prisma.equipmentPreset.findUnique({
          where: { id: productId }
        });
        if (product?.imageUrl) {
          deleteImageFile(product.imageUrl);
        }
        updatedProduct = await prisma.equipmentPreset.update({
          where: { id: productId },
          data: { imageUrl: null }
        });
        break;

      case 'tiles':
        product = await prisma.tilePreset.findUnique({
          where: { id: productId }
        });
        if (product?.imageUrl) {
          deleteImageFile(product.imageUrl);
        }
        updatedProduct = await prisma.tilePreset.update({
          where: { id: productId },
          data: { imageUrl: null }
        });
        break;

      case 'accessories':
        product = await prisma.accessoryPreset.findUnique({
          where: { id: productId }
        });
        if (product?.imageUrl) {
          deleteImageFile(product.imageUrl);
        }
        updatedProduct = await prisma.accessoryPreset.update({
          where: { id: productId },
          data: { imageUrl: null }
        });
        break;

      case 'materials':
        product = await prisma.constructionMaterialPreset.findUnique({
          where: { id: productId }
        });
        if (product?.imageUrl) {
          deleteImageFile(product.imageUrl);
        }
        updatedProduct = await prisma.constructionMaterialPreset.update({
          where: { id: productId },
          data: { imageUrl: null }
        });
        break;

      case 'plumbing':
        product = await prisma.plumbingItem.findUnique({
          where: { id: productId }
        });
        if (product?.imageUrl) {
          deleteImageFile(product.imageUrl);
        }
        updatedProduct = await prisma.plumbingItem.update({
          where: { id: productId },
          data: { imageUrl: null }
        });
        break;

      default:
        return res.status(400).json({ error: 'Tipo de producto no válido' });
    }

    res.json({
      message: 'Imagen eliminada exitosamente',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Error al eliminar imagen:', error);
    res.status(500).json({
      error: 'Error al eliminar imagen',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * DELETE /api/products/:productType/:productId/additional-images/:imageIndex
 * Elimina una imagen adicional específica
 */
export const deleteAdditionalImage = async (req: Request, res: Response) => {
  try {
    const { productType, productId, imageIndex } = req.params;
    const index = parseInt(imageIndex);

    let product: any;
    let updatedProduct;

    switch (productType) {
      case 'equipment':
        product = await prisma.equipmentPreset.findUnique({
          where: { id: productId }
        });
        if (product?.additionalImages && product.additionalImages[index]) {
          deleteImageFile(product.additionalImages[index]);
          const newImages = product.additionalImages.filter((_: string, i: number) => i !== index);
          updatedProduct = await prisma.equipmentPreset.update({
            where: { id: productId },
            data: { additionalImages: newImages }
          });
        }
        break;

      case 'tiles':
        product = await prisma.tilePreset.findUnique({
          where: { id: productId }
        });
        if (product?.additionalImages && product.additionalImages[index]) {
          deleteImageFile(product.additionalImages[index]);
          const newImages = product.additionalImages.filter((_: string, i: number) => i !== index);
          updatedProduct = await prisma.tilePreset.update({
            where: { id: productId },
            data: { additionalImages: newImages }
          });
        }
        break;

      case 'accessories':
        product = await prisma.accessoryPreset.findUnique({
          where: { id: productId }
        });
        if (product?.additionalImages && product.additionalImages[index]) {
          deleteImageFile(product.additionalImages[index]);
          const newImages = product.additionalImages.filter((_: string, i: number) => i !== index);
          updatedProduct = await prisma.accessoryPreset.update({
            where: { id: productId },
            data: { additionalImages: newImages }
          });
        }
        break;

      case 'materials':
        product = await prisma.constructionMaterialPreset.findUnique({
          where: { id: productId }
        });
        if (product?.additionalImages && product.additionalImages[index]) {
          deleteImageFile(product.additionalImages[index]);
          const newImages = product.additionalImages.filter((_: string, i: number) => i !== index);
          updatedProduct = await prisma.constructionMaterialPreset.update({
            where: { id: productId },
            data: { additionalImages: newImages }
          });
        }
        break;

      case 'plumbing':
        product = await prisma.plumbingItem.findUnique({
          where: { id: productId }
        });
        if (product?.additionalImages && product.additionalImages[index]) {
          deleteImageFile(product.additionalImages[index]);
          const newImages = product.additionalImages.filter((_: string, i: number) => i !== index);
          updatedProduct = await prisma.plumbingItem.update({
            where: { id: productId },
            data: { additionalImages: newImages }
          });
        }
        break;

      default:
        return res.status(400).json({ error: 'Tipo de producto no válido' });
    }

    res.json({
      message: 'Imagen adicional eliminada exitosamente',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Error al eliminar imagen adicional:', error);
    res.status(500).json({
      error: 'Error al eliminar imagen adicional',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Función auxiliar para eliminar archivo físico
 */
function deleteImageFile(imageUrl: string): void {
  try {
    // Solo eliminar archivos locales, no URLs externas
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return; // No intentar eliminar URLs externas
    }

    const imagePath = path.join(__dirname, '../../', imageUrl);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      console.log(`Imagen eliminada: ${imagePath}`);
    }
  } catch (error) {
    console.error(`Error al eliminar archivo físico ${imageUrl}:`, error);
  }
}

/**
 * POST /api/products/:productType/:productId/image-url
 * Guarda la URL de una imagen externa como imagen principal
 */
export const saveProductImageUrl = async (req: Request, res: Response) => {
  try {
    const { productType, productId } = req.params;
    const { imageUrl } = req.body;

    // Validar que se proporcionó una URL
    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ error: 'URL de imagen requerida' });
    }

    // Validar formato de URL
    const urlPattern = /^https?:\/\/.+/i;
    if (!urlPattern.test(imageUrl)) {
      return res.status(400).json({
        error: 'URL de imagen inválida. Debe comenzar con http:// o https://'
      });
    }

    // Actualizar el producto correspondiente
    let updatedProduct;

    switch (productType) {
      case 'equipment':
        // Eliminar imagen anterior si existe y es un archivo local
        const oldEquipment = await prisma.equipmentPreset.findUnique({
          where: { id: productId }
        });
        if (oldEquipment?.imageUrl) {
          deleteImageFile(oldEquipment.imageUrl);
        }

        updatedProduct = await prisma.equipmentPreset.update({
          where: { id: productId },
          data: { imageUrl }
        });
        break;

      case 'tiles':
        const oldTile = await prisma.tilePreset.findUnique({
          where: { id: productId }
        });
        if (oldTile?.imageUrl) {
          deleteImageFile(oldTile.imageUrl);
        }

        updatedProduct = await prisma.tilePreset.update({
          where: { id: productId },
          data: { imageUrl }
        });
        break;

      case 'accessories':
        const oldAccessory = await prisma.accessoryPreset.findUnique({
          where: { id: productId }
        });
        if (oldAccessory?.imageUrl) {
          deleteImageFile(oldAccessory.imageUrl);
        }

        updatedProduct = await prisma.accessoryPreset.update({
          where: { id: productId },
          data: { imageUrl }
        });
        break;

      case 'materials':
        const oldMaterial = await prisma.constructionMaterialPreset.findUnique({
          where: { id: productId }
        });
        if (oldMaterial?.imageUrl) {
          deleteImageFile(oldMaterial.imageUrl);
        }

        updatedProduct = await prisma.constructionMaterialPreset.update({
          where: { id: productId },
          data: { imageUrl }
        });
        break;

      case 'plumbing':
        const oldPlumbing = await prisma.plumbingItem.findUnique({
          where: { id: productId }
        });
        if (oldPlumbing?.imageUrl) {
          deleteImageFile(oldPlumbing.imageUrl);
        }

        updatedProduct = await prisma.plumbingItem.update({
          where: { id: productId },
          data: { imageUrl }
        });
        break;

      default:
        return res.status(400).json({
          error: 'Tipo de producto no válido. Use: equipment, tiles, accessories, materials, plumbing'
        });
    }

    res.json({
      message: 'URL de imagen guardada exitosamente',
      imageUrl,
      product: updatedProduct
    });
  } catch (error) {
    console.error('Error al guardar URL de imagen:', error);
    res.status(500).json({
      error: 'Error al guardar URL de imagen',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * POST /api/products/:productType/:productId/additional-image-urls
 * Guarda URLs de imágenes externas como imágenes adicionales
 */
export const saveAdditionalImageUrls = async (req: Request, res: Response) => {
  try {
    const { productType, productId } = req.params;
    const { imageUrls } = req.body;

    // Validar que se proporcionó un array de URLs
    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de URLs de imágenes' });
    }

    // Validar máximo 5 imágenes
    if (imageUrls.length > 5) {
      return res.status(400).json({ error: 'Máximo 5 imágenes adicionales permitidas' });
    }

    // Validar formato de todas las URLs
    const urlPattern = /^https?:\/\/.+/i;
    for (const url of imageUrls) {
      if (typeof url !== 'string' || !urlPattern.test(url)) {
        return res.status(400).json({
          error: `URL inválida: ${url}. Todas las URLs deben comenzar con http:// o https://`
        });
      }
    }

    // Obtener imágenes actuales y agregar las nuevas
    let currentProduct: any;
    let updatedProduct;

    switch (productType) {
      case 'equipment':
        currentProduct = await prisma.equipmentPreset.findUnique({
          where: { id: productId }
        });
        updatedProduct = await prisma.equipmentPreset.update({
          where: { id: productId },
          data: {
            additionalImages: [
              ...(currentProduct?.additionalImages || []),
              ...imageUrls
            ]
          }
        });
        break;

      case 'tiles':
        currentProduct = await prisma.tilePreset.findUnique({
          where: { id: productId }
        });
        updatedProduct = await prisma.tilePreset.update({
          where: { id: productId },
          data: {
            additionalImages: [
              ...(currentProduct?.additionalImages || []),
              ...imageUrls
            ]
          }
        });
        break;

      case 'accessories':
        currentProduct = await prisma.accessoryPreset.findUnique({
          where: { id: productId }
        });
        updatedProduct = await prisma.accessoryPreset.update({
          where: { id: productId },
          data: {
            additionalImages: [
              ...(currentProduct?.additionalImages || []),
              ...imageUrls
            ]
          }
        });
        break;

      case 'materials':
        currentProduct = await prisma.constructionMaterialPreset.findUnique({
          where: { id: productId }
        });
        updatedProduct = await prisma.constructionMaterialPreset.update({
          where: { id: productId },
          data: {
            additionalImages: [
              ...(currentProduct?.additionalImages || []),
              ...imageUrls
            ]
          }
        });
        break;

      case 'plumbing':
        currentProduct = await prisma.plumbingItem.findUnique({
          where: { id: productId }
        });
        updatedProduct = await prisma.plumbingItem.update({
          where: { id: productId },
          data: {
            additionalImages: [
              ...(currentProduct?.additionalImages || []),
              ...imageUrls
            ]
          }
        });
        break;

      default:
        return res.status(400).json({ error: 'Tipo de producto no válido' });
    }

    res.json({
      message: `${imageUrls.length} URLs de imágenes agregadas exitosamente`,
      imageUrls,
      product: updatedProduct
    });
  } catch (error) {
    console.error('Error al guardar URLs de imágenes:', error);
    res.status(500).json({
      error: 'Error al guardar URLs de imágenes',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
