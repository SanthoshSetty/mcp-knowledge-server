#!/bin/bash

# Personal AI Assistant MCP Server - Demo Workflow
# This script demonstrates the complete end-to-end workflow

echo "🚀 Personal AI Assistant MCP Server - Demo Workflow"
echo "=================================================="
echo ""

echo "📋 Current project status:"
echo "✅ Data persistence implemented"
echo "✅ GitHub export/import pipeline"
echo "✅ LinkedIn data processing"
echo "✅ Direct import tool"
echo "✅ Real data integration"
echo ""

echo "🔍 Testing current setup..."

# Check if the project is built
if [ ! -f "dist/index.js" ]; then
    echo "🔨 Building project..."
    npm run build
fi

# Check knowledge base
if [ -f "data/knowledge-base.json" ]; then
    ENTRIES=$(cat data/knowledge-base.json | grep -o '"id":' | wc -l)
    echo "📚 Knowledge base exists with $ENTRIES entries"
else
    echo "🆕 No knowledge base found - will be created on first use"
fi

echo ""
echo "🧪 Testing MCP server tools..."

# Test search functionality
echo "🔍 Testing search functionality..."
SEARCH_RESULT=$(echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_personal_knowledge","arguments":{"query":"typescript"}}}' | node dist/index.js 2>/dev/null | grep -o '"totalResults":[0-9]*' | cut -d: -f2)

if [ -n "$SEARCH_RESULT" ]; then
    echo "   ✅ Search found $SEARCH_RESULT TypeScript-related entries"
else
    echo "   ⚠️  Search test didn't return expected results"
fi

# Test GitHub projects tool
echo "🐙 Testing GitHub projects tool..."
GITHUB_RESULT=$(echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_github_projects","arguments":{"language":"TypeScript"}}}' | node dist/index.js 2>/dev/null | grep -o '"totalProjects":[0-9]*' | cut -d: -f2)

if [ -n "$GITHUB_RESULT" ]; then
    echo "   ✅ Found $GITHUB_RESULT TypeScript projects"
else
    echo "   ⚠️  GitHub projects test didn't return expected results"
fi

echo ""
echo "📁 Available demo data:"
if [ -f "exports/demo-github-export.json" ]; then
    echo "   ✅ Demo GitHub export available"
    echo "   📊 Run: node scripts/direct-import.js exports/demo-github-export.json"
else
    echo "   ❓ Demo GitHub export not found"
fi

echo ""
echo "🛠️  Available tools for real data import:"
echo "   📊 GitHub Export: node scripts/export-github.js (requires GITHUB_TOKEN)"
echo "   📊 LinkedIn Import: node scripts/import-linkedin.js <linkedin-data-dir>"
echo "   📊 Direct Import: node scripts/direct-import.js <export-file>"
echo ""

echo "🎯 Ready for use!"
echo "===================="
echo "Your Personal AI Assistant MCP Server is ready. Next steps:"
echo ""
echo "1. 🔗 Connect to Claude Desktop:"
echo "   Add this server to your Claude Desktop configuration"
echo ""
echo "2. 📊 Import your real data:"
echo "   - Export from GitHub: scripts/export-github.js"
echo "   - Export from LinkedIn: Manual export + scripts/import-linkedin.js"
echo "   - Import: scripts/direct-import.js"
echo ""
echo "3. 🚀 Start using your AI assistant:"
echo "   - Ask Claude about your GitHub projects"
echo "   - Search your professional history"
echo "   - Analyze your technical growth"
echo ""
echo "📖 See README.md and DEVELOPMENT.md for detailed instructions"
