#!/usr/bin/env node

/**
 * HTTP MCP Client Bridge
 * 
 * This script acts as a bridge between Claude Desktop's stdio MCP protocol
 * and an HTTP-based MCP server running on Cloudflare Workers.
 * 
 * Usage: node http-mcp-bridge.js <WORKER_URL>
 * Example: node http-mcp-bridge.js https://public-knowledge-mcp-server.your-subdomain.workers.dev
 */

const https = require('https');
const http = require('http');

// Get worker URL from command line argument
const WORKER_URL = process.argv[2];

if (!WORKER_URL) {
  console.error('Usage: node http-mcp-bridge.js <WORKER_URL>');
  process.exit(1);
}

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const module = url.startsWith('https:') ? https : http;
    const req = module.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ error: 'Invalid JSON response', data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Cache for server info
let serverInfo = null;

async function getServerInfo() {
  if (!serverInfo) {
    serverInfo = await makeRequest(`${WORKER_URL}/mcp/info`);
  }
  return serverInfo;
}

// Process MCP messages from stdin
process.stdin.setEncoding('utf8');
process.stdin.on('readable', async () => {
  const chunk = process.stdin.read();
  if (chunk === null) return;
  
  const lines = chunk.trim().split('\n');
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    try {
      const message = JSON.parse(line);
      
      if (message.method === 'initialize') {
        // Initialize response
        const response = {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            protocolVersion: '1.0.0',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'http-mcp-bridge',
              version: '1.0.0'
            }
          }
        };
        console.log(JSON.stringify(response));
        
      } else if (message.method === 'tools/list') {
        // List available tools
        try {
          const info = await getServerInfo();
          const tools = Object.entries(info.capabilities.tools || {}).map(([name, tool]) => ({
            name,
            description: tool.description,
            inputSchema: tool.parameters
          }));
          
          const response = {
            jsonrpc: '2.0',
            id: message.id,
            result: { tools }
          };
          console.log(JSON.stringify(response));
          
        } catch (error) {
          const response = {
            jsonrpc: '2.0',
            id: message.id,
            error: {
              code: -1,
              message: `Failed to fetch tools: ${error.message}`
            }
          };
          console.log(JSON.stringify(response));
        }
        
      } else if (message.method === 'tools/call') {
        // Execute tool
        try {
          const result = await makeRequest(`${WORKER_URL}/mcp/call`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              tool: message.params.name,
              parameters: message.params.arguments || {}
            })
          });
          
          let content;
          if (result.success) {
            content = [{
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }];
          } else {
            content = [{
              type: 'text',
              text: `Error: ${result.error || 'Unknown error'}`
            }];
          }
          
          const response = {
            jsonrpc: '2.0',
            id: message.id,
            result: { content }
          };
          console.log(JSON.stringify(response));
          
        } catch (error) {
          const response = {
            jsonrpc: '2.0',
            id: message.id,
            error: {
              code: -1,
              message: `Tool execution failed: ${error.message}`
            }
          };
          console.log(JSON.stringify(response));
        }
        
      } else {
        // Unknown method
        const response = {
          jsonrpc: '2.0',
          id: message.id,
          error: {
            code: -32601,
            message: `Method not found: ${message.method}`
          }
        };
        console.log(JSON.stringify(response));
      }
      
    } catch (error) {
      // Invalid JSON
      console.error(`Invalid JSON: ${error.message}`, { line });
    }
  }
});

// Handle process termination
process.on('SIGINT', () => {
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});
