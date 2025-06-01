import { z } from "zod";

// Cloudflare Workers types
interface Env {
  KNOWLEDGE_BASE_KV: KVNamespace;
  KNOWLEDGE_BASE_R2: R2Bucket;
}

// Types for our knowledge base
interface FileMetadata {
  id: string;
  filename: string;
  type: "pdf" | "txt";
  uploadedAt: string;
  size: number;
  r2Key: string;
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
    const searchableText = `${file.filename} ${file.summary || ''}`.toLowerCase();
    
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
        name: "personal-knowledge-mcp-server",
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
            
            // Generate file ID and R2 key
            const fileId = crypto.randomUUID();
            const r2Key = `files/${fileId}`;
            
            // Store file in R2
            await env.KNOWLEDGE_BASE_R2.put(r2Key, buffer, {
              httpMetadata: {
                contentType: type === 'pdf' ? 'application/pdf' : 'text/plain'
              }
            });
            
            // Extract text content for indexing
            let extractedText = '';
            if (type === 'pdf') {
              extractedText = await extractTextFromPDF(buffer.buffer);
            } else {
              extractedText = new TextDecoder().decode(buffer);
            }
            
            // Create file metadata
            const fileMetadata: FileMetadata = {
              id: fileId,
              filename,
              type,
              uploadedAt: new Date().toISOString(),
              size: buffer.length,
              r2Key,
              summary: extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : '')
            };
            
            // Update knowledge base
            const kb = await getKnowledgeBase(env);
            kb.files.push(fileMetadata);
            await saveKnowledgeBase(env, kb);
            
            return new Response(JSON.stringify({
              success: true,
              fileId,
              message: `File "${filename}" uploaded successfully`
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
              results: results.map(file => ({
                id: file.id,
                filename: file.filename,
                type: file.type,
                uploadedAt: file.uploadedAt,
                summary: file.summary
              }))
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
            
            // Get file from R2
            const r2Object = await env.KNOWLEDGE_BASE_R2.get(file.r2Key);
            if (!r2Object) {
              return new Response(JSON.stringify({
                success: false,
                error: "File content not found in storage"
              }), {
                status: 404,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
              });
            }
            
            const buffer = await r2Object.arrayBuffer();
            let content = '';
            
            if (file.type === 'pdf') {
              content = await extractTextFromPDF(buffer);
            } else {
              content = new TextDecoder().decode(buffer);
            }
            
            return new Response(JSON.stringify({
              success: true,
              file: {
                id: file.id,
                filename: file.filename,
                type: file.type,
                content
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
          <title>Personal Knowledge Base MCP Server</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
            .endpoint { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
            .method { font-weight: bold; color: #2196F3; }
            pre { background: #f0f0f0; padding: 10px; border-radius: 3px; overflow-x: auto; }
            h1 { color: #333; }
            h2 { color: #666; }
          </style>
        </head>
        <body>
          <h1>🧠 Personal Knowledge Base MCP Server</h1>
          
          <p>This is a public MCP (Model Context Protocol) server that provides knowledge base functionality. 
          It allows users to upload PDF and text files, search through them, and retrieve content.</p>
          
          <h2>🌐 Public Endpoints</h2>
          
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
          
          <p>To use this MCP server with Claude Desktop, add this to your configuration:</p>
          
          <pre>{
  "mcpServers": {
    "public-knowledge": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-everything", "https://YOUR_WORKER_URL.workers.dev"]
    }
  }
}</pre>
          
          <p><em>Replace YOUR_WORKER_URL with your actual Cloudflare Workers domain.</em></p>
          
          <hr>
          <p><small>Powered by Cloudflare Workers 🌟</small></p>
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
