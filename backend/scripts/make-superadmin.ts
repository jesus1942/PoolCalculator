import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function makeSuperAdmin() {
  // Obtener el email del usuario desde argumentos o usar un valor por defecto
  const email = process.argv[2];

  if (!email) {
    console.error('❌ Debes proporcionar un email');
    console.log('Uso: npm run make-superadmin -- tu@email.com');
    process.exit(1);
  }

  try {
    // Buscar el usuario
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`❌ No se encontró un usuario con el email: ${email}`);
      process.exit(1);
    }

    // Actualizar a SUPERADMIN
    const updated = await prisma.user.update({
      where: { email },
      data: { role: 'SUPERADMIN' },
    });

    console.log('✅ Usuario actualizado exitosamente:');
    console.log(`   📧 Email: ${updated.email}`);
    console.log(`   👤 Nombre: ${updated.name}`);
    console.log(`   🔑 Rol: ${updated.role}`);
    console.log(`   📅 Creado: ${updated.createdAt.toLocaleDateString('es-AR')}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

makeSuperAdmin();
