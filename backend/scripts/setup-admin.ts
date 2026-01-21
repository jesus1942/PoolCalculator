import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function setupAdmin() {
  try {
    const email = 'jesusnatec@gmail.com';
    const password = 'admin';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Buscar si el usuario existe
    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (user) {
      // Actualizar usuario existente
      user = await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
          role: 'ADMIN',
          name: 'Jesús Admin'
        }
      });
      console.log('✅ Usuario actualizado a ADMIN');
    } else {
      // Crear nuevo usuario
      user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: 'Jesús Admin',
          role: 'ADMIN'
        }
      });
      console.log('✅ Usuario ADMIN creado');
    }

    console.log('\n📧 Email: jesusnatec@gmail.com');
    console.log('🔑 Password: admin');
    console.log('👤 Rol: ADMIN\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupAdmin();
