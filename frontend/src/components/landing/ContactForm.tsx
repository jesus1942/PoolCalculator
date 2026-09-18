import React, { useRef, useState } from 'react';
import { Send, Mail, Phone, User, MessageSquare, CheckCircle } from 'lucide-react';
import api from '@/services/api';

export const ContactForm: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'Conocer Pool Installer',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);

  const subjects = [
    'Conocer Pool Installer',
    'Planes y suscripción',
    'Soporte de la aplicación',
    'Catálogo de modelos',
    'Otra consulta',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // El bloqueo sincrónico evita dos envíos antes del siguiente render.
    if (submitting.current) return;
    if (!formData.name.trim() || !formData.message.trim()) {
      setError('Completá tu nombre y el mensaje antes de enviar.');
      return;
    }
    submitting.current = true;
    setLoading(true);
    setError('');

    try {
      await api.post('/contact', {
        ...formData,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        message: formData.message.trim(),
      });
      setSuccess(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: 'Conocer Pool Installer',
        message: '',
      });

    } catch (err) {
      setError('Error al enviar el mensaje. Por favor, intenta de nuevo.');
      console.error('Error:', err);
    } finally {
      submitting.current = false;
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
      <div role="status" className="bg-green-50 border-2 border-green-200 rounded-2xl p-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Consulta recibida
        </h3>
        <p className="text-gray-600">
          Tu consulta quedó registrada. Usaremos el correo que indicaste para responderte.
        </p>
        <button type="button" className="mt-6 underline underline-offset-4" onClick={() => setSuccess(false)}>Enviar otra consulta</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" aria-busy={loading}>
      {/* Name */}
      <div>
        <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700 mb-2">
          <User className="w-4 h-4 inline mr-2" />
          Nombre Completo *
        </label>
        <input
          type="text"
          id="contact-name"
          autoComplete="name"
          maxLength={120}
          name="name"
          required
          value={formData.name}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Juan Pérez"
        />
      </div>

      {/* Email and Phone */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 mb-2">
            <Mail className="w-4 h-4 inline mr-2" />
            Email *
          </label>
          <input
            type="email"
            id="contact-email"
            autoComplete="email"
            maxLength={254}
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="juan@email.com"
          />
        </div>
        <div>
          <label htmlFor="contact-phone" className="block text-sm font-medium text-gray-700 mb-2">
            <Phone className="w-4 h-4 inline mr-2" />
            Teléfono
          </label>
          <input
            type="tel"
            id="contact-phone"
            autoComplete="tel"
            maxLength={40}
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="+54 9 11 1234-5678"
          />
        </div>
      </div>

      {/* Subject */}
      <div>
        <label htmlFor="contact-subject" className="block text-sm font-medium text-gray-700 mb-2">
          Motivo de Consulta
        </label>
        <select
          id="contact-subject"
          name="subject"
          value={formData.subject}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {subjects.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div>
        <label htmlFor="contact-message" className="block text-sm font-medium text-gray-700 mb-2">
          <MessageSquare className="w-4 h-4 inline mr-2" />
          Mensaje *
        </label>
        <textarea
          id="contact-message"
          maxLength={5000}
          name="message"
          required
          value={formData.message}
          onChange={handleChange}
          rows={5}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          placeholder="Cuéntanos cómo podemos ayudarte..."
        />
      </div>

      {/* Error Message */}
      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            Enviar consulta
          </>
        )}
      </button>
    </form>
  );
};
