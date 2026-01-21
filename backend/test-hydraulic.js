// Script para testear el endpoint de análisis hidráulico
// Uso: node test-hydraulic.js PROJECT_ID TOKEN

const https = require('http');

const projectId = process.argv[2] || 'test-id';
const token = process.argv[3] || '';

const options = {
  hostname: 'localhost',
  port: 3000,
  path: `/api/professional-calculations/${projectId}/hydraulic?distanceToEquipment=8&staticLift=1.5`,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
};

console.log('🔍 Testing hydraulic analysis endpoint...');
console.log('Project ID:', projectId);
console.log('URL:', `http://localhost:3000${options.path}`);
console.log('');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('');

    try {
      const json = JSON.parse(data);
      console.log('Response:');
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('Raw Response:');
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

if (!token) {
  console.log('⚠️  No se proporcionó token. Uso: node test-hydraulic.js PROJECT_ID TOKEN');
}

req.end();
