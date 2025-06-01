#!/usr/bin/env node

/**
 * Test version of MCP Bridge with debugging
 */

const https = require('https');

const SERVER_URL = 'https://public-knowledge-mcp-server.santhoshkumar199.workers.dev';

console.error('Bridge script starting...');

// Function to make HTTP requests to the MCP server
function makeRequest(data) {
  console.error('Making request:', JSON.stringify(data, null, 2));
  
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'public-knowledge-mcp-server.santhoshkumar199.workers.dev',
      port: 443,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.error('Response received:', responseData);
        try {
          const response = JSON.parse(responseData);
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Handle stdin data (messages from Claude Desktop)
process.stdin.on('data', async (data) => {
  console.error('Received data:', data.toString());
  
  try {
    const message = JSON.parse(data.toString().trim());
    console.error('Parsed message:', message);
    
    // Forward the exact message to the HTTP MCP server
    const response = await makeRequest(message);
    console.error('Got response:', response);
    
    // Send response back to Claude Desktop
    process.stdout.write(JSON.stringify(response) + '\n');
  } catch (error) {
    console.error('Error processing message:', error);
    // Send error response back to Claude Desktop
    const errorResponse = {
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32603,
        message: `Bridge error: ${error.message}`
      }
    };
    process.stdout.write(JSON.stringify(errorResponse) + '\n');
  }
});

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.error('Received SIGINT, exiting...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, exiting...');
  process.exit(0);
});

console.error('Bridge script ready, waiting for input...');
