#!/bin/bash

# Personal AI Assistant MCP Server Setup Script
# This script helps you quickly set up and configure the MCP server

set -e

echo "🤖 Personal AI Assistant MCP Server Setup"
echo "=========================================="

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js (v18 or higher) first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please upgrade to Node.js v18 or higher."
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building the project..."
npm run build

# Check if build was successful
if [ ! -f "dist/index.js" ]; then
    echo "❌ Build failed. Please check the error messages above."
    exit 1
fi

echo "✅ Build successful"

# Test the server
echo "🧪 Testing the MCP server..."
TEST_OUTPUT=$(echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node dist/index.js 2>/dev/null || true)

if echo "$TEST_OUTPUT" | grep -q "search_personal_knowledge"; then
    echo "✅ MCP server is working correctly"
else
    echo "❌ MCP server test failed"
    exit 1
fi

# Create Claude Desktop config directory if it doesn't exist
CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
if [ ! -d "$CLAUDE_CONFIG_DIR" ]; then
    echo "📁 Creating Claude Desktop config directory..."
    mkdir -p "$CLAUDE_CONFIG_DIR"
fi

# Generate Claude Desktop configuration
CURRENT_DIR=$(pwd)
CLAUDE_CONFIG_FILE="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"

echo "⚙️  Generating Claude Desktop configuration..."

# Check if config file exists
if [ -f "$CLAUDE_CONFIG_FILE" ]; then
    echo "📋 Backing up existing Claude Desktop config..."
    cp "$CLAUDE_CONFIG_FILE" "$CLAUDE_CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Create the configuration
cat > "$CLAUDE_CONFIG_FILE" << EOF
{
  "mcpServers": {
    "personal-ai-assistant": {
      "command": "node",
      "args": ["$CURRENT_DIR/dist/index.js"],
      "cwd": "$CURRENT_DIR",
      "env": {}
    }
  }
}
EOF

echo "✅ Claude Desktop configuration created at:"
echo "   $CLAUDE_CONFIG_FILE"

# Copy environment template
if [ ! -f ".env" ]; then
    echo "📄 Creating environment configuration..."
    cp .env.example .env
    echo "✅ Environment template created as .env"
    echo "   Edit this file to add your API keys and configuration"
fi

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "Next steps:"
echo "1. 📝 Edit .env file with your API keys (optional for basic usage)"
echo "2. 🔄 Restart Claude Desktop to load the new MCP server"
echo "3. 💬 Start chatting with Claude - it now has access to your personal AI assistant!"
echo ""
echo "Available commands:"
echo "  npm run build  - Build the project"
echo "  npm run dev    - Build and run the server"
echo "  npm run watch  - Watch for changes and rebuild"
echo ""
echo "For more information, see README.md and DEVELOPMENT.md"
echo ""
echo "Happy coding! 🚀"
