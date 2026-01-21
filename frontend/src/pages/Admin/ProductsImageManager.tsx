import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProductImageUploader } from '@/components/ProductImageUploader';
import { ProductType } from '@/services/productImageService';
import { poolPresetService } from '@/services/poolPresetService';
import { tilePresetService } from '@/services/tilePresetService';
import { accessoryPresetService } from '@/services/accessoryPresetService';
import { equipmentPresetService } from '@/services/equipmentPresetService';
import { constructionMaterialService } from '@/services/constructionMaterialService';
import { getImageUrl } from '@/utils/imageUtils';
import { Loader, Package, Image as ImageIcon } from 'lucide-react';

type Product = {
  id: string;
  name: string;
  imageUrl?: string | null;
  additionalImages?: string[];
  [key: string]: any;
};

type ProductCategory = {
  type: ProductType;
  title: string;
  icon: typeof Package;
  service: any;
};

const PRODUCT_CATEGORIES: ProductCategory[] = [
  {
    type: 'POOL_PRESET',
    title: 'Modelos de Piscinas',
    icon: Package,
    service: poolPresetService,
  },
  {
    type: 'TILE_PRESET',
    title: 'Losetas',
    icon: Package,
    service: tilePresetService,
  },
  {
    type: 'ACCESSORY_PRESET',
    title: 'Accesorios',
    icon: Package,
    service: accessoryPresetService,
  },
  {
    type: 'EQUIPMENT_PRESET',
    title: 'Equipos (Bombas, Filtros, Calefactores)',
    icon: Package,
    service: equipmentPresetService,
  },
  {
    type: 'CONSTRUCTION_MATERIAL',
    title: 'Materiales de Construcción',
    icon: Package,
    service: constructionMaterialService,
  },
];

export const ProductsImageManager: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<ProductType>('POOL_PRESET');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const currentCategory = PRODUCT_CATEGORIES.find(c => c.type === selectedCategory);

  useEffect(() => {
    loadProducts();
  }, [selectedCategory]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const category = PRODUCT_CATEGORIES.find(c => c.type === selectedCategory);
      if (!category) return;

      const data = await category.service.getAll();
      setProducts(data);
    } catch (error) {
      console.error('Error cargando productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpdated = () => {
    loadProducts(); // Recargar productos después de actualizar imagen
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Gestión de Imágenes de Productos
        </h1>
        <p className="text-gray-600">
          Sube y administra imágenes para todos tus productos en un solo lugar
        </p>
      </div>

      {/* Selector de categorías */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {PRODUCT_CATEGORIES.map((category) => {
          const Icon = category.icon;
          const isSelected = selectedCategory === category.type;

          return (
            <button
              key={category.type}
              onClick={() => setSelectedCategory(category.type)}
              className={`p-4 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <Icon
                className={`w-8 h-8 mx-auto mb-2 ${
                  isSelected ? 'text-blue-600' : 'text-gray-400'
                }`}
              />
              <div className={`text-sm font-medium text-center ${
                isSelected ? 'text-blue-900' : 'text-gray-700'
              }`}>
                {category.title}
              </div>
              <div className="text-xs text-gray-500 text-center mt-1">
                {products.length} items
              </div>
            </button>
          );
        })}
      </div>

      {/* Barra de búsqueda */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar productos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Lista de productos */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Cargando productos...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card className="p-12 text-center">
          <ImageIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">
            {searchQuery
              ? 'No se encontraron productos con ese nombre'
              : 'No hay productos en esta categoría'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {product.name}
                  </h3>
                  {product.brand && (
                    <p className="text-sm text-gray-500">Marca: {product.brand}</p>
                  )}
                  {product.model && (
                    <p className="text-sm text-gray-500">Modelo: {product.model}</p>
                  )}
                </div>
                {product.imageUrl ? (
                  <div className="flex-shrink-0 ml-4">
                    <img
                      src={getImageUrl(product.imageUrl) || ''}
                      alt={product.name}
                      className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%23f3f4f6" width="80" height="80"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="12"%3ESin imagen%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex-shrink-0 ml-4 w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>

              <ProductImageUploader
                productType={selectedCategory}
                productId={product.id}
                currentImageUrl={product.imageUrl}
                currentAdditionalImages={product.additionalImages || []}
                onImageUploaded={handleImageUpdated}
                onAdditionalImagesUploaded={handleImageUpdated}
                onImageDeleted={handleImageUpdated}
                onAdditionalImageDeleted={handleImageUpdated}
              />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
