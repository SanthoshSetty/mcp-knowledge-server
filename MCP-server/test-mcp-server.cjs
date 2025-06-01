#!/usr/bin/env node

/**
 * Test Script for MCP Public Knowledge Base
 * 
 * This script tests all the functionality of the MCP server
 * to ensure everything is working correctly.
 */

const https = require('https');

const SERVER_URL = 'https://public-knowledge-mcp-server.santhoshkumar199.workers.dev';

console.log('🧪 Testing MCP Public Knowledge Base Server...\n');

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

async function runTests() {
  try {
    // Test 1: List tools
    console.log('✅ Test 1: Listing available tools...');
    const toolsResponse = await makeRequest({
      jsonrpc: '2.0',
      method: 'tools/list',
      id: 1
    });
    
    if (toolsResponse.result && toolsResponse.result.tools) {
      console.log(`   Found ${toolsResponse.result.tools.length} tools: ${toolsResponse.result.tools.map(t => t.name).join(', ')}\n`);
    } else {
      throw new Error('Tools list not found in response');
    }

    // Test 2: Upload a test file
    console.log('✅ Test 2: Uploading a test file...');
    const uploadResponse = await makeRequest({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'upload_text_file',
        arguments: {
          filename: 'test-script-upload.txt',
          content: 'This is a test file uploaded by the test script to verify the MCP server is working correctly.'
        }
      },
      id: 2
    });
    
    if (uploadResponse.result) {
      console.log('   File uploaded successfully!\n');
    } else {
      throw new Error('File upload failed');
    }

    // Test 3: List files
    console.log('✅ Test 3: Listing files in knowledge base...');
    const listResponse = await makeRequest({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'list_files',
        arguments: {}
      },
      id: 3
    });
    
    if (listResponse.result) {
      console.log('   Files listed successfully!\n');
    } else {
      throw new Error('File listing failed');
    }

    // Test 4: Search for the uploaded file
    console.log('✅ Test 4: Searching for uploaded file...');
    const searchResponse = await makeRequest({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'search_knowledge_base',
        arguments: {
          query: 'test script',
          limit: 3
        }
      },
      id: 4
    });
    
    if (searchResponse.result) {
      console.log('   Search completed successfully!\n');
    } else {
      throw new Error('Search failed');
    }

    console.log('🎉 All tests passed! The MCP server is working correctly.');
    console.log('\n📝 You can now configure Claude Desktop to use this server.');
    console.log('   Follow the instructions in PUBLIC-USAGE-GUIDE.md\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\n🔧 Troubleshooting steps:');
    console.error('   1. Check your internet connection');
    console.error('   2. Verify the server is accessible: https://public-knowledge-mcp-server.santhoshkumar199.workers.dev');
    console.error('   3. Try running the test again in a few minutes\n');
    process.exit(1);
  }
}

runTests();
