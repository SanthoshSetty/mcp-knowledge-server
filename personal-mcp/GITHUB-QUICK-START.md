# Quick Start: Export Your GitHub Data

## Step 1: Get Your GitHub Token (2 minutes)

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Give it a name: "Personal MCP Server"
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `user` (Read all user profile data)
5. Click "Generate token"
6. **Copy the token immediately** (you won't see it again!)

## Step 2: Export Your Repositories (2 minutes)

```bash
# Set your token (replace with your actual token)
export GITHUB_TOKEN=ghp_your_token_here

# Run the export script
cd /Users/santhoshkumarsampangiramasetty/personal-mcp
node scripts/export-github.js
```

## Step 3: Import into MCP Server (1 minute)

```bash
# Load the exported data
node scripts/load-data.js exports/github-export-*.json

# Run the generated import commands
chmod +x exports/import-commands-*.sh
./exports/import-commands-*.sh
```

## Step 4: Test with Claude Desktop

1. Restart Claude Desktop
2. Ask: **"What are my GitHub projects about TypeScript?"**
3. Ask: **"Show me my most starred repositories"**
4. Ask: **"What technologies do I work with most?"**

---

## Expected Output

After running the export, you'll see:
```
🚀 GitHub Data Export Tool
===========================
👤 Fetching user information...
✅ Authenticated as: yourusername (Your Name)
📁 Fetching repositories...
✅ Found 42 repositories
📝 Processing: awesome-project
📝 Processing: cool-library
...
🎉 Export completed successfully!
📄 Data saved to: exports/github-export-1717405200000.json
📊 Exported 42 repository entries
```

Your AI assistant will now know about ALL your GitHub projects! 🎉
