#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
// Dynamic import to avoid initialization issues
// import pdf from "pdf-parse";

// Types for our knowledge base
interface FileMetadata {
  id: string;
  filename: string;
  type: "pdf" | "txt";
  uploadedAt: string;
  size: number;
  extractedText: string;
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

// Mock knowledge base (in production, this would be stored in Cloudflare KV/R2)
let knowledgeBase: KnowledgeBase = {
  files: [],
  owner: {
    name: "Personal Knowledge Base",
    description: "A collection of personal documents and information",
    background: "This knowledge base contains various documents and files that represent personal knowledge, experiences, and information."
  }
};

// Create server instance
const server = new McpServer({
  name: "personal-knowledge-mcp-server",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

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

// Helper function to search through knowledge base
function searchKnowledgeBase(query: string, limit: number = 5): FileMetadata[] {
  const searchTerm = query.toLowerCase();
  return knowledgeBase.files
    .filter(file => 
      file.filename.toLowerCase().includes(searchTerm) ||
      file.extractedText.toLowerCase().includes(searchTerm) ||
      (file.summary && file.summary.toLowerCase().includes(searchTerm))
    )
    .slice(0, limit);
}

// Register tools
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
      let extractedText = "";

      if (type === "pdf") {
        extractedText = await extractTextFromPDF(buffer.buffer);
      } else {
        extractedText = buffer.toString('utf-8');
      }

      const fileMetadata: FileMetadata = {
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        filename,
        type,
        uploadedAt: new Date().toISOString(),
        size: buffer.length,
        extractedText,
        summary: extractedText.substring(0, 500) + (extractedText.length > 500 ? "..." : "")
      };

      knowledgeBase.files.push(fileMetadata);

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
    const results = searchKnowledgeBase(query, limit);
    
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

    return {
      content: [
        {
          type: "text",
          text: `**${file.filename}** (${file.type.toUpperCase()})
Uploaded: ${new Date(file.uploadedAt).toLocaleDateString()}
Size: ${file.size} bytes

**Full Content:**
${file.extractedText}`
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
- Text files: ${knowledgeBase.files.filter(f => f.type === 'txt').length}
- Total content: ${knowledgeBase.files.reduce((sum, f) => sum + f.extractedText.length, 0)} characters`
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
    if (name) knowledgeBase.owner.name = name;
    if (description) knowledgeBase.owner.description = description;
    if (background) knowledgeBase.owner.background = background;

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

// Main function to run the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Personal Knowledge MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
