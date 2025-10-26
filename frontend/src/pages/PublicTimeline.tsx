import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { Clock, AlertTriangle, CheckCircle, FileText, Eye, Package, Home } from 'lucide-react';

interface ProjectUpdate {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  category: 'PROGRESS' | 'MILESTONE' | 'ISSUE' | 'NOTE' | 'INSPECTION' | 'DELIVERY' | 'OTHER';
  images: string[];
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

interface ProjectData {
  projectName: string;
  clientName: string;
  updates: ProjectUpdate[];
  showCosts: boolean;
  showDetails: boolean;
}

export const PublicTimeline: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    // Verificar si hay token de cliente en sessionStorage
    const clientToken = sessionStorage.getItem('clientShareToken');

    // Si no hay token o no coincide con el shareToken de la URL, redirigir al login
    if (!clientToken || clientToken !== shareToken) {
      navigate(`/client-login?returnUrl=/timeline/${shareToken}`);
      return;
    }

    loadTimeline();
  }, [shareToken, navigate]);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/public/timeline/${shareToken}`);
      setProjectData(response.data);
    } catch (error: any) {
      console.error('Error loading timeline:', error);
      setError(error.response?.data?.error || 'No se pudo cargar el timeline del proyecto');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryInfo = (category: ProjectUpdate['category']) => {
    const categories = {
      PROGRESS: { label: 'Progreso', icon: Clock, color: 'blue' },
      MILESTONE: { label: 'Hito', icon: CheckCircle, color: 'green' },
      ISSUE: { label: 'Problema', icon: AlertTriangle, color: 'red' },
      NOTE: { label: 'Nota', icon: FileText, color: 'gray' },
      INSPECTION: { label: 'Inspección', icon: Eye, color: 'purple' },
      DELIVERY: { label: 'Entrega', icon: Package, color: 'orange' },
      OTHER: { label: 'Otro', icon: FileText, color: 'gray' },
    };
    return categories[category] || categories.OTHER;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 24) {
      if (diffHours < 1) return 'Hace menos de 1 hora';
      return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    } else if (diffDays < 7) {
      return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="text-gray-700 mt-4 text-lg">Cargando timeline del proyecto...</p>
        </div>
      </div>
    );
  }

  if (error || !projectData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
          <AlertTriangle size={64} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
          <p className="text-gray-600 mb-6">
            {error || 'No se pudo cargar el timeline. Verifica que el enlace sea correcto.'}
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{projectData.projectName}</h1>
              <p className="text-gray-600 mt-1">Cliente: {projectData.clientName}</p>
            </div>
            <div className="flex items-center gap-2 text-blue-600">
              <Home size={24} />
              <span className="font-semibold text-lg">Pool Calculator</span>
            </div>
          </div>
        </div>
      </header>

      {/* Timeline Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Timeline del Proyecto</h2>
            <p className="text-gray-600">
              Registro cronológico de actualizaciones y eventos del proyecto
            </p>
            {projectData.updates.length > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                Total de actualizaciones: {projectData.updates.length}
              </p>
            )}
          </div>

          {projectData.updates.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-lg">
              <Clock size={64} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg mb-2">No hay actualizaciones registradas</p>
              <p className="text-sm text-gray-500">
                El constructor agregará actualizaciones a medida que avance el proyecto
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Línea vertical del timeline */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-indigo-200 to-purple-200"></div>

              {/* Lista de actualizaciones */}
              <div className="space-y-8">
                {projectData.updates.map((update, index) => {
                  const categoryInfo = getCategoryInfo(update.category);
                  const CategoryIcon = categoryInfo.icon;
                  const isFirst = index === 0;

                  return (
                    <div key={update.id} className="relative pl-20">
                      {/* Icono en la línea del timeline */}
                      <div
                        className={`absolute left-4 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center shadow-md ${
                          categoryInfo.color === 'blue' ? 'bg-blue-100' :
                          categoryInfo.color === 'green' ? 'bg-green-100' :
                          categoryInfo.color === 'red' ? 'bg-red-100' :
                          categoryInfo.color === 'purple' ? 'bg-purple-100' :
                          categoryInfo.color === 'orange' ? 'bg-orange-100' :
                          'bg-gray-100'
                        }`}
                      >
                        <CategoryIcon
                          size={16}
                          className={`${
                            categoryInfo.color === 'blue' ? 'text-blue-600' :
                            categoryInfo.color === 'green' ? 'text-green-600' :
                            categoryInfo.color === 'red' ? 'text-red-600' :
                            categoryInfo.color === 'purple' ? 'text-purple-600' :
                            categoryInfo.color === 'orange' ? 'text-orange-600' :
                            'text-gray-600'
                          }`}
                        />
                      </div>

                      {/* Contenido de la actualización */}
                      <div className={`bg-white border-2 rounded-lg p-6 shadow-md hover:shadow-xl transition-all ${
                        isFirst ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                      }`}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-bold text-gray-900 text-lg">{update.title}</h3>
                              <span
                                className={`px-3 py-1 text-xs rounded-full font-semibold ${
                                  categoryInfo.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                                  categoryInfo.color === 'green' ? 'bg-green-100 text-green-700' :
                                  categoryInfo.color === 'red' ? 'bg-red-100 text-red-700' :
                                  categoryInfo.color === 'purple' ? 'bg-purple-100 text-purple-700' :
                                  categoryInfo.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {categoryInfo.label}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">{formatDate(update.createdAt)}</p>
                          </div>
                        </div>

                        {update.description && (
                          <p className="text-gray-700 mb-4 leading-relaxed">{update.description}</p>
                        )}

                        {/* Galería de imágenes */}
                        {update.images && update.images.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                            {(update.images as string[]).map((image, imgIndex) => (
                              <div
                                key={imgIndex}
                                className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity shadow-md hover:shadow-lg"
                                onClick={() => setSelectedImage(image)}
                              >
                                <img
                                  src={image}
                                  alt={`${update.title} - ${imgIndex + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Pool Calculator</h3>
            <p className="text-gray-400 text-sm mb-4">
              Sistema completo de cálculo de materiales para montaje de piscinas de fibra de vidrio
            </p>
            <div className="border-t border-gray-800 pt-6">
              <p className="text-gray-400 text-sm mb-2">
                © {new Date().getFullYear()} Pool Calculator. Todos los derechos reservados.
              </p>
              <p className="text-gray-500 text-xs">
                Desarrollado por <span className="font-semibold text-blue-400">Jesús Olguín</span> - Domotics & IoT Solutions
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Modal para ver imagen completa */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-6xl max-h-[90vh]">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-white text-gray-900 rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-200 transition-colors shadow-lg"
            >
              ✕
            </button>
            <img
              src={selectedImage}
              alt="Vista completa"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
