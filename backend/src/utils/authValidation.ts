/** Normaliza el correo sin transformar ni truncar contraseñas. */
export const normalizeEmail = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
};

/** bcrypt compara hasta 72 bytes: se rechazan entradas que quedarían truncadas. */
export const validNewPassword = (value: unknown): value is string =>
  typeof value === 'string' && value.length >= 8 && Buffer.byteLength(value, 'utf8') <= 72;

export const PASSWORD_REQUIREMENTS = 'La contraseña debe tener al menos 8 caracteres y como máximo 72 bytes';

/** Valida los nombres que se guardan en perfiles y organizaciones. */
export const validName = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 150;
