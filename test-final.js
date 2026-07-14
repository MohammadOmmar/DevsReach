const http = require('http');

const accounts = [
  { name: 'Parent', email: 'parent@demo.com', expectedRole: 'parent' },
  { name: 'School', email: 'school@demo.com', expectedRole: 'school' },
  { name: 'Driver', email: 'driver@demo.com', expectedRole: 'driver' },
  { name: 'RTO', email: 'rto@demo.com', expectedRole: 'rto' }
];

const postData = JSON.stringify({
  email: '', // Will be set per account
  password: 'demo123'
});

let completed = 0;

accounts.forEach((account) => {
  const accountData = JSON.stringify({
    email: account.email,
    password: 'demo123'
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(accountData)
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      const response = JSON.parse(data);
      if (response.user && response.user.role === account.expectedRole) {
        console.log(`✅ ${account.name} Login: SUCCESS`);
        console.log(`   User: ${response.user.name}`);
        console.log(`   Role: ${response.user.role}`);
        console.log(`   Email: ${response.user.email}`);
      } else {
        console.log(`❌ ${account.name} Login: WRONG ROLE`);
        console.log(`   Expected: ${account.expectedRole}`);
        console.log(`   Got: ${response.user?.role || 'none'}`);
      }
      completed++;
      if (completed === accounts.length) {
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎉 All demo accounts ready for hackathon!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n📱 Open http://localhost:3000 in your browser');
        console.log('🔐 Use the demo buttons on the login page');
      }
    });
  });

  req.on('error', (error) => {
    console.log(`❌ ${account.name} Login: FAILED - ${error.message}`);
    completed++;
  });

  req.write(accountData);
  req.end();
});