#!/bin/bash
cd /Users/santhoshkumarsampangiramasetty/personal-mcp

echo "Testing simple add command..."
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"add_personal_knowledge","arguments":{"category":"github-projects","title":"demo-project","content":"Demo project content","tags":["demo","test"],"metadata":{"source":"manual-test"}}}}' | node dist/index.js

echo ""
echo "Testing search..."
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_personal_knowledge","arguments":{"query":"demo-project"}}}' | node dist/index.js
