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

// MCP JSON-RPC types
interface MCPRequest {
  jsonrpc: "2.0";
  id: string | number | null;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
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

// Handle MCP JSON-RPC requests
async function handleMCPRequest(request: MCPRequest, env: Env): Promise<MCPResponse> {
  const { id, method, params } = request;

  try {
    switch (method) {
      case "tools/list":
        return {
          jsonrpc: "2.0",
          id,
          result: {
            tools: [
              {
                name: "upload_text_file",
                description: "Upload a text file to the knowledge base",
                inputSchema: {
                  type: "object",
                  properties: {
                    filename: { type: "string" },
                    content: { type: "string", description: "Text content of the file" }
                  },
                  required: ["filename", "content"]
                }
              },
              {
                name: "search_knowledge_base",
                description: "Search through the knowledge base using natural language",
                inputSchema: {
                  type: "object",
                  properties: {
                    query: { type: "string" },
                    limit: { type: "number", default: 5 }
                  },
                  required: ["query"]
                }
              },
              {
                name: "list_files",
                description: "List all files in the knowledge base",
                inputSchema: { type: "object", properties: {} }
              },
              {
                name: "get_file_content",
                description: "Get the full content of a specific file",
                inputSchema: {
                  type: "object",
                  properties: {
                    fileId: { type: "string" }
                  },
                  required: ["fileId"]
                }
              }
            ]
          }
        };

      case "tools/call":
        const { name: toolName, arguments: toolArgs } = params;
        return await handleToolCall(toolName, toolArgs || {}, id, env);

      default:
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`
          }
        };
    }
  } catch (error) {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : "Internal error"
      }
    };
  }
}

// Handle tool calls
async function handleToolCall(toolName: string, args: any, id: string | number | null, env: Env): Promise<MCPResponse> {
  try {
    switch (toolName) {
      case "upload_text_file": {
        const { filename, content } = args;
        
        if (!filename || !content) {
          return {
            jsonrpc: "2.0",
            id,
            error: { code: -32602, message: "Missing required parameters: filename, content" }
          };
        }
        
        // Generate file ID
        const fileId = crypto.randomUUID();
        
        // Create file metadata
        const fileMetadata: FileMetadata = {
          id: fileId,
          filename,
          type: "txt",
          uploadedAt: new Date().toISOString(),
          size: content.length,
          content,
          summary: content.substring(0, 500) + (content.length > 500 ? '...' : '')
        };
        
        // Update knowledge base
        const kb = await getKnowledgeBase(env);
        kb.files.push(fileMetadata);
        await saveKnowledgeBase(env, kb);
        
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [{
              type: "text",
              text: `File "${filename}" uploaded successfully with ID: ${fileId}\\nContent length: ${content.length} characters`
            }]
          }
        };
      }

      case "search_knowledge_base": {
        const { query, limit = 5 } = args;
        
        if (!query) {
          return {
            jsonrpc: "2.0",
            id,
            error: { code: -32602, message: "Missing required parameter: query" }
          };
        }
        
        const kb = await getKnowledgeBase(env);
        const results = searchKnowledgeBase(kb, query, limit);
        
        const resultText = results.length > 0 
          ? `Found ${results.length} relevant files:\\n\\n` + 
            results.map(file => 
              `📄 **${file.filename}** (ID: ${file.id})\\n` +
              `   Uploaded: ${file.uploadedAt}\\n` +
              `   Size: ${file.size} characters\\n` +
              `   Summary: ${file.summary}\\n`
            ).join('\\n')
          : `No files found matching "${query}"`;
        
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [{
              type: "text",
              text: resultText
            }]
          }
        };
      }

      case "list_files": {
        const kb = await getKnowledgeBase(env);
        
        const resultText = kb.files.length > 0
          ? `Knowledge base contains ${kb.files.length} files:\\n\\n` +
            kb.files.map(file => 
              `📄 **${file.filename}** (ID: ${file.id})\\n` +
              `   Type: ${file.type}\\n` +
              `   Size: ${file.size} characters\\n` +
              `   Uploaded: ${file.uploadedAt}\\n` +
              `   Summary: ${file.summary}\\n`
            ).join('\\n')
          : "No files in the knowledge base yet.";
        
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [{
              type: "text",
              text: resultText
            }]
          }
        };
      }

      case "get_file_content": {
        const { fileId } = args;
        
        if (!fileId) {
          return {
            jsonrpc: "2.0",
            id,
            error: { code: -32602, message: "Missing required parameter: fileId" }
          };
        }
        
        const kb = await getKnowledgeBase(env);
        const file = kb.files.find(f => f.id === fileId);
        
        if (!file) {
          return {
            jsonrpc: "2.0",
            id,
            error: { code: -32603, message: "File not found" }
          };
        }
        
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [{
              type: "text",
              text: `**File: ${file.filename}**\\n\\nContent:\\n\\n${file.content}`
            }]
          }
        };
      }

      default:
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Unknown tool: ${toolName}`
          }
        };
    }
  } catch (error) {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : "Internal error"
      }
    };
  }
}

// Main Cloudflare Worker
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Handle MCP JSON-RPC requests on the root path
    if (request.method === 'POST' && url.pathname === '/') {
      try {
        const body = await request.json() as MCPRequest;
        
        // Validate JSON-RPC format
        if (body.jsonrpc !== "2.0") {
          return new Response(JSON.stringify({
            jsonrpc: "2.0",
            id: body.id || null,
            error: { code: -32600, message: "Invalid request: jsonrpc must be '2.0'" }
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
        
        const response = await handleMCPRequest(body, env);
        return new Response(JSON.stringify(response), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (error) {
        return new Response(JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: "Parse error" }
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    // Documentation page for GET requests
    if (request.method === 'GET' && url.pathname === '/') {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>📝 Public Text Knowledge Base MCP Server</title>
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
            pre { 
              background: #f1f3f4; 
              padding: 15px; 
              border-radius: 6px; 
              overflow-x: auto; 
              font-size: 14px;
            }
            .feature { background: #d1ecf1; padding: 15px; border-radius: 6px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="hero">
            <h1>📝 Public Text Knowledge Base</h1>
            <p>A Model Context Protocol server for sharing and searching text documents</p>
            <p><strong>🎉 MCP Server Ready!</strong></p>
          </div>
          
          <h2>🚀 Features</h2>
          <div class="feature">📄 <strong>Text File Storage</strong> - Upload and manage .txt documents</div>
          <div class="feature">🔍 <strong>Smart Search</strong> - Natural language queries to find relevant content</div>
          <div class="feature">🌐 <strong>Global Access</strong> - Available worldwide through Cloudflare's network</div>
          <div class="feature">🤖 <strong>Claude Integration</strong> - Full MCP protocol support</div>
          
          <h2>🔧 Claude Desktop Integration</h2>
          
          <p>To use this MCP server with Claude Desktop, save this bridge script and update your config:</p>
          
          <div class="endpoint">
            <strong>1. Save this as <code>mcp-bridge.js</code>:</strong>
            <pre>#!/usr/bin/env node

const SERVER_URL = "${url.origin}";

process.stdin.on('data', async (data) => {
  try {
    const message = JSON.parse(data.toString());
    
    const response = await fetch(SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
    
    const result = await response.json();
    process.stdout.write(JSON.stringify(result) + '\\n');
  } catch (error) {
    const errorResponse = {
      jsonrpc: '2.0',
      id: null,
      error: { code: -32603, message: error.message }
    };
    process.stdout.write(JSON.stringify(errorResponse) + '\\n');
  }
});</pre>
          </div>
          
          <div class="endpoint">
            <strong>2. Add to your Claude Desktop config:</strong>
            <p><code>~/Library/Application Support/Claude/claude_desktop_config.json</code></p>
            <pre>{
  "mcpServers": {
    "public-knowledge-base": {
      "command": "node",
      "args": ["/path/to/your/mcp-bridge.js"]
    }
  }
}</pre>
          </div>

          <h2>💡 Available Tools</h2>
          <ul>
            <li><strong>upload_text_file</strong> - Upload a new text file</li>
            <li><strong>search_knowledge_base</strong> - Search for documents</li>
            <li><strong>list_files</strong> - List all available files</li>
            <li><strong>get_file_content</strong> - Retrieve file content by ID</li>
          </ul>
          
          <p style="text-align: center; color: #6c757d; margin-top: 40px;">
            <small>Powered by Cloudflare Workers 🌟 | 
            <a href="https://github.com/modelcontextprotocol/specification" target="_blank">Learn about MCP</a>
            </small>
          </p>
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
