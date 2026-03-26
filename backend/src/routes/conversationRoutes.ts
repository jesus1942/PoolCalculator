import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  addConversationMessage,
  createConversation,
  getConversationById,
  listConversationMessages,
  listConversations,
} from '../controllers/conversationController';

const router = express.Router();

router.use(authenticate);

router.get('/', listConversations);
router.post('/', createConversation);
router.get('/:id', getConversationById);
router.get('/:id/messages', listConversationMessages);
router.post('/:id/messages', addConversationMessage);

export default router;
