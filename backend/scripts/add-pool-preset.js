const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function addPoolPreset() {
  console.log('🏊 Agregar nueva piscina al catálogo\n');

  try {
    const name = await question('Nombre de la piscina: ');
    const length = parseFloat(await question('Largo (metros): '));
    const width = parseFloat(await question('Ancho (metros): '));
    const depth = parseFloat(await question('Profundidad inicial (metros): '));
    const depthEnd = parseFloat(await question('Profundidad final (metros, Enter para misma profundidad): ') || depth);

    const shapeOptions = ['RECTANGULAR', 'OVAL', 'KIDNEY', 'L_SHAPED', 'FREEFORM'];
    console.log('\nFormas disponibles:', shapeOptions.join(', '));
    const shape = await question('Forma de la piscina (por defecto RECTANGULAR): ') || 'RECTANGULAR';

    const lateralCushionSpace = parseFloat(await question('Espacio colchón lateral (metros, por defecto 0.5): ') || '0.5');
    const floorCushionDepth = parseFloat(await question('Profundidad colchón piso (metros, por defecto 0.3): ') || '0.3');

    console.log('\n📋 Datos a crear:');
    console.log({
      name,
      length,
      width,
      depth,
      depthEnd,
      shape,
      lateralCushionSpace,
      floorCushionDepth
    });

    const confirm = await question('\n¿Confirmar creación? (s/n): ');

    if (confirm.toLowerCase() !== 's') {
      console.log('❌ Operación cancelada');
      rl.close();
      await prisma.$disconnect();
      return;
    }

    // Crear la piscina
    const pool = await prisma.poolPreset.create({
      data: {
        name,
        length,
        width,
        depth,
        depthEnd,
        shape,
        lateralCushionSpace,
        floorCushionDepth,
        imageUrl: null // Se actualizará después con update-pool-images.js
      }
    });

    console.log('\n✅ Piscina creada exitosamente!');
    console.log('ID:', pool.id);
    console.log('Nombre:', pool.name);

    // Ahora ejecutar update-pool-images.js para asignar la imagen
    console.log('\n🖼️  Actualizando imagen...');
    const { updatePoolImages } = require('./update-pool-images.js');
    await updatePoolImages();

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

// Si se ejecuta directamente
if (require.main === module) {
  addPoolPreset()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { addPoolPreset };
