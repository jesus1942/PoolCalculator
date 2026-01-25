import axios from 'axios';
import * as cheerio from 'cheerio';
import prisma from '../config/database';
import path from 'path';
import { storeImageBuffer } from '../utils/imageStorage';
import { createHash } from 'crypto';

interface ScrapedPool {
  name: string;
  length: number;
  width: number;
  depth: number;
  description?: string;
  imageUrl?: string;
  shape?: string;
}

interface ScrapingJob {
  jobId: string;
  url: string;
  vendorName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  poolsFound: number;
  pools?: ScrapedPool[];
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

// Almacenamiento en memoria de trabajos (en producción usar Redis o BD)
const jobs: Map<string, ScrapingJob> = new Map();

export const catalogScraperService = {
  /**
   * Realiza scraping de una URL
   */
  async scrapeFromUrl(
    url: string,
    vendorName: string,
    catalogType: string,
    jobId: string
  ): Promise<{ poolsFound: number; pools: ScrapedPool[] }> {
    // Registrar trabajo
    jobs.set(jobId, {
      jobId,
      url,
      vendorName,
      status: 'processing',
      poolsFound: 0,
      startedAt: new Date()
    });

    try {
      console.log(`[Scraper] Descargando contenido de: ${url}`);

      // Descargar el contenido
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 30000
      });

      const contentType = response.headers['content-type'] || '';
      let pools: ScrapedPool[] = [];

      if (contentType.includes('text/html')) {
        // Es HTML, usar cheerio para parsear
        pools = this.parseHtmlContent(response.data, vendorName, url);
      } else if (contentType.includes('application/pdf')) {
        // Es PDF, necesitaría procesamiento especial
        throw new Error('El scraping de PDFs desde URL aún no está implementado. Por favor descarga el PDF y usa la función de carga manual.');
      } else {
        // Intentar parsear como texto plano
        pools = this.parseTextContent(response.data, vendorName);
      }

      console.log(`[Scraper] Scraping completado: ${pools.length} modelos encontrados`);

      // Descargar imágenes localmente
      console.log(`[Scraper] Descargando imágenes...`);
      pools = await this.downloadPoolImages(pools, vendorName);
      console.log(`[Scraper] Imágenes procesadas`);

      // Actualizar trabajo con los pools encontrados
      jobs.set(jobId, {
        ...jobs.get(jobId)!,
        status: 'completed',
        poolsFound: pools.length,
        pools: pools,
        completedAt: new Date()
      });

      return {
        poolsFound: pools.length,
        pools
      };
    } catch (error: any) {
      console.error('[Scraper] Error:', error.message);

      // Actualizar trabajo con error
      jobs.set(jobId, {
        ...jobs.get(jobId)!,
        status: 'failed',
        error: error.message,
        completedAt: new Date()
      });

      throw error;
    }
  },

  /**
   * Parsea contenido HTML usando cheerio
   */
  parseHtmlContent(html: string, vendorName: string, baseUrl: string = ''): ScrapedPool[] {
    const $ = cheerio.load(html);
    const pools: ScrapedPool[] = [];

    // Patrón mejorado que acepta espacios opcionales alrededor de 'x'
    const dimensionPattern = /(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)/;

    // Estrategia 1: Buscar imágenes con alt text que contenga dimensiones (muy común en e-commerce)
    $('img').each((_, element) => {
      const $img = $(element);
      const alt = $img.attr('alt') || '';
      const dimensionMatch = alt.match(dimensionPattern);

      if (dimensionMatch) {
        // Extraer nombre del alt
        let name = alt.trim();

        // Si el nombre está duplicado (ej: "Piscina X Piscina X"), quedarnos con la primera mitad
        // Buscar un separador (espacio doble, punto, etc) en la mitad
        const halfLength = Math.floor(name.length / 2);
        const firstHalf = name.substring(0, halfLength).trim();
        const secondHalf = name.substring(halfLength).trim();

        // Si ambas mitades son muy similares, usar solo la primera
        if (firstHalf.toLowerCase() === secondHalf.toLowerCase() ||
            secondHalf.startsWith(firstHalf) ||
            name.includes('. ' + firstHalf)) {
          name = firstHalf;
        }

        // Obtener URL de la imagen
        let imageUrl = $img.attr('src') || $img.attr('data-src');

        // Normalizar URL de imagen
        if (imageUrl) {
          // Si empieza con //, agregarle https:
          if (imageUrl.startsWith('//')) {
            imageUrl = 'https:' + imageUrl;
          } else {
            imageUrl = this.normalizeImageUrl(imageUrl, baseUrl);
          }
        }

        pools.push({
          name,
          length: parseFloat(dimensionMatch[1]),
          width: parseFloat(dimensionMatch[2]),
          depth: parseFloat(dimensionMatch[3]),
          description: name,
          imageUrl: imageUrl || undefined,
          shape: this.inferShape(name)
        });
      }
    });

    // Estrategia 2: Buscar en enlaces de productos (común en e-commerce)
    $('a').each((_, element) => {
      const $el = $(element);
      const text = $el.text();
      const dimensionMatch = text.match(dimensionPattern);

      if (dimensionMatch) {
        // Extraer nombre limpio
        let name = text.trim();

        // Si el texto es muy largo, intentar extraer solo la parte relevante
        if (name.length > 100) {
          const parts = name.split('\n');
          name = parts[0].trim();
        }

        // Buscar imagen dentro del enlace, en el padre, o en hermanos
        let imageUrl = $el.find('img').first().attr('src') ||
                       $el.find('img').first().attr('data-src') ||
                       $el.parent().find('img').first().attr('src') ||
                       $el.parent().find('img').first().attr('data-src') ||
                       $el.prev('img').attr('src') ||
                       $el.next('img').attr('src');

        // Si encontramos imagen, normalizarla
        if (imageUrl) {
          if (imageUrl.startsWith('//')) {
            imageUrl = 'https:' + imageUrl;
          } else {
            imageUrl = this.normalizeImageUrl(imageUrl, baseUrl);
          }
        }

        pools.push({
          name,
          length: parseFloat(dimensionMatch[1]),
          width: parseFloat(dimensionMatch[2]),
          depth: parseFloat(dimensionMatch[3]),
          description: text.substring(0, 500).trim(),
          imageUrl: imageUrl || undefined,
          shape: this.inferShape(text)
        });
      }
    });

    // Estrategia 2: Buscar en elementos comunes de productos
    $('table tr, .product-item, .pool-model, article, .product, .item').each((_, element) => {
      const $el = $(element);
      const text = $el.text();
      const dimensionMatch = text.match(dimensionPattern);

      if (dimensionMatch) {
        const name = $el.find('h1, h2, h3, h4, .title, .name').first().text().trim() ||
                     text.split('\n')[0].trim() ||
                     `Piscina ${dimensionMatch[1]}x${dimensionMatch[2]}x${dimensionMatch[3]}`;

        let imageUrl = $el.find('img').first().attr('src') ||
                       $el.find('img').first().attr('data-src');

        if (imageUrl) {
          imageUrl = this.normalizeImageUrl(imageUrl, baseUrl);
        }

        pools.push({
          name,
          length: parseFloat(dimensionMatch[1]),
          width: parseFloat(dimensionMatch[2]),
          depth: parseFloat(dimensionMatch[3]),
          description: text.substring(0, 500).trim(),
          imageUrl: imageUrl || undefined,
          shape: this.inferShape(text)
        });
      }
    });

    // Estrategia 3: Buscar en listas
    $('ul li, ol li').each((_, element) => {
      const $el = $(element);
      const text = $el.text();
      const dimensionMatch = text.match(dimensionPattern);

      if (dimensionMatch) {
        pools.push({
          name: text.split(/\d/)[0].trim() || `Modelo ${dimensionMatch[1]}x${dimensionMatch[2]}`,
          length: parseFloat(dimensionMatch[1]),
          width: parseFloat(dimensionMatch[2]),
          depth: parseFloat(dimensionMatch[3]),
          description: text,
          shape: this.inferShape(text)
        });
      }
    });

    console.log(`[Parser] HTML parseado: ${pools.length} modelos encontrados`);
    return this.deduplicatePools(pools);
  },

  /**
   * Parsea contenido de texto plano
   */
  parseTextContent(text: string, vendorName: string): ScrapedPool[] {
    const pools: ScrapedPool[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      // Buscar patrones de dimensiones
      const dimensionMatch = line.match(/(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)/);

      if (dimensionMatch) {
        const namePart = line.split(/\d/)[0].trim();
        const name = namePart || `Modelo ${dimensionMatch[1]}x${dimensionMatch[2]}`;

        pools.push({
          name,
          length: parseFloat(dimensionMatch[1]),
          width: parseFloat(dimensionMatch[2]),
          depth: parseFloat(dimensionMatch[3]),
          description: line.substring(0, 500),
          shape: this.inferShape(line)
        });
      }
    }

    console.log(`[Parser] Texto parseado: ${pools.length} modelos encontrados`);
    return this.deduplicatePools(pools);
  },

  /**
   * Parsea contenido manual (para cuando el usuario copia y pega)
   */
  async parseContent(
    content: string,
    vendorName: string,
    contentType: 'html' | 'text'
  ): Promise<{ pools: ScrapedPool[]; warnings: string[] }> {
    const warnings: string[] = [];
    let pools: ScrapedPool[] = [];

    try {
      if (contentType === 'html') {
        pools = this.parseHtmlContent(content, vendorName);
      } else {
        pools = this.parseTextContent(content, vendorName);
      }

      if (pools.length === 0) {
        warnings.push('No se encontraron modelos de piscinas en el contenido');
      }

      return { pools, warnings };
    } catch (error: any) {
      warnings.push(`Error al parsear contenido: ${error.message}`);
      return { pools: [], warnings };
    }
  },

  /**
   * Guarda los modelos en la base de datos
   */
  async savePools(
    pools: ScrapedPool[],
    vendorName: string,
    userId: string,
    replaceExisting: boolean = false
  ): Promise<{ created: number; updated: number; skipped: number }> {
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const pool of pools) {
      try {
        // Validar datos mínimos
        if (!pool.name || !pool.length || !pool.width || !pool.depth) {
          skipped++;
          continue;
        }

        // Buscar si ya existe
        const existing = await prisma.poolPreset.findFirst({
          where: {
            name: pool.name,
            length: pool.length,
            width: pool.width,
            depth: pool.depth
          }
        });

        if (existing && !replaceExisting) {
          skipped++;
          continue;
        }

        const poolData = {
          name: pool.name,
          description: pool.description || `Piscina ${pool.length}x${pool.width}x${pool.depth}m`,
          length: pool.length,
          width: pool.width,
          depth: pool.depth,
          shape: (pool.shape?.toUpperCase() as any) || 'RECTANGULAR',
          imageUrl: pool.imageUrl,
          vendor: vendorName,
          userId,
          // Valores por defecto
          hasSkimmer: true,
          skimmerCount: 1,
          hasLighting: false,
          lightingCount: 0,
          hasBottomDrain: false,
          hasHotWaterReturn: false,
          hasVacuumIntake: true,
          vacuumIntakeCount: 1,
          hasHydroJets: false,
          hydroJetsCount: 0,
          returnsCount: 2
        };

        if (existing) {
          await prisma.poolPreset.update({
            where: { id: existing.id },
            data: poolData
          });
          updated++;
        } else {
          await prisma.poolPreset.create({
            data: poolData
          });
          created++;
        }
      } catch (error) {
        console.error(`Error al guardar pool ${pool.name}:`, error);
        skipped++;
      }
    }

    return { created, updated, skipped };
  },

  /**
   * Obtiene el estado de un trabajo
   */
  async getJobStatus(jobId: string): Promise<ScrapingJob | null> {
    return jobs.get(jobId) || null;
  },

  /**
   * Lista todos los trabajos
   */
  async listJobs(): Promise<ScrapingJob[]> {
    return Array.from(jobs.values()).sort((a, b) =>
      b.startedAt.getTime() - a.startedAt.getTime()
    );
  },

  /**
   * Deduplica pools por dimensiones
   */
  deduplicatePools(pools: ScrapedPool[]): ScrapedPool[] {
    const unique = new Map<string, ScrapedPool>();

    for (const pool of pools) {
      const key = `${pool.length}x${pool.width}x${pool.depth}`;
      if (!unique.has(key)) {
        unique.set(key, pool);
      }
    }

    return Array.from(unique.values());
  },

  /**
   * Infiere la forma de la piscina del texto
   */
  inferShape(text: string): string {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('redonda') || lowerText.includes('circular')) {
      return 'CIRCULAR';
    }
    if (lowerText.includes('oval') || lowerText.includes('ovalada')) {
      return 'OVAL';
    }
    if (lowerText.includes('riñon') || lowerText.includes('kidney')) {
      return 'KIDNEY';
    }
    if (lowerText.includes('rectangular') || lowerText.includes('rect')) {
      return 'RECTANGULAR';
    }

    return 'RECTANGULAR'; // Por defecto
  },

  /**
   * Normaliza URLs de imágenes relativas
   */
  normalizeImageUrl(imageUrl: string, baseUrl: string): string {
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }

    try {
      const base = new URL(baseUrl);
      return new URL(imageUrl, base.origin).href;
    } catch {
      return imageUrl;
    }
  },

  /**
   * Descarga una imagen desde una URL externa y la guarda localmente
   */
  async downloadImage(imageUrl: string, vendorName: string): Promise<string | null> {
    try {
      // Crear hash del URL para nombre de archivo único
      const hash = createHash('md5').update(imageUrl).digest('hex');
      const ext = path.extname(new URL(imageUrl).pathname) || '.jpg';
      const filename = `${vendorName.toLowerCase()}-${hash}${ext}`;

      console.log(`⬇️  Descargando imagen: ${imageUrl}`);

      // Descargar la imagen
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': imageUrl.includes('akesse') ? 'https://akesse.com.uy/' : undefined
        },
        timeout: 15000
      });

      const storedUrl = await storeImageBuffer(
        Buffer.from(response.data),
        filename,
        {
          folder: `catalog/${vendorName.toLowerCase()}`,
          localDir: '',
          filenamePrefix: vendorName.toLowerCase(),
        }
      );
      console.log(`✅ Imagen guardada: ${storedUrl}`);

      return storedUrl;
    } catch (error: any) {
      console.error(`❌ Error al descargar imagen ${imageUrl}:`, error.message);
      return null;
    }
  },

  /**
   * Descarga las imágenes de todos los pools y actualiza las URLs
   */
  async downloadPoolImages(pools: ScrapedPool[], vendorName: string): Promise<ScrapedPool[]> {
    const poolsWithLocalImages: ScrapedPool[] = [];

    for (const pool of pools) {
      if (pool.imageUrl && pool.imageUrl.startsWith('http')) {
        const localImageUrl = await this.downloadImage(pool.imageUrl, vendorName);
        poolsWithLocalImages.push({
          ...pool,
          imageUrl: localImageUrl || pool.imageUrl
        });
      } else {
        poolsWithLocalImages.push(pool);
      }
    }

    return poolsWithLocalImages;
  }
};
