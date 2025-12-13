import api, { API_BASE_URL } from './api';

export type ProductType = 'equipment' | 'tiles' | 'accessories' | 'materials' | 'plumbing';

export interface UploadImageResponse {
  message: string;
  imageUrl: string;
  product: any;
}

export interface UploadMultipleImagesResponse {
  message: string;
  imageUrls: string[];
  product: any;
}

class ProductImageService {
  /**
   * Upload main image for a product
   */
  async uploadMainImage(
    productType: ProductType,
    productId: string,
    imageFile: File
  ): Promise<UploadImageResponse> {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await api.post<UploadImageResponse>(
      `/products/${productType}/${productId}/image`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  }

  /**
   * Upload additional images for a product
   */
  async uploadAdditionalImages(
    productType: ProductType,
    productId: string,
    imageFiles: File[]
  ): Promise<UploadMultipleImagesResponse> {
    if (imageFiles.length === 0) {
      throw new Error('No image files provided');
    }

    if (imageFiles.length > 5) {
      throw new Error('Maximum 5 images can be uploaded at once');
    }

    const formData = new FormData();
    imageFiles.forEach((file) => {
      formData.append('images', file);
    });

    const response = await api.post<UploadMultipleImagesResponse>(
      `/products/${productType}/${productId}/additional-images`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  }

  /**
   * Delete main image from a product
   */
  async deleteMainImage(
    productType: ProductType,
    productId: string
  ): Promise<{ message: string; product: any }> {
    const response = await api.delete(
      `/products/${productType}/${productId}/image`
    );

    return response.data;
  }

  /**
   * Delete a specific additional image from a product
   */
  async deleteAdditionalImage(
    productType: ProductType,
    productId: string,
    imageIndex: number
  ): Promise<{ message: string; product: any }> {
    const response = await api.delete(
      `/products/${productType}/${productId}/additional-images/${imageIndex}`
    );

    return response.data;
  }

  /**
   * Get the full URL for an image path
   */
  getImageUrl(imagePath?: string | null): string | null {
    if (!imagePath) return null;

    // Si ya es una URL completa, devolverla tal cual
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }

    // Si empieza con /, quitarlo para evitar duplicación
    const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;

    // Construir URL completa
    return `${API_BASE_URL}/${cleanPath}`;
  }

  /**
   * Get URLs for multiple image paths
   */
  getImageUrls(imagePaths?: string[] | null): string[] {
    if (!imagePaths || imagePaths.length === 0) return [];

    return imagePaths
      .map((path) => this.getImageUrl(path))
      .filter((url): url is string => url !== null);
  }

  /**
   * Validate image file
   */
  validateImageFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Tipo de archivo no permitido. Use JPEG, PNG, GIF o WebP.',
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `El archivo es demasiado grande. Tamaño máximo: 5MB. Tamaño actual: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate multiple image files
   */
  validateImageFiles(files: File[]): { valid: boolean; errors: string[] } {
    if (files.length === 0) {
      return { valid: false, errors: ['No se seleccionaron archivos'] };
    }

    if (files.length > 5) {
      return { valid: false, errors: ['Máximo 5 imágenes a la vez'] };
    }

    const errors: string[] = [];

    files.forEach((file, index) => {
      const validation = this.validateImageFile(file);
      if (!validation.valid && validation.error) {
        errors.push(`Archivo ${index + 1} (${file.name}): ${validation.error}`);
      }
    });

    return { valid: errors.length === 0, errors };
  }

  /**
   * Save image URL (no file upload)
   */
  async saveImageUrl(
    productType: ProductType,
    productId: string,
    imageUrl: string
  ): Promise<UploadImageResponse> {
    const response = await api.post<UploadImageResponse>(
      `/products/${productType}/${productId}/image-url`,
      { imageUrl }
    );

    return response.data;
  }

  /**
   * Save multiple image URLs
   */
  async saveAdditionalImageUrls(
    productType: ProductType,
    productId: string,
    imageUrls: string[]
  ): Promise<UploadMultipleImagesResponse> {
    if (imageUrls.length === 0) {
      throw new Error('No se proporcionaron URLs de imágenes');
    }

    if (imageUrls.length > 5) {
      throw new Error('Máximo 5 URLs de imágenes permitidas');
    }

    const response = await api.post<UploadMultipleImagesResponse>(
      `/products/${productType}/${productId}/additional-image-urls`,
      { imageUrls }
    );

    return response.data;
  }

  /**
   * Validate image URL is accessible
   */
  async validateImageUrl(url: string): Promise<boolean> {
    try {
      // Validate URL format first
      const urlPattern = /^https?:\/\/.+/i;
      if (!urlPattern.test(url)) {
        return false;
      }

      // Try to load the image to verify it's accessible
      return await new Promise<boolean>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;

        // Timeout after 5 seconds
        setTimeout(() => resolve(false), 5000);
      });
    } catch {
      return false;
    }
  }

  /**
   * Validate URL format (synchronous)
   */
  validateUrlFormat(url: string): { valid: boolean; error?: string } {
    const urlPattern = /^https?:\/\/.+/i;

    if (!url || typeof url !== 'string') {
      return {
        valid: false,
        error: 'URL requerida'
      };
    }

    if (!urlPattern.test(url)) {
      return {
        valid: false,
        error: 'URL inválida. Debe comenzar con http:// o https://'
      };
    }

    return { valid: true };
  }

  /**
   * Validate multiple URLs format
   */
  validateUrlsFormat(urls: string[]): { valid: boolean; errors: string[] } {
    if (urls.length === 0) {
      return { valid: false, errors: ['No se proporcionaron URLs'] };
    }

    if (urls.length > 5) {
      return { valid: false, errors: ['Máximo 5 URLs permitidas'] };
    }

    const errors: string[] = [];

    urls.forEach((url, index) => {
      const validation = this.validateUrlFormat(url);
      if (!validation.valid && validation.error) {
        errors.push(`URL ${index + 1}: ${validation.error}`);
      }
    });

    return { valid: errors.length === 0, errors };
  }
}

export const productImageService = new ProductImageService();
