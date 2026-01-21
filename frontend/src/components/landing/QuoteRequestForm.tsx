import React, { useState, useEffect } from 'react';
import { Calculator, User, Mail, Phone, MapPin, Home, CheckCircle, Waves } from 'lucide-react';
import api from '@/services/api';
import { poolPresetService } from '@/services/poolPresetService';

interface PoolModel {
  id: string;
  name: string;
  length: number;
  width: number;
}

export const QuoteRequestForm: React.FC = () => {
  const [poolModels, setPoolModels] = useState<PoolModel[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    spaceLength: '',
    spaceWidth: '',
    selectedPoolId: '',
    additionalInfo: '',
    budget: '',
    timeframe: 'No definido',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPoolModels();
  }, []);

  const loadPoolModels = async () => {
    try {
      const models = await poolPresetService.getAll();
      setPoolModels(models);
    } catch (err) {
      console.error('Error loading pool models:', err);
    }
  };

  const timeframes = [
    'Lo antes posible',
    'En 1-3 meses',
    'En 3-6 meses',
    'En 6-12 meses',
    'Más de 1 año',
    'No definido',
  ];

  const budgetRanges = [
    'Menos de $1.000.000',
    '$1.000.000 - $2.000.000',
    '$2.000.000 - $3.000.000',
    '$3.000.000 - $5.000.000',
    'Más de $5.000.000',
    'Por definir',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/quote-requests', formData);
      setSuccess(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        location: '',
        spaceLength: '',
        spaceWidth: '',
        selectedPoolId: '',
        additionalInfo: '',
        budget: '',
        timeframe: 'No definido',
      });

      setTimeout(() => setSuccess(false), 6000);
    } catch (err) {
      setError('Error al enviar la solicitud. Por favor, intenta de nuevo.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (success) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-12 text-center">
        <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6 animate-bounce" />
        <h3 className="text-3xl font-bold text-gray-900 mb-3">
          ¡Solicitud Recibida!
        </h3>
        <p className="text-lg text-gray-600 mb-4">
          Gracias por tu interés en nuestras piscinas
        </p>
        <p className="text-gray-500">
          Analizaremos tu solicitud y te contactaremos en las próximas 24-48 horas con un presupuesto personalizado.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Personal Info Section */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <User className="w-6 h-6 text-blue-600" />
          Información Personal
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre Completo *
            </label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Juan Pérez"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email *
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="juan@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4 inline mr-2" />
                Teléfono *
              </label>
              <input
                type="tel"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+54 9 11 1234-5678"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4 inline mr-2" />
              Ubicación / Ciudad *
            </label>
            <input
              type="text"
              name="location"
              required
              value={formData.location}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Buenos Aires, Argentina"
            />
          </div>
        </div>
      </div>

      {/* Project Info Section */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Waves className="w-6 h-6 text-blue-600" />
          Información del Proyecto
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Modelo de Piscina (Opcional)
            </label>
            <select
              name="selectedPoolId"
              value={formData.selectedPoolId}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Seleccionar modelo o usar el calculador</option>
              {poolModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} ({model.length}m × {model.width}m)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">
              <Home className="w-4 h-4 inline mr-2" />
              Espacio Disponible (Opcional)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="number"
                  name="spaceLength"
                  step="0.1"
                  value={formData.spaceLength}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Largo (m)"
                />
              </div>
              <div>
                <input
                  type="number"
                  name="spaceWidth"
                  step="0.1"
                  value={formData.spaceWidth}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ancho (m)"
                />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Ingresa las medidas de tu terreno para que te recomendemos el mejor modelo
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Presupuesto Estimado
              </label>
              <select
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccionar rango</option>
                {budgetRanges.map((range) => (
                  <option key={range} value={range}>
                    {range}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plazo de Ejecución
              </label>
              <select
                name="timeframe"
                value={formData.timeframe}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {timeframes.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Información Adicional
            </label>
            <textarea
              name="additionalInfo"
              value={formData.additionalInfo}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Cuéntanos sobre tu proyecto, características especiales que necesites, etc."
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-lg transition-all flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl transform hover:scale-105"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Enviando Solicitud...
          </>
        ) : (
          <>
            <Calculator className="w-5 h-5" />
            Solicitar Presupuesto Gratis
          </>
        )}
      </button>

      <p className="text-center text-sm text-gray-500">
        * Al enviar este formulario, aceptas ser contactado por nuestro equipo comercial
      </p>
    </form>
  );
};
