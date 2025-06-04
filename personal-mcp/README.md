# Personal AI Assistant MCP Server

✅ **NOW LIVE!** Your personal knowledge base is accessible worldwide with a beautiful interface:

## 🌐 **https://personal-mcp-worker.santhoshkumar199.workers.dev**

Transform your personal digital life into an AI-accessible knowledge base. This Model Context Protocol (MCP) server creates a comprehensive digital memory companion that integrates with GitHub repositories, LinkedIn posts, personal notes, and project data.

---

## 🚀 **Quick Connect**

### 🤖 For Claude Desktop
```bash
./setup-claude.sh
```
*Then restart Claude Desktop and enjoy 6 personal AI tools!*

### 🔗 For Custom GPTs & OpenAI
**API Base:** `https://personal-mcp-worker.santhoshkumar199.workers.dev/api/`

### 🌐 For Web Interface
**Visit:** `https://personal-mcp-worker.santhoshkumar199.workers.dev`
*Features: Beautiful UI, one-click copying, live testing, mobile-responsive*

---

## 🎯 Overview

This MCP server acts as your personal AI assistant's memory system, providing intelligent access to:
- **GitHub Projects**: All your repositories, commits, and code insights
- **LinkedIn Activity**: Professional posts, articles, and career milestones  
- **Personal Knowledge**: Learning notes, project decisions, and research
- **Timeline Analysis**: Chronological view of your professional development
- **Growth Patterns**: AI-powered analysis of your skill and career progression

## 🚀 Features

### 7 Core Tools Available to AI Assistants

1. **`search_personal_knowledge`** - Intelligent search across all your personal data
2. **`get_github_projects`** - Filter and retrieve GitHub repository information
3. **`get_linkedin_activity`** - Access LinkedIn posts, articles, and professional content
4. **`add_personal_knowledge`** - Add new entries to your knowledge base
5. **`get_personal_timeline`** - Chronological view of professional development
6. **`analyze_growth_patterns`** - Analyze professional and technical growth trends
7. **`export_github_data`** - Export GitHub data for integration

### Knowledge Categories

- 📂 **github-projects** - Repository data, READMEs, commit history
- 💼 **linkedin-posts** - Professional posts, articles, engagement
- 📝 **learning-notes** - Study materials, course notes, insights
- 🎯 **project-decisions** - Architecture choices, lessons learned
- 🏆 **career-milestones** - Job changes, promotions, achievements
- 🤝 **meeting-notes** - Important discussions, decisions, action items
- 🔬 **personal-research** - Research projects, experiments, findings

## 🛠 Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Claude Desktop or compatible MCP client

### Automated Setup (Recommended)

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd personal-mcp
   ```

2. **Run the automated setup:**
   ```bash
   ./setup.sh
   ```
   
   This script will:
   - ✅ Check Node.js version compatibility
   - 📦 Install all dependencies
   - 🔨 Build the TypeScript project
   - 🧪 Test the MCP server
   - ⚙️  Configure Claude Desktop automatically
   - 📄 Create environment template

3. **Restart Claude Desktop** to load the new MCP server

### Manual Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Configure Claude Desktop:**
   Add to your Claude Desktop MCP configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):
   ```json
   {
     "mcpServers": {
       "personal-ai-assistant": {
         "command": "node",
         "args": ["/path/to/personal-mcp/dist/index.js"],
         "cwd": "/path/to/personal-mcp"
       }
     }
   }
   ```

4. **Test the server:**
   ```bash
   npm run dev
   ```

## 📊 Importing Your Real Data

### GitHub Projects (5 minutes)
```bash
# Set your GitHub token
export GITHUB_TOKEN=your_github_token

# Export all your repositories
node scripts/export-github.js

# Import directly into knowledge base (recommended)
node scripts/direct-import.js exports/github-export-*.json

# Alternative: Import via MCP commands
# node scripts/load-data.js exports/github-export-*.json
# ./exports/import-commands-*.sh
```

### LinkedIn Data (24-48 hours)
```bash
# 1. Request export from LinkedIn (https://www.linkedin.com/settings/)
# 2. Extract the ZIP file when received
unzip Basic_LinkedInDataExport_*.zip -d linkedin-data/

# 3. Process and import the data
node scripts/import-linkedin.js linkedin-data/
node scripts/direct-import.js exports/linkedin-import-*.json

# Alternative: Import via MCP commands
# node scripts/load-data.js exports/linkedin-import-*.json
# ./exports/import-commands-*.sh
```

**📖 See [Data Export Guide](scripts/DATA-EXPORT-GUIDE.md) for detailed instructions**

## 📋 Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Run the compiled server
- `npm run dev` - Build and run in one command
- `npm run watch` - Watch for changes and rebuild
- `npm run clean` - Remove build artifacts

### Data Export Scripts
- `scripts/export-github.js` - Export GitHub repositories
- `scripts/import-linkedin.js` - Import LinkedIn data export
- `scripts/load-data.js` - Load exported data into MCP server

## 🔧 Configuration

### Environment Variables
```bash
# GitHub Integration (for data export)
GITHUB_TOKEN=your_github_token

# LinkedIn Integration (future feature)  
LINKEDIN_TOKEN=your_linkedin_token

# Cloudflare Workers (future deployment)
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
```

## 📚 Usage Examples

### With Claude Desktop

Once configured, you can ask Claude questions like:

- *"What are my most recent GitHub projects?"*
- *"Show me my LinkedIn posts about AI from last month"*
- *"What have I learned about TypeScript lately?"*
- *"Analyze my career growth patterns over the last two years"*
- *"Add a note about today's important project decision"*

### Direct API Usage

```bash
# Test the MCP server directly
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node dist/index.js
```

## 🏗 Architecture

```
Personal AI Assistant MCP Server
├── Core Server (PersonalAIServer)
├── Knowledge Base (Map-based storage)
├── Tool Handlers (7 specialized tools)
├── Data Importers (GitHub, LinkedIn, Notes)
└── Analysis Engine (Growth patterns, insights)
```

### Data Flow
1. **Import**: Pull data from GitHub, LinkedIn, personal files
2. **Store**: Organize in categorized knowledge base
3. **Search**: AI-powered semantic search across all data
4. **Analyze**: Generate insights and growth patterns
5. **Serve**: Provide structured responses to AI assistants

## 🔮 Roadmap

### Phase 1: Core Foundation ✅
- [x] MCP server implementation
- [x] Basic knowledge categories
- [x] Search and retrieval tools
- [x] Sample data structure

### Phase 2: Real Integration (In Progress)
- [ ] GitHub API integration
- [ ] LinkedIn data export templates
- [ ] File system knowledge import
- [ ] Enhanced search algorithms

### Phase 3: Advanced Features
- [ ] Cloudflare Workers deployment
- [ ] Real-time data synchronization
- [ ] Advanced analytics and insights
- [ ] Custom knowledge connectors
- [ ] Web dashboard for management

### Phase 4: AI Enhancement
- [ ] Vector embeddings for semantic search
- [ ] AI-powered content summarization
- [ ] Automated knowledge categorization
- [ ] Predictive career insights

## 🤝 Contributing

This is a personal project, but contributions and ideas are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - feel free to use this as inspiration for your own personal AI assistant!

## 🔗 Related Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [MCP SDK Examples](https://github.com/modelcontextprotocol/create-python-server)
- [Claude Desktop MCP Guide](https://docs.anthropic.com/claude/docs/mcp)

---

*Built with ❤️ for personal AI assistance and digital memory management*
