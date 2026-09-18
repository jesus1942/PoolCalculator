import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { generateToken } from '../config/jwt';
import { ensureCurrentOrganization, ensureOrganizationInTransaction, getSessionRole, OrganizationAccessError } from '../utils/authOrganization';
import { normalizeEmail, validName, validNewPassword, PASSWORD_REQUIREMENTS } from '../utils/authValidation';

/** Crea usuario, organización y membresía en una sola transacción. */
export const register = async (req: Request, res: Response) => {
  try {
    const { password, name } = req.body || {};
    const email = normalizeEmail(req.body?.email);
    if (!email || !validName(name)) return res.status(400).json({ error: 'Ingresá un email y nombre válidos' });
    if (!validNewPassword(password)) return res.status(400).json({ error: PASSWORD_REQUIREMENTS });
    const existingUser = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
    if (existingUser) return res.status(409).json({ error: 'El email ya está registrado' });
    const hashedPassword = await bcrypt.hash(password, 12);
    const { user, orgId } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, password: hashedPassword, name: name.trim(), provider: 'EMAIL' },
      });
      const orgId = await ensureOrganizationInTransaction(tx, user.id);
      return { user, orgId };
    });
    const role = await getSessionRole(user.id, user.role, orgId);
    const token = generateToken(user.id, user.email, role, orgId, user.name, user.sessionVersion);
    return res.status(201).json({
      message: 'Usuario registrado exitosamente', token,
      user: { id: user.id, email: user.email, name: user.name, role, currentOrgId: orgId },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }
    console.error('Error en registro:', error);
    return res.status(500).json({ error: 'Error al registrar usuario' });
  }
};

/** Comprueba credenciales sin registrar correos ni contraseñas en logs. */
export const login = async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;
    if (!email || typeof password !== 'string' || !password || Buffer.byteLength(password) > 72) {
      return res.status(400).json({ error: 'Ingresá un email y contraseña válidos' });
    }
    const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
    if (!user?.password || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const orgId = await ensureCurrentOrganization(user.id);
    const role = await getSessionRole(user.id, user.role, orgId);
    const token = generateToken(user.id, user.email, role, orgId, user.name, user.sessionVersion);
    return res.json({
      message: 'Login exitoso', token,
      user: { id: user.id, email: user.email, name: user.name, role, currentOrgId: orgId },
    });
  } catch (error) {
    if (error instanceof OrganizationAccessError) return res.status(403).json({ error: error.message });
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};
