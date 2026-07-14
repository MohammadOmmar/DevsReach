const http = require('http');

const roles = [
  { name: 'Parent', role: 'parent' },
  { name: 'School', role: 'school' },
  { name: 'Driver', role: 'driver' },
  { name: 'RTO', role: 'rto' }
];

const postData = JSON.stringify({
  email: 'omarmohd742@gmail.com',
  password: 'demo123'
});

roles.forEach((roleInfo) => {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      const response = JSON.parse(data);
      console.log(`\n✅ ${roleInfo.name} Login: SUCCESS`);
      console.log(`   User: ${response.user.name}`);
      console.log(`   Role: ${response.user.role}`);
      console.log(`   Email: ${response.user.email}`);
    });
  });

  req.on('error', (error) => {
    console.log(`\n❌ ${roleInfo.name} Login: FAILED - ${error.message}`);
  });

  req.write(postData);
  req.end();
});