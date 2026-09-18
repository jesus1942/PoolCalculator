import { Router } from 'express';
import { catalogScraperController } from '../controllers/catalogScraperController';
import { authenticate, isSuperadmin } from '../middleware/auth';

const router = Router();

// El catálogo es global: su importación y sus trabajos pertenecen al proveedor.
router.use(authenticate, isSuperadmin);
router.post('/scrape', catalogScraperController.scrapeFromUrl);
router.get('/jobs', catalogScraperController.listScrapingJobs);
router.get('/jobs/:jobId', catalogScraperController.getScrapingStatus);
router.post('/parse', catalogScraperController.parseManualContent);
router.post('/save', catalogScraperController.saveScrapedModels);

export default router;
