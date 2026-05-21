import express from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate } from '../middleware/auth';
import {
  listAgendaEvents,
  getAgendaEventById,
  createAgendaEvent,
  updateAgendaEvent,
  deleteAgendaEvent,
  listAgendaChecklist,
  addAgendaChecklistItem,
  updateAgendaChecklistItem,
  deleteAgendaChecklistItem,
  listAgendaReminders,
  snoozeAgendaReminder,
  dismissAgendaReminder,
  getAgendaPushPublicKey,
  saveAgendaPushSubscription,
  deleteAgendaPushSubscription,
  listAgendaMessages,
  addAgendaMessage,
} from '../controllers/agendaController';

const router = express.Router();

router.use(authenticate);

const agendaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif, webp)'));
  },
});

const handleAgendaUpload: express.RequestHandler = (req, res, next) => {
  agendaUpload.array('images', 6)(req, res, (error: any) => {
    if (!error) return next();

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Cada imagen debe pesar menos de 12 MB.' });
    }

    return res.status(400).json({
      error: error?.message || 'No se pudieron procesar las imágenes adjuntas.',
    });
  });
};

router.get('/', listAgendaEvents);
router.get('/reminders', listAgendaReminders);
router.get('/push/public-key', getAgendaPushPublicKey);
router.post('/push/subscription', saveAgendaPushSubscription);
router.delete('/push/subscription', deleteAgendaPushSubscription);
router.post('/reminders/:id/snooze', snoozeAgendaReminder);
router.post('/reminders/:id/dismiss', dismissAgendaReminder);
router.get('/:id', getAgendaEventById);
router.post('/', createAgendaEvent);
router.put('/:id', updateAgendaEvent);
router.delete('/:id', deleteAgendaEvent);
router.get('/:id/checklist', listAgendaChecklist);
router.post('/:id/checklist', addAgendaChecklistItem);
router.patch('/:id/checklist/:itemId', updateAgendaChecklistItem);
router.delete('/:id/checklist/:itemId', deleteAgendaChecklistItem);
router.get('/:id/messages', listAgendaMessages);
router.post('/:id/messages', handleAgendaUpload, addAgendaMessage);

export default router;
