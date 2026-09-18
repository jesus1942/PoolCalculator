import type { User } from '@/types';

const roles: User['role'][] = ['ADMIN', 'USER', 'SUPERADMIN', 'INSTALLER', 'VIEWER'];

/** Lee datos de presentación y vencimiento; la autorización la verifica el backend. */
export const userFromSessionToken = (token: string): User => {
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[1]) throw new Error('Sesión inválida');
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0))));
  if (typeof payload.userId !== 'string' || typeof payload.email !== 'string' || !roles.includes(payload.role)) {
    throw new Error('Sesión inválida');
  }
  if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) throw new Error('Sesión vencida');
  return {
    id: payload.userId,
    email: payload.email,
    name: typeof payload.name === 'string' ? payload.name : payload.email.split('@')[0],
    role: payload.role,
    currentOrgId: typeof payload.orgId === 'string' ? payload.orgId : null,
  };
};

/** Mantiene la validación de contraseñas nuevas alineada con el límite de bcrypt. */
export const passwordValidationError = (password: string): string | null => {
  if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
  if (new TextEncoder().encode(password).length > 72) return 'La contraseña es demasiado larga (máximo 72 bytes)';
  return null;
};
