import axios from 'axios';

// Configurar URL del API según el entorno
// En desarrollo local usa el proxy, en ngrok usa la URL completa
export const API_URL = import.meta.env.VITE_API_URL || (
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
  timeout: 30000,
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
      const url = error.config?.url || '';
      const token = localStorage.getItem('token');
      const isLoginAttempt = /\/auth\/(login|register)(?:$|\?)/.test(url);
      // Una respuesta de una sesión anterior no puede cerrar la sesión nueva.
      if (!isLoginAttempt && token && error.config?.headers?.Authorization === `Bearer ${token}`) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('poolinstaller:session-expired'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
