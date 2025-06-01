#!/usr/bin/env node

/**
 * Test Concurrent Request Handling
 * 
 * This simulates the exact concurrent request pattern from Claude Desktop logs.
 */

const { spawn } = require('child_process');
const path = require('path');

const bridgeScript = path.join(__dirname, 'mcp-bridge.cjs');

console.log('🧪 Testing Concurrent Request Handling...\n');

// Start the bridge process
const bridge = spawn('node', [bridgeScript], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let responses = [];

// Listen for responses
bridge.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  lines.forEach(line => {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        responses.push(response);
        console.log(`✅ Response ID ${response.id}:`, response.result ? 'Success' : 'Error');
      } catch (e) {
        console.log('❌ Invalid JSON response:', line);
      }
    }
  });
});

bridge.stderr.on('data', (data) => {
  console.error('Bridge stderr:', data.toString());
});

async function runConcurrentTest() {
  try {
    console.log('Sending concurrent requests (simulating Claude Desktop pattern)...');
    
    // Simulate the exact pattern from the logs
    const requests = [
      '{"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"claude-ai","version":"0.1.0"}},"jsonrpc":"2.0","id":0}',
      '{"method":"notifications/initialized","jsonrpc":"2.0"}',
      '{"method":"tools/list","params":{},"jsonrpc":"2.0","id":1}',
      '{"method":"tools/list","params":{},"jsonrpc":"2.0","id":2}',
      '{"method":"resources/list","params":{},"jsonrpc":"2.0","id":3}',
      '{"method":"tools/list","params":{},"jsonrpc":"2.0","id":4}',
      '{"method":"tools/list","params":{},"jsonrpc":"2.0","id":5}',
      '{"method":"resources/list","params":{},"jsonrpc":"2.0","id":6}'
    ];
    
    // Send all requests quickly (like Claude Desktop does)
    requests.forEach((req, index) => {
      setTimeout(() => {
        bridge.stdin.write(req + '\n');
        console.log(`→ Sent request ${index + 1}: ${JSON.parse(req).method} (ID: ${JSON.parse(req).id || 'N/A'})`);
      }, index * 10); // 10ms apart
    });

    // Wait for responses
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Cleanup
    bridge.kill();
    
    console.log('\n📊 Test Results:');
    console.log(`   - Requests sent: ${requests.length}`);
    console.log(`   - Responses received: ${responses.length}`);
    
    // Check that we got responses for all requests with IDs (notifications don't get responses)
    const requestsWithIds = requests.filter(req => JSON.parse(req).id !== undefined);
    const expectedResponses = requestsWithIds.length;
    
    console.log(`   - Expected responses: ${expectedResponses}`);
    console.log(`   - Success rate: ${Math.round((responses.length/expectedResponses)*100)}%`);
    
    // Check for specific issues
    const missingIds = [];
    requestsWithIds.forEach(req => {
      const parsed = JSON.parse(req);
      if (!responses.find(r => r.id === parsed.id)) {
        missingIds.push(parsed.id);
      }
    });
    
    if (missingIds.length === 0) {
      console.log('\n🎉 All concurrent requests handled successfully!');
      console.log('✅ Timeout issues should now be resolved');
    } else {
      console.log('\n❌ Missing responses for IDs:', missingIds);
    }

  } catch (error) {
    console.error('Test failed:', error);
    bridge.kill();
  }
}

runConcurrentTest();
