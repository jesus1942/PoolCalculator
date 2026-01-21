import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types';
import { authService } from '@/services/authService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, name: string) => Promise<User>;
  logout: () => void;
  updateSession: (user: User, token: string) => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isInstaller: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = authService.getToken();
    const storedUser = authService.getUser();
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    setToken(response.token);
    setUser(response.user);
    authService.setToken(response.token);
    authService.setUser(response.user);
    return response.user;
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await authService.register(email, password, name);
    setToken(response.token);
    setUser(response.user);
    authService.setToken(response.token);
    authService.setUser(response.user);
    return response.user;
  };

  const logout = () => {
    authService.logout();
    setToken(null);
    setUser(null);
  };

  const updateSession = (nextUser: User, nextToken: string) => {
    setToken(nextToken);
    setUser(nextUser);
    authService.setToken(nextToken);
    authService.setUser(nextUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        updateSession,
        isAuthenticated: !!token,
        isAdmin: user?.role === 'ADMIN' || user?.role === 'SUPERADMIN',
        isInstaller: user?.role === 'INSTALLER',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};
