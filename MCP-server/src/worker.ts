import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import pdf from "pdf-parse";

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
        name: "Personal Knowledge Base",
        description: "A collection of personal documents and information",
        background: "This knowledge base contains various documents and files that represent personal knowledge, experiences, and information."
      }
    };
  }
  return stored as KnowledgeBase;
}

// Helper function to save knowledge base to KV
async function saveKnowledgeBase(env: Env, knowledgeBase: KnowledgeBase): Promise<void> {
  await env.KNOWLEDGE_BASE_KV.put("knowledge_base", JSON.stringify(knowledgeBase));
}

// Helper function to search through files
async function searchFiles(env: Env, query: string, limit: number = 5): Promise<Array<FileMetadata & {content: string}>> {
  const knowledgeBase = await getKnowledgeBase(env);
  const searchTerm = query.toLowerCase();
  const results: Array<FileMetadata & {content: string}> = [];
  
  for (const file of knowledgeBase.files) {
    if (results.length >= limit) break;
    
    if (file.filename.toLowerCase().includes(searchTerm) ||
        (file.summary && file.summary.toLowerCase().includes(searchTerm))) {
      
      // Get file content from R2
      const object = await env.KNOWLEDGE_BASE_R2.get(file.r2Key);
      if (object) {
        const content = await object.text();
        if (content.toLowerCase().includes(searchTerm)) {
          results.push({ ...file, content });
        }
      }
    }
  }
  
  return results;
}

// Create MCP server for Cloudflare Workers
function createMCPServer(env: Env) {
  const server = new McpServer({
    name: "personal-knowledge-mcp-server",
    version: "1.0.0",
    capabilities: {
      resources: {},
      tools: {},
    },
  });

  server.tool(
    "upload-file",
    "Upload a PDF or TXT file to the personal knowledge base",
    {
      filename: z.string().describe("Name of the file"),
      content: z.string().describe("Base64 encoded file content"),
      type: z.enum(["pdf", "txt"]).describe("File type (pdf or txt)"),
    },
    async ({ filename, content, type }) => {
      try {
        const buffer = Buffer.from(content, 'base64');
        const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const r2Key = `${fileId}_${filename}`;
        
        let extractedText = "";
        if (type === "pdf") {
          extractedText = await extractTextFromPDF(buffer.buffer);
        } else {
          extractedText = buffer.toString('utf-8');
        }

        // Store file content in R2
        await env.KNOWLEDGE_BASE_R2.put(r2Key, extractedText);

        const fileMetadata: FileMetadata = {
          id: fileId,
          filename,
          type,
          uploadedAt: new Date().toISOString(),
          size: buffer.length,
          r2Key,
          summary: extractedText.substring(0, 500) + (extractedText.length > 500 ? "..." : "")
        };

        const knowledgeBase = await getKnowledgeBase(env);
        knowledgeBase.files.push(fileMetadata);
        await saveKnowledgeBase(env, knowledgeBase);

        return {
          content: [
            {
              type: "text",
              text: `Successfully uploaded ${filename}. File ID: ${fileMetadata.id}. Extracted ${extractedText.length} characters of text.`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error uploading file: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ]
        };
      }
    }
  );

  server.tool(
    "search-knowledge",
    "Search through the personal knowledge base",
    {
      query: z.string().describe("Search query to find relevant documents"),
      limit: z.number().optional().default(5).describe("Maximum number of results to return"),
    },
    async ({ query, limit = 5 }) => {
      const results = await searchFiles(env, query, limit);
      
      if (results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No documents found matching "${query}"`
            }
          ]
        };
      }

      const resultText = results.map(file => 
        `**${file.filename}** (${file.type.toUpperCase()})
Uploaded: ${new Date(file.uploadedAt).toLocaleDateString()}
Size: ${file.size} bytes
Summary: ${file.summary || 'No summary available'}
---`
      ).join('\n\n');

      return {
        content: [
          {
            type: "text",
            text: `Found ${results.length} document(s) matching "${query}":\n\n${resultText}`
          }
        ]
      };
    }
  );

  server.tool(
    "get-file-content",
    "Get the full text content of a specific file by ID",
    {
      fileId: z.string().describe("The ID of the file to retrieve"),
    },
    async ({ fileId }) => {
      const knowledgeBase = await getKnowledgeBase(env);
      const file = knowledgeBase.files.find(f => f.id === fileId);
      
      if (!file) {
        return {
          content: [
            {
              type: "text",
              text: `File with ID "${fileId}" not found`
            }
          ]
        };
      }

      const object = await env.KNOWLEDGE_BASE_R2.get(file.r2Key);
      if (!object) {
        return {
          content: [
            {
              type: "text",
              text: `File content not found in storage for ID "${fileId}"`
            }
          ]
        };
      }

      const content = await object.text();

      return {
        content: [
          {
            type: "text",
            text: `**${file.filename}** (${file.type.toUpperCase()})
Uploaded: ${new Date(file.uploadedAt).toLocaleDateString()}
Size: ${file.size} bytes

**Full Content:**
${content}`
          }
        ]
      };
    }
  );

  server.tool(
    "list-files",
    "List all files in the personal knowledge base",
    {},
    async () => {
      const knowledgeBase = await getKnowledgeBase(env);
      
      if (knowledgeBase.files.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No files have been uploaded to the knowledge base yet."
            }
          ]
        };
      }

      const fileList = knowledgeBase.files.map(file => 
        `• **${file.filename}** (${file.type.toUpperCase()}) - ID: ${file.id}
  Uploaded: ${new Date(file.uploadedAt).toLocaleDateString()}
  Size: ${file.size} bytes`
      ).join('\n\n');

      return {
        content: [
          {
            type: "text",
            text: `**Personal Knowledge Base Files** (${knowledgeBase.files.length} total):\n\n${fileList}`
          }
        ]
      };
    }
  );

  server.tool(
    "get-owner-info",
    "Get information about the knowledge base owner",
    {},
    async () => {
      const knowledgeBase = await getKnowledgeBase(env);
      
      return {
        content: [
          {
            type: "text",
            text: `**Knowledge Base Owner Information:**

**Name:** ${knowledgeBase.owner.name}
**Description:** ${knowledgeBase.owner.description}
**Background:** ${knowledgeBase.owner.background}

**Statistics:**
- Total files: ${knowledgeBase.files.length}
- PDF files: ${knowledgeBase.files.filter(f => f.type === 'pdf').length}
- Text files: ${knowledgeBase.files.filter(f => f.type === 'txt').length}`
          }
        ]
      };
    }
  );

  server.tool(
    "update-owner-info",
    "Update the knowledge base owner information",
    {
      name: z.string().optional().describe("Owner's name"),
      description: z.string().optional().describe("Description of the owner"),
      background: z.string().optional().describe("Background information about the owner"),
    },
    async ({ name, description, background }) => {
      const knowledgeBase = await getKnowledgeBase(env);
      
      if (name) knowledgeBase.owner.name = name;
      if (description) knowledgeBase.owner.description = description;
      if (background) knowledgeBase.owner.background = background;
      
      await saveKnowledgeBase(env, knowledgeBase);

      return {
        content: [
          {
            type: "text",
            text: `Successfully updated owner information:
**Name:** ${knowledgeBase.owner.name}
**Description:** ${knowledgeBase.owner.description}
**Background:** ${knowledgeBase.owner.background}`
          }
        ]
      };
    }
  );

  return server;
}

// Cloudflare Workers export
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // This is for HTTP-based MCP server (future implementation)
    return new Response("Personal Knowledge MCP Server - Cloudflare Workers", {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  },
};
