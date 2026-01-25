import axios from 'axios';

// Configurar URL del API según el entorno
// En desarrollo local usa el proxy, en ngrok usa la URL completa
const API_URL = import.meta.env.VITE_API_URL || (
  window.location.hostname.includes('ngrok')
    ? `${window.location.protocol}//${window.location.hostname}/api`
    : '/api'
);

const resolveApiBaseUrl = () => {
  if (API_URL.startsWith('http://') || API_URL.startsWith('https://')) {
    return API_URL.replace(/\/api\/?$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
};

// URL base del backend (sin /api) para imágenes y recursos estáticos
export const API_BASE_URL = resolveApiBaseUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Solo redirigir al login si es un error de autenticación en rutas críticas
      // NO redirigir si es un error de recurso no encontrado o permisos específicos
      const url = error.config?.url || '';

      // Lista de rutas que NO deben causar redirect automático
      const noRedirectRoutes = [
        '/professional-calculations',
        '/products/',
        '/agenda',
        '/crews',
        '/users',
        '/weather'
      ];

      const shouldRedirect = !noRedirectRoutes.some(route => url.includes(route));

      if (shouldRedirect) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
