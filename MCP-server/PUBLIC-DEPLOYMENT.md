# 🌐 Public MCP Server Deployment Guide

This guide shows you how to deploy your Personal Knowledge Base MCP Server to Cloudflare Workers, making it publicly accessible to anyone.

## 🎯 Two Deployment Options

### Option 1: Local MCP Server (Current Setup)
- Runs locally on your machine
- Only you can access it through Claude Desktop
- No cloud infrastructure needed

### Option 2: Public MCP Server (New Setup)
- Deployed to Cloudflare Workers
- Accessible to anyone worldwide
- Users can integrate with their Claude Desktop
- Shared knowledge base

## 🚀 Deploying the Public Version

### Step 1: Cloudflare Setup

1. **Login to Cloudflare**:
   ```bash
   npm run setup:cloudflare
   npx wrangler login
   ```

2. **Create KV Namespace** (for metadata storage):
   ```bash
   npx wrangler kv:namespace create "KNOWLEDGE_BASE_KV"
   npx wrangler kv:namespace create "KNOWLEDGE_BASE_KV" --preview
   ```
   
   This will output namespace IDs like:
   ```
   { binding = "KNOWLEDGE_BASE_KV", id = "abc123...", preview_id = "def456..." }
   ```

3. **Create R2 Bucket** (for file storage):
   ```bash
   npx wrangler r2 bucket create public-knowledge-base
   ```

4. **Update Configuration**:
   Edit `wrangler-public.toml` and replace the placeholder IDs with your actual ones:
   ```toml
   [[kv_namespaces]]
   binding = "KNOWLEDGE_BASE_KV"
   id = "your-actual-kv-namespace-id"
   preview_id = "your-actual-preview-kv-namespace-id"
   ```

### Step 2: Deploy

```bash
npm run deploy:public
```

Your server will be deployed to: `https://public-knowledge-mcp-server.YOUR_SUBDOMAIN.workers.dev`

## 🔧 How Users Connect

### For Claude Desktop Users

Users can add your public MCP server to their Claude Desktop by adding this to their `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "public-knowledge": {
      "command": "node",
      "args": ["-e", "
        const https = require('https');
        const url = 'https://YOUR_WORKER_URL.workers.dev';
        
        process.stdin.on('data', async (data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.method === 'tools/list') {
              // Handle tool listing
              const response = await fetch(url + '/mcp/info');
              const info = await response.json();
              console.log(JSON.stringify({
                jsonrpc: '2.0',
                id: message.id,
                result: { tools: Object.keys(info.capabilities.tools).map(name => ({
                  name,
                  description: info.capabilities.tools[name].description,
                  inputSchema: info.capabilities.tools[name].parameters
                })) }
              }));
            } else if (message.method === 'tools/call') {
              // Handle tool execution
              const response = await fetch(url + '/mcp/call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  tool: message.params.name,
                  parameters: message.params.arguments
                })
              });
              const result = await response.json();
              console.log(JSON.stringify({
                jsonrpc: '2.0',
                id: message.id,
                result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
              }));
            }
          } catch (error) {
            console.log(JSON.stringify({
              jsonrpc: '2.0',
              id: message.id,
              error: { code: -1, message: error.message }
            }));
          }
        });
      "]
    }
  }
}
```

### Alternative: HTTP-based MCP Client

For advanced users, they can also interact directly with the HTTP API:

```bash
# Get server info
curl https://YOUR_WORKER_URL.workers.dev/mcp/info

# Search knowledge base
curl -X POST https://YOUR_WORKER_URL.workers.dev/mcp/call \
  -H "Content-Type: application/json" \
  -d '{"tool": "search-knowledge", "parameters": {"query": "machine learning"}}'

# Upload a file
curl -X POST https://YOUR_WORKER_URL.workers.dev/mcp/call \
  -H "Content-Type: application/json" \
  -d '{"tool": "upload-file", "parameters": {"filename": "doc.txt", "content": "SGVsbG8gV29ybGQ=", "type": "txt"}}'
```

## 🌟 Features of the Public Version

### For End Users:
- **Upload files**: PDF and TXT documents
- **Search knowledge**: Natural language queries
- **List files**: See all available documents
- **Get content**: Retrieve full text from files
- **Web interface**: Visit the worker URL for documentation

### For You (Admin):
- **Shared knowledge base**: Everyone contributes to the same pool
- **Global accessibility**: Available 24/7 worldwide
- **Automatic scaling**: Cloudflare handles traffic spikes
- **Cost-effective**: Pay only for usage

## 🔒 Security Considerations

### Current Setup (Open Access):
- Anyone can upload files
- Anyone can access all files
- No authentication required

### Adding Authentication (Recommended for Production):

1. **Add API Key Authentication**:
   ```typescript
   // In public-worker.ts
   if (!request.headers.get('Authorization')?.startsWith('Bearer ')) {
     return new Response('Unauthorized', { status: 401 });
   }
   ```

2. **User-specific Storage**:
   ```typescript
   // Prefix files with user ID
   const r2Key = `users/${userId}/files/${fileId}`;
   ```

3. **Rate Limiting**:
   ```typescript
   // Implement rate limiting per IP
   const clientIP = request.headers.get('CF-Connecting-IP');
   ```

## 📊 Monitoring & Analytics

After deployment, you can monitor usage at:
- Cloudflare Dashboard > Workers > Your Worker
- View metrics for requests, errors, and performance
- Set up alerts for issues

## 🎉 Sharing Your MCP Server

Once deployed, you can share your MCP server by:

1. **Providing the Worker URL**: `https://YOUR_WORKER_URL.workers.dev`
2. **Sharing the Claude Desktop config snippet**
3. **Creating documentation**: The worker URL serves automatic documentation
4. **Community sharing**: Post on MCP community forums

## 📝 Next Steps

1. Deploy and test the public version
2. Add authentication if needed
3. Create user documentation
4. Share with the community
5. Monitor usage and performance
6. Iterate based on user feedback

Your MCP server will be available globally and can serve thousands of users simultaneously! 🚀
