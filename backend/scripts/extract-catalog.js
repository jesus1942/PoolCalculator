const fs = require('fs');
const path = require('path');
const PDFParser = require('pdf2json');

async function extractTextFromPDF(pdfPath) {
  console.log(`📖 Procesando PDF: ${pdfPath}`);

  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on('pdfParser_dataError', errData => reject(errData.parserError));

    pdfParser.on('pdfParser_dataReady', pdfData => {
      const pageCount = pdfData.Pages.length;
      console.log(`📄 Total de páginas: ${pageCount}`);

      // Extraer todo el texto
      let text = '';
      pdfData.Pages.forEach(page => {
        page.Texts.forEach(textItem => {
          textItem.R.forEach(r => {
            text += decodeURIComponent(r.T) + ' ';
          });
        });
        text += '\n';
      });

      console.log(`📝 Texto extraído (primeros 200 caracteres): ${text.substring(0, 200)}...`);

      resolve({
        text,
        pageCount
      });
    });

    pdfParser.loadPDF(pdfPath);
  });
}

async function parsePoolModels(text) {
  const models = [];

  // Patrones comunes en catálogos de piscinas
  // Ejemplo: "MODELO ABC 8x4x1.5" o "8.00 x 4.00 x 1.50"
  const dimensionPatterns = [
    /(\w+[\s\w]*?)\s*[-:]?\s*(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)/g,
    /MODELO\s+([A-Z0-9\s]+)/gi,
    /(\d+\.?\d*)\s*m\s*[xX×]\s*(\d+\.?\d*)\s*m\s*[xX×]\s*(\d+\.?\d*)\s*m/g
  ];

  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Buscar dimensiones
    for (const pattern of dimensionPatterns) {
      pattern.lastIndex = 0; // Reset regex
      const match = pattern.exec(line);

      if (match) {
        let model = {
          name: '',
          length: 0,
          width: 0,
          depth: 0,
          description: line,
          source: 'catalogo-piletas-acquam'
        };

        if (match.length === 5) {
          // Formato: MODELO nombre largo x ancho x profundo
          model.name = match[1].trim();
          model.length = parseFloat(match[2]);
          model.width = parseFloat(match[3]);
          model.depth = parseFloat(match[4]);
        } else if (match.length === 4) {
          // Formato: largo x ancho x profundo
          model.name = `Piscina ${match[1]}x${match[2]}x${match[3]}`;
          model.length = parseFloat(match[1]);
          model.width = parseFloat(match[2]);
          model.depth = parseFloat(match[3]);
        }

        if (model.length > 0 && model.width > 0 && model.depth > 0) {
          // Buscar descripción adicional en líneas cercanas
          const contextLines = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3));
          model.description = contextLines.join(' ').substring(0, 500);

          models.push(model);
        }
      }
    }
  }

  console.log(`🔍 Modelos encontrados: ${models.length}`);
  return models;
}

async function main() {
  const assetsDir = path.join(__dirname, '../../assets');
  const outputDir = path.join(__dirname, '../public/pool-images');

  // Asegurar que el directorio de salida existe
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Buscar todos los PDFs en assets
  const files = fs.readdirSync(assetsDir);
  const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));

  console.log(`📁 PDFs encontrados: ${pdfFiles.length}`);

  const allModels = [];

  for (const pdfFile of pdfFiles) {
    const pdfPath = path.join(assetsDir, pdfFile);

    try {
      const { text } = await extractTextFromPDF(pdfPath);

      // Parsear modelos del texto
      const models = await parsePoolModels(text);

      // Agregar información del fabricante basado en el nombre del archivo
      const vendor = pdfFile
        .replace('catalogo-piletas-', '')
        .replace('.pdf', '')
        .replace(/-/g, ' ')
        .toUpperCase();

      models.forEach(model => {
        model.vendor = vendor;
      });

      allModels.push(...models);

      console.log(`✅ Procesado: ${pdfFile} - ${models.length} modelos`);
    } catch (error) {
      console.error(`❌ Error procesando ${pdfFile}:`, error.message);
    }
  }

  // Guardar los modelos extraídos en un JSON
  const outputPath = path.join(__dirname, 'extracted-pools.json');
  fs.writeFileSync(outputPath, JSON.stringify(allModels, null, 2));

  console.log(`\n📊 Resumen:`);
  console.log(`   Total modelos extraídos: ${allModels.length}`);
  console.log(`   Archivo generado: ${outputPath}`);

  return allModels;
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Proceso completado');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { extractTextFromPDF, parsePoolModels };
