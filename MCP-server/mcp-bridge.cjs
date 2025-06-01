#!/usr/bin/env node

/**
 * MCP Bridge for Public Knowledge Base Server
 * 
 * This script bridges Claude Desktop's stdio MCP protocol
 * with the HTTP-based MCP server running on Cloudflare Workers.
 * 
 * Usage: node mcp-bridge.cjs
 */

const https = require('https');

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
      },
      rejectUnauthorized: false  // Allow Cloudflare Workers certificates
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          // Ensure we only parse the JSON part
          const trimmedData = responseData.trim();
          if (!trimmedData.startsWith('{')) {
            reject(new Error(`Invalid JSON response: ${trimmedData.substring(0, 100)}`));
            return;
          }
          
          const response = JSON.parse(trimmedData);
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}. Data: ${responseData.substring(0, 100)}`));
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

// Buffer to handle incomplete JSON messages
let inputBuffer = '';

// Handle stdin data (messages from Claude Desktop)
process.stdin.on('data', async (data) => {
  // Append new data to buffer
  inputBuffer += data.toString();
  
  // Process complete JSON messages (separated by newlines)
  const lines = inputBuffer.split('\n');
  inputBuffer = lines.pop() || ''; // Keep incomplete line in buffer
  
  // Process each complete line
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue; // Skip empty lines
    
    let message = null;
    
    try {
      message = JSON.parse(trimmedLine);
    
      // Handle MCP initialization locally
      if (message.method === 'initialize') {
        const initResponse = {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
              resources: {}
            },
            serverInfo: {
              name: 'public-knowledge-base',
              version: '1.0.0'
            }
          }
        };
        process.stdout.write(JSON.stringify(initResponse) + '\n');
        continue;
      }
      
      // Handle notifications locally (no response needed)
      if (message.method === 'notifications/initialized' || message.method?.startsWith('notifications/')) {
        // Just acknowledge, no response needed for notifications
        continue;
      }
      
      // Handle resources/list locally (we don't have resources)
      if (message.method === 'resources/list') {
        const resourcesResponse = {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            resources: []
          }
        };
        process.stdout.write(JSON.stringify(resourcesResponse) + '\n');
        continue;
      }
      
      // Handle prompts/list locally (we don't have prompts)
      if (message.method === 'prompts/list') {
        const promptsResponse = {
          jsonrpc: '2.0',
          id: message.id,
          error: {
            code: -32601,
            message: 'Method not found: prompts/list'
          }
        };
        process.stdout.write(JSON.stringify(promptsResponse) + '\n');
        continue;
      }
      
      // Forward other messages to the HTTP MCP server
      try {
        const response = await makeRequest(message);
        
        // Ensure response has proper ID and structure
        if (response && typeof response === 'object') {
          response.id = message.id; // Preserve original request ID
          response.jsonrpc = '2.0'; // Ensure JSON-RPC version
          
          // Send response back to Claude Desktop
          process.stdout.write(JSON.stringify(response) + '\n');
        } else {
          throw new Error('Invalid response from server');
        }
      } catch (httpError) {
        // Send error response back to Claude Desktop with proper ID
        const errorResponse = {
          jsonrpc: '2.0',
          id: message.id, // Use actual message ID, not null
          error: {
            code: -32603,
            message: `HTTP request failed: ${httpError.message}`
          }
        };
        process.stdout.write(JSON.stringify(errorResponse) + '\n');
      }
    } catch (parseError) {
      // Only send error response if we have a valid message ID
      if (message?.id !== undefined) {
        const errorResponse = {
          jsonrpc: '2.0',
          id: message.id,
          error: {
            code: -32700,
            message: `Parse error: ${parseError.message}`
          }
        };
        process.stdout.write(JSON.stringify(errorResponse) + '\n');
      }
      // If we can't parse the message, don't send anything back
    }
  }
});

// Handle process termination gracefully
process.on('SIGINT', () => {
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});
