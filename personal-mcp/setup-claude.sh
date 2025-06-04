#!/bin/bash

# Personal MCP Server - Claude Desktop Setup Script
echo "🤖 Setting up Personal MCP Server for Claude Desktop..."
echo "================================================="

# Check if Claude Desktop config directory exists
CONFIG_DIR="$HOME/.claude_desktop_config.json"

# Backup existing config if it exists
if [ -f "$CONFIG_DIR" ]; then
    echo "📋 Backing up existing Claude Desktop config..."
    cp "$CONFIG_DIR" "$CONFIG_DIR.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Copy our config
echo "⚙️  Installing Personal MCP Server configuration..."
cp claude-desktop-config.json "$CONFIG_DIR"

echo "✅ Configuration installed successfully!"
echo ""
echo "🔄 Next steps:"
echo "1. Restart Claude Desktop"
echo "2. Look for 'personal-assistant' in your available tools"
echo "3. Start asking Claude about your personal projects!"
echo ""
echo "🌐 Web Interface: https://personal-mcp-worker.santhoshkumar199.workers.dev"
echo "📚 Available Tools:"
echo "   • search_personal_knowledge - Search your data"
echo "   • get_github_projects - Access repositories"
echo "   • get_linkedin_activity - Professional content"
echo "   • add_personal_knowledge - Add new knowledge"
echo "   • get_personal_timeline - Development timeline"
echo "   • analyze_growth_patterns - Growth insights"
echo ""
echo "🎉 Your Personal AI Assistant is ready!"
