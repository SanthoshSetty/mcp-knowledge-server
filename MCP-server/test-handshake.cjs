#!/usr/bin/env node

// Test the complete MCP handshake sequence that Claude Desktop performs

const { spawn } = require('child_process');
const path = require('path');

const bridgeScript = path.join(__dirname, 'mcp-bridge.cjs');

console.log('🧪 Testing complete MCP handshake sequence...\n');

const bridge = spawn('node', [bridgeScript]);

let messageId = 0;

function sendMessage(message) {
  messageId++;
  const msg = { ...message, id: messageId };
  console.log('→ Sending:', JSON.stringify(msg));
  bridge.stdin.write(JSON.stringify(msg) + '\n');
}

bridge.stdout.on('data', (data) => {
  const lines = data.toString().trim().split('\n');
  lines.forEach(line => {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        console.log('← Received:', JSON.stringify(response, null, 2));
      } catch (e) {
        console.log('← Raw output:', line);
      }
    }
  });
});

bridge.stderr.on('data', (data) => {
  console.log('stderr:', data.toString());
});

// Simulate Claude Desktop's sequence
setTimeout(() => {
  console.log('\n1. Initialize...');
  sendMessage({
    jsonrpc: '2.0',
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'claude-ai', version: '0.1.0' }
    }
  });
}, 100);

setTimeout(() => {
  console.log('\n2. Send initialized notification...');
  bridge.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    method: 'notifications/initialized'
  }) + '\n');
}, 200);

setTimeout(() => {
  console.log('\n3. List tools...');
  sendMessage({
    jsonrpc: '2.0',
    method: 'tools/list',
    params: {}
  });
}, 300);

setTimeout(() => {
  console.log('\n4. List resources...');
  sendMessage({
    jsonrpc: '2.0',
    method: 'resources/list',
    params: {}
  });
}, 400);

setTimeout(() => {
  console.log('\n5. Test tool call...');
  sendMessage({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'list_files',
      arguments: {}
    }
  });
}, 500);

setTimeout(() => {
  console.log('\n✅ Test sequence complete!');
  bridge.kill();
  process.exit(0);
}, 1000);
