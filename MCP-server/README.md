# Personal Knowledge Base MCP Server

A Model Context Protocol (MCP) server that provides personal knowledge base functionality with PDF/TXT file storage. This server can be deployed on Cloudflare Workers and allows Claude Desktop users to interact with your personal documents and information.

## Features

- **File Upload**: Upload PDF and TXT files to your personal knowledge base
- **Intelligent Search**: Search through your documents using natural language queries
- **Content Extraction**: Automatic text extraction from PDF files
- **Cloud Storage**: Files stored securely on Cloudflare R2 with metadata in KV storage
- **Owner Information**: Manage personal information and background for AI interactions
- **Claude Desktop Integration**: Seamlessly works with Claude Desktop for natural conversations

## Available Tools

### 1. `upload-file`
Upload a PDF or TXT file to your knowledge base.
- **Parameters**: `filename`, `content` (base64), `type` (pdf/txt)

### 2. `search-knowledge`
Search through your documents using natural language queries.
- **Parameters**: `query`, `limit` (optional)

### 3. `get-file-content`
Retrieve the full text content of a specific file by ID.
- **Parameters**: `fileId`

### 4. `list-files`
List all files in your knowledge base with metadata.

### 5. `get-owner-info`
Get information about the knowledge base owner.

### 6. `update-owner-info`
Update your personal information for better AI interactions.
- **Parameters**: `name`, `description`, `background` (all optional)

## 🚀 Quick Start

### Option 1: Local MCP Server (Private)
```bash
npm install       # Install dependencies
npm run build     # Build the project
npm start         # Run locally
# Configure Claude Desktop (see SETUP.md)
```

### Option 2: Public MCP Server (Shared)
```bash
npm run setup:cloudflare  # Follow setup instructions
npm run deploy:public     # Deploy to Cloudflare Workers
# Share with others (see PUBLIC-DEPLOYMENT.md)
```

## Local Development Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build the project**:
   ```bash
   npm run build
   ```

3. **Start the development server**:
   ```bash
   npm start
   ```

## Cloudflare Workers Deployment

1. **Install Wrangler CLI**:
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**:
   ```bash
   wrangler login
   ```

3. **Create KV namespace**:
   ```bash
   wrangler kv:namespace create "KNOWLEDGE_BASE_KV"
   wrangler kv:namespace create "KNOWLEDGE_BASE_KV" --preview
   ```

4. **Create R2 bucket**:
   ```bash
   wrangler r2 bucket create personal-knowledge-base
   ```

5. **Update wrangler.toml** with your actual KV namespace IDs.

6. **Deploy to Cloudflare Workers**:
   ```bash
   npm run deploy
   ```

## Claude Desktop Integration

To use this MCP server with Claude Desktop, add the following configuration to your Claude Desktop configuration file:

**Location**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "personal-knowledge": {
      "command": "node",
      "args": ["/absolute/path/to/your/project/dist/index.js"]
    }
  }
}
```

After adding the configuration:
1. Save the file
2. Restart Claude Desktop
3. Look for the tools icon in Claude Desktop to confirm the server is connected

## Usage Examples

Once connected to Claude Desktop, you can interact with your knowledge base naturally:

- "Upload this PDF file to my knowledge base" (with file attachment)
- "Search for documents about machine learning"
- "What files do I have in my knowledge base?"
- "Show me the content of file ID xyz123"
- "Update my personal information - I'm a software engineer with 5 years of experience"

## Architecture

- **MCP Server**: Handles tool registration and communication with Claude Desktop
- **Cloudflare Workers**: Provides serverless hosting for global accessibility
- **Cloudflare R2**: Stores actual file content (PDFs, text files)
- **Cloudflare KV**: Stores file metadata and search indexes
- **PDF Processing**: Extracts text content from PDF files for searchability

## Security Notes

- Files are stored securely in Cloudflare R2
- Metadata is stored in Cloudflare KV
- No sensitive data is exposed through the MCP interface
- All file access is controlled through the MCP server

## Development Scripts

- `npm run build` - Build TypeScript to JavaScript
- `npm run dev` - Watch mode for development
- `npm start` - Start the MCP server locally
- `npm run deploy` - Deploy to Cloudflare Workers

## Troubleshooting

1. **Server not connecting to Claude Desktop**:
   - Check that the path in `claude_desktop_config.json` is absolute
   - Ensure the project is built (`npm run build`)
   - Restart Claude Desktop after configuration changes

2. **File upload errors**:
   - Ensure files are properly base64 encoded
   - Check file size limits
   - Verify Cloudflare R2 bucket permissions

3. **Search not working**:
   - Verify KV namespace is properly configured
   - Check that text extraction from PDFs is working
   - Ensure content is being stored in R2

## Contributing

This is a personal knowledge base server. Feel free to fork and customize for your own needs.

## License

ISC License - see package.json for details.
