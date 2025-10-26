import axios from 'axios';

// Configurar URL del API según el entorno
// En desarrollo local usa el proxy, en ngrok usa la URL completa
const API_URL = import.meta.env.VITE_API_URL || (
  window.location.hostname.includes('ngrok')
    ? `${window.location.protocol}//${window.location.hostname}/api`
    : '/api'
);

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
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
