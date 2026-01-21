import { Router } from 'express';
import {
  submitContactForm,
  submitQuoteRequest,
  submitCalculatorInquiry,
} from '../controllers/publicContactController';

const router = Router();

// Rutas públicas (sin autenticación)
router.post('/contact', submitContactForm);
router.post('/quote-requests', submitQuoteRequest);
router.post('/calculator-inquiry', submitCalculatorInquiry);

export default router;
