const http = require('http');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTE3ODQwMDY3ODE2OTAiLCJyb2xlIjoicGFyZW50IiwiaWF0IjoxNzg0MDA2OTcyLCJleHAiOjE3ODQwMzU3NzJ9.oqWf728uqPyfN0161c3HvX-fsJyxvZcz4iuYA4vovL8';

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/dashboard',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.end();