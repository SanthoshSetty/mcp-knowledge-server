# 🎯 CEO Demo Setup - Public Knowledge Base MCP Server

## 🚀 **What This Demo Shows**

Your MCP server allows **any Claude Desktop user** to:
- 📄 Store and search text documents globally
- 🔍 Find information using natural language queries  
- 📤 Upload files that become searchable by everyone
- 🌍 Access a shared knowledge base from anywhere

**Business Value:** Demonstrates how MCP servers can extend Claude's capabilities for enterprise knowledge management.

---

## 📋 **For Your CEO - 2-Minute Setup**

### **Step 1: Download the Bridge Script** ⬇️
Save this file as `knowledge-base-bridge.cjs` on your desktop:

```javascript
#!/usr/bin/env node
const https = require('https');

function makeRequest(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const options = {
      hostname: 'public-knowledge-mcp-server.santhoshkumar199.workers.dev',
      port: 443, path: '/', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
      rejectUnauthorized: false
    };
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          const trimmedData = responseData.trim();
          if (!trimmedData.startsWith('{')) {
            reject(new Error(`Invalid JSON response: ${trimmedData.substring(0, 100)}`));
            return;
          }
          resolve(JSON.parse(trimmedData));
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

let inputBuffer = '';
process.stdin.on('data', async (data) => {
  inputBuffer += data.toString();
  const lines = inputBuffer.split('\\n');
  inputBuffer = lines.pop() || '';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    let message = null;
    try {
      message = JSON.parse(trimmedLine);
      
      if (message.method === 'initialize') {
        process.stdout.write(JSON.stringify({
          jsonrpc: '2.0', id: message.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {}, resources: {} },
            serverInfo: { name: 'public-knowledge-base', version: '1.0.0' }
          }
        }) + '\\n');
        continue;
      }
      
      if (message.method?.startsWith('notifications/')) continue;
      
      if (message.method === 'resources/list') {
        process.stdout.write(JSON.stringify({
          jsonrpc: '2.0', id: message.id, result: { resources: [] }
        }) + '\\n');
        continue;
      }
      
      if (message.method === 'prompts/list') {
        process.stdout.write(JSON.stringify({
          jsonrpc: '2.0', id: message.id,
          error: { code: -32601, message: 'Method not found: prompts/list' }
        }) + '\\n');
        continue;
      }
      
      try {
        const response = await makeRequest(message);
        if (response && typeof response === 'object') {
          response.id = message.id;
          response.jsonrpc = '2.0';
          process.stdout.write(JSON.stringify(response) + '\\n');
        } else {
          throw new Error('Invalid response from server');
        }
      } catch (httpError) {
        process.stdout.write(JSON.stringify({
          jsonrpc: '2.0', id: message.id,
          error: { code: -32603, message: `HTTP request failed: ${httpError.message}` }
        }) + '\\n');
      }
    } catch (parseError) {
      if (message?.id !== undefined) {
        process.stdout.write(JSON.stringify({
          jsonrpc: '2.0', id: message.id,
          error: { code: -32700, message: `Parse error: ${parseError.message}` }
        }) + '\\n');
      }
    }
  }
});

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
```

### **Step 2: Update Claude Desktop Config** ⚙️

**File Location:**
- **Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\\Claude\\claude_desktop_config.json`

**Add this configuration:**
```json
{
  "mcpServers": {
    "demo-knowledge-base": {
      "command": "node",
      "args": ["/Users/[USERNAME]/Desktop/knowledge-base-bridge.cjs"]
    }
  }
}
```
*Replace `[USERNAME]` with actual username*

### **Step 3: Restart Claude Desktop** 🔄

Close and reopen Claude Desktop completely.

---

## 🎬 **Demo Script**

### **Opening (30 seconds)**
*"I want to show you how we can extend Claude's capabilities with custom servers. This demo shows a global knowledge base that any Claude user can access."*

### **Demo Actions (2 minutes)**

1. **Show Current Content:**
   ```
   "List all files in the knowledge base"
   ```
   *Shows existing documents already stored*

2. **Search Demonstration:**
   ```
   "Search for documents about machine learning"
   ```
   *Shows intelligent search through stored content*

3. **Upload New Content:**
   ```
   "I want to upload this quarterly report to the knowledge base"
   ```
   *Upload a sample .txt file - shows real-time sharing*

4. **Verify Upload:**
   ```
   "List all files again to show the new document"
   ```
   *Proves the file was stored and is now searchable*

### **Key Points to Highlight:**
- ✅ **Global Access** - Anyone with this setup can access the same knowledge base
- ✅ **Real-time Sharing** - Files uploaded by one user are immediately available to others  
- ✅ **Enterprise Ready** - Built on Cloudflare's global infrastructure
- ✅ **Extensible** - This is just one example of custom MCP servers

---

## 📊 **Business Impact Talking Points**

### **Technical Achievement:**
- Built a production MCP server on Cloudflare Workers
- Demonstrates Model Context Protocol integration
- Shows real-world AI tool extensibility

### **Business Potential:**
- **Internal Knowledge Sharing** - Teams can share documents instantly
- **Customer Support** - Agents can access shared knowledge bases
- **Compliance** - Centralized document storage with search
- **Partnerships** - Share knowledge bases with trusted partners

### **Competitive Advantage:**
- Early adoption of MCP protocol
- Custom AI tool development capability
- Scalable architecture for enterprise needs

---

## 🛠️ **Technical Architecture** 
*(For technical questions)*

```
Claude Desktop ←→ Bridge Script ←→ Cloudflare Workers ←→ KV Storage
      (MCP)          (Translation)        (HTTP API)         (Data)
```

- **Frontend:** Claude Desktop with MCP protocol
- **Bridge:** Node.js script translating stdio ↔ HTTP  
- **Backend:** Cloudflare Workers (serverless)
- **Storage:** Cloudflare KV (global key-value store)
- **Deployment:** Global edge network, zero maintenance

---

## 🎯 **Success Metrics**

After the demo, your CEO should understand:
- ✅ MCP servers extend Claude's capabilities
- ✅ Real-world business applications exist  
- ✅ Your team can build production-ready AI tools
- ✅ Scalable architecture for enterprise deployment

---

## 📞 **Fallback Plan**

If the live demo has issues:

1. **Show the Web Interface:** https://public-knowledge-mcp-server.santhoshkumar199.workers.dev
2. **Use Pre-recorded Screenshots** (create these beforehand)
3. **Explain the Architecture** using the diagram above

---

**Demo Duration:** ~3 minutes  
**Setup Time:** ~2 minutes  
**Technical Risk:** Low (server is stable and tested)

*Good luck with your demo! 🚀*
