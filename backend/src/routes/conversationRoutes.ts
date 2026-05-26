import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import {
  addConversationMessage,
  createConversation,
  getConversationById,
  listConversationMessages,
  listConversations,
} from '../controllers/conversationController';

const router = express.Router();

const chatUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype.startsWith('image/'));
  },
});

const withChatUpload = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  chatUpload.array('images', 8)(req, res, (err: any) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Cada imagen debe pesar menos de 12 MB.' });
    }
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
};

router.use(authenticate);

router.get('/', listConversations);
router.post('/', createConversation);
router.get('/:id', getConversationById);
router.get('/:id/messages', listConversationMessages);
router.post('/:id/messages', withChatUpload, addConversationMessage);

export default router;
