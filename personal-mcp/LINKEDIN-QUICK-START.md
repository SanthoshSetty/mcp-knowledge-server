# LinkedIn Data Export Process

## Step 1: Request Your LinkedIn Data Export (5 minutes)

1. **Go to LinkedIn Settings:**
   - Visit: https://www.linkedin.com/settings/
   - Click "Data Privacy" in the left sidebar
   - Click "Get a copy of your data"

2. **Select What to Export:**
   - ✅ **Posts** - Your LinkedIn posts and updates
   - ✅ **Articles** - Published articles
   - ✅ **Comments** - Comments you've made
   - ✅ **Profile** - Your profile information
   - ✅ **Positions** - Work experience
   - ✅ **Education** - Educational background
   - ✅ **Connections** - Your professional network

3. **Request the Archive:**
   - Click "Request archive"
   - LinkedIn will email you when it's ready (usually 24-48 hours)

## Step 2: When You Get the Email (1 minute)

1. Download the ZIP file from LinkedIn's email
2. Extract it to a folder (e.g., `~/Downloads/linkedin-export/`)

## Step 3: Import Your Data (2 minutes)

```bash
# Navigate to your MCP server directory
cd /Users/santhoshkumarsampangiramasetty/personal-mcp

# Import the LinkedIn data
node scripts/import-linkedin.js ~/Downloads/Basic_LinkedInDataExport_*/

# Load into MCP server
node scripts/load-data.js exports/linkedin-import-*.json
./exports/import-commands-*.sh
```

## Step 4: Test with Claude Desktop

Ask your AI assistant:
- **"What have I posted about on LinkedIn recently?"**
- **"Show me my career progression"**
- **"What topics do I write about most?"**
- **"When did I start my current job?"**

---

## What Gets Imported

✅ **LinkedIn Posts** → `linkedin-posts` category
✅ **Published Articles** → `linkedin-posts` category  
✅ **Work Experience** → `career-milestones` category
✅ **Education** → `career-milestones` category
✅ **Professional Updates** → `career-milestones` category

## Privacy Note

- All data stays on your local machine
- No data is sent to external services
- You control what gets imported
- Easy to delete individual entries later
