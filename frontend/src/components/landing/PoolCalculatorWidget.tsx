import React, { useState, useEffect } from 'react';
import { Calculator, Ruler, CheckCircle, Send, Mail, User, Phone } from 'lucide-react';
import { poolPresetService } from '@/services/poolPresetService';
import { getImageUrl } from '@/utils/imageUtils';
import api from '@/services/api';

interface PoolModel {
  id: string;
  name: string;
  length: number;
  width: number;
  imageUrl?: string;
  description?: string;
}

export const PoolCalculatorWidget: React.FC = () => {
  const [step, setStep] = useState<'measure' | 'results' | 'contact'>('measure');
  const [spaceLength, setSpaceLength] = useState('');
  const [spaceWidth, setSpaceWidth] = useState('');
  const [matchingPools, setMatchingPools] = useState<PoolModel[]>([]);
  const [selectedPool, setSelectedPool] = useState<PoolModel | null>(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (step === 'results' && spaceLength && spaceWidth) {
      findMatchingPools();
    }
  }, [step]);

  const findMatchingPools = async () => {
    try {
      const allPools = await poolPresetService.getAll();
      const length = parseFloat(spaceLength);
      const width = parseFloat(spaceWidth);

      // Filtrar piscinas que caben con 30cm de margen a cada lado
      const margin = 0.3;
      const fitting = allPools.filter((pool: PoolModel) => {
        const requiredLength = pool.length + (margin * 2);
        const requiredWidth = pool.width + (margin * 2);
        return requiredLength <= length && requiredWidth <= width;
      });

      setMatchingPools(fitting);
    } catch (error) {
      console.error('Error finding matching pools:', error);
    }
  };

  const handleCalculate = () => {
    if (spaceLength && spaceWidth) {
      setStep('results');
    }
  };

  const handleSelectPool = (pool: PoolModel) => {
    setSelectedPool(pool);
    setContactForm({
      ...contactForm,
      message: `Estoy interesado en el modelo ${pool.name} (${pool.length}m × ${pool.width}m). Mi espacio disponible es de ${spaceLength}m × ${spaceWidth}m.`,
    });
    setStep('contact');
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/calculator-inquiry', {
        ...contactForm,
        poolId: selectedPool?.id,
        poolName: selectedPool?.name,
        spaceLength,
        spaceWidth,
      });
      setSuccess(true);
    } catch (error) {
      console.error('Error sending inquiry:', error);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Consulta Enviada!</h3>
        <p className="text-gray-600">Te contactaremos pronto con más información.</p>
        <button
          onClick={() => {
            setSuccess(false);
            setStep('measure');
            setSpaceLength('');
            setSpaceWidth('');
            setSelectedPool(null);
          }}
          className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
        >
          Hacer otra consulta
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Calculator className="w-8 h-8" />
          <h3 className="text-2xl font-bold">Calculador Inteligente</h3>
        </div>
        <p className="text-blue-100">
          Encuentra la piscina perfecta para tu espacio
        </p>
      </div>

      <div className="p-6">
        {/* Step 1: Measure */}
        {step === 'measure' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Ruler className="w-4 h-4 inline mr-2" />
                Largo del espacio disponible (metros)
              </label>
              <input
                type="number"
                step="0.1"
                value={spaceLength}
                onChange={(e) => setSpaceLength(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: 8.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Ruler className="w-4 h-4 inline mr-2" />
                Ancho del espacio disponible (metros)
              </label>
              <input
                type="number"
                step="0.1"
                value={spaceWidth}
                onChange={(e) => setSpaceWidth(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: 4.5"
              />
            </div>

            <button
              onClick={handleCalculate}
              disabled={!spaceLength || !spaceWidth}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Calcular Modelos Compatibles
            </button>
          </div>
        )}

        {/* Step 2: Results */}
        {step === 'results' && (
          <div>
            <div className="mb-6">
              <h4 className="text-lg font-bold text-gray-900 mb-2">
                {matchingPools.length} modelos encontrados para tu espacio
              </h4>
              <p className="text-sm text-gray-600">
                Espacio disponible: {spaceLength}m × {spaceWidth}m
              </p>
            </div>

            {matchingPools.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">
                  No encontramos modelos estándar para ese espacio.
                </p>
                <button
                  onClick={() => setStep('measure')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Intentar con otras medidas
                </button>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {matchingPools.map((pool) => (
                  <div
                    key={pool.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors cursor-pointer"
                    onClick={() => handleSelectPool(pool)}
                  >
                    <div className="flex items-start gap-4">
                      {pool.imageUrl && (
                        <img
                          src={getImageUrl(pool.imageUrl)}
                          alt={pool.name}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <h5 className="font-bold text-gray-900">{pool.name}</h5>
                        <p className="text-sm text-gray-600 mb-2">
                          {pool.length}m × {pool.width}m
                        </p>
                        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                          Solicitar Información →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setStep('measure')}
              className="w-full mt-4 text-gray-600 hover:text-gray-700 font-medium py-2"
            >
              ← Volver a calcular
            </button>
          </div>
        )}

        {/* Step 3: Contact */}
        {step === 'contact' && selectedPool && (
          <div>
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-bold text-gray-900 mb-1">{selectedPool.name}</h4>
              <p className="text-sm text-gray-600">
                {selectedPool.length}m × {selectedPool.width}m
              </p>
            </div>

            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Tu nombre"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="tu@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-2" />
                  Teléfono *
                </label>
                <input
                  type="tel"
                  required
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="+54 11 1234-5678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensaje
                </label>
                <textarea
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Enviar Consulta
                  </>
                )}
              </button>
            </form>

            <button
              onClick={() => setStep('results')}
              className="w-full mt-4 text-gray-600 hover:text-gray-700 font-medium py-2"
            >
              ← Ver otros modelos
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
