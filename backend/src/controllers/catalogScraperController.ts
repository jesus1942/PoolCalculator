import { Request, Response } from 'express';
import { catalogScraperService } from '../services/catalogScraperService';

export const catalogScraperController = {
  /**
   * Inicia un scraping desde una URL
   */
  async scrapeFromUrl(req: Request, res: Response) {
    try {
      const { url, vendorName, catalogType = 'pools' } = req.body;

      if (!url || !vendorName) {
        return res.status(400).json({
          error: 'Se requiere URL y nombre del fabricante'
        });
      }

      // Validar URL
      try {
        new URL(url);
      } catch {
        return res.status(400).json({
          error: 'URL inválida'
        });
      }

      console.log(`[Catalog Scraper] Iniciando scraping de: ${url}`);

      // Iniciar scraping en segundo plano
      const jobId = `scrape-${Date.now()}`;

      // Ejecutar en segundo plano
      catalogScraperService.scrapeFromUrl(url, vendorName, catalogType, jobId)
        .then(result => {
          console.log(`[Catalog Scraper] Job ${jobId} completado: ${result.poolsFound} modelos encontrados`);
        })
        .catch(error => {
          console.error(`[Catalog Scraper] Job ${jobId} falló:`, error);
        });

      res.json({
        success: true,
        message: 'Scraping iniciado',
        jobId,
        status: 'processing'
      });
    } catch (error: any) {
      console.error('Error en scrapeFromUrl:', error);
      res.status(500).json({
        error: 'Error al iniciar scraping',
        details: error.message
      });
    }
  },

  /**
   * Obtiene el estado de un trabajo de scraping
   */
  async getScrapingStatus(req: Request, res: Response) {
    try {
      const { jobId } = req.params;
      const status = await catalogScraperService.getJobStatus(jobId);

      if (!status) {
        return res.status(404).json({
          error: 'Trabajo no encontrado'
        });
      }

      res.json(status);
    } catch (error: any) {
      console.error('Error en getScrapingStatus:', error);
      res.status(500).json({
        error: 'Error al obtener estado',
        details: error.message
      });
    }
  },

  /**
   * Lista todos los trabajos de scraping
   */
  async listScrapingJobs(req: Request, res: Response) {
    try {
      const jobs = await catalogScraperService.listJobs();
      res.json(jobs);
    } catch (error: any) {
      console.error('Error en listScrapingJobs:', error);
      res.status(500).json({
        error: 'Error al listar trabajos',
        details: error.message
      });
    }
  },

  /**
   * Parsea texto/HTML extraído manualmente
   */
  async parseManualContent(req: Request, res: Response) {
    try {
      const { content, vendorName, contentType = 'html' } = req.body;

      if (!content || !vendorName) {
        return res.status(400).json({
          error: 'Se requiere contenido y nombre del fabricante'
        });
      }

      const result = await catalogScraperService.parseContent(content, vendorName, contentType);

      res.json({
        success: true,
        poolsFound: result.pools.length,
        pools: result.pools,
        warnings: result.warnings
      });
    } catch (error: any) {
      console.error('Error en parseManualContent:', error);
      res.status(500).json({
        error: 'Error al parsear contenido',
        details: error.message
      });
    }
  },

  /**
   * Guarda los modelos parseados en la base de datos
   */
  async saveScrapedModels(req: any, res: Response) {
    try {
      const { pools, vendorName, replaceExisting = false } = req.body;
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        return res.status(401).json({
          error: 'Usuario no autenticado'
        });
      }

      if (!pools || !Array.isArray(pools) || pools.length === 0) {
        return res.status(400).json({
          error: 'Se requiere un array de modelos de piscinas'
        });
      }

      const result = await catalogScraperService.savePools(pools, vendorName, userId, replaceExisting);

      res.json({
        success: true,
        message: `${result.created} modelos creados, ${result.updated} actualizados`,
        stats: result
      });
    } catch (error: any) {
      console.error('Error en saveScrapedModels:', error);
      res.status(500).json({
        error: 'Error al guardar modelos',
        details: error.message
      });
    }
  }
};
