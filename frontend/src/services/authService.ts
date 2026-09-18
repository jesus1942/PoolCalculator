import api from './api';
import { AuthResponse, User } from '@/types';
import { userFromSessionToken } from '@/utils/session';

export const authService = {
  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    const response = await api.post('/auth/register', { email, password, name });
    return response.data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getToken(): string | null {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      userFromSessionToken(token);
      return token;
    } catch {
      this.logout();
      return null;
    }
  },

  setToken(token: string) {
    localStorage.setItem('token', token);
  },

  getUser(): User | null {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (!user || typeof user.id !== 'string' || typeof user.email !== 'string') return null;
      return user;
    } catch {
      // Un dato local dañado no debe bloquear toda la aplicación.
      this.logout();
      return null;
    }
  },

  setUser(user: User) {
    localStorage.setItem('user', JSON.stringify(user));
  },
};
