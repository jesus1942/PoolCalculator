import React, { useState, useEffect } from 'react';
import {
  Globe,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  Code,
  Database,
  Loader,
  Play
} from 'lucide-react';
import api from '@/services/api';

interface ScrapingJob {
  jobId: string;
  url: string;
  vendorName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  poolsFound: number;
  pools?: ScrapedPool[];
  error?: string;
  startedAt: string;
  completedAt?: string;
}

interface ScrapedPool {
  name: string;
  length: number;
  width: number;
  depth: number;
  description?: string;
  imageUrl?: string;
  shape?: string;
}

export const CatalogManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'scrape' | 'manual' | 'jobs'>('scrape');
  const [url, setUrl] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentJob, setCurrentJob] = useState<string | null>(null);
  const [jobs, setJobs] = useState<ScrapingJob[]>([]);
  const [manualContent, setManualContent] = useState('');
  const [contentType, setContentType] = useState<'html' | 'text'>('html');
  const [parsedPools, setParsedPools] = useState<ScrapedPool[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 5000); // Actualizar cada 5 segundos
    return () => clearInterval(interval);
  }, []);

  const loadJobs = async () => {
    try {
      const response = await api.get('/catalog-scraper/jobs');
      setJobs(response.data);
    } catch (error) {
      console.error('Error cargando trabajos:', error);
    }
  };

  const handleScrapeUrl = async () => {
    if (!url || !vendorName) {
      alert('Por favor ingresa una URL y nombre del fabricante');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/catalog-scraper/scrape', {
        url,
        vendorName,
        catalogType: 'pools'
      });

      setCurrentJob(response.data.jobId);
      setActiveTab('jobs');
      alert(`Scraping iniciado. Job ID: ${response.data.jobId}`);

      // Limpiar formulario
      setUrl('');
      setVendorName('');
    } catch (error: any) {
      console.error('Error al iniciar scraping:', error);
      alert(`Error: ${error.response?.data?.error || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleParseManual = async () => {
    if (!manualContent || !vendorName) {
      alert('Por favor ingresa contenido y nombre del fabricante');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/catalog-scraper/parse', {
        content: manualContent,
        vendorName,
        contentType
      });

      setParsedPools(response.data.pools);
      setShowResults(true);

      if (response.data.warnings && response.data.warnings.length > 0) {
        alert(`Advertencias:\n${response.data.warnings.join('\n')}`);
      }
    } catch (error: any) {
      console.error('Error al parsear:', error);
      alert(`Error: ${error.response?.data?.error || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePools = async (replaceExisting: boolean = false) => {
    if (parsedPools.length === 0) {
      alert('No hay modelos para guardar');
      return;
    }

    if (!confirm(`¿Guardar ${parsedPools.length} modelos en la base de datos?${replaceExisting ? ' (Se reemplazarán duplicados)' : ''}`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/catalog-scraper/save', {
        pools: parsedPools,
        vendorName,
        replaceExisting
      });

      alert(`Guardado exitoso:\n- Creados: ${response.data.stats.created}\n- Actualizados: ${response.data.stats.updated}\n- Omitidos: ${response.data.stats.skipped}`);

      // Limpiar
      setParsedPools([]);
      setShowResults(false);
      setManualContent('');
    } catch (error: any) {
      console.error('Error al guardar:', error);
      alert(`Error: ${error.response?.data?.error || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveJobPools = async (job: ScrapingJob, replaceExisting: boolean = false) => {
    if (!job.pools || job.pools.length === 0) {
      alert('No hay modelos para guardar');
      return;
    }

    if (!confirm(`¿Guardar ${job.pools.length} modelos de ${job.vendorName} en la base de datos?${replaceExisting ? ' (Se reemplazarán duplicados)' : ''}`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/catalog-scraper/save', {
        pools: job.pools,
        vendorName: job.vendorName,
        replaceExisting
      });

      alert(`✅ Guardado exitoso:\n\n📊 Estadísticas:\n- ✨ Creados: ${response.data.stats.created}\n- 🔄 Actualizados: ${response.data.stats.updated}\n- ⏭️  Omitidos: ${response.data.stats.skipped}`);

      // Recargar lista de trabajos
      loadJobs();
    } catch (error: any) {
      console.error('Error al guardar:', error);
      alert(`Error: ${error.response?.data?.error || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'processing':
        return <Loader className="w-5 h-5 text-blue-400 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Gestor de Catálogos</h1>
          <p className="text-zinc-400">
            Importa catálogos de piscinas desde URLs o contenido manual
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('scrape')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'scrape'
                ? 'bg-blue-500/20 border border-blue-500/50 text-blue-300'
                : 'bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10'
            }`}
          >
            <Globe className="w-5 h-5" />
            Scraping desde URL
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'manual'
                ? 'bg-purple-500/20 border border-purple-500/50 text-purple-300'
                : 'bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10'
            }`}
          >
            <FileText className="w-5 h-5" />
            Contenido Manual
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'jobs'
                ? 'bg-green-500/20 border border-green-500/50 text-green-300'
                : 'bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10'
            }`}
          >
            <Database className="w-5 h-5" />
            Trabajos ({jobs.length})
          </button>
        </div>

        {/* Scraping desde URL */}
        {activeTab === 'scrape' && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <Globe className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">Scraping Automático</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  URL del Catálogo
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://ejemplo.com/catalogo-piscinas"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Nombre del Fabricante
                </label>
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="ACQUAM, IGUI, MAYTRONICS, etc."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-200">
                    <p className="font-medium mb-1">Información importante:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-300">
                      <li>El scraping es automático y puede tardar varios segundos</li>
                      <li>Funciona mejor con páginas HTML estructuradas</li>
                      <li>Los PDFs desde URL aún no están soportados (descárgalos y usa contenido manual)</li>
                      <li>Se detectarán automáticamente patrones de dimensiones (ej: 8x4x1.5)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <button
                onClick={handleScrapeUrl}
                disabled={loading || !url || !vendorName}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Iniciar Scraping
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Contenido Manual */}
        {activeTab === 'manual' && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="w-6 h-6 text-purple-400" />
              <h2 className="text-2xl font-bold text-white">Parseo Manual</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Nombre del Fabricante
                </label>
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="ACQUAM, IGUI, etc."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-zinc-300">
                    Tipo de Contenido
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setContentType('html')}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                        contentType === 'html'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                          : 'bg-white/5 text-zinc-400 border border-white/10'
                      }`}
                    >
                      <Code className="w-4 h-4 inline mr-1" />
                      HTML
                    </button>
                    <button
                      onClick={() => setContentType('text')}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                        contentType === 'text'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                          : 'bg-white/5 text-zinc-400 border border-white/10'
                      }`}
                    >
                      <FileText className="w-4 h-4 inline mr-1" />
                      Texto
                    </button>
                  </div>
                </div>
                <textarea
                  value={manualContent}
                  onChange={(e) => setManualContent(e.target.value)}
                  placeholder={contentType === 'html' ? 'Pega aquí el código HTML...' : 'Pega aquí el contenido de texto...'}
                  rows={12}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all font-mono text-sm"
                />
              </div>

              <button
                onClick={handleParseManual}
                disabled={loading || !manualContent || !vendorName}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Parseando...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Parsear Contenido
                  </>
                )}
              </button>

              {/* Resultados del parseo */}
              {showResults && (
                <div className="mt-6 bg-green-500/10 border border-green-500/20 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-green-300">
                      {parsedPools.length} Modelos Encontrados
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSavePools(false)}
                        disabled={loading}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                      >
                        Guardar Nuevos
                      </button>
                      <button
                        onClick={() => handleSavePools(true)}
                        disabled={loading}
                        className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                      >
                        Guardar y Reemplazar
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                    {parsedPools.map((pool, index) => (
                      <div
                        key={index}
                        className="bg-white/5 border border-white/10 rounded-lg p-3"
                      >
                        <p className="font-medium text-white text-sm mb-1">{pool.name}</p>
                        <p className="text-zinc-400 text-xs">
                          {pool.length}m × {pool.width}m × {pool.depth}m
                        </p>
                        {pool.shape && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded">
                            {pool.shape}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lista de Trabajos */}
        {activeTab === 'jobs' && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Database className="w-6 h-6 text-green-400" />
                <h2 className="text-2xl font-bold text-white">Historial de Trabajos</h2>
              </div>
              <button
                onClick={loadJobs}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-zinc-300 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Actualizar
              </button>
            </div>

            {jobs.length === 0 ? (
              <div className="text-center py-12">
                <Database className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400">No hay trabajos de scraping registrados</p>
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => (
                  <div
                    key={job.jobId}
                    className={`bg-white/5 border rounded-lg p-4 transition-all ${
                      job.jobId === currentJob
                        ? 'border-blue-500/50 ring-2 ring-blue-500/20'
                        : 'border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(job.status)}
                          <span className="font-medium text-white">{job.vendorName}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              job.status === 'completed'
                                ? 'bg-green-500/20 text-green-300'
                                : job.status === 'failed'
                                ? 'bg-red-500/20 text-red-300'
                                : job.status === 'processing'
                                ? 'bg-blue-500/20 text-blue-300'
                                : 'bg-gray-500/20 text-gray-300'
                            }`}
                          >
                            {job.status}
                          </span>
                        </div>
                        <p className="text-zinc-400 text-sm mb-1 truncate">{job.url}</p>
                        <div className="flex items-center gap-4 text-xs text-zinc-500">
                          <span>Iniciado: {new Date(job.startedAt).toLocaleString('es-AR')}</span>
                          {job.completedAt && (
                            <span>Completado: {new Date(job.completedAt).toLocaleString('es-AR')}</span>
                          )}
                        </div>
                        {job.error && (
                          <p className="text-red-400 text-sm mt-2">{job.error}</p>
                        )}
                      </div>
                      {job.status === 'completed' && (
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-400">{job.poolsFound}</div>
                          <div className="text-xs text-zinc-500">modelos</div>
                        </div>
                      )}
                    </div>

                    {/* Mostrar modelos encontrados y botones de guardado */}
                    {job.status === 'completed' && job.pools && job.pools.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-zinc-300">
                            {job.pools.length} Modelos Encontrados
                          </h4>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveJobPools(job, false)}
                              disabled={loading}
                              className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded text-xs font-medium transition-all disabled:opacity-50"
                            >
                              💾 Guardar Nuevos
                            </button>
                            <button
                              onClick={() => handleSaveJobPools(job, true)}
                              disabled={loading}
                              className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-xs font-medium transition-all disabled:opacity-50"
                            >
                              🔄 Guardar y Reemplazar
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                          {job.pools.slice(0, 10).map((pool, index) => (
                            <div
                              key={index}
                              className="bg-white/5 border border-white/10 rounded p-2"
                            >
                              <p className="font-medium text-white text-xs mb-0.5 truncate">{pool.name}</p>
                              <p className="text-zinc-400 text-xs">
                                {pool.length}m × {pool.width}m × {pool.depth}m
                              </p>
                              {pool.shape && (
                                <span className="inline-block mt-1 px-1.5 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded">
                                  {pool.shape}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                        {job.pools.length > 10 && (
                          <p className="text-xs text-zinc-500 mt-2 text-center">
                            ... y {job.pools.length - 10} modelos más
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CatalogManager;
