#!/usr/bin/env node

/**
 * MCP Bridge for Public Knowledge Base Server - Simplified Version
 * 
 * This script bridges Claude Desktop's stdio MCP protocol
 * with the HTTP-based MCP server running on Cloudflare Workers.
 */

const https = require('https');
const readline = require('readline');

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

// Create readline interface for line-by-line input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Handle each line of input
rl.on('line', async (line) => {
  try {
    const message = JSON.parse(line.trim());
    
    // Forward the exact message to the HTTP MCP server
    const response = await makeRequest(message);
    
    // Send response back to Claude Desktop
    console.log(JSON.stringify(response));
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
    console.log(JSON.stringify(errorResponse));
  }
});

// Handle process termination gracefully
process.on('SIGINT', () => {
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});
