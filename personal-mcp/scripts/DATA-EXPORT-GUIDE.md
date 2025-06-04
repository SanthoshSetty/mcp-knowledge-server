# Data Export & Import Guide

This guide walks you through exporting your real GitHub and LinkedIn data and importing it into your Personal AI Assistant MCP Server.

## 🚀 Quick Start

### GitHub Export (5 minutes)

1. **Get your GitHub token:**
   ```bash
   # Go to https://github.com/settings/tokens
   # Create a new token with 'repo' and 'user' scopes
   export GITHUB_TOKEN=your_github_token_here
   ```

2. **Export your repositories:**
   ```bash
   node scripts/export-github.js
   ```

3. **Load into MCP server:**
   ```bash
   # This creates an import script
   node scripts/load-data.js exports/github-export-*.json
   
   # Run the generated import script
   ./exports/import-commands-*.sh
   ```

### LinkedIn Export (24-48 hours)

1. **Request LinkedIn data export:**
   - Go to https://www.linkedin.com/settings/
   - Click "Data Privacy" → "Get a copy of your data"
   - Select: Posts, Articles, Profile, Positions, Education
   - Click "Request archive" (LinkedIn will email you)

2. **Import when ready:**
   ```bash
   # Extract the ZIP file LinkedIn sends you
   unzip Basic_LinkedInDataExport_*.zip -d linkedin-data/
   
   # Import the data
   node scripts/import-linkedin.js linkedin-data/
   
   # Load into MCP server
   node scripts/load-data.js exports/linkedin-import-*.json
   ./exports/import-commands-*.sh
   ```

## 📁 File Structure After Export

```
personal-mcp/
├── exports/
│   ├── github-export-1234567890.json      # Your GitHub data
│   ├── linkedin-import-1234567890.json    # Your LinkedIn data
│   └── import-commands-1234567890.sh      # Auto-generated import script
├── scripts/
│   ├── export-github.js                   # GitHub export tool
│   ├── import-linkedin.js                 # LinkedIn import tool
│   └── load-data.js                       # Data loader
└── linkedin-data/                         # LinkedIn export (temporary)
    ├── Posts.csv
    ├── Articles.csv
    ├── Positions.csv
    └── Education.csv
```

## 🔧 Manual Data Entry (Alternative)

If you want to add data immediately without waiting for exports:

### Add GitHub Project
```bash
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "add_personal_knowledge", "arguments": {"category": "github-projects", "title": "my-awesome-project", "content": "A TypeScript project that does amazing things", "tags": ["typescript", "nodejs"], "metadata": {"url": "https://github.com/username/project", "language": "TypeScript", "stars": 42}}}}' | node dist/index.js
```

### Add LinkedIn Post
```bash
echo '{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "add_personal_knowledge", "arguments": {"category": "linkedin-posts", "title": "Thoughts on AI Development", "content": "Recently I have been thinking about the future of AI in software development...", "tags": ["AI", "development", "future"], "metadata": {"post_date": "2024-06-01", "engagement": {"likes": 125, "comments": 15}}}}}' | node dist/index.js
```

### Add Career Milestone
```bash
echo '{"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "add_personal_knowledge", "arguments": {"category": "career-milestones", "title": "Started new role as Senior AI Engineer", "content": "Excited to join TechCorp as Senior AI Engineer, leading the AI initiatives team", "tags": ["career", "promotion", "AI"], "metadata": {"date": "2024-05-01", "company": "TechCorp", "role": "Senior AI Engineer"}}}}' | node dist/index.js
```

## 🔍 Verifying Your Data

After importing, test your data with Claude Desktop:

1. **Search your projects:**
   > "What are my most recent GitHub projects?"

2. **Find LinkedIn content:**
   > "Show me my LinkedIn posts about AI"

3. **Review career progression:**
   > "What are my key career milestones?"

4. **Analyze growth:**
   > "Analyze my technical skill growth patterns"

## 🛠 Troubleshooting

### GitHub Export Issues

**Error: "Bad credentials"**
```bash
# Check your token
echo $GITHUB_TOKEN

# Regenerate token at https://github.com/settings/tokens
# Make sure it has 'repo' and 'user' scopes
```

**Error: "Rate limit exceeded"**
```bash
# Wait an hour or use a different token
# GitHub allows 5000 requests per hour
```

### LinkedIn Import Issues

**Error: "CSV file not found"**
```bash
# Check the extracted directory structure
ls -la linkedin-data/

# LinkedIn export structure varies by region
# Look for files like:
# - Posts.csv or posts.csv
# - Articles.csv or articles.csv
```

**Error: "Invalid CSV format"**
```bash
# Try opening CSV in Excel/Google Sheets first
# Save as UTF-8 CSV if needed
```

### MCP Server Issues

**Error: "Tool not found"**
```bash
# Rebuild the server
npm run build

# Test basic functionality
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node dist/index.js
```

**Error: "Data not appearing in Claude"**
```bash
# Restart Claude Desktop completely
# Check that claude_desktop_config.json is updated
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

## 📊 Data Privacy & Security

- ✅ All data stored locally on your machine
- ✅ No data sent to external services
- ✅ You control what gets imported
- ✅ Easy to delete individual entries
- ✅ Open source - you can audit the code

## 🔄 Keeping Data Updated

### Automated Updates (Future)
- Set up GitHub webhooks for real-time updates
- Schedule periodic exports
- Monitor for new LinkedIn content

### Manual Updates
```bash
# Re-run exports periodically
export GITHUB_TOKEN=your_token
node scripts/export-github.js

# Import new data
node scripts/load-data.js exports/github-export-latest.json
./exports/import-commands-latest.sh
```

## 💡 Tips for Best Results

1. **Use descriptive titles** - They appear in search results
2. **Add relevant tags** - Helps with categorization and search
3. **Include metadata** - Dates, URLs, and context are valuable
4. **Regular exports** - Keep your data current
5. **Backup exports** - Save your JSON files safely

Your Personal AI Assistant will become more powerful as you add more data!
