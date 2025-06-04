# 🌐 Personal MCP Server - Cloudflare Workers Deployment

✅ **DEPLOYED SUCCESSFULLY!** Your Personal AI Assistant MCP Server is now live at:

## 🎉 **https://personal-mcp-worker.santhoshkumar199.workers.dev**

---

## 🔗 Connection Instructions

### For AI Applications (Claude, ChatGPT, etc.)

**MCP Server URL:** `https://personal-mcp-worker.santhoshkumar199.workers.dev/mcp`

Add this to your MCP client configuration:

```json
{
  "servers": {
    "personal-assistant": {
      "command": "mcp-http-client",
      "args": ["https://personal-mcp-worker.santhoshkumar199.workers.dev/mcp"]
    }
  }
}
```

### For Web Browser Testing

Visit: **https://personal-mcp-worker.santhoshkumar199.workers.dev**

The web interface provides:
- Interactive API documentation
- Live endpoint testing
- Knowledge base statistics
- Connection examples

---

## 📊 API Endpoints

| Endpoint | Description | Example |
|----------|-------------|---------|
| `/api/search?q=query` | Search knowledge base | `/api/search?q=github` |
| `/api/github/projects` | Get GitHub repositories | `/api/github/projects` |
| `/api/linkedin/activity` | LinkedIn posts/articles | `/api/linkedin/activity` |
| `/api/timeline` | Personal development timeline | `/api/timeline` |
| `/api/knowledge` | Add new knowledge | POST with JSON data |
| `/api/analytics/growth` | Growth pattern analysis | `/api/analytics/growth` |
| `/mcp` | MCP JSON-RPC endpoint | For MCP clients |
| `/sse` | Server-Sent Events | Real-time updates |

---

## 🚀 Deployment Guide

### Step 1: Install Dependencies
```bash
cd cloudflare
npm install
```

### Step 2: Login to Cloudflare
```bash
npx wrangler login
```

### Step 3: Create KV Namespace
```bash
# Create production KV namespace
npx wrangler kv:namespace create "KNOWLEDGE_BASE"

# Create preview KV namespace  
npx wrangler kv:namespace create "KNOWLEDGE_BASE" --preview
```

### Step 4: Create R2 Bucket
```bash
# Create R2 bucket for file storage
npx wrangler r2 bucket create personal-mcp-files
```

### Step 5: Update wrangler.toml
Update the KV namespace IDs in `wrangler.toml` with the IDs from step 3:

```toml
[[kv_namespaces]]
binding = "KNOWLEDGE_BASE"
id = "your-actual-kv-namespace-id"
preview_id = "your-actual-preview-kv-namespace-id"
```

### Step 6: Migrate Your Data
```bash
# Upload your knowledge base to Cloudflare KV
node migrate-data.js
```

### Step 7: Deploy
```bash
npm run deploy
```

## 🎯 Your Deployed MCP Server

After deployment, your server will be available at:
```
https://personal-mcp-worker.your-account.workers.dev
```

### Available Endpoints:

**🏠 Main Page:**
- `GET /` - API documentation and overview

**🔍 Search API:**
- `GET /api/search?q=typescript&category=github-projects&limit=5`
- Search across your personal knowledge base

**📁 GitHub Projects:**
- `GET /api/github/projects?language=TypeScript&topic=MCP`
- Get your GitHub repositories with filtering

**💼 LinkedIn Activity:**
- `GET /api/linkedin/activity?type=posts&timeframe=month`
- Retrieve your professional LinkedIn content

**📊 Timeline:**
- `GET /api/timeline?timeframe=year&focus=technical`
- Get chronological view of your development

**➕ Add Knowledge:**
- `POST /api/knowledge`
- Add new entries to your knowledge base

**📈 Growth Analytics:**
- `GET /api/analytics/growth?dimension=skills`
- Analyze your professional growth patterns

**🤖 MCP Protocol:**
- `POST /mcp` - JSON-RPC endpoint for MCP clients
- `GET /sse` - Server-Sent Events for real-time connections

## 🔗 Integration Examples

### Claude Desktop Integration
Update your Claude Desktop config to use the remote server:

```json
{
  "mcpServers": {
    "personal-ai-assistant": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://personal-mcp-worker.your-account.workers.dev/sse"
      ]
    }
  }
}
```

### JavaScript/Web Integration
```javascript
// Search your knowledge base
const response = await fetch('https://personal-mcp-worker.your-account.workers.dev/api/search?q=typescript');
const results = await response.json();

// Get GitHub projects
const projects = await fetch('https://personal-mcp-worker.your-account.workers.dev/api/github/projects?language=TypeScript');
const data = await projects.json();
```

### curl Examples
```bash
# Search knowledge base
curl "https://personal-mcp-worker.your-account.workers.dev/api/search?q=MCP&limit=3"

# Get TypeScript projects
curl "https://personal-mcp-worker.your-account.workers.dev/api/github/projects?language=TypeScript"

# Add new knowledge
curl -X POST "https://personal-mcp-worker.your-account.workers.dev/api/knowledge" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "learning-notes",
    "title": "Cloudflare Workers MCP Server",
    "content": "Successfully deployed personal MCP server to Cloudflare Workers!",
    "tags": ["cloudflare", "workers", "mcp", "deployment"]
  }'
```

## 🔧 Local Development

### Run locally with Wrangler:
```bash
npm run dev
```

Your local server will be available at `http://localhost:8787`

### Test MCP Protocol:
```bash
# List available tools
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'

# Search knowledge
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0", 
    "id": 1, 
    "method": "tools/call",
    "params": {
      "name": "search_personal_knowledge",
      "arguments": {"query": "typescript", "limit": 3}
    }
  }'
```

## 📊 Monitoring & Analytics

### View logs:
```bash
npx wrangler tail
```

### KV Storage usage:
```bash
npx wrangler kv:key list --binding=KNOWLEDGE_BASE
```

### R2 Storage usage:
```bash
npx wrangler r2 object list personal-mcp-files
```

## 🔄 Data Updates

### Update knowledge base:
```bash
# After updating local data, re-migrate
node migrate-data.js

# No need to redeploy - data is stored in KV
```

### Add new categories:
```bash
# Add data via API
curl -X POST "https://your-worker.workers.dev/api/knowledge" \
  -H "Content-Type: application/json" \
  -d '{"category": "new-category", "title": "...", "content": "..."}'
```

## 🎉 Success!

Your Personal AI Assistant is now globally accessible! 🌍

- **Web API**: Fast HTTP endpoints for all your personal data
- **MCP Protocol**: Compatible with Claude Desktop and other MCP clients  
- **Global CDN**: Fast access from anywhere in the world
- **Serverless**: Auto-scaling with zero maintenance
- **Secure**: Your data stays in your Cloudflare account

**Next steps:**
1. Share the API with your favorite tools and apps
2. Build custom dashboards using the web API
3. Integrate with other AI assistants and workflows
4. Add real-time data synchronization
