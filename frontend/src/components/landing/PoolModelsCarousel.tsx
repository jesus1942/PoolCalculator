import React, { useEffect, useState } from 'react';
import { Carousel } from '@/components/ui/Carousel';
import { Waves, Ruler, Droplet } from 'lucide-react';
import { poolPresetService } from '@/services/poolPresetService';
import { getImageUrl } from '@/utils/imageUtils';

interface PoolModel {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  length: number;
  width: number;
  depth: number;
  shape: string;
  hasSkimmer: boolean;
  hasLighting: boolean;
}

export const PoolModelsCarousel: React.FC = () => {
  const [poolModels, setPoolModels] = useState<PoolModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPoolModels();
  }, []);

  const loadPoolModels = async () => {
    try {
      const models = await poolPresetService.getAll();
      setPoolModels(models.slice(0, 12)); // Mostrar 12 modelos
    } catch (error) {
      console.error('Error al cargar modelos:', error);
      setPoolModels([]);
    } finally {
      setLoading(false);
    }
  };

  const getShapeLabel = (shape: string) => {
    const shapes: Record<string, string> = {
      RECTANGULAR: 'Rectangular',
      CIRCULAR: 'Circular',
      OVAL: 'Ovalada',
      JACUZZI: 'Jacuzzi',
    };
    return shapes[shape] || shape;
  };

  if (loading) {
    return (
      <div className="h-[500px] bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">
        <div className="text-gray-400">Cargando modelos...</div>
      </div>
    );
  }

  if (poolModels.length === 0) {
    return (
      <div className="h-[500px] bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <Waves className="w-16 h-16 text-cyan-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No hay modelos disponibles</p>
        </div>
      </div>
    );
  }

  return (
    <Carousel autoPlay interval={7000} className="h-[500px]">
      {poolModels.map((model) => (
        <div key={model.id} className="relative h-[500px] bg-gradient-to-br from-blue-500 to-cyan-600">
          {/* Background Image */}
          {model.imageUrl && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-40"
              style={{ backgroundImage: `url(${getImageUrl(model.imageUrl)})` }}
            />
          )}

          {/* Content */}
          <div className="relative h-full flex items-center justify-center p-8">
            <div className="max-w-4xl w-full">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden">
                <div className="grid md:grid-cols-2 gap-0">
                  {/* Image Section */}
                  <div className="relative h-64 md:h-auto">
                    {model.imageUrl ? (
                      <img
                        src={getImageUrl(model.imageUrl)}
                        alt={model.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                        <Waves className="w-24 h-24 text-white opacity-50" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4 bg-blue-600 text-white px-4 py-2 rounded-full font-bold text-sm">
                      {getShapeLabel(model.shape)}
                    </div>
                  </div>

                  {/* Info Section */}
                  <div className="p-8 flex flex-col justify-center">
                    <h3 className="text-3xl font-bold text-gray-900 mb-3">{model.name}</h3>
                    {model.description && (
                      <p className="text-gray-600 mb-6 line-clamp-2">{model.description}</p>
                    )}

                    {/* Specs */}
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <Ruler className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Dimensiones</div>
                          <div className="font-semibold text-gray-900">
                            {model.length}m × {model.width}m
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="bg-cyan-100 p-2 rounded-lg">
                          <Droplet className="w-5 h-5 text-cyan-600" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Profundidad</div>
                          <div className="font-semibold text-gray-900">{model.depth}m</div>
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {model.hasSkimmer && (
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                          </svg>
                          Skimmer
                        </span>
                      )}
                      {model.hasLighting && (
                        <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                          </svg>
                          Iluminación
                        </span>
                      )}
                    </div>

                    {/* CTA */}
                    <button
                      onClick={() => {
                        const element = document.getElementById('contact-form');
                        element?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-lg hover:shadow-xl"
                    >
                      Solicitar Información
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </Carousel>
  );
};
