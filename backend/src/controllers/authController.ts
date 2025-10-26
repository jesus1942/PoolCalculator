import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { generateToken } from '../config/jwt';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        provider: 'EMAIL', // Marcar como usuario de email/password
      },
    });

    const token = generateToken(user.id, user.email, user.role);

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    console.log('🔐 [AUTH] Intento de login:', req.body.email);
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    console.log('🔍 [AUTH] Usuario encontrado:', user ? `✅ ${user.email}` : '❌ No existe');

    if (!user) {
      console.log('❌ [AUTH] Login fallido: usuario no encontrado');
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Verificar si es usuario de OAuth (no tiene password)
    if (user.provider === 'GOOGLE' && !user.password) {
      console.log('❌ [AUTH] Login fallido: usuario de Google OAuth');
      return res.status(400).json({
        error: 'Esta cuenta usa inicio de sesión con Google. Por favor usa el botón de Google.',
      });
    }

    // Verificar que tenga password
    if (!user.password) {
      console.log('❌ [AUTH] Login fallido: sin contraseña');
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    console.log('🔑 [AUTH] Validación contraseña:', validPassword ? '✅ Correcta' : '❌ Incorrecta');

    if (!validPassword) {
      console.log('❌ [AUTH] Login fallido: contraseña incorrecta');
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = generateToken(user.id, user.email, user.role);
    console.log('✅ [AUTH] Login exitoso:', user.email, '| Rol:', user.role);

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};
