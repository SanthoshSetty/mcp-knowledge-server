#!/bin/bash

# 🚀 Personal MCP Server - Cloudflare Deployment Script
# Automated setup and deployment to Cloudflare Workers

set -e

echo "🌐 Personal AI Assistant MCP Server - Cloudflare Deployment"
echo "=========================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the cloudflare directory"
    echo "   cd cloudflare && ./deploy.sh"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Login to Cloudflare (if not already logged in)
echo ""
echo "🔐 Checking Cloudflare authentication..."
if ! npx wrangler whoami > /dev/null 2>&1; then
    echo "Please login to Cloudflare:"
    npx wrangler login
else
    echo "✅ Already authenticated with Cloudflare"
fi

# Create KV namespace
echo ""
echo "🗄️  Setting up KV storage..."
echo "Creating KNOWLEDGE_BASE namespace..."

# Create production namespace
PROD_KV_ID=$(npx wrangler kv:namespace create "KNOWLEDGE_BASE" --json | jq -r '.id')
echo "Production KV ID: $PROD_KV_ID"

# Create preview namespace
PREVIEW_KV_ID=$(npx wrangler kv:namespace create "KNOWLEDGE_BASE" --preview --json | jq -r '.id')
echo "Preview KV ID: $PREVIEW_KV_ID"

# Update wrangler.toml with the actual IDs
echo ""
echo "📝 Updating wrangler.toml with KV namespace IDs..."
sed -i.bak "s/id = \"your-kv-namespace-id\"/id = \"$PROD_KV_ID\"/" wrangler.toml
sed -i.bak "s/preview_id = \"your-preview-kv-namespace-id\"/preview_id = \"$PREVIEW_KV_ID\"/" wrangler.toml
rm wrangler.toml.bak

# Create R2 bucket
echo ""
echo "📁 Setting up R2 file storage..."
npx wrangler r2 bucket create personal-mcp-files || echo "Bucket already exists or creation failed - continuing..."

# Migrate data
echo ""
echo "⬆️  Migrating knowledge base to Cloudflare..."
if [ -f "../data/knowledge-base.json" ]; then
    node migrate-data.js
else
    echo "⚠️  No local knowledge base found. You can migrate data later."
fi

# Deploy worker
echo ""
echo "🚀 Deploying to Cloudflare Workers..."
npm run deploy

# Get worker URL
echo ""
echo "🎉 Deployment completed!"
echo ""
echo "Your Personal MCP Server is now live!"
echo ""

# Try to get the worker URL from wrangler
WORKER_URL=$(npx wrangler subdomain 2>/dev/null | grep -o 'https://.*workers.dev' || echo "")

if [ -n "$WORKER_URL" ]; then
    FULL_URL="${WORKER_URL%/}/personal-mcp-worker"
    echo "🌐 Server URL: $FULL_URL"
    echo ""
    echo "📡 API Endpoints:"
    echo "   Search: $FULL_URL/api/search?q=typescript"
    echo "   GitHub: $FULL_URL/api/github/projects"
    echo "   Timeline: $FULL_URL/api/timeline"
    echo "   MCP: $FULL_URL/mcp"
    echo ""
else
    echo "🌐 Server URL: https://personal-mcp-worker.YOUR-ACCOUNT.workers.dev"
    echo ""
    echo "📡 API Endpoints:"
    echo "   Search: https://personal-mcp-worker.YOUR-ACCOUNT.workers.dev/api/search?q=typescript"
    echo "   GitHub: https://personal-mcp-worker.YOUR-ACCOUNT.workers.dev/api/github/projects"
    echo "   Timeline: https://personal-mcp-worker.YOUR-ACCOUNT.workers.dev/api/timeline"
    echo "   MCP: https://personal-mcp-worker.YOUR-ACCOUNT.workers.dev/mcp"
    echo ""
fi

echo "🔗 Integration:"
echo "   Add to Claude Desktop using mcp-remote:"
echo "   https://personal-mcp-worker.YOUR-ACCOUNT.workers.dev/sse"
echo ""
echo "✅ Setup complete! Your personal AI assistant is now globally accessible."
