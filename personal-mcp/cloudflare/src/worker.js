"use strict";
/**
 * Personal AI Assistant MCP Server - Cloudflare Workers Edition
 *
 * A web-accessible MCP server that makes your personal knowledge base available via HTTP API.
 * Integrates with Cloudflare KV for data storage and R2 for file storage.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// Personal AI Assistant Worker
class PersonalAIWorker {
    constructor(env) {
        this.categories = {
            'professional-profile': 'Professional profile and summary',
            'work-experience': 'Career history and professional experience',
            'skills-expertise': 'Technical and professional skills',
            'education-background': 'Educational background and qualifications',
            'github-projects': 'Personal GitHub repositories and code projects',
            'certifications': 'Professional certifications and achievements',
            'recommendations': 'Professional recommendations and endorsements',
            'linkedin-posts': 'Professional LinkedIn posts and articles',
            'learning-notes': 'Programming tutorials, courses, and technical learning',
            'project-decisions': 'Architecture decisions and technical choices',
            'career-milestones': 'Professional achievements and career progression',
            'meeting-notes': 'Important meetings, discussions, and decisions',
            'personal-research': 'Research papers, articles, and industry insights'
        };
        this.env = env;
    }
    handleRequest(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = new URL(request.url);
            const path = url.pathname;
            // Handle CORS
            if (request.method === 'OPTIONS') {
                return new Response(null, {
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type',
                    },
                });
            }
            // API Routes
            if (path.startsWith('/api/')) {
                return this.handleAPI(request);
            }
            // MCP Server Routes
            if (path === '/mcp' || path === '/sse') {
                return this.handleMCP(request);
            }
            // Default: Return API documentation
            return this.handleDocs();
        });
    }
    handleAPI(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = new URL(request.url);
            const path = url.pathname;
            const method = request.method;
            try {
                let result;
                switch (path) {
                    case '/api/search':
                        if (method === 'GET') {
                            const query = url.searchParams.get('q') || '';
                            const category = url.searchParams.get('category') || '';
                            const limit = parseInt(url.searchParams.get('limit') || '10');
                            result = yield this.searchKnowledge(query, category, limit);
                        }
                        break;
                    case '/api/github/projects':
                        if (method === 'GET') {
                            const language = url.searchParams.get('language') || '';
                            const topic = url.searchParams.get('topic') || '';
                            result = yield this.getGitHubProjects(language, topic);
                        }
                        break;
                    case '/api/linkedin/activity':
                        if (method === 'GET') {
                            const type = url.searchParams.get('type') || 'all';
                            const timeframe = url.searchParams.get('timeframe') || 'all';
                            result = yield this.getLinkedInActivity(type, timeframe);
                        }
                        break;
                    case '/api/timeline':
                        if (method === 'GET') {
                            const timeframe = url.searchParams.get('timeframe') || 'all';
                            const focus = url.searchParams.get('focus') || 'all';
                            result = yield this.getPersonalTimeline(timeframe, focus);
                        }
                        break;
                    case '/api/knowledge':
                        if (method === 'POST') {
                            const body = yield request.json();
                            result = yield this.addKnowledge(body);
                        }
                        break;
                    case '/api/analytics/growth':
                        if (method === 'GET') {
                            const dimension = url.searchParams.get('dimension') || 'skills';
                            result = yield this.analyzeGrowthPatterns(dimension);
                        }
                        break;
                    default:
                        return new Response('API endpoint not found', { status: 404 });
                }
                return new Response(JSON.stringify(result, null, 2), {
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                });
            }
            catch (error) {
                return new Response(JSON.stringify({
                    error: 'API Error',
                    message: error instanceof Error ? error.message : 'Unknown error'
                }), {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                });
            }
        });
    }
    handleMCP(request) {
        return __awaiter(this, void 0, void 0, function* () {
            if (request.method === 'GET') {
                // Server-Sent Events for MCP
                return new Response('MCP Server running', {
                    headers: {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                        'Access-Control-Allow-Origin': '*',
                    },
                });
            }
            if (request.method === 'POST') {
                // Handle MCP JSON-RPC requests
                const body = yield request.json();
                const result = yield this.handleMCPRequest(body);
                return new Response(JSON.stringify(result), {
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                });
            }
            return new Response('Method not allowed', { status: 405 });
        });
    }
    handleMCPRequest(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const { method, params, id } = request;
            try {
                let result;
                switch (method) {
                    case 'tools/list':
                        result = yield this.listTools();
                        break;
                    case 'tools/call':
                        result = yield this.callTool(params.name, params.arguments || {});
                        break;
                    default:
                        throw new Error(`Unknown method: ${method}`);
                }
                return {
                    jsonrpc: '2.0',
                    id,
                    result
                };
            }
            catch (error) {
                return {
                    jsonrpc: '2.0',
                    id,
                    error: {
                        code: -32000,
                        message: error instanceof Error ? error.message : 'Unknown error'
                    }
                };
            }
        });
    }
    listTools() {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                tools: [
                    {
                        name: 'search_personal_knowledge',
                        description: 'Search across all personal knowledge categories',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                query: { type: 'string', description: 'Search query' },
                                category: { type: 'string', description: 'Optional category filter' },
                                limit: { type: 'number', description: 'Maximum results', default: 10 }
                            },
                            required: ['query']
                        }
                    },
                    {
                        name: 'get_github_projects',
                        description: 'Get information about GitHub repositories',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                language: { type: 'string', description: 'Filter by language' },
                                topic: { type: 'string', description: 'Filter by topic' }
                            }
                        }
                    },
                    {
                        name: 'get_linkedin_activity',
                        description: 'Retrieve LinkedIn posts and activity',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                type: { type: 'string', enum: ['posts', 'articles', 'comments', 'all'] },
                                timeframe: { type: 'string', enum: ['week', 'month', 'quarter', 'year', 'all'] }
                            }
                        }
                    },
                    {
                        name: 'add_personal_knowledge',
                        description: 'Add new knowledge to the knowledge base',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                category: { type: 'string', enum: Object.keys(this.categories) },
                                title: { type: 'string' },
                                content: { type: 'string' },
                                tags: { type: 'array', items: { type: 'string' } },
                                metadata: { type: 'object' }
                            },
                            required: ['category', 'title', 'content']
                        }
                    },
                    {
                        name: 'get_personal_timeline',
                        description: 'Get chronological view of personal development',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                timeframe: { type: 'string', enum: ['month', 'quarter', 'year', 'all'] },
                                focus: { type: 'string', enum: ['career', 'technical', 'learning', 'projects', 'all'] }
                            }
                        }
                    },
                    {
                        name: 'analyze_growth_patterns',
                        description: 'Analyze professional and technical growth patterns',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                dimension: { type: 'string', enum: ['skills', 'projects', 'network', 'content', 'achievements'] }
                            },
                            required: ['dimension']
                        }
                    }
                ]
            };
        });
    }
    callTool(name, args) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (name) {
                case 'search_personal_knowledge':
                    return {
                        content: [{
                                type: 'text',
                                text: JSON.stringify(yield this.searchKnowledge(args.query, args.category, args.limit), null, 2)
                            }]
                    };
                case 'get_github_projects':
                    return {
                        content: [{
                                type: 'text',
                                text: JSON.stringify(yield this.getGitHubProjects(args.language, args.topic), null, 2)
                            }]
                    };
                case 'get_linkedin_activity':
                    return {
                        content: [{
                                type: 'text',
                                text: JSON.stringify(yield this.getLinkedInActivity(args.type, args.timeframe), null, 2)
                            }]
                    };
                case 'add_personal_knowledge':
                    return {
                        content: [{
                                type: 'text',
                                text: JSON.stringify(yield this.addKnowledge(args), null, 2)
                            }]
                    };
                case 'get_personal_timeline':
                    return {
                        content: [{
                                type: 'text',
                                text: JSON.stringify(yield this.getPersonalTimeline(args.timeframe, args.focus), null, 2)
                            }]
                    };
                case 'analyze_growth_patterns':
                    return {
                        content: [{
                                type: 'text',
                                text: JSON.stringify(yield this.analyzeGrowthPatterns(args.dimension), null, 2)
                            }]
                    };
                default:
                    throw new Error(`Unknown tool: ${name}`);
            }
        });
    }
    // Knowledge Base Operations
    getKnowledgeBase() {
        return __awaiter(this, void 0, void 0, function* () {
            const knowledgeBase = new Map();
            for (const category of Object.keys(this.categories)) {
                const data = yield this.env.KNOWLEDGE_BASE.get(category);
                knowledgeBase.set(category, data ? JSON.parse(data) : []);
            }
            return knowledgeBase;
        });
    }
    saveKnowledgeBase(knowledgeBase) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const [category, data] of knowledgeBase.entries()) {
                yield this.env.KNOWLEDGE_BASE.put(category, JSON.stringify(data));
            }
        });
    }
    searchKnowledge(query_1, category_1) {
        return __awaiter(this, arguments, void 0, function* (query, category, limit = 10) {
            const knowledgeBase = yield this.getKnowledgeBase();
            const results = [];
            const searchCategories = category ? [category] : Object.keys(this.categories);
            for (const cat of searchCategories) {
                const entries = knowledgeBase.get(cat) || [];
                for (const entry of entries) {
                    const searchText = `${entry.title || entry.name || ''} ${entry.content || entry.description || ''} ${(entry.tags || []).join(' ')}`.toLowerCase();
                    if (searchText.includes(query.toLowerCase())) {
                        results.push(Object.assign(Object.assign({}, entry), { category: cat, relevanceScore: this.calculateRelevance(query, searchText) }));
                    }
                }
            }
            results.sort((a, b) => b.relevanceScore - a.relevanceScore);
            return {
                query,
                totalResults: results.length,
                results: results.slice(0, limit)
            };
        });
    }
    calculateRelevance(query, text) {
        const queryWords = query.toLowerCase().split(' ');
        let score = 0;
        for (const word of queryWords) {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            const matches = text.match(regex);
            if (matches) {
                score += matches.length;
            }
        }
        return score;
    }
    getGitHubProjects(language, topic) {
        return __awaiter(this, void 0, void 0, function* () {
            const knowledgeBase = yield this.getKnowledgeBase();
            const projects = knowledgeBase.get('github-projects') || [];
            let filteredProjects = projects;
            if (language) {
                filteredProjects = filteredProjects.filter((p) => {
                    var _a;
                    return (p.language && p.language.toLowerCase() === language.toLowerCase()) ||
                        (((_a = p.metadata) === null || _a === void 0 ? void 0 : _a.language) && p.metadata.language.toLowerCase() === language.toLowerCase()) ||
                        (p.tags && p.tags.some((tag) => tag.toLowerCase() === language.toLowerCase()));
                });
            }
            if (topic) {
                filteredProjects = filteredProjects.filter((p) => (p.topics && p.topics.some((t) => t.toLowerCase().includes(topic.toLowerCase()))) ||
                    (p.tags && p.tags.some((tag) => tag.toLowerCase().includes(topic.toLowerCase()))));
            }
            return {
                totalProjects: filteredProjects.length,
                projects: filteredProjects
            };
        });
    }
    getLinkedInActivity(type, timeframe) {
        return __awaiter(this, void 0, void 0, function* () {
            const knowledgeBase = yield this.getKnowledgeBase();
            const activity = knowledgeBase.get('linkedin-posts') || [];
            let filteredActivity = activity;
            if (type !== 'all') {
                filteredActivity = filteredActivity.filter((item) => item.type === type);
            }
            // Add timeframe filtering logic here
            return {
                totalActivity: filteredActivity.length,
                activity: filteredActivity
            };
        });
    }
    addKnowledge(entry) {
        return __awaiter(this, void 0, void 0, function* () {
            const knowledgeBase = yield this.getKnowledgeBase();
            const { category, title, content, tags = [], metadata = {} } = entry;
            const categoryEntries = knowledgeBase.get(category) || [];
            const newEntry = {
                id: `${category}-${Date.now()}`,
                title,
                content,
                tags,
                metadata: Object.assign(Object.assign({}, metadata), { dateAdded: new Date().toISOString() })
            };
            categoryEntries.push(newEntry);
            knowledgeBase.set(category, categoryEntries);
            yield this.saveKnowledgeBase(knowledgeBase);
            return {
                success: true,
                entry: newEntry
            };
        });
    }
    getPersonalTimeline(timeframe, focus) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const knowledgeBase = yield this.getKnowledgeBase();
            const timeline = [];
            for (const [category, entries] of knowledgeBase.entries()) {
                for (const entry of entries) {
                    timeline.push(Object.assign(Object.assign({}, entry), { category, date: ((_a = entry.metadata) === null || _a === void 0 ? void 0 : _a.dateAdded) || entry.dateAdded || entry.date || entry.lastUpdated }));
                }
            }
            timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            return {
                timeframe,
                focus,
                totalEvents: timeline.length,
                timeline
            };
        });
    }
    analyzeGrowthPatterns(dimension) {
        return __awaiter(this, void 0, void 0, function* () {
            const knowledgeBase = yield this.getKnowledgeBase();
            // Implement growth analysis logic based on dimension
            const analysis = {
                dimension,
                insights: [],
                trends: [],
                recommendations: []
            };
            switch (dimension) {
                case 'skills':
                    // Analyze technical skills progression
                    break;
                case 'projects':
                    // Analyze project complexity and growth
                    break;
                case 'network':
                    // Analyze professional network growth
                    break;
                case 'content':
                    // Analyze content creation patterns
                    break;
                case 'achievements':
                    // Analyze career achievements
                    break;
            }
            return analysis;
        });
    }
    handleDocs() {
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Santhosh Kumar Setty - AI-Powered Professional Knowledge Hub</title>
    <meta name="description" content="Explore my professional journey through an intelligent MCP server. Access GitHub projects, LinkedIn insights, and career milestones through AI-powered conversations.">
    <meta name="keywords" content="MCP, AI, Product Management, GitHub, LinkedIn, Professional Portfolio">
    <meta name="author" content="Santhosh Kumar Setty">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://personal-mcp-worker.santhoshkumar199.workers.dev/">
    <meta property="og:title" content="Santhosh Kumar Setty - AI-Powered Professional Knowledge Hub">
    <meta property="og:description" content="Connect with my professional knowledge through an intelligent MCP server">
    <meta property="og:image" content="https://i.ibb.co/vCw7xH33/Screenshot-2025-06-03-at-12-23-07.png">

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="https://personal-mcp-worker.santhoshkumar199.workers.dev/">
    <meta property="twitter:title" content="Santhosh Kumar Setty - AI-Powered Professional Knowledge Hub">
    <meta property="twitter:description" content="Connect with my professional knowledge through an intelligent MCP server">
    <meta property="twitter:image" content="https://i.ibb.co/vCw7xH33/Screenshot-2025-06-03-at-12-23-07.png">

    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: {
                            50: '#eff6ff',
                            100: '#dbeafe',
                            500: '#3b82f6',
                            600: '#2563eb',
                            700: '#1d4ed8',
                            900: '#1e3a8a'
                        },
                        secondary: {
                            50: '#f8fafc',
                            100: '#f1f5f9',
                            500: '#64748b',
                            600: '#475569',
                            900: '#0f172a'
                        }
                    },
                    fontFamily: {
                        'sans': ['Inter', 'system-ui', 'sans-serif']
                    },
                    animation: {
                        'fade-in': 'fadeIn 0.6s ease-out',
                        'slide-up': 'slideUp 0.5s ease-out',
                        'bounce-gentle': 'bounceGentle 2s infinite',
                        'glow': 'glow 2s ease-in-out infinite alternate'
                    }
                }
            }
        }
    </script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        * {
            scroll-behavior: smooth;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes bounceGentle {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
        }
        
        @keyframes glow {
            from { box-shadow: 0 0 20px rgba(59, 130, 246, 0.5); }
            to { box-shadow: 0 0 30px rgba(59, 130, 246, 0.8), 0 0 40px rgba(59, 130, 246, 0.3); }
        }
        
        .glass-morphism {
            background: rgba(255, 255, 255, 0.25);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.18);
        }
        
        .text-gradient {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .card-hover {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .card-hover:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        
        .floating-element {
            animation: bounceGentle 3s ease-in-out infinite;
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
            width: 8px;
        }
        
        ::-webkit-scrollbar-track {
            background: #f1f5f9;
        }
        
        ::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
        }
    </style>
</head>
<body class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 antialiased">
    <!-- Navigation -->
    <nav class="fixed top-0 w-full z-50 glass-morphism border-b border-white/20">
        <div class="container mx-auto px-6 py-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <div class="relative">
                        <div class="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold shadow-lg animate-glow">
                            SK
                        </div>
                        <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
                    </div>
                    <div>
                        <h1 class="text-xl font-bold text-gray-900">Santhosh Kumar Setty</h1>
                        <p class="text-sm text-primary-600 font-medium">Senior AI Product Leader</p>
                        <div class="flex items-center space-x-2 mt-1">
                            <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span class="text-xs text-gray-500">Available for AI conversations</span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center space-x-3">
                    <a href="https://linkedin.com/in/santhoshkumarsetty" 
                       target="_blank" 
                       rel="noopener noreferrer" 
                       class="group relative p-3 rounded-full bg-white/50 hover:bg-white/80 transition-all duration-300 shadow-md hover:shadow-lg"
                       aria-label="Connect on LinkedIn">
                        <svg class="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                        <div class="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            LinkedIn
                        </div>
                    </a>
                    <a href="https://github.com/santhoshkumarsetty" 
                       target="_blank" 
                       rel="noopener noreferrer" 
                       class="group relative p-3 rounded-full bg-white/50 hover:bg-white/80 transition-all duration-300 shadow-md hover:shadow-lg"
                       aria-label="View GitHub Profile">
                        <svg class="w-5 h-5 text-gray-800 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        <div class="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            GitHub
                        </div>
                    </a>
                </div>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <main>
        <section class="pt-32 pb-20 px-6 relative overflow-hidden">
            <!-- Background decoration -->
            <div class="absolute inset-0 overflow-hidden">
                <div class="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl floating-element"></div>
                <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-pink-600/20 rounded-full blur-3xl floating-element" style="animation-delay: -1s;"></div>
            </div>
            
            <div class="container mx-auto max-w-6xl text-center relative z-10">
                <div class="mb-12 animate-fade-in">
                    <div class="relative inline-block">
                        <img 
                            src="https://i.ibb.co/vCw7xH33/Screenshot-2025-06-03-at-12-23-07.png" 
                            alt="Personal MCP Server in action with Claude - AI-powered knowledge interface"
                            class="w-full max-w-4xl mx-auto rounded-2xl shadow-2xl border border-white/20 card-hover"
                            loading="eager"
                        />
                        <div class="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent rounded-2xl"></div>
                    </div>
                </div>
                
                <div class="space-y-6 animate-slide-up">
                    <h1 class="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
                        Welcome to My
                        <span class="block text-gradient">AI-Powered Knowledge Hub</span>
                    </h1>
                    
                    <p class="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed font-light">
                        Discover my professional journey through an intelligent MCP server that connects you directly 
                        to my <span class="font-semibold text-primary-600">GitHub projects</span>, 
                        <span class="font-semibold text-primary-600">LinkedIn insights</span>, and 
                        <span class="font-semibold text-primary-600">career milestones</span>. 
                        Experience the future of personal knowledge sharing.
                    </p>

                    <!-- Stats Grid -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto mt-12">
                        <div class="glass-morphism rounded-2xl p-4 text-center card-hover">
                            <div class="text-2xl font-bold text-primary-600">12+</div>
                            <div class="text-sm text-gray-600">Years Experience</div>
                        </div>
                        <div class="glass-morphism rounded-2xl p-4 text-center card-hover">
                            <div class="text-2xl font-bold text-primary-600">4.7K+</div>
                            <div class="text-sm text-gray-600">LinkedIn Followers</div>
                        </div>
                        <div class="glass-morphism rounded-2xl p-4 text-center card-hover">
                            <div class="text-2xl font-bold text-primary-600">500+</div>
                            <div class="text-sm text-gray-600">Professional Network</div>
                        </div>
                        <div class="glass-morphism rounded-2xl p-4 text-center card-hover">
                            <div class="text-2xl font-bold text-primary-600">AI</div>
                            <div class="text-sm text-gray-600">Product Leader</div>
                        </div>
                    </div>
                    
                    <!-- CTA Button -->
                    <div class="mt-12">
                        <a href="#connect" class="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                            <span>Start AI Conversation</span>
                            <svg class="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </section> 
                    alt="Personal MCP Server in action with Claude" 
                    class="w-full max-w-4xl mx-auto rounded-lg shadow-lg border border-gray-200"
                />
            </div>
            
            <h1 class="text-5xl font-bold text-gray-900 mb-6 animate-fade-in">
                Welcome to My AI-Powered
                <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600"> Workspace</span>
            </h1>
            
            <p class="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed animate-fade-in">
                Discover my journey in AI and B2B SaaS through an intelligent MCP server that connects you directly 
                to my GitHub projects, LinkedIn insights, and professional articles. Experience the future of 
                personal knowledge sharing.
            </p>

            <div class="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in">
                <div class="flex items-center space-x-2 text-sm text-gray-500">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.5 6L12 10.5 8.5 8 12 5.5 15.5 8zM12 13.5l3.5 2.5L12 18.5 8.5 16l3.5-2.5z"/>
                    </svg>
                    <span>4,725 LinkedIn followers</span>
                </div>
                <div class="flex items-center space-x-2 text-sm text-gray-500">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0L19.2 12l-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
                    </svg>
                    <span>500+ connections</span>
                </div>
                <div class="flex items-center space-x-2 text-sm text-gray-500">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                    <span>AI Product Leader @ Trustana</span>
                </div>
            </div>
        </div>
    </section>

    <!-- Connection Methods -->
    <section class="py-16 px-6">
        <div class="container mx-auto max-w-6xl">
            <div class="text-center mb-12">
                <h2 class="text-3xl font-bold text-gray-900 mb-4">
                    Connect with My MCP Server
                </h2>
                <p class="text-lg text-gray-600 max-w-2xl mx-auto">
                    Choose your preferred AI platform to explore my projects, articles, and professional insights 
                    through an intelligent conversation interface.
                </p>
            </div>

            <div class="grid md:grid-cols-2 gap-8">
                <!-- Claude Desktop Connection -->
                <div class="hover:shadow-2xl transition-all duration-300 hover:scale-105 border-0 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm">
                    <div class="text-center pb-4 p-6">
                        <div class="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.5 6L12 10.5 8.5 8 12 5.5 15.5 8zM12 13.5l3.5 2.5L12 18.5 8.5 16l3.5-2.5z"/>
                            </svg>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-2">Claude Desktop</h3>
                        <p class="text-gray-600 mb-6">
                            Connect through Anthropic's Claude Desktop for intelligent conversations about my work
                        </p>
                    </div>
                    <div class="p-6 pt-0 space-y-6">
                        <div class="bg-gray-50 rounded-lg p-4">
                            <h4 class="font-semibold text-gray-900 mb-2">What you can explore:</h4>
                            <ul class="space-y-2 text-sm text-gray-600">
                                <li class="flex items-center space-x-2">
                                    <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span>GitHub repositories and project details</span>
                                </li>
                                <li class="flex items-center space-x-2">
                                    <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span>LinkedIn posts and professional updates</span>
                                </li>
                                <li class="flex items-center space-x-2">
                                    <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span>Published articles and thought leadership</span>
                                </li>
                                <li class="flex items-center space-x-2">
                                    <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span>Professional connections and network insights</span>
                                </li>
                            </ul>
                        </div>
                        
                        <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <h4 class="font-semibold text-orange-900 mb-2">Setup Instructions:</h4>
                            <ol class="space-y-2 text-sm text-orange-800">
                                <li>1. Install Claude Desktop application</li>
                                <li>2. Configure MCP server endpoint</li>
                                <li>3. Add server credentials in settings</li>
                                <li>4. Start exploring my professional journey!</li>
                            </ol>
                        </div>

                        <button class="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-3 px-4 rounded-lg text-lg font-medium transition-colors">
                            <svg class="w-4 h-4 mr-2 inline-block" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.5 6L12 10.5 8.5 8 12 5.5 15.5 8zM12 13.5l3.5 2.5L12 18.5 8.5 16l3.5-2.5z"/>
                            </svg>
                            Connect with Claude Desktop
                            <svg class="w-4 h-4 ml-2 inline-block" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M5 12h14m-7-7l7 7-7 7"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- OpenAI Connection -->
                <div class="hover:shadow-2xl transition-all duration-300 hover:scale-105 border-0 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm">
                    <div class="text-center pb-4 p-6">
                        <div class="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                            </svg>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-2">OpenAI Integration</h3>
                        <p class="text-gray-600 mb-6">
                            Access my professional data through OpenAI's powerful language models
                        </p>
                    </div>
                    <div class="p-6 pt-0 space-y-6">
                        <div class="bg-gray-50 rounded-lg p-4">
                            <h4 class="font-semibold text-gray-900 mb-2">Features available:</h4>
                            <ul class="space-y-2 text-sm text-gray-600">
                                <li class="flex items-center space-x-2">
                                    <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span>Advanced project analysis and insights</span>
                                </li>
                                <li class="flex items-center space-x-2">
                                    <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span>Content summarization and key takeaways</span>
                                </li>
                                <li class="flex items-center space-x-2">
                                    <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span>Professional timeline and career journey</span>
                                </li>
                                <li class="flex items-center space-x-2">
                                    <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span>Technology stack and expertise mapping</span>
                                </li>
                            </ul>
                        </div>
                        
                        <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h4 class="font-semibold text-green-900 mb-2">Integration Steps:</h4>
                            <ol class="space-y-2 text-sm text-green-800">
                                <li>1. Set up OpenAI API credentials</li>
                                <li>2. Configure MCP server connection</li>
                                <li>3. Initialize the chat interface</li>
                                <li>4. Begin intelligent conversations!</li>
                            </ol>
                        </div>

                        <button class="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-3 px-4 rounded-lg text-lg font-medium transition-colors">
                            <svg class="w-4 h-4 mr-2 inline-block" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                            </svg>
                            Connect with OpenAI
                            <svg class="w-4 h-4 ml-2 inline-block" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M5 12h14m-7-7l7 7-7 7"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="py-8 px-6 border-t bg-white/80 backdrop-blur-sm">
        <div class="container mx-auto max-w-4xl text-center">
            <p class="text-gray-600">
                © 2024 Santhosh Kumar Setty. Built with AI-powered tools and modern web technologies.
            </p>
            <p class="text-sm text-gray-500 mt-2">
                Berlin, Germany • Product Leader @ Trustana • National University of Singapore Alumni
            </p>
        </div>
    </footer>
</div>

<script>
// Minimal JavaScript for basic interactions
document.addEventListener('DOMContentLoaded', function() {
    // Add simple fade-in animation for cards
    const cards = document.querySelectorAll('.glass-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'all 0.6s ease-out';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 200 + index * 100);
    });
    
    // Add hover effects for cards
    document.querySelectorAll('.glass-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-4px)';
            this.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)';
            this.style.transition = 'all 0.3s ease-out';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
        });
    });
});
</script>
</body>
</html>`;
        return new Response(html, {
            headers: {
                'Content-Type': 'text/html; charset=UTF-8',
                'Access-Control-Allow-Origin': '*',
            },
        });
    }
}
// Cloudflare Workers entry point
exports.default = {
    fetch(request, env) {
        return __awaiter(this, void 0, void 0, function* () {
            const worker = new PersonalAIWorker(env);
            return worker.handleRequest(request);
        });
    },
};
