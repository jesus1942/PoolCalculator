import { Router, Request, Response } from 'express';
import axios from 'axios';
import { authenticate } from '../middleware/auth';
import { isSuperAdmin } from '../middleware/permissions';
import { createConfiguredMailer } from '../utils/mailer';
import { getIntegrationAdminView, getIntegrationConfig, saveIntegrationConfig, integrationReadiness, IntegrationError } from '../services/platformIntegrationService';

const router = Router();
function integrationFailure(res: Response, error: unknown) {
  return res.status(error instanceof IntegrationError ? error.status : 503).json({ error: error instanceof IntegrationError ? error.message : 'No se pudo acceder a la configuración de integraciones.' });
}

/** Publica únicamente la disponibilidad del login y el enlace de contacto. */
export async function publicIntegrations(_req: Request, res: Response) {
  try {
    const config = await getIntegrationConfig();
    const ready = integrationReadiness(config);
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ googleEnabled: config.google.enabled && ready.google, whatsappUrl: config.whatsapp.enabled && config.whatsapp.phoneNumber ? `https://wa.me/${config.whatsapp.phoneNumber}` : null });
  } catch { return res.json({ googleEnabled: false, whatsappUrl: null }); }
}

router.use(authenticate, isSuperAdmin);
router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
router.get('/', async (_req, res) => {
  try { return res.json(await getIntegrationAdminView()); }
  catch (error) { return integrationFailure(res, error); }
});
router.put('/', async (req, res) => {
  try { return res.json(await saveIntegrationConfig(req.body?.config, req.body?.revision)); }
  catch (error) { return integrationFailure(res, error); }
});

/** Verifica credenciales sin enviar correos ni mensajes a personas. */
router.post('/verify/:provider', async (req, res) => {
  try {
    const config = await getIntegrationConfig();
    const provider = req.params.provider;
    const options = { timeout: 10000, maxRedirects: 0, maxContentLength: 256000 };
    if (provider === 'smtp') {
      const mailer = await createConfiguredMailer();
      if (!mailer) throw new IntegrationError('Guarda y habilita SMTP antes de comprobar la conexión.');
      await mailer.transport.verify();
    } else if (provider === 'telegram') {
      if (!config.telegram.enabled || !integrationReadiness(config).telegram) throw new IntegrationError('Completa y habilita Telegram.');
      const token = config.telegram.botToken;
      const identity = await axios.get(`https://api.telegram.org/bot${token}/getMe`, options);
      if (identity.data?.ok !== true) throw new Error('provider');
      const chat = await axios.get(`https://api.telegram.org/bot${token}/getChat`, { ...options, params: { chat_id: config.telegram.chatId } });
      if (chat.data?.ok !== true) throw new Error('provider');
    } else if (provider === 'whatsapp') {
      if (!config.whatsapp.enabled || !integrationReadiness(config).whatsapp) throw new IntegrationError('Completa y habilita WhatsApp.');
      if (config.whatsapp.mode === 'link') return res.json({ ok: true, message: 'Enlace de contacto configurado. Este modo abre WhatsApp; no envía mensajes automáticamente.' });
      await axios.get(`https://graph.facebook.com/${config.whatsapp.apiVersion}/${config.whatsapp.phoneNumberId}`, { ...options, headers: { Authorization: `Bearer ${config.whatsapp.accessToken}` }, params: { fields: 'id,display_phone_number' } });
    } else throw new IntegrationError('Proveedor no admitido.');
    return res.json({ ok: true, message: 'Conexión verificada. No se enviaron mensajes.' });
  } catch (error) {
    if (error instanceof IntegrationError) return integrationFailure(res, error);
    return res.status(502).json({ error: 'El proveedor rechazó la conexión o no respondió. Revisa las credenciales, permisos y acceso de red.' });
  }
});
export default router;
