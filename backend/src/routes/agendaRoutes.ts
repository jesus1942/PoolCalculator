import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
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
  listAgendaMessages,
  addAgendaMessage,
} from '../controllers/agendaController';

const router = express.Router();

router.use(authenticate);

const agendaStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/agenda');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-');
    cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
  },
});

const agendaUpload = multer({
  storage: agendaStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif, webp)'));
  },
});

router.get('/', listAgendaEvents);
router.get('/reminders', listAgendaReminders);
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
router.post('/:id/messages', agendaUpload.array('images', 6), addAgendaMessage);

export default router;
