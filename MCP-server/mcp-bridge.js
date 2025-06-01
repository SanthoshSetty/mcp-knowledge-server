#!/usr/bin/env node

/**
 * MCP Bridge for Public Knowledge Base Server
 * 
 * This script bridges Claude Desktop's stdio MCP protocol
 * with the HTTP-based MCP server running on Cloudflare Workers.
 * 
 * Usage: node mcp-bridge.cjs
 */

import https from 'https';

const SERVER_URL = 'https://public-knowledge-mcp-server.santhoshkumar199.workers.dev';

// Function to make HTTP requests to the MCP server
function makeRequest(data) {
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
        try {
          const response = JSON.parse(responseData);
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Handle stdin data (messages from Claude Desktop)
process.stdin.on('data', async (data) => {
  try {
    const message = JSON.parse(data.toString().trim());
    
    // Forward the exact message to the HTTP MCP server
    const response = await makeRequest(message);
    
    // Send response back to Claude Desktop
    process.stdout.write(JSON.stringify(response) + '\n');
  } catch (error) {
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
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});
