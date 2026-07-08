import axios from 'axios';
import * as cheerio from 'cheerio';

// Resultados de Quini 6 y Loto Plus para la pestaña privada del superadmin.
// Se scrapean fuentes públicas con parsers tolerantes y fallback entre fuentes:
// si una página cambia de formato o no responde, se intenta la siguiente.

export type ModalidadResultado = {
  nombre: string;
  numeros: number[];
};

export type ResultadoJuego = {
  ok: boolean;
  juego: 'QUINI6' | 'LOTO';
  fuente?: string;
  sorteo?: string | null;
  fecha?: string | null;
  modalidades?: ModalidadResultado[];
  error?: string;
};

type Fuente = {
  url: string;
  nombre: string;
};

const QUINI_FUENTES: Fuente[] = [
  { url: 'https://www.nacionalloteria.com/argentina/quini6.php', nombre: 'nacionalloteria.com' },
  { url: 'https://www.tujugada.com.ar/quini6.php', nombre: 'tujugada.com.ar' },
  { url: 'https://quini-6-resultados.com.ar/', nombre: 'quini-6-resultados.com.ar' },
];

const LOTO_FUENTES: Fuente[] = [
  { url: 'https://www.nacionalloteria.com/argentina/loto.php', nombre: 'nacionalloteria.com' },
  { url: 'https://www.tujugada.com.ar/loto.php', nombre: 'tujugada.com.ar' },
];

// Modalidades y cantidad de números esperados por juego.
const QUINI_MODALIDADES: Array<{ etiquetas: string[]; nombre: string; cantidad: number; max: number }> = [
  { etiquetas: ['tradicional', 'primer sorteo'], nombre: 'Tradicional', cantidad: 6, max: 45 },
  { etiquetas: ['la segunda', 'segunda del quini', 'segunda vuelta', 'segunda'], nombre: 'La Segunda', cantidad: 6, max: 45 },
  { etiquetas: ['revancha'], nombre: 'Revancha', cantidad: 6, max: 45 },
  { etiquetas: ['siempre sale', 'siempresale'], nombre: 'Siempre Sale', cantidad: 6, max: 45 },
  { etiquetas: ['pozo extra'], nombre: 'Pozo Extra', cantidad: 18, max: 45 },
];

const LOTO_MODALIDADES: Array<{ etiquetas: string[]; nombre: string; cantidad: number; max: number }> = [
  { etiquetas: ['tradicional'], nombre: 'Tradicional + Jackpot', cantidad: 8, max: 41 },
  { etiquetas: ['desquite'], nombre: 'Desquite + Jackpot', cantidad: 8, max: 41 },
  { etiquetas: ['sale o sale', 'salcosale', 'sale-o-sale'], nombre: 'Sale o Sale + Jackpot', cantidad: 8, max: 41 },
];

const fetchTexto = async (url: string): Promise<string> => {
  const response = await axios.get(url, {
    timeout: 12000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36',
      'Accept-Language': 'es-AR,es;q=0.9',
    },
    responseType: 'text',
    // Algunas de estas páginas devuelven 4xx con contenido útil igual.
    validateStatus: (status) => status >= 200 && status < 500,
  });

  const $ = cheerio.load(String(response.data || ''));
  $('script, style, noscript').remove();
  // Texto plano normalizado: los números quedan separados por espacios.
  return $('body').text().replace(/\s+/g, ' ').trim();
};

// Busca la etiqueta de la modalidad y toma los primeros N números válidos que
// aparezcan a continuación (ignorando fechas, años y montos de pozo).
const extraerNumeros = (texto: string, etiquetas: string[], cantidad: number, max: number): number[] | null => {
  const lower = texto.toLowerCase();
  for (const etiqueta of etiquetas) {
    let desde = 0;
    while (true) {
      const idx = lower.indexOf(etiqueta, desde);
      if (idx === -1) break;
      desde = idx + etiqueta.length;

      const ventana = texto.slice(idx + etiqueta.length, idx + etiqueta.length + 600);
      const crudos = ventana.match(/\d+(?:[.,]\d+)?/g) || [];
      const numeros: number[] = [];
      for (const crudo of crudos) {
        // Montos ($ 1.530.000.000) y años (2026) quedan afuera.
        if (crudo.includes('.') || crudo.includes(',')) continue;
        if (crudo.length > 2) continue;
        const valor = Number(crudo);
        if (!Number.isInteger(valor) || valor < 0 || valor > max) continue;
        numeros.push(valor);
        if (numeros.length === cantidad) return numeros;
      }
      // Esta aparición de la etiqueta no juntó suficientes números: probar la
      // próxima aparición (los sitios suelen repetir la palabra en menús).
    }
  }
  return null;
};

const extraerFecha = (texto: string): string | null => {
  const numerica = texto.match(/\b([0-3]?\d[\/-][01]?\d[\/-](?:20)?\d{2})\b/);
  if (numerica) return numerica[1];
  const escrita = texto.match(
    /\b([0-3]?\d\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s+de\s+\d{4})?)\b/i,
  );
  return escrita ? escrita[1] : null;
};

const extraerSorteo = (texto: string): string | null => {
  const match = texto.match(/sorteo\s*(?:n[°ºro.]*\s*)?(\d{3,5})/i);
  return match ? match[1] : null;
};

const obtenerJuego = async (
  juego: 'QUINI6' | 'LOTO',
  fuentes: Fuente[],
  modalidades: Array<{ etiquetas: string[]; nombre: string; cantidad: number; max: number }>,
): Promise<ResultadoJuego> => {
  let ultimoError = 'Sin fuentes disponibles';

  for (const fuente of fuentes) {
    try {
      const texto = await fetchTexto(fuente.url);
      const resultados: ModalidadResultado[] = [];

      for (const modalidad of modalidades) {
        const numeros = extraerNumeros(texto, modalidad.etiquetas, modalidad.cantidad, modalidad.max);
        if (numeros) {
          resultados.push({ nombre: modalidad.nombre, numeros });
        }
      }

      // Con al menos la modalidad principal parseada damos por buena la fuente.
      if (resultados.length > 0) {
        return {
          ok: true,
          juego,
          fuente: fuente.nombre,
          sorteo: extraerSorteo(texto),
          fecha: extraerFecha(texto),
          modalidades: resultados,
        };
      }

      ultimoError = `No se pudieron leer los números en ${fuente.nombre}`;
    } catch (error: any) {
      ultimoError = `${fuente.nombre}: ${error?.message || 'error de red'}`;
    }
  }

  return { ok: false, juego, error: ultimoError };
};

type CacheEntry = {
  data: { quini6: ResultadoJuego; loto: ResultadoJuego; actualizado: string };
  expiraEn: number;
};

let cache: CacheEntry | null = null;
const CACHE_MS = 10 * 60 * 1000;

export const obtenerUltimosSorteos = async (forzar = false) => {
  if (!forzar && cache && cache.expiraEn > Date.now()) {
    return cache.data;
  }

  const [quini6, loto] = await Promise.all([
    obtenerJuego('QUINI6', QUINI_FUENTES, QUINI_MODALIDADES),
    obtenerJuego('LOTO', LOTO_FUENTES, LOTO_MODALIDADES),
  ]);

  const data = { quini6, loto, actualizado: new Date().toISOString() };

  // Solo cachear si al menos un juego salió bien; un fallo total se reintenta.
  if (quini6.ok || loto.ok) {
    cache = { data, expiraEn: Date.now() + CACHE_MS };
  }

  return data;
};
