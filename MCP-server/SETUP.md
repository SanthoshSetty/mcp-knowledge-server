# Setup Guide for Personal Knowledge Base MCP Server

## Quick Start

### 1. Build the Project
```bash
npm run build
```

### 2. Test Local Server
```bash
npm start
```

### 3. Configure Claude Desktop

Add this configuration to your Claude Desktop config file:

**File Location**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "personal-knowledge": {
      "command": "node",
      "args": ["/Users/santhoshkumarsampangiramasetty/MCP-server/dist/index.js"]
    }
  }
}
```

**Important**: Replace the path with your actual project path!

### 4. Restart Claude Desktop

After saving the configuration file, completely restart Claude Desktop.

## Cloudflare Workers Deployment (Optional)

### Prerequisites
1. Cloudflare account with Workers enabled
2. Wrangler CLI installed globally: `npm install -g wrangler`

### Setup Steps

1. **Login to Cloudflare**:
   ```bash
   wrangler login
   ```

2. **Create KV namespace**:
   ```bash
   wrangler kv:namespace create "KNOWLEDGE_BASE_KV"
   wrangler kv:namespace create "KNOWLEDGE_BASE_KV" --preview
   ```

3. **Create R2 bucket**:
   ```bash
   wrangler r2 bucket create personal-knowledge-base
   ```

4. **Update `wrangler.toml`** with the actual KV namespace IDs from step 2.

5. **Deploy**:
   ```bash
   npm run deploy
   ```

## Usage Examples

Once connected to Claude Desktop, you can:

### Upload Files
- "Can you help me upload this PDF to my knowledge base?" (attach file)
- "I want to add this text document to my personal knowledge base"

### Search Knowledge Base
- "Search my documents for information about machine learning"
- "What files do I have about project management?"
- "Find documents mentioning 'API design'"

### Manage Information
- "List all files in my knowledge base"
- "Show me the content of file with ID xyz123"
- "Update my personal information - I'm a software engineer"

## Troubleshooting

### Claude Desktop Not Connecting
1. Check that the path in `claude_desktop_config.json` is absolute and correct
2. Ensure the project is built (`npm run build`)
3. Restart Claude Desktop completely
4. Check Claude Desktop logs: `~/Library/Logs/Claude/mcp*.log`

### Build Issues
1. Run `npm install` to ensure all dependencies are installed
2. Check TypeScript errors with `npx tsc --noEmit`
3. Ensure Node.js version is 16 or higher

### File Upload Problems
1. Ensure files are properly base64 encoded
2. Check file size limits (typically 10MB for PDFs)
3. Verify PDF files are not password-protected or corrupted

## Development

### Watch Mode
For development, use watch mode to automatically rebuild on changes:
```bash
npm run dev
```

### Debug Mode
Use VS Code's debug configuration "Debug MCP Server" to run with breakpoints.

## Security Notes

- Files are stored locally in memory for the local version
- For Cloudflare deployment, files are stored securely in R2 with metadata in KV
- No sensitive data is exposed through the MCP interface
- Consider implementing authentication for production use
