#!/usr/bin/env node

/**
 * Test Claude Desktop Integration
 * 
 * This script simulates the exact message sequence that Claude Desktop
 * would send to test the MCP bridge integration.
 */

const { spawn } = require('child_process');
const path = require('path');

const bridgeScript = path.join(__dirname, 'mcp-bridge.cjs');

console.log('🧪 Testing Claude Desktop MCP Integration...\n');

// Start the bridge process
const bridge = spawn('node', [bridgeScript], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let messageId = 1;
let responses = [];

// Listen for responses
bridge.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  lines.forEach(line => {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        responses.push(response);
        console.log(`← Response ${response.id || 'notification'}:`, JSON.stringify(response, null, 2));
      } catch (e) {
        console.log('← Raw output:', line);
      }
    }
  });
});

bridge.stderr.on('data', (data) => {
  console.error('Bridge stderr:', data.toString());
});

// Send a sequence of messages that Claude Desktop would send
async function sendMessage(message) {
  return new Promise((resolve) => {
    bridge.stdin.write(JSON.stringify(message) + '\n');
    setTimeout(resolve, 100); // Give time for response
  });
}

async function runTest() {
  try {
    console.log('1. Initialize MCP session...');
    await sendMessage({
      jsonrpc: "2.0",
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "claude-desktop",
          version: "1.0.0"
        }
      },
      id: messageId++
    });

    await new Promise(resolve => setTimeout(resolve, 200));

    console.log('\n2. Send initialized notification...');
    await sendMessage({
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {}
    });

    await new Promise(resolve => setTimeout(resolve, 200));

    console.log('\n3. List available tools...');
    await sendMessage({
      jsonrpc: "2.0",
      method: "tools/list",
      params: {},
      id: messageId++
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('\n4. Test tool call (list files)...');
    await sendMessage({
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "list_files",
        arguments: {}
      },
      id: messageId++
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('\n5. Test tool call (search)...');
    await sendMessage({
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "search_knowledge_base",
        arguments: {
          query: "test",
          limit: 3
        }
      },
      id: messageId++
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    // Cleanup
    bridge.kill();
    
    console.log('\n✅ Integration test complete!');
    console.log('\n📊 Test Results:');
    console.log(`   - Messages sent: ${messageId - 1}`);
    console.log(`   - Responses received: ${responses.length}`);
    console.log(`   - Successful responses: ${responses.filter(r => r.result).length}`);
    console.log(`   - Error responses: ${responses.filter(r => r.error).length}`);
    
    if (responses.some(r => r.result && r.result.tools)) {
      console.log('\n🎉 Claude Desktop integration is ready!');
      console.log('\nTo use with Claude Desktop:');
      console.log('1. Restart Claude Desktop');
      console.log('2. In a conversation, the tools should be available automatically');
      console.log('3. Try: "List all files in the knowledge base"');
    }

  } catch (error) {
    console.error('Test failed:', error);
    bridge.kill();
  }
}

runTest();
