/**
 * Script para verificar qué equipos y configuración tiene un proyecto
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProjectEquipment(projectId: string) {
  console.log('Verificando proyecto:', projectId);
  console.log('');

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      poolPreset: true,
      projectAdditionals: {
        include: {
          equipment: true,
          accessory: true,
          material: true
        }
      }
    }
  });

  if (!project) {
    console.log('Proyecto no encontrado');
    return;
  }

  console.log('=== INFORMACIÓN DEL PROYECTO ===');
  console.log('Nombre:', project.name);
  console.log('Cliente:', project.clientName);
  console.log('Volumen:', project.volume, 'm³');
  console.log('');

  console.log('=== MODELO DE PISCINA ===');
  console.log('Modelo:', project.poolPreset?.name);
  console.log('Skimmers:', project.poolPreset?.skimmerCount || 0);
  console.log('Retornos:', project.poolPreset?.returnsCount || 0);
  console.log('Hydrojets:', project.poolPreset?.hydroJetsCount || 0);
  console.log('Iluminación:', project.poolPreset?.lightingCount || 0);
  console.log('');

  console.log('=== CONFIGURACIÓN HIDRÁULICA (plumbingConfig) ===');
  if (project.plumbingConfig) {
    console.log(JSON.stringify(project.plumbingConfig, null, 2));
  } else {
    console.log('No configurada');
  }
  console.log('');

  console.log('=== CONFIGURACIÓN ELÉCTRICA (electricalConfig) ===');
  if (project.electricalConfig) {
    console.log(JSON.stringify(project.electricalConfig, null, 2));
  } else {
    console.log('No configurada');
  }
  console.log('');

  console.log('=== EQUIPOS ADICIONALES (projectAdditionals) ===');
  if (project.projectAdditionals && project.projectAdditionals.length > 0) {
    project.projectAdditionals.forEach((additional, index) => {
      console.log(`\nAdicional ${index + 1}:`);
      if (additional.equipment) {
        console.log('  Tipo: EQUIPO');
        console.log('  Nombre:', additional.equipment.name);
        console.log('  Tipo equipo:', additional.equipment.type);
        console.log('  Potencia:', additional.equipment.power, 'HP');
        console.log('  Capacidad:', additional.equipment.capacity);
        console.log('  Voltaje:', additional.equipment.voltage, 'V');
        console.log('  Precio:', additional.equipment.pricePerUnit);
      }
      if (additional.accessory) {
        console.log('  Tipo: ACCESORIO');
        console.log('  Nombre:', additional.accessory.name);
      }
      if (additional.tile) {
        console.log('  Tipo: LOSETA');
        console.log('  Nombre:', additional.tile.name);
      }
      console.log('  Cantidad:', additional.quantity);
    });
  } else {
    console.log('No hay adicionales configurados');
  }
  console.log('');

  console.log('=== ANÁLISIS ===');
  console.log('Con esta información, los análisis deberían:');
  console.log('1. Usar los equipos de projectAdditionals (si existen)');
  console.log('2. Usar la configuración de plumbingConfig para tuberías');
  console.log('3. Usar la configuración de electricalConfig para cargas eléctricas');
  console.log('');

  await prisma.$disconnect();
}

const projectId = process.argv[2] || 'ba0da726-72bc-4d65-bb75-a796869655d0';
checkProjectEquipment(projectId).catch(console.error);
