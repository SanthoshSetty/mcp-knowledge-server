/**
 * Personal AI Assistant MCP Server - Cloudflare Workers Edition
 * 
 * A web-accessible MCP server that makes your personal knowledge base available via HTTP API.
 * Integrates with Cloudflare KV for data storage and R2 for file storage.
 */

import { z } from 'zod';

export interface Env {
  KNOWLEDGE_BASE: any; // KVNamespace
  FILES?: any; // R2Bucket
}

// Personal AI Assistant Worker
class PersonalAIWorker {
  private env: Env;
  private categories = {
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

  constructor(env: Env) {
    this.env = env;
  }

  async handleRequest(request: Request): Promise<Response> {
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

    // Download endpoints
    if (path === '/download/bridge') {
      return this.handleBridgeDownload();
    }

    if (path === '/download/config') {
      return this.handleConfigDownload();
    }

    // Image endpoints
    if (path === '/images/profile.jpeg') {
      return this.handleImageServing('profile');
    }

    if (path === '/images/main-image.jpeg') {
      return this.handleImageServing('main');
    }

    // Default: Return API documentation
    return this.handleDocs();
  }

  async handleAPI(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      let result: any;

      switch (path) {
        case '/api/search':
          if (method === 'GET') {
            const query = url.searchParams.get('q') || '';
            const category = url.searchParams.get('category') || '';
            const limit = parseInt(url.searchParams.get('limit') || '10');
            result = await this.searchKnowledge(query, category, limit);
          }
          break;

        case '/api/github/projects':
          if (method === 'GET') {
            const language = url.searchParams.get('language') || '';
            const topic = url.searchParams.get('topic') || '';
            result = await this.getGitHubProjects(language, topic);
          }
          break;

        case '/api/linkedin/activity':
          if (method === 'GET') {
            const type = url.searchParams.get('type') || 'all';
            const timeframe = url.searchParams.get('timeframe') || 'all';
            result = await this.getLinkedInActivity(type, timeframe);
          }
          break;

        case '/api/timeline':
          if (method === 'GET') {
            const timeframe = url.searchParams.get('timeframe') || 'all';
            const focus = url.searchParams.get('focus') || 'all';
            result = await this.getPersonalTimeline(timeframe, focus);
          }
          break;

        case '/api/knowledge':
          if (method === 'POST') {
            const body = await request.json();
            result = await this.addKnowledge(body);
          }
          break;

        case '/api/analytics/growth':
          if (method === 'GET') {
            const dimension = url.searchParams.get('dimension') || 'skills';
            result = await this.analyzeGrowthPatterns(dimension);
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

    } catch (error) {
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
  }

  async handleMCP(request: Request): Promise<Response> {
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
      const body = await request.json();
      const result = await this.handleMCPRequest(body);
      
      return new Response(JSON.stringify(result), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response('Method not allowed', { status: 405 });
  }

  async handleMCPRequest(request: any): Promise<any> {
    const { method, params, id } = request;

    try {
      let result: any;

      switch (method) {
        case 'tools/list':
          result = await this.listTools();
          break;
        case 'tools/call':
          result = await this.callTool(params.name, params.arguments || {});
          break;
        default:
          throw new Error(`Unknown method: ${method}`);
      }

      return {
        jsonrpc: '2.0',
        id,
        result
      };

    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32000,
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  async listTools(): Promise<any> {
    return {
      tools: [
        {
          name: 'search_personal_knowledge',
          description: 'Search across Santhosh Kumar Setty\'s knowledge base (GitHub, LinkedIn, professional experience, skills, etc.)',
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
          description: 'Get information about Santhosh Kumar Setty\'s GitHub repositories and coding projects',
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
          description: 'Retrieve Santhosh Kumar Setty\'s LinkedIn posts, articles, and professional activity',
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
          description: 'Add new knowledge to Santhosh Kumar Setty\'s knowledge base (admin only)',
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
          description: 'Get chronological view of Santhosh Kumar Setty\'s professional and personal development',
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
          description: 'Analyze Santhosh Kumar Setty\'s professional and technical growth patterns',
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
  }

  async callTool(name: string, args: any): Promise<any> {
    switch (name) {
      case 'search_personal_knowledge':
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(await this.searchKnowledge(args.query, args.category, args.limit), null, 2)
          }]
        };
      case 'get_github_projects':
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(await this.getGitHubProjects(args.language, args.topic), null, 2)
          }]
        };
      case 'get_linkedin_activity':
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(await this.getLinkedInActivity(args.type, args.timeframe), null, 2)
          }]
        };
      case 'add_personal_knowledge':
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(await this.addKnowledge(args), null, 2)
          }]
        };
      case 'get_personal_timeline':
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(await this.getPersonalTimeline(args.timeframe, args.focus), null, 2)
          }]
        };
      case 'analyze_growth_patterns':
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(await this.analyzeGrowthPatterns(args.dimension), null, 2)
          }]
        };
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  // Knowledge Base Operations
  async getKnowledgeBase(): Promise<Map<string, any[]>> {
    const knowledgeBase = new Map();
    
    for (const category of Object.keys(this.categories)) {
      const data = await this.env.KNOWLEDGE_BASE.get(category);
      knowledgeBase.set(category, data ? JSON.parse(data) : []);
    }
    
    return knowledgeBase;
  }

  async saveKnowledgeBase(knowledgeBase: Map<string, any[]>): Promise<void> {
    for (const [category, data] of knowledgeBase.entries()) {
      await this.env.KNOWLEDGE_BASE.put(category, JSON.stringify(data));
    }
  }

  async searchKnowledge(query: string, category?: string, limit: number = 10): Promise<any> {
    const knowledgeBase = await this.getKnowledgeBase();
    const results: any[] = [];
    
    const searchCategories = category ? [category] : Object.keys(this.categories);
    
    for (const cat of searchCategories) {
      const entries = knowledgeBase.get(cat) || [];
      
      for (const entry of entries) {
        const searchText = `${entry.title || entry.name || ''} ${entry.content || entry.description || ''} ${(entry.tags || []).join(' ')}`.toLowerCase();
        
        if (searchText.includes(query.toLowerCase())) {
          results.push({
            ...entry,
            category: cat,
            relevanceScore: this.calculateRelevance(query, searchText)
          });
        }
      }
    }
    
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    return {
      query,
      totalResults: results.length,
      results: results.slice(0, limit)
    };
  }

  calculateRelevance(query: string, text: string): number {
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

  async getGitHubProjects(language?: string, topic?: string): Promise<any> {
    const knowledgeBase = await this.getKnowledgeBase();
    const projects = knowledgeBase.get('github-projects') || [];
    
    let filteredProjects = projects;
    
    if (language) {
      filteredProjects = filteredProjects.filter((p: any) => 
        (p.language && p.language.toLowerCase() === language.toLowerCase()) ||
        (p.metadata?.language && p.metadata.language.toLowerCase() === language.toLowerCase()) ||
        (p.tags && p.tags.some((tag: string) => tag.toLowerCase() === language.toLowerCase()))
      );
    }
    
    if (topic) {
      filteredProjects = filteredProjects.filter((p: any) => 
        (p.topics && p.topics.some((t: string) => t.toLowerCase().includes(topic.toLowerCase()))) ||
        (p.tags && p.tags.some((tag: string) => tag.toLowerCase().includes(topic.toLowerCase())))
      );
    }
    
    return {
      totalProjects: filteredProjects.length,
      projects: filteredProjects
    };
  }

  async getLinkedInActivity(type: string, timeframe: string): Promise<any> {
    const knowledgeBase = await this.getKnowledgeBase();
    const activity = knowledgeBase.get('linkedin-posts') || [];
    
    let filteredActivity = activity;
    
    if (type !== 'all') {
      filteredActivity = filteredActivity.filter((item: any) => item.type === type);
    }
    
    // Add timeframe filtering logic here
    
    return {
      totalActivity: filteredActivity.length,
      activity: filteredActivity
    };
  }

  async addKnowledge(entry: any): Promise<any> {
    const knowledgeBase = await this.getKnowledgeBase();
    const { category, title, content, tags = [], metadata = {} } = entry;
    
    const categoryEntries = knowledgeBase.get(category) || [];
    
    const newEntry = {
      id: `${category}-${Date.now()}`,
      title,
      content,
      tags,
      metadata: {
        ...metadata,
        dateAdded: new Date().toISOString()
      }
    };
    
    categoryEntries.push(newEntry);
    knowledgeBase.set(category, categoryEntries);
    
    await this.saveKnowledgeBase(knowledgeBase);
    
    return {
      success: true,
      entry: newEntry
    };
  }

  async getPersonalTimeline(timeframe: string, focus: string): Promise<any> {
    const knowledgeBase = await this.getKnowledgeBase();
    const timeline: any[] = [];
    
    for (const [category, entries] of knowledgeBase.entries()) {
      for (const entry of entries) {
        timeline.push({
          ...entry,
          category,
          date: entry.metadata?.dateAdded || entry.dateAdded || entry.date || entry.lastUpdated
        });
      }
    }
    
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return {
      timeframe,
      focus,
      totalEvents: timeline.length,
      timeline
    };
  }

  async analyzeGrowthPatterns(dimension: string): Promise<any> {
    const knowledgeBase = await this.getKnowledgeBase();
    
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
  }

  handleDocs(): Response {
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
                            200: '#bfdbfe',
                            300: '#93c5fd',
                            400: '#60a5fa',
                            500: '#3b82f6',
                            600: '#2563eb',
                            700: '#1d4ed8',
                            800: '#1e40af',
                            900: '#1e3a8a',
                            950: '#172554'
                        },
                        secondary: {
                            50: '#f8fafc',
                            100: '#f1f5f9',
                            200: '#e2e8f0',
                            300: '#cbd5e1',
                            400: '#94a3b8',
                            500: '#64748b',
                            600: '#475569',
                            700: '#334155',
                            800: '#1e293b',
                            900: '#0f172a'
                        },
                        success: {
                            50: '#ecfdf5',
                            500: '#10b981',
                            600: '#059669'
                        },
                        warning: {
                            50: '#fffbeb',
                            500: '#f59e0b',
                            600: '#d97706'
                        }
                    },
                    fontFamily: {
                        sans: ['Inter', 'system-ui', 'sans-serif'],
                        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace']
                    },
                    animation: {
                        'fade-in': 'fadeIn 1s ease-out',
                        'fade-in-up': 'fadeInUp 0.8s ease-out',
                        'slide-up': 'slideUp 0.8s ease-out',
                        'bounce-gentle': 'bounceGentle 3s ease-in-out infinite',
                        'glow': 'glow 2s ease-in-out infinite alternate',
                        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                        'spin-slow': 'spin 3s linear infinite',
                        'gradient': 'gradient 8s ease infinite',
                        'float': 'float 6s ease-in-out infinite'
                    },
                    backgroundSize: {
                        '300%': '300%'
                    },
                    backdropBlur: {
                        'xs': '2px'
                    }
                }
            }
        }
    </script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');
        
        * {
            scroll-behavior: smooth;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
            line-height: 1.5;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
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
        
        @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            33% { transform: translateY(-10px) rotate(1deg); }
            66% { transform: translateY(-5px) rotate(-1deg); }
        }
        
        .glass-morphism {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);  
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        
        .glass-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        
        .glass-card:hover {
            background: rgba(255, 255, 255, 0.98);
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        }
        
        .text-gradient {
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%);
            background-size: 300% 300%;
            animation: gradient 8s ease infinite;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .bg-gradient-animated {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%);
            background-size: 400% 400%;
            animation: gradient 15s ease infinite;
        }
        
        .card-hover {
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        
        .card-hover:hover {
            transform: translateY(-12px) scale(1.03);
            box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.25);
        }
        
        .floating-element {
            animation: float 6s ease-in-out infinite;
        }
        
        .button-primary {
            position: relative;
            overflow: hidden;
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            transform: perspective(1px) translateZ(0);
            transition: all 0.3s ease;
        }
        
        .button-primary::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            transition: left 0.5s;
        }
        
        .button-primary:hover::before {
            left: 100%;
        }
        
        .button-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(59, 130, 246, 0.4);
        }
        
        .feature-icon {
            transition: all 0.3s ease;
        }
        
        .feature-icon:hover {
            transform: scale(1.1) rotate(5deg);
        }
        
        .status-indicator {
            position: relative;
        }
        
        .status-indicator::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border-radius: 50%;
            background: rgba(34, 197, 94, 0.3);
            animation: pulse-slow 2s infinite;
        }
        
        /* Enhanced scrollbar */
        ::-webkit-scrollbar {
            width: 12px;
        }
        
        ::-webkit-scrollbar-track {
            background: linear-gradient(90deg, #f1f5f9, #e2e8f0);
            border-radius: 6px;
        }
        
        ::-webkit-scrollbar-thumb {
            background: linear-gradient(90deg, #3b82f6, #1d4ed8);
            border-radius: 6px;
            border: 2px solid #f1f5f9;
        }
        
        ::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(90deg, #1d4ed8, #1e3a8a);
        }
        
        /* Focus styles for accessibility */
        .focus-ring:focus {
            outline: 2px solid #3b82f6;
            outline-offset: 2px;
        }
        
        /* Mobile optimizations */
        @media (max-width: 768px) {
            .glass-morphism {
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
            }
            
            .glass-card:hover {
                transform: translateY(-4px) scale(1.01);
            }
        }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        }
        
        /* Loading states */
        .loading-shimmer {
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 1000px 100%;
            animation: shimmer 1.2s ease-in-out infinite;
        }
        
        @keyframes shimmer {
            from { background-position: -468px 0; }
            to { background-position: 468px 0; }
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
                        <img src="/images/profile.jpeg" 
                             alt="Santhosh Kumar Setty" 
                             class="w-14 h-14 rounded-full object-cover shadow-lg border-2 border-white/20 animate-glow" />
                        <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
                    </div>
                    <div>
                        <h1 class="text-xl font-bold text-gray-900">Santhosh Kumar Setty</h1>
                        <p class="text-sm text-primary-600 font-medium">Senior AI Product Leader</p>
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
                            src="/images/main-image.jpeg" 
                            class="w-full max-w-4xl mx-auto rounded-2xl shadow-2xl border border-white/20 card-hover"
                            loading="eager"
                        />
                        <div class="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent rounded-2xl"></div>
                    </div>
                </div>
                
                <div class="space-y-6 animate-slide-up">
                    <h1 class="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
                        Welcome to My
                        <span class="block text-gradient">Professional Space</span>
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
                </div>
            </div>
        </section>
    </section>

    <!-- Setup Instructions -->
    <section class="py-16 px-6 bg-gradient-to-br from-gray-50 to-blue-50">
        <div class="container mx-auto max-w-6xl">
            <div class="text-center mb-12">
                <h2 class="text-4xl font-bold text-gray-900 mb-4">
                    📋 Setup Instructions
                </h2>
                <p class="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
                    Choose your preferred AI platform to connect with my personal knowledge base:
                </p>
            </div>

            <!-- Tab Navigation -->
            <div class="flex justify-center mb-8">
                <div class="bg-white rounded-xl p-2 shadow-lg border border-gray-200">
                    <button id="claude-tab" class="tab-button active px-8 py-3 rounded-lg font-semibold text-gray-700 hover:text-blue-600 transition-all duration-300">
                        <svg class="w-5 h-5 inline-block mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.5 6L12 10.5 8.5 8 12 5.5 15.5 8zM12 13.5l3.5 2.5L12 18.5 8.5 16l3.5-2.5z"/>
                        </svg>
                        Claude Desktop
                    </button>
                    <button id="openai-tab" class="tab-button px-8 py-3 rounded-lg font-semibold text-gray-700 hover:text-green-600 transition-all duration-300">
                        <svg class="w-5 h-5 inline-block mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142-.0852 4.783-2.7582a.7712.7712 0 0 0 .7806 0l5.8428 3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
                        </svg>
                        OpenAI
                    </button>
                </div>
            </div>

            <!-- Claude Desktop Instructions -->
            <div id="claude-instructions" class="tab-content">
                <div class="flex flex-wrap justify-center gap-4 mb-8">
                    <a href="/download/bridge" class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl">
                        Download Bridge Script
                    </a>
                    <a href="/download/config" class="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl">
                        Download Config File
                    </a>
                </div>

                <!-- Step-by-Step Guide for Claude -->
                <div class="glass-card rounded-3xl p-8 mb-12">
                    <h3 class="text-3xl font-semibold mb-8 text-center text-gray-900">Claude Desktop Setup Guide</h3>
                    
                    <div class="space-y-8">
                        <!-- Step 1 -->
                        <div class="flex items-start space-x-6 p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                            <div class="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">1</div>
                            <div class="flex-1">
                                <h4 class="font-bold text-xl mb-3 text-gray-900">Download Files</h4>
                                <div class="space-y-2">
                                    <p class="text-gray-700 text-lg">• Click "Download Bridge Script" button above</p>
                                    <p class="text-gray-700 text-lg">• Click "Download Config File" button above</p>
                                </div>
                            </div>
                        </div>

                        <!-- Step 2 -->
                        <div class="flex items-start space-x-6 p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                            <div class="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">2</div>
                            <div class="flex-1">
                                <h4 class="font-bold text-xl mb-4 text-gray-900">Install Files (No Terminal Required!)</h4>
                                
                                <div class="mb-6">
                                    <h5 class="font-semibold text-lg text-blue-600 mb-3">On macOS:</h5>
                                    <div class="pl-4 space-y-2">
                                        <p class="text-gray-700"><strong>Bridge Script:</strong> Drag <code class="bg-gray-100 px-3 py-1 rounded-lg font-mono text-sm">mcp-bridge.cjs</code> to your home folder (the one with your username)</p>
                                        <div>
                                            <p class="text-gray-700 mb-2"><strong>Config File:</strong></p>
                                            <ul class="pl-4 space-y-1 text-gray-600">
                                                <li>◦ Press <code class="bg-gray-100 px-2 py-1 rounded font-mono text-sm">Cmd + Shift + G</code> in Finder</li>
                                                <li>◦ Type: <code class="bg-gray-100 px-2 py-1 rounded font-mono text-sm">~/Library/Application Support/Claude/</code></li>
                                                <li>◦ If the folder doesn't exist, create it</li>
                                                <li>◦ Open the downloaded <code class="bg-gray-100 px-2 py-1 rounded font-mono text-sm">claude_desktop_config.json</code> file</li>
                                                <li>◦ Copy all the text and paste it into a new file called <code class="bg-gray-100 px-2 py-1 rounded font-mono text-sm">claude_desktop_config.json</code> in the Claude folder</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h5 class="font-semibold text-lg text-green-600 mb-3">On Windows:</h5>
                                    <div class="pl-4 space-y-2">
                                        <p class="text-gray-700"><strong>Bridge Script:</strong> Drag <code class="bg-gray-100 px-3 py-1 rounded-lg font-mono text-sm">mcp-bridge.cjs</code> to your user folder (usually <code class="bg-gray-100 px-2 py-1 rounded font-mono text-sm">C:\\Users\\YourName\\</code>)</p>
                                        <div>
                                            <p class="text-gray-700 mb-2"><strong>Config File:</strong></p>
                                            <ul class="pl-4 space-y-1 text-gray-600">
                                                <li>◦ Press <code class="bg-gray-100 px-2 py-1 rounded font-mono text-sm">Windows + R</code>, type <code class="bg-gray-100 px-2 py-1 rounded font-mono text-sm">%APPDATA%\\Claude</code> and press Enter</li>
                                                <li>◦ If the folder doesn't exist, create it</li>
                                                <li>◦ Open the downloaded <code class="bg-gray-100 px-2 py-1 rounded font-mono text-sm">claude_desktop_config.json</code> file</li>
                                                <li>◦ Copy all the text and paste it into a new file called <code class="bg-gray-100 px-2 py-1 rounded font-mono text-sm">claude_desktop_config.json</code> in the Claude folder</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Step 3 -->
                        <div class="flex items-start space-x-6 p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                            <div class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">3</div>
                            <div class="flex-1">
                                <h4 class="font-bold text-xl mb-3 text-gray-900">Update Configuration</h4>
                                <div class="space-y-2">
                                    <p class="text-gray-700 text-lg">1. Open the Claude Desktop config file in a text editor</p>
                                    <p class="text-gray-700 text-lg">2. Update the path to <code class="bg-gray-100 px-2 py-1 rounded font-mono text-sm">mcp-bridge.cjs</code> to match where you saved it</p>
                                    <p class="text-gray-700 text-lg">3. Ensure the SERVER_URL points to: <code class="bg-gray-100 px-2 py-1 rounded font-mono text-sm">https://personal-mcp-worker.santhoshkumar199.workers.dev</code></p>
                                </div>
                            </div>
                        </div>

                        <!-- Step 4 -->
                        <div class="flex items-start space-x-6 p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                            <div class="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">4</div>
                            <div class="flex-1">
                                <h4 class="font-bold text-xl mb-3 text-gray-900">Restart Claude Desktop</h4>
                                <div class="space-y-2">
                                    <p class="text-gray-700 text-lg">1. Completely quit Claude Desktop</p>
                                    <p class="text-gray-700 text-lg">2. Restart the application</p>
                                    <p class="text-gray-700 text-lg">3. The MCP server should now be available!</p>
                                </div>
                            </div>
                        </div>

                        <!-- Step 5 -->
                        <div class="flex items-start space-x-6 p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                            <div class="w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">5</div>
                            <div class="flex-1">
                                <h4 class="font-bold text-xl mb-3 text-gray-900">Test It Out</h4>
                                <p class="text-gray-700 text-lg mb-4">Try these commands in Claude Desktop:</p>
                                <div class="bg-gray-900 rounded-xl p-6 space-y-3 font-mono text-sm">
                                    <p class="text-green-400">• "Search Santhosh's knowledge base for machine learning"</p>
                                    <p class="text-blue-400">• "What projects does Santhosh have related to TypeScript?"</p>
                                    <p class="text-purple-400">• "Show me Santhosh's work experience"</p>
                                    <p class="text-yellow-400">• "List Santhosh's technical skills"</p>
                                    <p class="text-pink-400">• "What certifications does Santhosh have?"</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- OpenAI Instructions -->
            <div id="openai-instructions" class="tab-content hidden">
                <div class="glass-card rounded-3xl p-8 mb-12">
                    <h3 class="text-3xl font-semibold mb-8 text-center text-gray-900">OpenAI MCP Setup Guide</h3>
                    
                    <div class="space-y-8">
                        <!-- Step 1 -->
                        <div class="flex items-start space-x-6 p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                            <div class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">1</div>
                            <div class="flex-1">
                                <h4 class="font-bold text-xl mb-3 text-gray-900">Install MCP Client SDK</h4>
                                <p class="text-gray-700 text-lg mb-4">Install the OpenAI MCP client in your project:</p>
                                <div class="bg-gray-900 rounded-lg p-4">
                                    <code class="text-green-400">npm install @openai/mcp-client</code>
                                </div>
                            </div>
                        </div>

                        <!-- Step 2 -->
                        <div class="flex items-start space-x-6 p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                            <div class="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">2</div>
                            <div class="flex-1">
                                <h4 class="font-bold text-xl mb-3 text-gray-900">Configure MCP Connection</h4>
                                <p class="text-gray-700 text-lg mb-4">Create a client configuration to connect to the remote MCP server:</p>
                                <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
<pre class="text-sm text-gray-300"><code>import { MCPClient } from '@openai/mcp-client';

const client = new MCPClient({
  serverUrl: 'https://personal-mcp-worker.santhoshkumar199.workers.dev',
  transport: 'http'
});

// Initialize the connection
await client.connect();</code></pre>
                                </div>
                            </div>
                        </div>

                        <!-- Step 3 -->
                        <div class="flex items-start space-x-6 p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                            <div class="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">3</div>
                            <div class="flex-1">
                                <h4 class="font-bold text-xl mb-3 text-gray-900">Use Available Tools</h4>
                                <p class="text-gray-700 text-lg mb-4">Access the knowledge base through MCP tools:</p>
                                <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
<pre class="text-sm text-gray-300"><code>// Search the knowledge base
const searchResult = await client.callTool('search-knowledge', {
  query: 'machine learning projects',
  category: 'github-projects',
  limit: 5
});

// Get GitHub projects
const projects = await client.callTool('get-github-projects', {
  language: 'TypeScript',
  topic: 'AI'
});

// Get professional experience
const experience = await client.callTool('get-work-experience');

console.log('Search results:', searchResult);
console.log('Projects:', projects);
console.log('Experience:', experience);</code></pre>
                                </div>
                            </div>
                        </div>

                        <!-- Step 4 -->
                        <div class="flex items-start space-x-6 p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                            <div class="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">4</div>
                            <div class="flex-1">
                                <h4 class="font-bold text-xl mb-3 text-gray-900">Integrate with OpenAI Chat</h4>
                                <p class="text-gray-700 text-lg mb-4">Use the MCP tools within OpenAI's chat completion:</p>
                                <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
<pre class="text-sm text-gray-300"><code>import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Define MCP tools for OpenAI
const tools = await client.listTools();

const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [
    {
      role: "user", 
      content: "What are Santhosh's main technical skills?"
    }
  ],
  tools: tools.map(tool => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema
    }
  }))
});

console.log(response.choices[0].message);</code></pre>
                                </div>
                            </div>
                        </div>

                        <!-- Step 5 -->
                        <div class="flex items-start space-x-6 p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                            <div class="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">5</div>
                            <div class="flex-1">
                                <h4 class="font-bold text-xl mb-3 text-gray-900">Available API Endpoints</h4>
                                <p class="text-gray-700 text-lg mb-4">Direct HTTP API access (alternative to MCP client):</p>
                                <div class="space-y-3">
                                    <div class="flex items-center space-x-3">
                                        <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-mono">GET</span>
                                        <code class="text-gray-700">/api/search?q=query&category=type&limit=10</code>
                                    </div>
                                    <div class="flex items-center space-x-3">
                                        <span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-mono">GET</span>
                                        <code class="text-gray-700">/api/github/projects?language=TypeScript</code>
                                    </div>
                                    <div class="flex items-center space-x-3">
                                        <span class="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-mono">GET</span>
                                        <code class="text-gray-700">/api/linkedin/activity?type=posts</code>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="relative py-12 px-6 bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 text-white overflow-hidden">
        <!-- Background decoration -->
        <div class="absolute inset-0 opacity-10">
            <div class="absolute top-0 left-1/4 w-32 h-32 bg-blue-400 rounded-full blur-xl animate-pulse"></div>
            <div class="absolute bottom-0 right-1/4 w-32 h-32 bg-purple-400 rounded-full blur-xl animate-pulse" style="animation-delay: -1s;"></div>
        </div>
        
        <div class="container mx-auto max-w-6xl relative z-10">
            <div class="grid md:grid-cols-2 gap-12 mb-12">
                <!-- Brand Section -->
                <div class="text-center md:text-left">
                    <div class="flex items-center justify-center md:justify-start space-x-3 mb-4">
                        <img src="/images/profile.jpeg" 
                             alt="Santhosh Kumar Setty" 
                             class="w-12 h-12 rounded-xl object-cover shadow-lg border-2 border-white/20" />
                        <div>
                            <h3 class="text-xl font-bold">Santhosh Kumar Setty</h3>
                            <p class="text-blue-200">AI Product Leader</p>
                        </div>
                    </div>
                    <p class="text-gray-300 leading-relaxed mb-4">
                        Building the future of AI-powered products and personal knowledge systems through innovative technology and thoughtful design.
                    </p>
                    <div class="flex justify-center md:justify-start space-x-4">
                        <a href="https://linkedin.com/in/santhoshkumarsetty" 
                           target="_blank" 
                           rel="noopener noreferrer"
                           class="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-300 hover:scale-110 focus-ring"
                           aria-label="LinkedIn Profile">
                            <svg class="w-5 h-5 text-blue-300" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                        </a>
                        <a href="https://github.com/santhoshkumarsetty" 
                           target="_blank" 
                           rel="noopener noreferrer"
                           class="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-300 hover:scale-110 focus-ring"
                           aria-label="GitHub Profile">
                            <svg class="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                            </svg>
                        </a>
                    </div>
                </div>
                
                <!-- Professional Info -->
                <div class="text-center md:text-right">
                    <h4 class="text-lg font-bold text-white mb-6">Professional Focus</h4>
                    <div class="space-y-3 text-gray-300">
                        <div class="flex items-center justify-center md:justify-end space-x-2">
                            <svg class="w-4 h-4 text-blue-300" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.5 6L12 10.5 8.5 8 12 5.5 15.5 8zM12 13.5l3.5 2.5L12 18.5 8.5 16l3.5-2.5z"/>
                            </svg>
                            <span class="font-medium">AI Product Development</span>
                        </div>
                        <div class="flex items-center justify-center md:justify-end space-x-2">
                            <svg class="w-4 h-4 text-green-300" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                            </svg>
                            <span class="font-medium">B2B SaaS Solutions</span>
                        </div>
                        <div class="flex items-center justify-center md:justify-end space-x-2">
                            <svg class="w-4 h-4 text-purple-300" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                            </svg>
                            <span class="font-medium">Machine Learning</span>
                        </div>
                        <div class="flex items-center justify-center md:justify-end space-x-2">
                            <svg class="w-4 h-4 text-yellow-300" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15.5 19.5V21a2 2 0 01-2 2H12"/>
                            </svg>
                            <span class="font-medium">Product Strategy</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Bottom Bar -->
            <div class="border-t border-white/20 pt-8">
                <div class="flex flex-col items-center space-y-4 text-center">
                    <div>
                        <p class="text-gray-300 font-medium">
                            © 2025 Santhosh Kumar Setty. Built with AI-powered tools and modern web technologies.
                        </p>
                        <p class="text-sm text-gray-400 mt-1">
                            Berlin, Germany • Product Leader @ Trustana • National University of Singapore Alumni
                        </p>
                    </div>
                    <div class="flex items-center justify-center space-x-6">
                        <div class="flex items-center space-x-2 text-sm text-gray-400">
                            <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span>MCP Server Online</span>
                        </div>
                        <div class="text-sm text-gray-400">
                            Last updated: ${new Date().toLocaleDateString()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </footer>
</div>

<script>
// Enhanced JavaScript for better user experience and interactions
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all functionality
    initializeAnimations();
    initializeScrollEffects();
    initializeAccessibility();
    initializePerformanceOptimizations();
    initializeTabs();
    
    function initializeTabs() {
        const claudeTab = document.getElementById('claude-tab');
        const openaiTab = document.getElementById('openai-tab');
        const claudeInstructions = document.getElementById('claude-instructions');
        const openaiInstructions = document.getElementById('openai-instructions');
        
        // Tab switching functionality
        claudeTab?.addEventListener('click', function() {
            setActiveTab('claude');
        });
        
        openaiTab?.addEventListener('click', function() {
            setActiveTab('openai');
        });
        
        function setActiveTab(tab) {
            // Update tab buttons
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active', 'bg-blue-100', 'text-blue-600', 'bg-green-100', 'text-green-600');
            });
            
            // Update content visibility
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.add('hidden');
            });
            
            if (tab === 'claude') {
                claudeTab?.classList.add('active', 'bg-blue-100', 'text-blue-600');
                claudeInstructions?.classList.remove('hidden');
            } else if (tab === 'openai') {
                openaiTab?.classList.add('active', 'bg-green-100', 'text-green-600');
                openaiInstructions?.classList.remove('hidden');
            }
        }
        
        // Initialize with Claude tab active
        setActiveTab('claude');
    }
    
    function initializeAnimations() {
        // Staggered animation for cards
        const cards = document.querySelectorAll('.glass-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            setTimeout(() => {
                card.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 300 + index * 150);
        });
        
        // Enhanced hover effects with better performance
        cards.forEach(card => {
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-8px) scale(1.02)';
                this.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
                this.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            });
            
            card.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0) scale(1)';
                this.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.1)';
            });
        });
        
        // Button interactions
        const buttons = document.querySelectorAll('.button-primary, .bg-blue-600, .bg-purple-600, .bg-green-600');
        buttons.forEach(button => {
            button.addEventListener('click', function() {
                // Add ripple effect
                const ripple = document.createElement('span');
                ripple.classList.add('ripple');
                ripple.style.position = 'absolute';
                ripple.style.borderRadius = '50%';
                ripple.style.background = 'rgba(255, 255, 255, 0.6)';
                ripple.style.transform = 'scale(0)';
                ripple.style.animation = 'ripple 600ms linear';
                ripple.style.left = '50%';
                ripple.style.top = '50%';
                ripple.style.width = ripple.style.height = '100px';
                ripple.style.marginLeft = ripple.style.marginTop = '-50px';
                
                this.style.position = 'relative';
                this.style.overflow = 'hidden';
                this.appendChild(ripple);
                setTimeout(() => ripple.remove(), 600);
            });
        });
    }
    
    function initializeScrollEffects() {
        // Intersection Observer for scroll animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-fade-in-up');
                    entry.target.style.animationDelay = Math.random() * 0.5 + 's';
                }
            });
        }, observerOptions);
        
        // Observe elements for scroll animations
        document.querySelectorAll('section, .glass-card').forEach(el => {
            observer.observe(el);
        });
        
        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
        
        // Parallax effect for background decorations
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    const scrolled = window.pageYOffset;
                    const rate = scrolled * -0.5;
                    
                    document.querySelectorAll('.floating-element').forEach(el => {
                        el.style.transform = \`translateY(\${rate}px)\`;
                    });
                    
                    ticking = false;
                });
                ticking = true;
            }
        });
    }
    
    function initializeAccessibility() {
        // Enhanced keyboard navigation
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });
        
        document.addEventListener('mousedown', function() {
            document.body.classList.remove('keyboard-navigation');
        });
        
        // Skip link functionality
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.textContent = 'Skip to main content';
        skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50';
        document.body.insertBefore(skipLink, document.body.firstChild);
        
        // Reduced motion support
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.querySelectorAll('*').forEach(el => {
                el.style.animationDuration = '0.01ms';
                el.style.transitionDuration = '0.01ms';
            });
        }
    }
    
    function initializePerformanceOptimizations() {
        // Lazy loading for images
        const images = document.querySelectorAll('img[loading="lazy"]');
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src || img.src;
                        img.classList.remove('loading-skeleton');
                        observer.unobserve(img);
                    }
                });
            });
            
            images.forEach(img => imageObserver.observe(img));
        }
        
        // Service worker registration for caching (if available)
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => {
                // Service worker not available, continue without it
            });
        }
    }
    
    // Add loading states
    function showLoading(element) {
        element.classList.add('loading-skeleton');
        element.style.pointerEvents = 'none';
    }
    
    function hideLoading(element) {
        element.classList.remove('loading-skeleton');
        element.style.pointerEvents = 'auto';
    }
    
    // Error handling for network requests
    window.addEventListener('unhandledrejection', function(event) {
        console.warn('Unhandled promise rejection:', event.reason);
    });
    
    // Add CSS for animations and tab functionality
    const additionalStyles = \`
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
        .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        }
        .keyboard-navigation *:focus {
            outline: 3px solid #3b82f6 !important;
            outline-offset: 2px !important;
        }
        .ripple {
            pointer-events: none;
        }
        .tab-button {
            transition: all 0.3s ease;
        }
        .tab-button.active {
            font-weight: 600;
        }
        .tab-content {
            transition: opacity 0.3s ease;
        }
        .hidden {
            display: none !important;
        }
    \`;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = additionalStyles;
    document.head.appendChild(styleSheet);
    
    console.log('🚀 Personal MCP Server UI initialized successfully with enhanced features');
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

  async handleImageServing(imageType: string): Promise<Response> {
    // For now, we'll use placeholder images or redirect to external URLs
    // In a production setup, you would store images in Cloudflare R2
    
    const imageUrls = {
      'profile': 'https://raw.githubusercontent.com/SanthoshSetty/mcp-knowledge-server/main/personal-mcp/1688242564790.jpeg',
      'main': 'https://raw.githubusercontent.com/SanthoshSetty/mcp-knowledge-server/main/personal-mcp/1723737750013.jpeg'
    };
    
    const imageUrl = imageUrls[imageType as keyof typeof imageUrls];
    
    if (!imageUrl) {
      return new Response('Image not found', { status: 404 });
    }
    
    // Redirect to the actual image URL for now
    return Response.redirect(imageUrl, 302);
  }

  async handleBridgeDownload(): Promise<Response> {
    const bridgeScript = `#!/usr/bin/env node

/**
 * MCP Bridge Script for Personal AI Assistant
 * This script connects Claude Desktop to your personal MCP server
 */

const { spawn } = require('child_process');
const { Transform } = require('stream');

const SERVER_URL = process.env.SERVER_URL || 'https://personal-mcp-worker.santhoshkumar199.workers.dev';

class MCPBridge {
  constructor() {
    this.setupErrorHandling();
    this.startBridge();
  }

  setupErrorHandling() {
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error.message);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }

  async startBridge() {
    try {
      // Start the MCP server connection
      const serverProcess = spawn('npx', [
        '-y',
        '@modelcontextprotocol/server-fetch',
        SERVER_URL
      ], {
        stdio: ['pipe', 'pipe', 'inherit']
      });

      // Handle server process
      serverProcess.on('error', (error) => {
        console.error('Server process error:', error.message);
        process.exit(1);
      });

      serverProcess.on('exit', (code) => {
        console.error('Server process exited with code:', code);
        process.exit(code || 1);
      });

      // Pipe stdio
      process.stdin.pipe(serverProcess.stdin);
      serverProcess.stdout.pipe(process.stdout);

      console.error('MCP Bridge started successfully');
    } catch (error) {
      console.error('Failed to start MCP bridge:', error.message);
      process.exit(1);
    }
  }
}

// Start the bridge
new MCPBridge();
`;

    return new Response(bridgeScript, {
      headers: {
        'Content-Type': 'application/javascript',
        'Content-Disposition': 'attachment; filename="mcp-bridge.cjs"',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  async handleConfigDownload(): Promise<Response> {
    const config = {
      mcpServers: {
        "personal-mcp": {
          command: "node",
          args: ["./mcp-bridge.cjs"],
          env: {
            SERVER_URL: "https://personal-mcp-worker.santhoshkumar199.workers.dev"
          }
        }
      }
    };

    return new Response(JSON.stringify(config, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="claude_desktop_config.json"',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

// Cloudflare Workers entry point
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const worker = new PersonalAIWorker(env);
    return worker.handleRequest(request);
  },
};
