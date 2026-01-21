# 📸 Sistema de Imágenes y Catálogos de Productos

## ✅ LO QUE HE IMPLEMENTADO

### 1. **Schema Prisma Actualizado** ✓

He agregado los siguientes campos a **TODOS** los modelos de productos:

```prisma
// Agregado a:
// - TilePreset
// - AccessoryPreset
// - EquipmentPreset
// - ConstructionMaterialPreset
// - PlumbingItem

imageUrl         String?              // URL de la imagen principal
additionalImages String[] @default([]) // URLs de imágenes adicionales
catalogPage      String?              // Página del catálogo de donde viene
datasheet        String?              // URL de la ficha técnica PDF (solo EquipmentPreset)
```

### 2. **Modelos Actualizados:**

✅ **TilePreset** - Losetas con imágenes
✅ **AccessoryPreset** - Accesorios con imágenes
✅ **EquipmentPreset** - Equipos con imágenes + ficha técnica
✅ **ConstructionMaterialPreset** - Materiales con imágenes
✅ **PlumbingItem** - Plomería con imágenes

---

## 🚀 PASOS PARA APLICAR

### **PASO 1: Generar y Aplicar Migración**

```bash
cd /home/jesusolguin/Projects/pool-calculator/backend

# Generar migración
npx prisma migrate dev --name add_product_images

# Si pregunta si quieres aplicar los cambios, responde: yes
```

### **PASO 2: Regenerar Cliente Prisma**

```bash
npx prisma generate
```

### **PASO 3: Verificar Migración**

```bash
# Ver el estado de las migraciones
npx prisma migrate status

# Abrir Prisma Studio para verificar los nuevos campos
npx prisma studio
```

---

## 📁 ESTRUCTURA DE ALMACENAMIENTO DE IMÁGENES

### **Opción 1: Almacenamiento Local** (Actual)

```
backend/
└── uploads/
    └── products/
        ├── equipment/
        │   ├── pump-hayward-sp2610x15.jpg
        │   ├── filter-pentair-140332.jpg
        │   └── heater-raypak-206000.jpg
        ├── tiles/
        │   ├── romana-celeste-001.jpg
        │   └── veneciana-turquesa-002.jpg
        ├── accessories/
        │   ├── skimmer-standard-001.jpg
        │   └── return-orientable-002.jpg
        ├── materials/
        │   ├── cement-loma-negra-50kg.jpg
        │   └── sand-gruesa-m3.jpg
        └── plumbing/
            ├── pipe-pvc-50mm.jpg
            └── elbow-90-40mm.jpg
```

### **Opción 2: Almacenamiento en Cloud** (Recomendado para producción)

- **AWS S3**
- **Cloudinary**
- **Google Cloud Storage**
- **Azure Blob Storage**

---

## 🔧 PRÓXIMOS PASOS - BACKEND

### **1. Controlador de Upload de Imágenes**

Crear: `backend/src/controllers/productImageController.ts`

```typescript
import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configurar multer para upload de imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const productType = req.params.productType; // 'equipment', 'tiles', etc.
    const uploadPath = path.join(__dirname, `../../uploads/products/${productType}`);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.original name));
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máximo
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif, webp)'));
  }
});

// POST /api/products/:productType/:productId/images
export const uploadProductImage = async (req: Request, res: Response) => {
  try {
    const { productType, productId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
    }

    const imageUrl = `/uploads/products/${productType}/${file.filename}`;

    // Actualizar el producto correspondiente
    let updatedProduct;
    switch (productType) {
      case 'equipment':
        updatedProduct = await prisma.equipmentPreset.update({
          where: { id: productId },
          data: { imageUrl }
        });
        break;
      case 'tiles':
        updatedProduct = await prisma.tilePreset.update({
          where: { id: productId },
          data: { imageUrl }
        });
        break;
      case 'accessories':
        updatedProduct = await prisma.accessoryPreset.update({
          where: { id: productId },
          data: { imageUrl }
        });
        break;
      case 'materials':
        updatedProduct = await prisma.constructionMaterialPreset.update({
          where: { id: productId },
          data: { imageUrl }
        });
        break;
      case 'plumbing':
        updatedProduct = await prisma.plumbingItem.update({
          where: { id: productId },
          data: { imageUrl }
        });
        break;
      default:
        return res.status(400).json({ error: 'Tipo de producto no válido' });
    }

    res.json({
      message: 'Imagen subida exitosamente',
      imageUrl,
      product: updatedProduct
    });
  } catch (error) {
    console.error('Error al subir imagen:', error);
    res.status(500).json({ error: 'Error al subir imagen' });
  }
};

// POST /api/products/:productType/:productId/additional-images
export const uploadAdditionalImages = async (req: Request, res: Response) => {
  try {
    const { productType, productId } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron imágenes' });
    }

    const imageUrls = files.map(file =>
      `/uploads/products/${productType}/${file.filename}`
    );

    // Obtener imágenes actuales
    let currentProduct: any;
    switch (productType) {
      case 'equipment':
        currentProduct = await prisma.equipmentPreset.findUnique({
          where: { id: productId }
        });
        break;
      // ... otros casos
    }

    const updatedImages = [
      ...(currentProduct?.additionalImages || []),
      ...imageUrls
    ];

    // Actualizar con nuevas imágenes
    let updatedProduct;
    switch (productType) {
      case 'equipment':
        updatedProduct = await prisma.equipmentPreset.update({
          where: { id: productId },
          data: { additionalImages: updatedImages }
        });
        break;
      // ... otros casos
    }

    res.json({
      message: `${files.length} imágenes subidas exitosamente`,
      imageUrls,
      product: updatedProduct
    });
  } catch (error) {
    console.error('Error al subir imágenes adicionales:', error);
    res.status(500).json({ error: 'Error al subir imágenes' });
  }
};

// DELETE /api/products/:productType/:productId/images
export const deleteProductImage = async (req: Request, res: Response) => {
  try {
    const { productType, productId } = req.params;
    const { imageUrl } = req.body;

    // Eliminar archivo físico
    const fs = require('fs');
    const imagePath = path.join(__dirname, '../../', imageUrl);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // Actualizar base de datos
    let updatedProduct;
    switch (productType) {
      case 'equipment':
        updatedProduct = await prisma.equipmentPreset.update({
          where: { id: productId },
          data: { imageUrl: null }
        });
        break;
      // ... otros casos
    }

    res.json({
      message: 'Imagen eliminada exitosamente',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Error al eliminar imagen:', error);
    res.status(500).json({ error: 'Error al eliminar imagen' });
  }
};
```

### **2. Rutas de Upload**

Crear: `backend/src/routes/productImageRoutes.ts`

```typescript
import express from 'express';
import {
  uploadProductImage,
  uploadAdditionalImages,
  deleteProductImage,
  upload
} from '../controllers/productImageController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Upload imagen principal
router.post(
  '/:productType/:productId/images',
  upload.single('image'),
  uploadProductImage
);

// Upload imágenes adicionales (múltiples)
router.post(
  '/:productType/:productId/additional-images',
  upload.array('images', 5), // Máximo 5 imágenes a la vez
  uploadAdditionalImages
);

// Eliminar imagen
router.delete('/:productType/:productId/images', deleteProductImage);

export default router;
```

### **3. Registrar Rutas en `index.ts`**

```typescript
import productImageRoutes from './routes/productImageRoutes';

app.use('/api/products', productImageRoutes);
```

---

## 🎨 PRÓXIMOS PASOS - FRONTEND

### **1. Componente de Upload de Imágenes**

Crear: `frontend/src/components/admin/ProductImageUploader.tsx`

```typescript
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import api from '@/services/api';

interface ProductImageUploaderProps {
  productType: 'equipment' | 'tiles' | 'accessories' | 'materials' | 'plumbing';
  productId: string;
  currentImage?: string;
  additionalImages?: string[];
  onImageUploaded: () => void;
}

export const ProductImageUploader: React.FC<ProductImageUploaderProps> = ({
  productType,
  productId,
  currentImage,
  additionalImages = [],
  onImageUploaded
}) => {
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      await api.post(`/products/${productType}/${productId}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('Imagen subida exitosamente');
      onImageUploaded();
    } catch (error) {
      console.error('Error al subir imagen:', error);
      alert('Error al subir imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!confirm('¿Eliminar esta imagen?')) return;

    try {
      await api.delete(`/products/${productType}/${productId}/images`, {
        data: { imageUrl: currentImage }
      });

      alert('Imagen eliminada');
      onImageUploaded();
    } catch (error) {
      console.error('Error al eliminar imagen:', error);
      alert('Error al eliminar imagen');
    }
  };

  return (
    <div className="space-y-4">
      {/* Imagen Principal */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
        {currentImage ? (
          <div className="relative group">
            <img
              src={currentImage}
              alt="Producto"
              className="w-full h-48 object-cover rounded"
            />
            <button
              onClick={handleDeleteImage}
              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500 mb-4">Sin imagen</p>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploading}
              />
              <Button as="span" disabled={uploading}>
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Subiendo...' : 'Subir Imagen'}
              </Button>
            </label>
          </div>
        )}
      </div>

      {/* Imágenes Adicionales */}
      {additionalImages.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Imágenes Adicionales</h4>
          <div className="grid grid-cols-4 gap-2">
            {additionalImages.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt={`Adicional ${idx + 1}`}
                className="w-full h-24 object-cover rounded"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

### **2. Integración en Panel de Admin**

Crear: `frontend/src/pages/Admin/ProductsManager.tsx`

```typescript
// Panel de administración de productos con carga de imágenes
// Incluye: CRUD completo + upload de imágenes + importación desde catálogos
```

---

## 📚 SISTEMA DE IMPORTACIÓN DESDE CATÁLOGOS

### **Opción 1: Importación desde PDF** (Catálogos estáticos)

```typescript
// backend/src/services/catalogImporter.ts

import pdf from 'pdf-parse';
import { PrismaClient } from '@prisma/client';

export class CatalogPDFImporter {
  async importFromPDF(pdfPath: string, catalogName: string) {
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdf(dataBuffer);

    // Extraer texto y parsear productos
    const products = this.parseProductsFromText(pdfData.text);

    // Guardar en base de datos
    for (const product of products) {
      await prisma.equipmentPreset.create({
        data: {
          ...product,
          catalogPage: catalogName
        }
      });
    }
  }

  parseProductsFromText(text: string): any[] {
    // Lógica para extraer productos del PDF
    // Puede usar regex, AI, o parseo manual
  }
}
```

### **Opción 2: Web Scraping** (Catálogos online)

Ya tienes `catalogScraperService.ts` implementado! Solo necesitas:

1. Agregar el campo `imageUrl` al scraper
2. Descargar las imágenes localmente
3. Actualizar la base de datos

---

## 🎯 RESUMEN - LO QUE FALTA HACER

### **Backend:**
- [ ] Aplicar migración de Prisma
- [ ] Crear controlador de upload de imágenes
- [ ] Crear rutas de upload
- [ ] Registrar rutas en `index.ts`
- [ ] Crear carpetas de uploads

### **Frontend:**
- [ ] Componente `ProductImageUploader`
- [ ] Panel de administración de productos
- [ ] Integrar en CRUD de productos existentes

### **Importación:**
- [ ] Sistema de importación desde PDF
- [ ] Mejorar web scraper para incluir imágenes
- [ ] Script de importación masiva

---

## 📝 COMANDOS RÁPIDOS

```bash
# 1. Aplicar migración
cd backend && npx prisma migrate dev

# 2. Crear carpetas de uploads
mkdir -p backend/uploads/products/{equipment,tiles,accessories,materials,plumbing}

# 3. Regenerar cliente Prisma
npx prisma generate

# 4. Verificar en Prisma Studio
npx prisma studio
```

---

¿Qué quieres que implemente primero?
1. **Controlador de upload de imágenes** (backend)
2. **Componente de admin de productos** (frontend)
3. **Sistema de importación desde catálogos**
