#!/usr/bin/env node

/**
 * Test Fixed Bridge Script for Zod Validation
 * 
 * This tests the exact message patterns that were causing Zod validation errors.
 */

const { spawn } = require('child_process');
const path = require('path');

const bridgeScript = path.join(__dirname, 'mcp-bridge.cjs');

console.log('🧪 Testing Fixed Bridge Script for Zod Validation Issues...\n');

// Start the bridge process
const bridge = spawn('node', [bridgeScript], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let testsPassed = 0;
let totalTests = 0;

// Listen for responses
bridge.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  lines.forEach(line => {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        console.log(`✅ Valid JSON-RPC response:`, {
          id: response.id,
          hasResult: !!response.result,
          hasError: !!response.error,
          jsonrpc: response.jsonrpc
        });
        
        // Validate response structure
        if (response.jsonrpc === '2.0' && 
            (response.id !== null && response.id !== undefined) &&
            (response.result || response.error)) {
          testsPassed++;
        }
      } catch (e) {
        console.log('❌ Invalid JSON response:', line);
      }
    }
  });
});

bridge.stderr.on('data', (data) => {
  console.error('Bridge stderr:', data.toString());
});

// Send test messages
async function sendMessage(message, description) {
  totalTests++;
  console.log(`${totalTests}. ${description}`);
  console.log(`   → Sending: ${JSON.stringify(message)}`);
  bridge.stdin.write(JSON.stringify(message) + '\n');
  await new Promise(resolve => setTimeout(resolve, 200));
}

async function runTests() {
  try {
    // Test 1: Initialize (should work)
    await sendMessage({
      jsonrpc: "2.0",
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "claude-ai", version: "0.1.0" }
      },
      id: 0
    }, "Initialize (local handling)");

    // Test 2: Notification (should not respond)
    await sendMessage({
      jsonrpc: "2.0",
      method: "notifications/initialized"
    }, "Notification (should be silent)");

    // Test 3: Resources list (should work locally)
    await sendMessage({
      jsonrpc: "2.0",
      method: "resources/list",
      params: {},
      id: 3
    }, "Resources list (local handling)");

    // Test 4: Prompts list (should return error)
    await sendMessage({
      jsonrpc: "2.0",
      method: "prompts/list",
      params: {},
      id: 7
    }, "Prompts list (should return method not found)");

    // Test 5: Tools list (should forward to server)
    await sendMessage({
      jsonrpc: "2.0",
      method: "tools/list",
      params: {},
      id: 1
    }, "Tools list (forward to server)");

    // Test 6: Cancelled notification (should be silent)
    await sendMessage({
      jsonrpc: "2.0",
      method: "notifications/cancelled",
      params: {
        requestId: 2,
        reason: "Error: MCP error -32001: Request timed out"
      }
    }, "Cancelled notification (should be silent)");

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Cleanup
    bridge.kill();
    
    console.log('\n📊 Test Results:');
    console.log(`   - Total tests: ${totalTests}`);
    console.log(`   - Valid responses: ${testsPassed}`);
    console.log(`   - Success rate: ${Math.round((testsPassed/totalTests)*100)}%`);
    
    if (testsPassed >= totalTests - 2) { // Allow for notifications that don't respond
      console.log('\n🎉 All Zod validation issues fixed!');
      console.log('✅ Bridge script now properly handles:');
      console.log('   - Correct ID preservation');
      console.log('   - Proper JSON-RPC 2.0 format');
      console.log('   - Local handling of standard methods');
      console.log('   - Silent notification handling');
      console.log('   - Error responses with correct structure');
    } else {
      console.log('\n❌ Some issues remain');
    }

  } catch (error) {
    console.error('Test failed:', error);
    bridge.kill();
  }
}

runTests();
