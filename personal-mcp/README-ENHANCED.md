# Personal AI Assistant MCP Server - Enhanced Edition

An advanced Model Context Protocol (MCP) server that transforms your personal and professional data into an AI-accessible knowledge base with a beautiful, modern web interface.

![Personal MCP Server](https://i.ibb.co/vCw7xH33/Screenshot-2025-06-03-at-12-23-07.png)

## 🌟 Features

### 🤖 **AI-Powered Knowledge Base**
- **Professional Profile**: Complete career overview with sanitized personal information
- **Work Experience**: 12+ years of detailed professional history across top tech companies
- **Skills & Expertise**: Comprehensive technical and leadership competencies
- **GitHub Projects**: All public repositories with intelligent categorization
- **Education Background**: Academic credentials and certifications
- **Recommendations**: Professional endorsements and feedback

### 🎨 **Modern Web Interface**
- **Glass Morphism Design**: Beautiful frosted glass effects with backdrop blur
- **Responsive Layout**: Perfect viewing experience across all devices
- **Smooth Animations**: Elegant fade-in, slide-up, and hover effects
- **Dark Mode Ready**: Carefully crafted color scheme for accessibility
- **Professional Typography**: Inter font with advanced features
- **Interactive Elements**: Hover states, tooltips, and micro-interactions

### 🔍 **Advanced Search & Discovery**
- **Natural Language Search**: Query using conversational language
- **Category Filtering**: Filter by professional domains (work, projects, skills)
- **Timeline Analysis**: Chronological view of career progression
- **Growth Pattern Recognition**: AI-powered insights into professional development

## 🚀 Live Demo

**🌐 Web Interface**: [https://personal-mcp-worker.santhoshkumar199.workers.dev](https://personal-mcp-worker.santhoshkumar199.workers.dev)

**📊 API Endpoints**:
- `GET /` - Interactive web interface
- `GET /api/search?q={query}` - Search knowledge base
- `GET /api/profile` - Professional profile summary
- `GET /api/projects` - GitHub projects overview
- `GET /api/timeline` - Career timeline

## 🛠️ Technical Architecture

### **Frontend**
- **Framework**: Vanilla JavaScript with Tailwind CSS
- **Styling**: Custom CSS3 animations, glass morphism effects
- **Performance**: Optimized loading, lazy image loading, efficient animations
- **Accessibility**: ARIA labels, semantic HTML, keyboard navigation

### **Backend**
- **Runtime**: Cloudflare Workers (Edge computing)
- **Storage**: Cloudflare KV for knowledge base
- **Data Processing**: TypeScript with intelligent sanitization
- **API**: RESTful endpoints with JSON responses

### **Data Sources**
- **LinkedIn Export**: Professional history, connections, skills
- **GitHub API**: Repository data, commit history, project details
- **Manual Curation**: Personal notes, learning materials, insights

## 📁 Project Structure

```
personal-mcp/
├── 🌐 cloudflare/          # Web interface & API
│   ├── src/
│   │   ├── worker.ts       # Main Cloudflare Worker
│   │   ├── index.html      # Static HTML (fallback)
│   │   └── Screenshot.png  # Demo screenshot
│   ├── package.json        # Dependencies
│   └── wrangler.toml       # Cloudflare configuration
├── 📊 data/                # Knowledge base
│   ├── knowledge-base.json # Original data
│   └── processed-knowledge-base.json # Sanitized data
├── 🔧 scripts/            # Data processing
│   ├── process-personal-data.js # Main processor
│   ├── export-github.js    # GitHub data export
│   └── import-linkedin.js  # LinkedIn data import
├── 📝 Linkedin data/       # Raw LinkedIn export
├── 🚀 src/                 # MCP Server core
│   └── index.ts           # Main MCP implementation
└── 📋 docs/               # Documentation
```

## 🚀 Quick Start

### **1. Clone Repository**
```bash
git clone https://github.com/SanthoshSetty/mcp-knowledge-server.git
cd personal-mcp
```

### **2. Install Dependencies**
```bash
npm install
cd cloudflare && npm install
```

### **3. Process Your Data**
```bash
# Process LinkedIn and GitHub data
node scripts/process-personal-data.js
```

### **4. Run Locally**
```bash
# Start MCP server
npm run dev

# Start web interface
cd cloudflare && npm run dev
```

### **5. Deploy to Production**
```bash
cd cloudflare && npm run deploy
```

## 🎯 MCP Tools Available

### **Core Search & Discovery**
- `search_personal_knowledge` - Natural language search across all data
- `get_professional_profile` - Comprehensive professional overview
- `get_work_experience` - Detailed career history with achievements
- `get_skills_expertise` - Technical and leadership competencies

### **Project & Development**
- `get_github_projects` - Repository analysis with language/topic filtering
- `get_project_timeline` - Development history and progression
- `analyze_technical_growth` - Skill development patterns

### **Career Insights**
- `get_career_progression` - Professional advancement analysis
- `get_recommendations` - Peer and supervisor feedback
- `analyze_network_growth` - Professional relationship building

## 🎨 Design System

### **Color Palette**
- **Primary**: Blue gradient (#3b82f6 to #2563eb)
- **Secondary**: Slate tones (#64748b to #475569)
- **Accent**: Purple gradient (#667eea to #764ba2)
- **Background**: Multi-layer gradients (slate-50 to indigo-100)

### **Typography**
- **Font Family**: Inter (Google Fonts)
- **Features**: Stylistic sets (cv02, cv03, cv04, cv11)
- **Weights**: 300-800 for hierarchical information

### **Animations**
- **Fade In**: 0.6s ease-out with vertical translation
- **Slide Up**: 0.5s ease-out for content reveals
- **Bounce Gentle**: 3s infinite for floating elements
- **Glow Effect**: 2s alternate for interactive elements

## 📊 Data Privacy & Security

### **Personal Information Sanitization**
- ✅ Email addresses removed/redacted
- ✅ Phone numbers anonymized  
- ✅ Specific addresses generalized
- ✅ Personal identifiers protected
- ✅ Professional context preserved

### **Security Features**
- 🔒 HTTPS-only communication
- 🛡️ CORS protection
- 🔐 No sensitive data in client-side code
- 🏠 Edge computing for performance
- 📝 Audit trail for API access

## 🤝 Connect with Me

### **Professional Platforms**
- **LinkedIn**: [santhoshkumarsetty](https://linkedin.com/in/santhoshkumarsetty)
- **GitHub**: [SanthoshSetty](https://github.com/santhoshkumarsetty)
- **Current Role**: Senior AI Product Leader @ Trustana

### **AI Conversations**
Start intelligent conversations about my:
- 🎯 Product Management expertise
- 🤖 AI/ML implementation experience  
- 🏗️ Technical architecture decisions
- 📈 Growth strategy insights
- 🔧 Engineering leadership

## 📄 License

MIT License - feel free to use this as inspiration for your own personal MCP server!

---

*Built with ❤️ using Model Context Protocol, TypeScript, and modern web technologies*
