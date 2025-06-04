# 🔗 Personal MCP Server - Connection Guide

Your Personal AI Assistant is now deployed with a **beautiful, modern web interface**!

## 🌐 Live Server

**URL:** https://personal-mcp-worker.santhoshkumar199.workers.dev

✨ **Features:**
- 🎨 Beautiful modern UI with animations
- 📱 Mobile-responsive design  
- 📋 One-click copy buttons for all configs
- 🧪 Interactive API testing
- 📊 Live statistics and knowledge base overview
- 🌍 Proper UTF-8 character encoding

---

## 🤖 For AI Applications (Claude, ChatGPT, etc.)

### MCP Protocol Connection

**Server URL:** `https://personal-mcp-worker.santhoshkumar199.workers.dev/mcp`

### Claude Desktop Configuration

**Easy Setup:** Copy the file `claude-desktop-config.json` to `~/.claude_desktop_config.json`:

```bash
cp claude-desktop-config.json ~/.claude_desktop_config.json
```

Or manually add to your `~/.claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "personal-assistant": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-http",
        "https://personal-mcp-worker.santhoshkumar199.workers.dev/mcp"
      ]
    }
  }
}
```

**📱 Visit the web interface for one-click copy buttons!**

### Generic MCP Client Configuration

```json
{
  "servers": {
    "personal-assistant": {
      "type": "http",
      "url": "https://personal-mcp-worker.santhoshkumar199.workers.dev/mcp",
      "headers": {
        "Content-Type": "application/json"
      }
    }
  }
}
```

---

## 🌐 For Web Browser Testing

**Visit:** https://personal-mcp-worker.santhoshkumar199.workers.dev

The web interface provides:
- 📊 Interactive API documentation
- 🔍 Live knowledge base search
- 📈 Analytics and statistics
- 🛠️ Endpoint testing tools

---

## 📡 API Endpoints

| Endpoint | Purpose | Example Usage |
|----------|---------|---------------|
| `/api/search` | Search knowledge base | `?q=github&category=projects` |
| `/api/github/projects` | Get repositories | `?language=TypeScript` |
| `/api/linkedin/activity` | LinkedIn content | `?type=posts&timeframe=month` |
| `/api/timeline` | Development timeline | `?focus=technical` |
| `/api/knowledge` | Add knowledge | POST JSON data |
| `/api/analytics/growth` | Growth analysis | `?dimension=skills` |

---

## 🧪 Quick Test

Test your connection:

```bash
# Search your knowledge base
curl "https://personal-mcp-worker.santhoshkumar199.workers.dev/api/search?q=github"

# Get GitHub projects
curl "https://personal-mcp-worker.santhoshkumar199.workers.dev/api/github/projects"

# Test MCP protocol
curl -X POST "https://personal-mcp-worker.santhoshkumar199.workers.dev/mcp" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'
```

---

## 🎯 Available Tools

Your AI assistant now has access to these 6 tools:

1. **`search_personal_knowledge`** - Search across all your data
2. **`get_github_projects`** - Access GitHub repositories
3. **`get_linkedin_activity`** - LinkedIn posts and articles
4. **`add_personal_knowledge`** - Add new knowledge entries
5. **`get_personal_timeline`** - Chronological development view
6. **`analyze_growth_patterns`** - Professional growth analysis

---

## 📊 Current Data

Your knowledge base contains:
- **12 GitHub repositories** with code, READMEs, and metadata
- **1 LinkedIn post** with professional content
- **1 learning note** with technical insights
- **Full search index** across all categories

---

## 🔒 Privacy & Security

- **Your data stays yours** - Stored in your Cloudflare account
- **No third-party access** - Direct connection to your knowledge base
- **Global CDN** - Fast access from anywhere in the world
- **CORS enabled** - Works with web applications

---

*Your personal AI assistant is ready! Start using it with any MCP-compatible application.*
