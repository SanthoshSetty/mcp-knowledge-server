// filepath: /Users/santhoshkumarsampangiramasetty/MCP-server/src/fixed-mcp-worker.ts
import { z } from "zod";

// Cloudflare Workers types
interface Env {
  KNOWLEDGE_BASE_KV: KVNamespace;
}

// Types for our knowledge base
interface FileMetadata {
  id: string;
  filename: string;
  type: "txt";
  uploadedAt: string;
  size: number;
  content: string;
  summary?: string;
}

interface KnowledgeBase {
  files: FileMetadata[];
  owner: {
    name: string;
    description: string;
    background: string;
  };
}

// Helper function to get knowledge base from KV
async function getKnowledgeBase(env: Env): Promise<KnowledgeBase> {
  const stored = await env.KNOWLEDGE_BASE_KV.get("knowledge_base", "json");
  if (!stored) {
    return {
      files: [],
      owner: {
        name: "Public Knowledge Base",
        description: "A shared collection of text documents and information",
        background: "This knowledge base contains various text files that can be searched and accessed by users."
      }
    };
  }
  return stored as KnowledgeBase;
}

// Helper function to save knowledge base to KV
async function saveKnowledgeBase(env: Env, kb: KnowledgeBase): Promise<void> {
  await env.KNOWLEDGE_BASE_KV.put("knowledge_base", JSON.stringify(kb));
}

// Helper function to search through knowledge base
function searchKnowledgeBase(kb: KnowledgeBase, query: string, limit: number = 5): FileMetadata[] {
  const searchTerms = query.toLowerCase().split(' ');
  
  const scored = kb.files.map(file => {
    let score = 0;
    const searchableText = `${file.filename} ${file.summary || ''} ${file.content}`.toLowerCase();
    
    searchTerms.forEach(term => {
      if (searchableText.includes(term)) {
        score += 1;
      }
    });
    
    return { file, score };
  }).filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
    
  return scored.map(item => item.file);
}

// HTTP-based MCP server for Cloudflare Workers
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // CORS headers for browser access
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Download routes for easy setup
    if (request.method === 'GET') {
      // Download bridge script
      if (url.pathname === '/download/bridge') {
        const bridgeScript = `#!/usr/bin/env node

/**
 * MCP Bridge for Public Knowledge Base Server
 * 
 * This script bridges Claude Desktop's stdio MCP protocol
 * with the HTTP-based MCP server running on Cloudflare Workers.
 * 
 * Usage: node mcp-bridge.cjs
 */

const https = require('https');
const http = require('http');

// Configuration
const SERVER_URL = '${url.origin}';
const HOSTNAME = '${url.hostname}';

// Allow self-signed certificates for development
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

let inputBuffer = '';

/**
 * Send JSON-RPC response to Claude Desktop
 */
function sendResponse(response) {
  console.log(JSON.stringify(response));
}

/**
 * Handle MCP protocol messages from Claude Desktop
 */
async function handleMessage(message) {
  try {
    const { id, method, params } = message;

    switch (method) {
      case 'initialize':
        sendResponse({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'public-knowledge-mcp-server',
              version: '1.0.0'
            }
          }
        });
        break;

      case 'notifications/initialized':
        // Acknowledge initialization
        break;

      case 'resources/list':
        sendResponse({
          jsonrpc: '2.0',
          id,
          result: {
            resources: []
          }
        });
        break;

      case 'prompts/list':
        sendResponse({
          jsonrpc: '2.0',
          id,
          result: {
            prompts: []
          }
        });
        break;

      case 'tools/list':
        // Fetch available tools from the HTTP server
        const infoResponse = await fetch(SERVER_URL + '/mcp/info', {
          agent: new https.Agent({
            rejectUnauthorized: false
          })
        });
        
        if (!infoResponse.ok) {
          throw new Error(\`HTTP \${infoResponse.status}: \${infoResponse.statusText}\`);
        }
        
        const info = await infoResponse.json();
        const tools = Object.keys(info.capabilities.tools).map(name => ({
          name,
          description: info.capabilities.tools[name].description,
          inputSchema: info.capabilities.tools[name].parameters
        }));

        sendResponse({
          jsonrpc: '2.0',
          id,
          result: { tools }
        });
        break;

      case 'tools/call':
        // Forward tool call to HTTP server
        const toolResponse = await fetch(SERVER_URL + '/mcp/call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tool: params.name,
            parameters: params.arguments
          }),
          agent: new https.Agent({
            rejectUnauthorized: false
          })
        });

        if (!toolResponse.ok) {
          throw new Error(\`HTTP \${toolResponse.status}: \${toolResponse.statusText}\`);
        }

        const result = await toolResponse.json();
        sendResponse({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }]
          }
        });
        break;

      default:
        sendResponse({
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: \`Method '\${method}' not found\`
          }
        });
        break;
    }
  } catch (error) {
    sendResponse({
      jsonrpc: '2.0',
      id: message.id,
      error: {
        code: -1,
        message: error.message
      }
    });
  }
}

/**
 * Process stdin data and handle complete JSON messages
 */
process.stdin.on('data', (data) => {
  inputBuffer += data.toString();
  
  // Process complete JSON messages
  let lines = inputBuffer.split('\\n');
  inputBuffer = lines.pop(); // Keep incomplete line in buffer
  
  for (const line of lines) {
    if (line.trim()) {
      try {
        const message = JSON.parse(line.trim());
        handleMessage(message);
      } catch (error) {
        // Ignore malformed JSON
      }
    }
  }
});

// Handle process termination
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
`;

        return new Response(bridgeScript, {
          headers: {
            'Content-Type': 'application/javascript',
            'Content-Disposition': 'attachment; filename="mcp-bridge.cjs"',
            ...corsHeaders
          }
        });
      }

      // Download configuration file
      if (url.pathname === '/download/config') {
        const config = {
          mcpServers: {
            "public-knowledge-base": {
              command: "node",
              args: ["./mcp-bridge.cjs"],
              env: {
                SERVER_URL: url.origin
              }
            }
          }
        };

        return new Response(JSON.stringify(config, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': 'attachment; filename="claude_desktop_config.json"',
            ...corsHeaders
          }
        });
      }
    }

    // Server info endpoint
    if (url.pathname === '/mcp/info') {
      return new Response(JSON.stringify({
        name: "public-knowledge-mcp-server",
        version: "1.0.0",
        description: "A public MCP server for text-based knowledge sharing",
        capabilities: {
          tools: {
            "upload-file": {
              description: "Upload a text file to the knowledge base",
              parameters: {
                type: "object",
                properties: {
                  filename: { type: "string" },
                  content: { type: "string", description: "Base64 encoded text content" },
                  type: { type: "string", enum: ["txt"] }
                },
                required: ["filename", "content", "type"]
              }
            },
            "search-knowledge": {
              description: "Search through the knowledge base using natural language",
              parameters: {
                type: "object",
                properties: {
                  query: { type: "string" },
                  limit: { type: "number", default: 5 }
                },
                required: ["query"]
              }
            },
            "list-files": {
              description: "List all files in the knowledge base",
              parameters: { type: "object", properties: {} }
            },
            "get-file-content": {
              description: "Get the full content of a specific file",
              parameters: {
                type: "object",
                properties: {
                  fileId: { type: "string" }
                },
                required: ["fileId"]
              }
            },
            "delete-file": {
              description: "Delete a specific file from the knowledge base",
              parameters: {
                type: "object",
                properties: {
                  fileId: { type: "string" }
                },
                required: ["fileId"]
              }
            }
          }
        }
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Tool execution endpoint
    if (url.pathname === '/mcp/call' && request.method === 'POST') {
      try {
        const body = await request.json() as any;
        const { tool, parameters } = body;

        switch (tool) {
          case 'upload-file': {
            const { filename, content, type } = parameters;
            
            if (type !== 'txt') {
              return new Response(JSON.stringify({
                success: false,
                error: "Only text files are supported in this version"
              }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
              });
            }
            
            // Decode base64 content
            let extractedText: string;
            try {
              extractedText = atob(content);
            } catch (error) {
              return new Response(JSON.stringify({
                success: false,
                error: "Invalid base64 content"
              }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
              });
            }
            
            // Check file size limits
            const fileSizeBytes = extractedText.length;
            const fileSizeMB = fileSizeBytes / (1024 * 1024);
            
            if (fileSizeMB > 20) {
              return new Response(JSON.stringify({
                success: false,
                error: `File too large (${fileSizeMB.toFixed(1)}MB). Maximum size is 20MB due to Cloudflare KV storage limits.`
              }), {
                status: 413,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
              });
            }
            
            // Generate file ID
            const fileId = crypto.randomUUID();
            
            // Create file metadata
            const fileMetadata: FileMetadata = {
              id: fileId,
              filename,
              type: "txt",
              uploadedAt: new Date().toISOString(),
              size: extractedText.length,
              content: extractedText,
              summary: extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : '')
            };
            
            // Update knowledge base
            const kb = await getKnowledgeBase(env);
            kb.files.push(fileMetadata);
            await saveKnowledgeBase(env, kb);
            
            return new Response(JSON.stringify({
              success: true,
              fileId,
              message: `File "${filename}" uploaded successfully`,
              extractedLength: extractedText.length
            }), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }

          case 'search-knowledge': {
            const { query, limit = 5 } = parameters;
            const kb = await getKnowledgeBase(env);
            const results = searchKnowledgeBase(kb, query, limit);
            
            return new Response(JSON.stringify({
              success: true,
              query,
              results: results.map(file => ({
                id: file.id,
                filename: file.filename,
                type: file.type,
                uploadedAt: file.uploadedAt,
                summary: file.summary
              })),
              totalFiles: kb.files.length
            }), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }

          case 'list-files': {
            const kb = await getKnowledgeBase(env);
            
            return new Response(JSON.stringify({
              success: true,
              files: kb.files.map(file => ({
                id: file.id,
                filename: file.filename,
                type: file.type,
                uploadedAt: file.uploadedAt,
                size: file.size,
                summary: file.summary
              })),
              total: kb.files.length
            }), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }

          case 'get-file-content': {
            const { fileId } = parameters;
            const kb = await getKnowledgeBase(env);
            const file = kb.files.find(f => f.id === fileId);
            
            if (!file) {
              return new Response(JSON.stringify({
                success: false,
                error: "File not found"
              }), {
                status: 404,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
              });
            }
            
            return new Response(JSON.stringify({
              success: true,
              file: {
                id: file.id,
                filename: file.filename,
                type: file.type,
                content: file.content
              }
            }), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }

          case 'delete-file': {
            const { fileId } = parameters;
            const kb = await getKnowledgeBase(env);
            const fileIndex = kb.files.findIndex(f => f.id === fileId);
            
            if (fileIndex === -1) {
              return new Response(JSON.stringify({
                success: false,
                error: "File not found"
              }), {
                status: 404,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
              });
            }
            
            // Remove the file from the knowledge base
            const deletedFile = kb.files[fileIndex];
            kb.files.splice(fileIndex, 1);
            await saveKnowledgeBase(env, kb);
            
            return new Response(JSON.stringify({
              success: true,
              message: `File "${deletedFile.filename}" (ID: ${fileId}) has been deleted successfully`,
              deletedFile: {
                id: deletedFile.id,
                filename: deletedFile.filename,
                type: deletedFile.type,
                size: deletedFile.size
              },
              remainingFiles: kb.files.length
            }), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }

          default:
            return new Response(JSON.stringify({
              success: false,
              error: `Unknown tool: ${tool}`
            }), {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    // API documentation endpoint
    if (url.pathname === '/') {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Public Text Knowledge Base MCP Server</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              max-width: 900px; 
              margin: 40px auto; 
              padding: 20px; 
              line-height: 1.6;
              color: #333;
            }
            .hero { 
              text-align: center; 
              background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
              color: white;
              padding: 40px 20px;
              border-radius: 12px;
              margin-bottom: 40px;
            }
            .endpoint { 
              background: #f8f9fa; 
              padding: 20px; 
              margin: 15px 0; 
              border-radius: 8px; 
              border-left: 4px solid #28a745;
            }
            .method { 
              font-weight: bold; 
              color: #28a745; 
              font-size: 14px;
              text-transform: uppercase;
            }
            pre { 
              background: #f1f3f4; 
              padding: 15px; 
              border-radius: 6px; 
              overflow-x: auto; 
              font-size: 14px;
            }
            .stats { 
              display: grid; 
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
              gap: 20px; 
              margin: 30px 0; 
            }
            .stat-card { 
              background: white; 
              padding: 20px; 
              border-radius: 8px; 
              box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
              text-align: center;
            }
            .stat-number { 
              font-size: 2em; 
              font-weight: bold; 
              color: #28a745; 
            }
            h2 { color: #495057; margin-top: 40px; }
            .feature { background: #d1ecf1; padding: 15px; border-radius: 6px; margin: 10px 0; }
            .integration-code { background: #2d3748; color: #e2e8f0; padding: 20px; border-radius: 8px; }
            .demo { background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .download-section { background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .download-buttons { display: flex; gap: 15px; flex-wrap: wrap; margin: 15px 0; }
            .download-btn { 
              background: #007bff; 
              color: white; 
              padding: 12px 24px; 
              border-radius: 6px; 
              text-decoration: none; 
              font-weight: bold;
              display: inline-block;
              transition: background-color 0.2s;
            }
            .download-btn:hover { background: #0056b3; }
            .download-btn.config { background: #28a745; }
            .download-btn.config:hover { background: #1e7e34; }
            .setup-instructions { margin-top: 20px; }
            .step { background: white; padding: 15px; margin: 15px 0; border-radius: 6px; border-left: 4px solid #007bff; }
            .step h4 { margin-top: 0; color: #007bff; }
            .platform-tabs { margin: 10px 0; }
            .platform-tabs strong { display: block; margin: 15px 0 5px 0; color: #28a745; }
            .platform-tabs ol { margin: 5px 0 15px 20px; }
            .platform-tabs code { background: #f1f3f4; padding: 2px 4px; border-radius: 3px; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="hero">
            <h1>Public Text Knowledge Base</h1>
            <p>A Model Context Protocol server for sharing and searching text documents</p>
            <p><strong>Successfully Deployed!</strong></p>
          </div>
          
          <div class="stats">
            <div class="stat-card">
              <div class="stat-number" id="file-count">...</div>
              <div>Text Files</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">ONLINE</div>
              <div>Status</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">GLOBAL</div>
              <div>Access</div>
            </div>
          </div>

          <div class="demo">
            <h3>Live Demo</h3>
            <p>Try uploading a text file:</p>
            <input type="file" id="fileInput" accept=".txt" style="margin: 10px 0;">
            <button onclick="uploadFile()" style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Upload</button>
            <div id="result" style="margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 5px; display: none;"></div>
          </div>

          <div class="download-section">
            <h2>Setup Instructions</h2>
            <p><strong>Get everything you need to use this knowledge base with Claude Desktop:</strong></p>
            
            <div class="download-buttons">
              <a href="/download/bridge" class="download-btn">Download Bridge Script</a>
              <a href="/download/config" class="download-btn config">Download Config File</a>
            </div>
            
            <div class="setup-instructions">
              <h3>Step-by-Step Setup Guide</h3>
              
              <div class="step">
                <h4>Step 1: Download Files</h4>
                <ul>
                  <li>Click "Download Bridge Script" button above</li>
                  <li>Click "Download Config File" button above</li>
                </ul>
              </div>

              <div class="step">
                <h4>Step 2: Install Files (No Terminal Required!)</h4>
                <div class="platform-tabs">
                  <strong>On macOS:</strong>
                  <ol>
                    <li><strong>Bridge Script:</strong> Drag <code>mcp-bridge.cjs</code> to your home folder (the one with your username)</li>
                    <li><strong>Config File:</strong> 
                        <ul>
                          <li>Press <code>Cmd + Shift + G</code> in Finder</li>
                          <li>Type: <code>~/Library/Application Support/Claude/</code></li>
                          <li>If the folder doesn't exist, create it</li>
                          <li>Open the downloaded <code>claude_desktop_config.json</code> file</li>
                          <li>Copy all the text and paste it into a new file called <code>claude_desktop_config.json</code> in the Claude folder</li>
                        </ul>
                    </li>
                  </ol>
                  
                  <strong>On Windows:</strong>
                  <ol>
                    <li><strong>Bridge Script:</strong> Drag <code>mcp-bridge.cjs</code> to your user folder (usually <code>C:\\Users\\YourName\\</code>)</li>
                    <li><strong>Config File:</strong>
                        <ul>
                          <li>Press <code>Windows + R</code>, type <code>%APPDATA%\\Claude</code> and press Enter</li>
                          <li>If the folder doesn't exist, create it</li>
                          <li>Open the downloaded <code>claude_desktop_config.json</code> file</li>
                          <li>Copy all the text and paste it into a new file called <code>claude_desktop_config.json</code> in the Claude folder</li>
                        </ul>
                    </li>
                  </ol>
                </div>
              </div>

              <div class="step">
                <h4>Step 3: Update Configuration</h4>
                <ol>
                  <li>Open the Claude Desktop config file in a text editor</li>
                  <li>Update the path to <code>mcp-bridge.cjs</code> to match where you saved it</li>
                  <li>Ensure the SERVER_URL points to: <code>${url.origin}</code></li>
                </ol>
              </div>

              <div class="step">
                <h4>Step 4: Restart Claude Desktop</h4>
                <ol>
                  <li>Completely quit Claude Desktop</li>
                  <li>Restart the application</li>
                  <li>The MCP server should now be available!</li>
                </ol>
              </div>

              <div class="step">
                <h4>Step 5: Test It Out</h4>
                <p>Try these commands in Claude Desktop:</p>
                <ul>
                  <li><code>"Upload this text file to the knowledge base"</code> (with .txt file attached)</li>
                  <li><code>"Search for documents about machine learning"</code></li>
                  <li><code>"List all available files"</code></li>
                  <li><code>"Show me the content of file ID xyz123"</code></li>
                  <li><code>"Delete file ID xyz123 from the knowledge base"</code></li>
                </ul>
              </div>
            </div>
          </div>

          <h2>Features</h2>
          <div class="feature"><strong>Text File Support</strong> - Upload and search through .txt documents (up to 20MB each)</div>
          <div class="feature"><strong>Smart Search</strong> - Natural language queries to find relevant content</div>
          <div class="feature"><strong>Global Access</strong> - Available worldwide through Cloudflare's network</div>
          <div class="feature"><strong>Claude Integration</strong> - Works seamlessly with Claude Desktop</div>
          
          <div class="feature" style="background: #fff3cd; border-left: 4px solid #ffc107;">
            <h3 style="margin-top: 0;">File Size Limits</h3>
            <ul style="margin: 10px 0;">
              <li><strong>Maximum file size:</strong> 20MB per file (due to Cloudflare KV storage limits)</li>
              <li><strong>Total storage:</strong> Unlimited number of files</li>
              <li><strong>Supported formats:</strong> .txt files only</li>
              <li><strong>For larger files:</strong> Consider splitting into smaller chunks or using external storage</li>
            </ul>
          </div>
          
          <h2>Claude Desktop Integration</h2>
          
          <p>Add this to your Claude Desktop config file:</p>
          <p><strong>File:</strong> <code>~/Library/Application Support/Claude/claude_desktop_config.json</code></p>
          
          <pre class="integration-code">{
  "mcpServers": {
    "public-knowledge-base": {
      "command": "node",
      "args": ["./mcp-bridge.cjs"],
      "env": {
        "SERVER_URL": "${url.origin}"
      }
    }
  }
}</pre>

          <h2>Example Usage</h2>
          
          <div class="endpoint">
            <p>After connecting to Claude Desktop, try:</p>
            <ul>
              <li>"Upload this text file to the knowledge base" (with .txt file)</li>
              <li>"Search for documents about machine learning"</li>
              <li>"List all available files"</li>
              <li>"Show me the content of file ID xyz123"</li>
              <li>"Delete file ID xyz123 from the knowledge base"</li>
            </ul>
          </div>
          
          <hr style="margin: 40px 0; border: none; border-top: 1px solid #dee2e6;">
          <p style="text-align: center; color: #6c757d;">
            <small>Powered by Cloudflare Workers | 
            <a href="https://github.com/modelcontextprotocol/specification" target="_blank">Learn about MCP</a>
            </small>
          </p>

          <script>
            // Load file count
            fetch('/mcp/call', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tool: 'list-files', parameters: {} })
            })
            .then(r => r.json())
            .then(data => {
              if (data.success) {
                document.getElementById('file-count').textContent = data.total;
              }
            })
            .catch(() => document.getElementById('file-count').textContent = '0');

            // File upload demo
            function uploadFile() {
              const fileInput = document.getElementById('fileInput');
              const resultDiv = document.getElementById('result');
              
              if (!fileInput.files[0]) {
                alert('Please select a file first');
                return;
              }
              
              const file = fileInput.files[0];
              const reader = new FileReader();
              
              reader.onload = function(e) {
                const content = btoa(e.target.result);
                
                fetch('/mcp/call', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    tool: 'upload-file',
                    parameters: {
                      filename: file.name,
                      content: content,
                      type: 'txt'
                    }
                  })
                })
                .then(r => r.json())
                .then(data => {
                  resultDiv.style.display = 'block';
                  if (data.success) {
                    resultDiv.innerHTML = '<strong>Success!</strong> File uploaded with ID: ' + data.fileId;
                    resultDiv.style.background = '#d4edda';
                    resultDiv.style.color = '#155724';
                    // Refresh file count
                    location.reload();
                  } else {
                    resultDiv.innerHTML = '<strong>Error:</strong> ' + data.error;
                    resultDiv.style.background = '#f8d7da';
                    resultDiv.style.color = '#721c24';
                  }
                })
                .catch(error => {
                  resultDiv.style.display = 'block';
                  resultDiv.innerHTML = '<strong>Network Error:</strong> ' + error.message;
                  resultDiv.style.background = '#f8d7da';
                  resultDiv.style.color = '#721c24';
                });
              };
              
              reader.readAsText(file);
            }
          </script>
        </body>
        </html>
      `;
      
      return new Response(html, {
        headers: { 'Content-Type': 'text/html', ...corsHeaders }
      });
    }

    return new Response('Not Found', { 
      status: 404,
      headers: corsHeaders
    });
  }
};
