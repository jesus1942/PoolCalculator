import { Router } from 'express';
import { catalogScraperController } from '../controllers/catalogScraperController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Rutas de scraping de catálogos (requieren autenticación)
router.post('/scrape', authenticate, catalogScraperController.scrapeFromUrl);
router.get('/jobs', authenticate, catalogScraperController.listScrapingJobs);
router.get('/jobs/:jobId', authenticate, catalogScraperController.getScrapingStatus);
router.post('/parse', authenticate, catalogScraperController.parseManualContent);
router.post('/save', authenticate, catalogScraperController.saveScrapedModels);

export default router;
