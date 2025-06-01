# 🌍 Public Knowledge Base MCP Server - User Guide

## 🎉 Server Now Live!

The public MCP server is now deployed and accessible at:
**https://public-knowledge-mcp-server.santhoshkumar199.workers.dev**

## ✨ What This Server Provides

This is a **text-only knowledge base** that allows you to:
- 📄 Upload and store text files (.txt)
- 🔍 Search through stored documents
- 📋 List all available files
- 📖 Retrieve specific file contents

## 🔧 How to Integrate with Claude Desktop

### Step 1: Download the MCP Bridge Script

Save this script as `mcp-bridge.cjs` on your computer:

```javascript
#!/usr/bin/env node

/**
 * MCP Bridge for Public Knowledge Base Server
 * 
 * This script bridges Claude Desktop's stdio MCP protocol
 * with the HTTP-based MCP server running on Cloudflare Workers.
 * 
 * Usage: node mcp-bridge.cjs
 */

const https = require('https');

const SERVER_URL = 'https://public-knowledge-mcp-server.santhoshkumar199.workers.dev';

// Function to make HTTP requests to the MCP server
function makeRequest(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'public-knowledge-mcp-server.santhoshkumar199.workers.dev',
      port: 443,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      rejectUnauthorized: false  // Allow Cloudflare Workers certificates
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Handle stdin data (messages from Claude Desktop)
process.stdin.on('data', async (data) => {
  try {
    const message = JSON.parse(data.toString().trim());
    
    // Forward the exact message to the HTTP MCP server
    const response = await makeRequest(message);
    
    // Send response back to Claude Desktop
    process.stdout.write(JSON.stringify(response) + '\n');
  } catch (error) {
    // Send error response back to Claude Desktop
    const errorResponse = {
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32603,
        message: `Bridge error: ${error.message}`
      }
    };
    process.stdout.write(JSON.stringify(errorResponse) + '\n');
  }
});

// Handle process termination gracefully
process.on('SIGINT', () => {
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});
```
        try {
          const response = JSON.parse(responseData);
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

process.stdin.on('data', async (data) => {
  try {
    const message = JSON.parse(data.toString().trim());
    const response = await makeRequest(message);
    process.stdout.write(JSON.stringify(response) + '\\n');
  } catch (error) {
    const errorResponse = {
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32603,
        message: `Bridge error: ${error.message}`
      }
    };
    process.stdout.write(JSON.stringify(errorResponse) + '\\n');
  }
});

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
```

### Step 2: Locate Your Claude Desktop Config

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\\Claude\\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

### Step 3: Add the MCP Server Configuration

Open your `claude_desktop_config.json` file and add this configuration:

```json
{
  "mcpServers": {
    "public-knowledge-base": {
      "command": "node",
      "args": ["/absolute/path/to/your/mcp-bridge.cjs"]
    }
  }
}
```

**Important**: Replace `/absolute/path/to/your/mcp-bridge.cjs` with the actual full path to where you saved the bridge script.

### Step 4: Make the Script Executable (macOS/Linux)

```bash
chmod +x /path/to/your/mcp-bridge.cjs
```

### Step 5: Test the Bridge Script

Before configuring Claude Desktop, test that the bridge script works:

```bash
# Make the script executable
chmod +x mcp-bridge.cjs

# Test the connection
echo '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' | node mcp-bridge.cjs
```

You should see a JSON response listing the available tools.

**Optional**: Download and run our comprehensive test script:

```javascript
// Save as test-mcp-server.cjs and run: node test-mcp-server.cjs
// [Download from: https://public-knowledge-mcp-server.santhoshkumar199.workers.dev]
```

### Step 6: Restart Claude Desktop

Close and reopen Claude Desktop to load the new MCP server.

## ✅ Bridge Script Testing

You can test your bridge script independently with these commands:

### Test Tools List
```bash
echo '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' | node mcp-bridge.cjs
```

### Test File Upload
```bash
echo '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "upload_text_file", "arguments": {"filename": "test.txt", "content": "This is a test file content."}}, "id": 2}' | node mcp-bridge.cjs
```

### Test File Listing
```bash
echo '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "list_files", "arguments": {}}, "id": 3}' | node mcp-bridge.cjs
```

### Test Search
```bash
echo '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "search_knowledge_base", "arguments": {"query": "test", "limit": 5}}, "id": 4}' | node mcp-bridge.cjs
```

## 🛠️ Available Tools

Once integrated, you'll have access to these tools in Claude:

1. **upload_text_file** - Upload a new text file to the knowledge base
2. **search_knowledge_base** - Search through all stored documents
3. **get_file_content** - Retrieve the full content of a specific file
4. **list_files** - Get a list of all files in the knowledge base
5. **get_owner_info** - Get information about the knowledge base owner
6. **set_owner_info** - Update the knowledge base owner information

## 📝 Usage Examples

### Upload a Text File
```
Upload this text content as "meeting-notes.txt": "Today we discussed the quarterly goals..."
```

### Search the Knowledge Base
```
Search for documents about "project timeline" in the knowledge base
```

### List All Files
```
Show me all files in the knowledge base
```

### Get File Content
```
Get the full content of "meeting-notes.txt"
```

## 🔒 Privacy & Security

- This is a **public server** - anyone can access and modify the knowledge base
- Don't upload sensitive or private information
- All files are stored as plain text
- No authentication or user separation currently implemented

## 🚀 Technical Details

- **Platform**: Cloudflare Workers
- **Storage**: Cloudflare KV (key-value store)
- **File Types**: Text files only (.txt)
- **API**: HTTP-based MCP protocol
- **CORS**: Enabled for web access

## 🔗 Direct API Access

You can also interact with the server directly via HTTP POST requests to:
`https://public-knowledge-mcp-server.santhoshkumar199.workers.dev`

## 🐛 Troubleshooting

### Bridge Script Issues

If the bridge script doesn't work, try these steps:

1. **Check Node.js Installation**
   ```bash
   node --version
   # Should show v14+ or higher
   ```

2. **Test the Bridge Script**
   ```bash
   echo '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' | node mcp-bridge.cjs
   # Should return a JSON response with tools
   ```

3. **TLS Certificate Issues**
   - The script includes `rejectUnauthorized: false` to handle Cloudflare certificates
   - If you're still having issues, check your Node.js version and network settings

### Claude Desktop Integration Issues

1. **Tools Not Appearing**
   - Verify the `mcp_config_path` in your Claude Desktop config
   - Ensure the bridge script path is absolute
   - Restart Claude Desktop after config changes

2. **Server Connection Errors**
   - Test the bridge script independently first
   - Check that the server URL is accessible
   - Verify your internet connection

### Direct API Testing

Test the server directly with curl:
```bash
curl -X POST https://public-knowledge-mcp-server.santhoshkumar199.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'
```

### Common Error Messages

- **"Bridge error"**: Check your internet connection and server availability
- **"Failed to parse response"**: Usually indicates a network or server issue
- **"Tools not found"**: Restart Claude Desktop and verify your configuration

## 📞 Support

If you're still having issues:
1. Test each step independently
2. Check the server status at: https://public-knowledge-mcp-server.santhoshkumar199.workers.dev
3. Verify your Claude Desktop configuration
4. Review the debug output from the bridge script

---

*Last updated: 2025-05-31*
- Check that Node.js is installed
- Verify your `claude_desktop_config.json` syntax

### Can't Upload Files
- Only `.txt` files are supported
- Check file size (should be reasonable)
- Ensure file content is valid text

## 📞 Support

For issues or questions, check the server status by visiting:
https://public-knowledge-mcp-server.santhoshkumar199.workers.dev

---

**Enjoy your public knowledge base! 🎉**
