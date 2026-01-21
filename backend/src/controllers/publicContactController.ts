import { Request, Response } from 'express';
import prisma from '../config/database';
import * as nodemailer from 'nodemailer';

// Configurar transporter de email
let transporter: nodemailer.Transporter | null = null;

try {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('[PUBLIC-CONTACT] SMTP configurado correctamente');
  } else {
    console.warn('[PUBLIC-CONTACT] Variables SMTP no configuradas. Los emails no se enviarán.');
  }
} catch (error) {
  console.error('[PUBLIC-CONTACT] Error al configurar nodemailer:', error);
}

// Contact form submission
export const submitContactForm = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Validar campos requeridos
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    console.log('[CONTACT FORM] Nueva consulta recibida:', { name, email, subject });

    // Guardar en la base de datos
    const contactForm = await prisma.contactForm.create({
      data: {
        name,
        email,
        phone: phone || null,
        subject,
        message,
        status: 'PENDING',
      },
    });

    console.log('[CONTACT FORM] Guardado en BD con ID:', contactForm.id);

    // Enviar email de notificación al administrador
    if (transporter) {
      try {
        const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;

        await transporter.sendMail({
          from: `"Pool Installer" <${process.env.SMTP_USER}>`,
          to: adminEmail,
          subject: `Nueva Consulta: ${subject}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Nueva Consulta de Contacto</h2>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Nombre:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Teléfono:</strong> ${phone || 'No proporcionado'}</p>
                <p><strong>Motivo:</strong> ${subject}</p>
              </div>
              <div style="background: #fff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                <h3 style="margin-top: 0;">Mensaje:</h3>
                <p style="white-space: pre-wrap;">${message}</p>
              </div>
              <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
                Puedes responder directamente a ${email}
              </p>
            </div>
          `,
        });

        console.log('[CONTACT FORM] Email enviado exitosamente a:', adminEmail);
      } catch (emailError) {
        console.error('[CONTACT FORM] Error al enviar email:', emailError);
        // No fallar la request si el email falla
      }
    }

    res.status(200).json({
      message: 'Consulta recibida exitosamente',
      data: { id: contactForm.id, name, email, subject },
    });
  } catch (error) {
    console.error('Error en formulario de contacto:', error);
    res.status(500).json({ error: 'Error al procesar la consulta' });
  }
};

// Quote request submission
export const submitQuoteRequest = async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      phone,
      location,
      spaceLength,
      spaceWidth,
      selectedPoolId,
      additionalInfo,
      budget,
      timeframe,
    } = req.body;

    // Validar campos requeridos
    if (!name || !email || !phone || !location) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    console.log('[QUOTE REQUEST] Nueva solicitud de presupuesto:', { name, email, location });

    // Guardar en la base de datos
    const quoteRequest = await prisma.quoteRequest.create({
      data: {
        name,
        email,
        phone,
        location,
        spaceLength: spaceLength ? parseFloat(spaceLength) : null,
        spaceWidth: spaceWidth ? parseFloat(spaceWidth) : null,
        selectedPoolId: selectedPoolId || null,
        additionalInfo: additionalInfo || null,
        budget: budget || null,
        timeframe: timeframe || null,
        status: 'PENDING',
      },
    });

    console.log('[QUOTE REQUEST] Guardado en BD con ID:', quoteRequest.id);
    console.log('Detalles:', {
      space: spaceLength && spaceWidth ? `${spaceLength}m x ${spaceWidth}m` : 'No especificado',
      poolId: selectedPoolId,
      budget,
      timeframe,
    });

    // Enviar email de notificación al administrador
    if (transporter) {
      try {
        const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;

        await transporter.sendMail({
          from: `"Pool Installer" <${process.env.SMTP_USER}>`,
          to: adminEmail,
          subject: `Nueva Solicitud de Presupuesto - ${location}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Nueva Solicitud de Presupuesto</h2>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Nombre:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Teléfono:</strong> ${phone}</p>
                <p><strong>Ubicación:</strong> ${location}</p>
              </div>
              <div style="background: #fff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Detalles del Proyecto:</h3>
                <p><strong>Espacio disponible:</strong> ${spaceLength && spaceWidth ? `${spaceLength}m x ${spaceWidth}m` : 'No especificado'}</p>
                <p><strong>Modelo seleccionado:</strong> ${selectedPoolId ? `ID: ${selectedPoolId}` : 'Por definir'}</p>
                <p><strong>Presupuesto:</strong> ${budget || 'No especificado'}</p>
                <p><strong>Plazo deseado:</strong> ${timeframe || 'No especificado'}</p>
                ${additionalInfo ? `<p><strong>Información adicional:</strong></p><p style="white-space: pre-wrap;">${additionalInfo}</p>` : ''}
              </div>
              <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
                Responder a: ${email}
              </p>
            </div>
          `,
        });

        console.log('[QUOTE REQUEST] Email enviado exitosamente a:', adminEmail);
      } catch (emailError) {
        console.error('[QUOTE REQUEST] Error al enviar email:', emailError);
      }
    }

    res.status(200).json({
      message: 'Solicitud de presupuesto recibida exitosamente',
      data: { id: quoteRequest.id, name, email, location },
    });
  } catch (error) {
    console.error('Error en solicitud de presupuesto:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
};

// Calculator inquiry submission
export const submitCalculatorInquiry = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, message, poolId, poolName, spaceLength, spaceWidth } = req.body;

    // Validar campos requeridos
    if (!name || !email || !phone) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    console.log('[CALCULATOR INQUIRY] Nueva consulta del calculador:', { name, email, poolName });

    // Guardar en la base de datos
    const calculatorInquiry = await prisma.calculatorInquiry.create({
      data: {
        name,
        email,
        phone,
        message: message || null,
        poolId: poolId || null,
        poolName: poolName || null,
        spaceLength: spaceLength ? parseFloat(spaceLength) : null,
        spaceWidth: spaceWidth ? parseFloat(spaceWidth) : null,
        status: 'PENDING',
      },
    });

    console.log('[CALCULATOR INQUIRY] Guardado en BD con ID:', calculatorInquiry.id);
    console.log('Detalles:', {
      poolName,
      space: spaceLength && spaceWidth ? `${spaceLength}m x ${spaceWidth}m` : 'No especificado',
    });

    // Enviar email de notificación al administrador
    if (transporter) {
      try {
        const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;

        await transporter.sendMail({
          from: `"Pool Installer" <${process.env.SMTP_USER}>`,
          to: adminEmail,
          subject: `Consulta desde Calculador - ${poolName || 'Modelo no especificado'}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Consulta desde Calculador de Piscinas</h2>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Nombre:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Teléfono:</strong> ${phone}</p>
              </div>
              <div style="background: #fff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Detalles:</h3>
                <p><strong>Modelo de piscina:</strong> ${poolName || 'No especificado'}</p>
                <p><strong>ID del modelo:</strong> ${poolId || 'No especificado'}</p>
                <p><strong>Espacio disponible:</strong> ${spaceLength && spaceWidth ? `${spaceLength}m x ${spaceWidth}m` : 'No especificado'}</p>
                ${message ? `<p><strong>Mensaje:</strong></p><p style="white-space: pre-wrap;">${message}</p>` : ''}
              </div>
              <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
                Responder a: ${email}
              </p>
            </div>
          `,
        });

        console.log('[CALCULATOR INQUIRY] Email enviado exitosamente a:', adminEmail);
      } catch (emailError) {
        console.error('[CALCULATOR INQUIRY] Error al enviar email:', emailError);
      }
    }

    res.status(200).json({
      message: 'Consulta recibida exitosamente',
      data: { id: calculatorInquiry.id, name, email, poolName },
    });
  } catch (error) {
    console.error('Error en consulta de calculador:', error);
    res.status(500).json({ error: 'Error al procesar la consulta' });
  }
};
