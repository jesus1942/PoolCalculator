import prisma from '../src/config/database';
import { TileType } from '@prisma/client';

async function seedRomanaTiles() {
  console.log('🏛️  Agregando losetas estilo ROMANA y otros estilos...\n');

  const romanaTiles = [
    // ESTILO ROMANA
    {
      name: 'Lomo Ballena Romana 50x40cm',
      type: TileType.ROMANA,
      width: 0.5,
      length: 0.4,
      pricePerUnit: 5800,
      brand: 'Premium',
      description: 'Loseta lomo ballena estilo romana para piscinas. Bordes redondeados y diseño clásico.',
      hasCorner: true,
      cornerPricePerUnit: 6500,
      isForFirstRing: true,
    },
    {
      name: 'Terminación Romana L 30x30cm',
      type: TileType.ROMANA,
      width: 0.3,
      length: 0.3,
      pricePerUnit: 3200,
      brand: 'Premium',
      description: 'Terminación en L estilo romana para primer anillo perimetral.',
      hasCorner: false,
      isForFirstRing: true,
    },
    {
      name: 'Loseta Antideslizante Romana 50x50cm',
      type: TileType.ROMANA,
      width: 0.5,
      length: 0.5,
      pricePerUnit: 4500,
      brand: 'Standard',
      description: 'Loseta antideslizante estilo romana para filas adicionales.',
      hasCorner: false,
      isForFirstRing: false,
    },

    // ESTILO VENECIANA
    {
      name: 'Venecita Mosaico Azul 2x2cm',
      type: TileType.VENECIANA,
      width: 0.02,
      length: 0.02,
      pricePerUnit: 9500,
      brand: 'Mosaicos Premium',
      description: 'Venecitas pequeñas estilo veneciano para decoración perimetral.',
      hasCorner: false,
      isForFirstRing: false,
    },
    {
      name: 'Venecita Mosaico Turquesa 2x2cm',
      type: TileType.VENECIANA,
      width: 0.02,
      length: 0.02,
      pricePerUnit: 10200,
      brand: 'Mosaicos Premium',
      description: 'Venecitas turquesa estilo veneciano de alta calidad.',
      hasCorner: false,
      isForFirstRing: false,
    },

    // ESTILO TROPICAL
    {
      name: 'Lomo Ballena Tropical 50x40cm',
      type: TileType.TROPICAL,
      width: 0.5,
      length: 0.4,
      pricePerUnit: 6200,
      brand: 'Tropical Line',
      description: 'Loseta lomo ballena con diseño tropical y colores vibrantes.',
      hasCorner: true,
      cornerPricePerUnit: 6800,
      isForFirstRing: true,
    },
    {
      name: 'Loseta Símil Madera Tropical 20x120cm',
      type: TileType.TROPICAL,
      width: 0.2,
      length: 1.2,
      pricePerUnit: 5500,
      brand: 'Tropical Line',
      description: 'Loseta símil madera tropical para efecto deck.',
      hasCorner: false,
      isForFirstRing: false,
    },

    // ESTILO CLÁSICA
    {
      name: 'Lomo Ballena Clásica 50x40cm',
      type: TileType.CLASICA,
      width: 0.5,
      length: 0.4,
      pricePerUnit: 5200,
      brand: 'Clásicos',
      description: 'Loseta lomo ballena diseño clásico atemporal.',
      hasCorner: true,
      cornerPricePerUnit: 5800,
      isForFirstRing: true,
    },
    {
      name: 'Terminación L Clásica 30x30cm',
      type: TileType.CLASICA,
      width: 0.3,
      length: 0.3,
      pricePerUnit: 2800,
      brand: 'Clásicos',
      description: 'Terminación en L clásica sin esquineros.',
      hasCorner: false,
      isForFirstRing: true,
    },
    {
      name: 'Loseta Antideslizante Clásica 50x50cm',
      type: TileType.CLASICA,
      width: 0.5,
      length: 0.5,
      pricePerUnit: 3800,
      brand: 'Clásicos',
      description: 'Loseta antideslizante clásica color beige/gris.',
      hasCorner: false,
      isForFirstRing: false,
    },

    // ESTILO MODERNA
    {
      name: 'Lomo Ballena Moderna 50x40cm',
      type: TileType.MODERNA,
      width: 0.5,
      length: 0.4,
      pricePerUnit: 6800,
      brand: 'Modern Design',
      description: 'Loseta lomo ballena diseño moderno minimalista.',
      hasCorner: true,
      cornerPricePerUnit: 7500,
      isForFirstRing: true,
    },
    {
      name: 'Loseta Porcelanato Moderna 60x60cm',
      type: TileType.MODERNA,
      width: 0.6,
      length: 0.6,
      pricePerUnit: 7200,
      brand: 'Modern Design',
      description: 'Loseta porcelanato rectificado diseño moderno.',
      hasCorner: false,
      isForFirstRing: false,
    },
    {
      name: 'Deck Composite Moderna 14x300cm',
      type: TileType.MODERNA,
      width: 0.14,
      length: 3.0,
      pricePerUnit: 12500,
      brand: 'Modern Design',
      description: 'Tabla deck composite de alta durabilidad, diseño moderno.',
      hasCorner: false,
      isForFirstRing: false,
    },
  ];

  try {
    let createdCount = 0;
    let skippedCount = 0;

    for (const tile of romanaTiles) {
      // Verificar si ya existe
      const existing = await prisma.tilePreset.findFirst({
        where: {
          name: tile.name,
        },
      });

      if (existing) {
        console.log(`⚠️  Ya existe: ${tile.name}`);
        skippedCount++;
        continue;
      }

      // Crear nueva loseta
      await prisma.tilePreset.create({
        data: tile,
      });

      console.log(`✅ Creada: ${tile.name} (${tile.type}) - $${tile.pricePerUnit}`);
      createdCount++;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Proceso completado`);
    console.log(`${'='.repeat(60)}`);
    console.log(`✔️  Losetas creadas: ${createdCount}`);
    console.log(`⚠️  Losetas omitidas (ya existían): ${skippedCount}`);
    console.log(`📊 Total procesadas: ${romanaTiles.length}`);
    console.log(`${'='.repeat(60)}\n`);

  } catch (error) {
    console.error('❌ Error al crear losetas:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
seedRomanaTiles();
