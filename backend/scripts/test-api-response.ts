import axios from 'axios';

async function testApiResponse() {
  console.log('🔍 Probando respuesta de la API...\n');

  try {
    // Obtener un token de autenticación primero
    console.log('🔐 Intentando autenticación...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@aquam.com',
      password: 'Admin123!'
    });

    const token = loginResponse.data.token;
    console.log('✅ Autenticación exitosa\n');

    // Obtener los pool presets
    console.log('📡 Obteniendo pool presets...');
    const response = await axios.get('http://localhost:3000/api/pool-presets', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const akessePools = response.data.filter((p: any) => p.vendor === 'Akesse');

    console.log(`✅ Encontrados ${akessePools.length} modelos de Akesse\n`);

    akessePools.slice(0, 3).forEach((pool: any, index: number) => {
      console.log(`${index + 1}. ${pool.name}`);
      console.log(`   Vendor: ${pool.vendor || 'Sin vendor'}`);
      console.log(`   ImageUrl: ${pool.imageUrl ? '✅ SÍ' : '❌ NO'}`);
      if (pool.imageUrl) {
        console.log(`   URL: ${pool.imageUrl.substring(0, 80)}...`);
      }
      console.log('');
    });

    const withImages = akessePools.filter((p: any) => p.imageUrl).length;
    console.log(`📊 Estadísticas:`);
    console.log(`   Total: ${akessePools.length}`);
    console.log(`   Con imageUrl: ${withImages}`);
    console.log(`   Sin imageUrl: ${akessePools.length - withImages}`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Detalles:', error.response.data);
    }
  }
}

testApiResponse();
