import prisma from '../src/config/database';

async function setAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.log('Uso: tsx scripts/set-admin.ts <email>');
    process.exit(1);
  }

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' }
    });

    console.log(`✅ Usuario ${user.email} ahora es ADMIN`);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

setAdmin();
