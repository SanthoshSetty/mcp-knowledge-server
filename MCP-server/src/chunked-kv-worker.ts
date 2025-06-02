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
  summary?: string;
  chunks: number; // Number of chunks this file is split into
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

// Split large content into chunks that fit in KV storage
function splitContentIntoChunks(content: string, maxChunkSize: number = 20 * 1024 * 1024): string[] {
  const chunks: string[] = [];
  let currentIndex = 0;
  
  while (currentIndex < content.length) {
    const chunk = content.slice(currentIndex, currentIndex + maxChunkSize);
    chunks.push(chunk);
    currentIndex += maxChunkSize;
  }
  
  return chunks;
}

// Reconstruct content from chunks stored in KV
async function getFileContent(env: Env, fileId: string, totalChunks: number): Promise<string> {
  const chunks: string[] = [];
  
  for (let i = 0; i < totalChunks; i++) {
    const chunkKey = `file_content_${fileId}_chunk_${i}`;
    const chunk = await env.KNOWLEDGE_BASE_KV.get(chunkKey);
    if (chunk === null) {
      throw new Error(`Missing chunk ${i} for file ${fileId}`);
    }
    chunks.push(chunk);
  }
  
  return chunks.join('');
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
        description: "A KV-based MCP server with large file support via chunking",
        capabilities: {
          tools: {
            "upload-file": {
              description: "Upload a text file to the knowledge base (supports large files)",
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
            
            // Generate file ID
            const fileId = crypto.randomUUID();
            
            // Split content into chunks that fit in KV storage (20MB chunks to be safe)
            const chunks = splitContentIntoChunks(extractedText, 20 * 1024 * 1024);
            
            // Store each chunk in KV
            for (let i = 0; i < chunks.length; i++) {
              const chunkKey = `file_content_${fileId}_chunk_${i}`;
              await env.KNOWLEDGE_BASE_KV.put(chunkKey, chunks[i]);
            }
            
            // Create file metadata
            const fileMetadata: FileMetadata = {
              id: fileId,
              filename,
              type: "txt",
              uploadedAt: new Date().toISOString(),
              size: extractedText.length,
              chunks: chunks.length,
              summary: extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : '')
            };
            
            // Update knowledge base
            const kb = await getKnowledgeBase(env);
            kb.files.push(fileMetadata);
            await saveKnowledgeBase(env, kb);
            
            return new Response(JSON.stringify({
              success: true,
              fileId,
              message: `File "${filename}" uploaded successfully in ${chunks.length} chunks`,
              extractedLength: extractedText.length,
              chunks: chunks.length
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
                summary: file.summary,
                chunks: file.chunks
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
                chunks: file.chunks,
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
            
            // Reconstruct content from chunks
            const content = await getFileContent(env, fileId, file.chunks);
            
            return new Response(JSON.stringify({
              success: true,
              file: {
                id: file.id,
                filename: file.filename,
                type: file.type,
                content: content,
                chunks: file.chunks
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
            
            const deletedFile = kb.files[fileIndex];
            
            // Delete all chunks from KV
            for (let i = 0; i < deletedFile.chunks; i++) {
              const chunkKey = `file_content_${fileId}_chunk_${i}`;
              await env.KNOWLEDGE_BASE_KV.delete(chunkKey);
            }
            
            // Remove the file from the knowledge base
            kb.files.splice(fileIndex, 1);
            await saveKnowledgeBase(env, kb);
            
            return new Response(JSON.stringify({
              success: true,
              message: `File "${deletedFile.filename}" (ID: ${fileId}) has been deleted successfully`,
              deletedFile: {
                id: deletedFile.id,
                filename: deletedFile.filename,
                type: deletedFile.type,
                size: deletedFile.size,
                chunks: deletedFile.chunks
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

    // Homepage
    if (url.pathname === '/') {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Personal Knowledge Base MCP Server</title>
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
              background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
              color: white;
              padding: 40px 20px;
              border-radius: 12px;
              margin-bottom: 40px;
            }
            .feature { 
              background: #e7f3ff; 
              padding: 15px; 
              border-radius: 6px; 
              margin: 10px 0; 
              border-left: 4px solid #007bff;
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
          </style>
        </head>
        <body>
          <div class="hero">
            <h1>Personal Knowledge Base</h1>
            <p>MCP server with chunked storage for large files</p>
            <p><strong>KV-based with unlimited file size support!</strong></p>
          </div>
          
          <div class="stats">
            <div class="stat-card">
              <div class="stat-number" id="file-count">...</div>
              <div>Files Stored</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">ONLINE</div>
              <div>Status</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">CHUNKED</div>
              <div>Storage</div>
            </div>
          </div>

          <h2>Features</h2>
          <div class="feature"><strong>Large File Support</strong> - Files are automatically split into 20MB chunks</div>
          <div class="feature"><strong>KV Storage</strong> - Uses Cloudflare KV with automatic chunking</div>
          <div class="feature"><strong>Smart Reconstruction</strong> - Files are seamlessly reassembled when accessed</div>
          <div class="feature"><strong>MCP Compatible</strong> - Works with Claude Desktop via MCP protocol</div>
          
          <h2>Technical Details</h2>
          <p>This server splits large files into 20MB chunks to work within Cloudflare KV storage limits. Each file is stored as multiple KV entries and reconstructed when accessed.</p>
          
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
          </script>
        </body>
        </html>
      `;
      
      return new Response(html, {
        headers: { 'Content-Type': 'text/html', ...corsHeaders }
      });
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  }
};
