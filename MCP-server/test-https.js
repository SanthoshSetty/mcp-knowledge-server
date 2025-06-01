#!/usr/bin/env node

const https = require('https');

// Simple test to make sure HTTPS request works
const data = JSON.stringify({
  "jsonrpc": "2.0", 
  "method": "tools/list", 
  "id": 1
});

const options = {
  hostname: 'public-knowledge-mcp-server.santhoshkumar199.workers.dev',
  port: 443,
  path: '/',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(options, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', responseData);
    process.exit(0);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
  process.exit(1);
});

req.write(data);
req.end();
