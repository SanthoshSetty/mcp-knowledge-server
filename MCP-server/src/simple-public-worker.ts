import { z } from "zod";

// Cloudflare Workers types
interface Env {
  KNOWLEDGE_BASE_KV: KVNamespace;
}

// Types for our knowledge base
interface FileMetadata {
  id: string;
  filename: string;
  type: "pdf" | "txt";
  uploadedAt: string;
  size: number;
  content: string; // Store content directly in KV for now
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

// Helper function to extract text from PDF buffer
async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  try {
    const pdf = (await import("pdf-parse")).default;
    const data = await pdf(Buffer.from(buffer));
    return data.text;
  } catch (error) {
    console.error("Error extracting PDF text:", error);
    return "";
  }
}

// Helper function to get knowledge base from KV
async function getKnowledgeBase(env: Env): Promise<KnowledgeBase> {
  const stored = await env.KNOWLEDGE_BASE_KV.get("knowledge_base", "json");
  if (!stored) {
    return {
      files: [],
      owner: {
        name: "Public Knowledge Base",
        description: "A shared collection of documents and information",
        background: "This knowledge base contains various documents and files that can be searched and accessed by users."
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

    // Server info endpoint
    if (url.pathname === '/mcp/info') {
      return new Response(JSON.stringify({
        name: "public-knowledge-mcp-server",
        version: "1.0.0",
        capabilities: {
          tools: {
            "upload-file": {
              description: "Upload a PDF or TXT file to the knowledge base",
              parameters: {
                type: "object",
                properties: {
                  filename: { type: "string" },
                  content: { type: "string", description: "Base64 encoded file content" },
                  type: { type: "string", enum: ["pdf", "txt"] }
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
            
            // Decode base64 content
            const buffer = Uint8Array.from(atob(content), c => c.charCodeAt(0));
            
            // Extract text content for indexing
            let extractedText = '';
            if (type === 'pdf') {
              extractedText = await extractTextFromPDF(buffer.buffer);
            } else {
              extractedText = new TextDecoder().decode(buffer);
            }
            
            // Generate file ID
            const fileId = crypto.randomUUID();
            
            // Create file metadata (store content in KV for simplicity)
            const fileMetadata: FileMetadata = {
              id: fileId,
              filename,
              type,
              uploadedAt: new Date().toISOString(),
              size: buffer.length,
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
          <title>🧠 Public Knowledge Base MCP Server</title>
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
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
              border-left: 4px solid #007bff;
            }
            .method { 
              font-weight: bold; 
              color: #007bff; 
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
              color: #007bff; 
            }
            h2 { color: #495057; margin-top: 40px; }
            .feature { background: #e3f2fd; padding: 15px; border-radius: 6px; margin: 10px 0; }
            .integration-code { background: #2d3748; color: #e2e8f0; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="hero">
            <h1>🧠 Public Knowledge Base MCP Server</h1>
            <p>A powerful Model Context Protocol server for sharing and searching documents</p>
          </div>
          
          <div class="stats">
            <div class="stat-card">
              <div class="stat-number" id="file-count">0</div>
              <div>Files Stored</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">24/7</div>
              <div>Availability</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">∞</div>
              <div>Global Access</div>
            </div>
          </div>

          <h2>🚀 Features</h2>
          <div class="feature">📄 <strong>PDF & Text Support</strong> - Upload and search through PDF and text documents</div>
          <div class="feature">🔍 <strong>Smart Search</strong> - Natural language queries to find relevant content</div>
          <div class="feature">🌐 <strong>Global Access</strong> - Available worldwide through Cloudflare's network</div>
          <div class="feature">🤖 <strong>Claude Integration</strong> - Works seamlessly with Claude Desktop</div>
          
          <h2>🌐 API Endpoints</h2>
          
          <div class="endpoint">
            <div class="method">GET</div>
            <strong>/mcp/info</strong> - Get server capabilities and tool definitions
          </div>
          
          <div class="endpoint">
            <div class="method">POST</div>
            <strong>/mcp/call</strong> - Execute MCP tools
            <pre>Content-Type: application/json

{
  "tool": "tool_name",
  "parameters": { /* tool parameters */ }
}</pre>
          </div>
          
          <h2>🛠️ Available Tools</h2>
          
          <div class="endpoint">
            <strong>upload-file</strong> - Upload a PDF or TXT file
            <pre>{
  "tool": "upload-file",
  "parameters": {
    "filename": "document.pdf",
    "content": "base64_encoded_content",
    "type": "pdf"
  }
}</pre>
          </div>
          
          <div class="endpoint">
            <strong>search-knowledge</strong> - Search through documents
            <pre>{
  "tool": "search-knowledge",
  "parameters": {
    "query": "machine learning",
    "limit": 5
  }
}</pre>
          </div>
          
          <div class="endpoint">
            <strong>list-files</strong> - List all uploaded files
            <pre>{
  "tool": "list-files",
  "parameters": {}
}</pre>
          </div>
          
          <div class="endpoint">
            <strong>get-file-content</strong> - Get full content of a file
            <pre>{
  "tool": "get-file-content",
  "parameters": {
    "fileId": "file-uuid"
  }
}</pre>
          </div>
          
          <h2>🔧 Integration with Claude Desktop</h2>
          
          <p>Add this configuration to your Claude Desktop config file:</p>
          <p><strong>File:</strong> <code>~/Library/Application Support/Claude/claude_desktop_config.json</code></p>
          
          <pre class="integration-code">{
  "mcpServers": {
    "public-knowledge": {
      "command": "node",
      "args": ["${url.origin}/http-mcp-bridge.js", "${url.origin}"]
    }
  }
}</pre>
          
          <h2>💡 Example Usage</h2>
          
          <div class="endpoint">
            <p>Try these commands in Claude Desktop after connecting:</p>
            <ul>
              <li>"Upload this document to the knowledge base" (with file attachment)</li>
              <li>"Search for documents about artificial intelligence"</li>
              <li>"List all available files"</li>
              <li>"Show me the content of file ID xyz123"</li>
            </ul>
          </div>
          
          <hr style="margin: 40px 0; border: none; border-top: 1px solid #dee2e6;">
          <p style="text-align: center; color: #6c757d;">
            <small>Powered by Cloudflare Workers 🌟 | 
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
            .catch(() => {});
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
