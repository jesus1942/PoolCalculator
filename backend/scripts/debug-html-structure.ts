import axios from 'axios';
import * as cheerio from 'cheerio';

async function debugHtmlStructure() {
  console.log('🔍 Analizando estructura HTML de Akesse...\n');

  try {
    const response = await axios.get('https://akesse.com.uy/piscinas', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    console.log('📸 Buscando todas las imágenes en la página...\n');
    let imageCount = 0;

    $('img').each((index, element) => {
      const $img = $(element);
      const src = $img.attr('src') || $img.attr('data-src');
      const alt = $img.attr('alt') || '';

      // Solo mostrar imágenes que parezcan ser de productos (las primeras 10)
      if (src && imageCount < 10) {
        console.log(`Imagen ${imageCount + 1}:`);
        console.log(`  src: ${src}`);
        console.log(`  alt: ${alt}`);

        // Mostrar el contexto (el elemento padre)
        const parent = $img.parent();
        console.log(`  parent tag: <${parent.prop('tagName')?.toLowerCase()}>`);
        console.log(`  parent class: ${parent.attr('class') || 'sin clase'}`);
        console.log('');

        imageCount++;
      }
    });

    console.log(`\n📊 Total de imágenes encontradas: ${$('img').length}`);

    // Buscar enlaces que contengan dimensiones
    console.log('\n🔗 Analizando enlaces con dimensiones...\n');
    const dimensionPattern = /(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)/;
    let linkCount = 0;

    $('a').each((_, element) => {
      const $el = $(element);
      const text = $el.text();

      if (text.match(dimensionPattern) && linkCount < 3) {
        console.log(`Enlace ${linkCount + 1}:`);
        console.log(`  Texto: ${text.substring(0, 80)}...`);
        console.log(`  Tiene img dentro: ${$el.find('img').length > 0 ? 'SÍ' : 'NO'}`);
        console.log(`  Img en parent: ${$el.parent().find('img').length > 0 ? 'SÍ' : 'NO'}`);

        // Buscar img en diferentes niveles
        const closestImg = $el.closest('*').find('img').first();
        if (closestImg.length) {
          console.log(`  Img más cercana: ${closestImg.attr('src')?.substring(0, 60)}...`);
        }
        console.log('');
        linkCount++;
      }
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

debugHtmlStructure();
