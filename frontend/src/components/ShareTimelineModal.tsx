import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { HdLink, HdCopy, HdCheck, HdGear, HdEye, HdEyeOff, HdX, HdDownload } from '@/components/ui/HandDrawnIcons';
import api, { API_URL } from '@/services/api';
import { publicAssetUrl } from '@/utils/publicAssetUrl';

interface ShareTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  updates: any[];
}

export const ShareTimelineModal: React.FC<ShareTimelineModalProps> = ({
  isOpen,
  onClose,
  projectId,
  updates,
}) => {
  const [loading, setLoading] = useState(false);
  const [shareConfig, setShareConfig] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [showCosts, setShowCosts] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [clientUsername, setClientUsername] = useState('');
  const [clientPassword, setClientPassword] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    setShareConfig(null);
    setCopied(false);
    setClientUsername('');
    setClientPassword('');
    setShowCosts(false);
    setShowDetails(true);
    loadShareConfig(controller.signal);
    return () => controller.abort();
  }, [isOpen, projectId]);

  const loadShareConfig = async (signal: AbortSignal) => {
    try {
      const response = await api.get(`/project-share/${projectId}`, { signal });
      if (signal.aborted) return;
      if (response.data) {
        setShareConfig(response.data);
        setShowCosts(response.data.showCosts);
        setShowDetails(response.data.showDetails);
      }
    } catch (error) {
      if (!signal.aborted) console.error('Error al cargar configuración:', error);
    }
  };

  const handleCreateShare = async () => {
    if (!clientUsername.trim() || !clientPassword.trim()) {
      alert('Debes ingresar usuario y contraseña para el cliente');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/project-share/${projectId}`, {
        showCosts,
        showDetails,
        clientUsername: clientUsername.trim(),
        clientPassword: clientPassword.trim(),
      });
      setShareConfig(response.data);
      alert('Link compartido creado exitosamente');
    } catch (error: any) {
      console.error('Error al crear link:', error);
      const errorMsg = error.response?.data?.error || 'Error al crear link compartido';
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateShare = async () => {
    setLoading(true);
    try {
      const response = await api.post(`/project-share/${projectId}`, {
        showCosts,
        showDetails,
      });
      setShareConfig(response.data);
      alert('Configuración actualizada');
    } catch (error) {
      console.error('Error al actualizar:', error);
      alert('Error al actualizar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirm('¿Desactivar el link compartido? Los clientes no podrán acceder más.')) return;

    setLoading(true);
    try {
      await api.delete(`/project-share/${projectId}`);
      setShareConfig({ ...shareConfig, isActive: false });
      alert('Link desactivado');
    } catch (error) {
      console.error('Error al desactivar:', error);
      alert('Error al desactivar link');
    } finally {
      setLoading(false);
    }
  };

  const getShareUrl = () => {
    if (!shareConfig?.shareToken) return '';
    const url = new URL(publicAssetUrl('client-login'), window.location.origin);
    url.searchParams.set('returnUrl', `/timeline/${encodeURIComponent(shareConfig.shareToken)}`);
    return url.toString();
  };

  const getExportUrl = () => {
    if (!shareConfig?.shareToken) return '';
    return `${API_URL.replace(/\/$/, '')}/public/timeline/${encodeURIComponent(shareConfig.shareToken)}/export`;
  };

  const handleCopyLink = () => {
    const url = getShareUrl();
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const publicUpdates = updates.filter((u: any) => u.isPublic !== false);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Compartir la historia con el cliente">
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">El diario de su piscina</h4>
          <p className="text-sm text-blue-700">
            Compartí un acceso para que tu cliente recorra los avances publicados de su obra.
            Elegí qué información puede ver; las novedades privadas quedan dentro del equipo.
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h5 className="font-semibold text-gray-900 mb-3 text-sm">Configuración de Visibilidad</h5>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50">
              <div>
                <div className="font-medium text-sm">Mostrar Costos</div>
                <div className="text-xs text-gray-600">Incluir información de presupuesto y costos</div>
              </div>
              <input
                type="checkbox"
                checked={showCosts}
                onChange={(e) => setShowCosts(e.target.checked)}
                className="w-5 h-5"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50">
              <div>
                <div className="font-medium text-sm">Mostrar Detalles</div>
                <div className="text-xs text-gray-600">Incluir relatos y fotografías de las publicaciones visibles</div>
              </div>
              <input
                type="checkbox"
                checked={showDetails}
                onChange={(e) => setShowDetails(e.target.checked)}
                className="w-5 h-5"
              />
            </label>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h5 className="font-semibold text-gray-900 mb-2 text-sm">Actualizaciones Visibles</h5>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{publicUpdates.length}</div>
            <div className="text-xs text-gray-600">de {updates.length} actualizaciones</div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Usa los controles en cada actualización para hacerlas públicas o privadas
          </p>
        </div>

        {shareConfig && shareConfig.isActive ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-green-800">
                <HdLink size={18} />
                <span className="font-semibold text-sm">Link Activo</span>
              </div>
              <button
                onClick={handleDeactivate}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Desactivar
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={getShareUrl()}
                readOnly
                className="flex-1 px-3 py-2 border rounded-md text-sm bg-white"
              />
              <Button variant="secondary" onClick={handleCopyLink} className="flex-shrink-0">
                {copied ? <HdCheck size={18} /> : <HdCopy size={18} />}
              </Button>
            </div>

            <div className="mt-3 space-y-2">
              <Button variant="secondary" onClick={handleUpdateShare} className="w-full" disabled={loading}>
                <HdGear size={18} className="mr-2" />
                Actualizar Configuración
              </Button>
              <Button
                variant="secondary"
                onClick={() => window.open(getExportUrl(), '_blank')}
                className="w-full"
                disabled={loading}
              >
                <HdDownload size={18} className="mr-2" />
                Exportar Timeline (CSV)
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h5 className="font-semibold text-yellow-900 mb-2 text-sm">Credenciales del Cliente</h5>
              <p className="text-xs text-yellow-700 mb-3">
                Crea un usuario y contraseña que compartirás con tu cliente para que pueda acceder al timeline.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Usuario
                  </label>
                  <input
                    type="text"
                    value={clientUsername}
                    onChange={(e) => setClientUsername(e.target.value)}
                    placeholder="Ej: cliente123"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    value={clientPassword}
                    onChange={(e) => setClientPassword(e.target.value)}
                    placeholder="Contraseña segura"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <Button onClick={handleCreateShare} className="w-full" disabled={loading}>
              <HdLink size={18} className="mr-2" />
              {loading ? 'Generando...' : 'Generar Link Compartible'}
            </Button>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
