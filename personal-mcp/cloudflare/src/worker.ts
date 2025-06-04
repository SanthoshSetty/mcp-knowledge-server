/**
 * Personal AI Assistant MCP Server - Cloudflare Workers Edition
 * 
 * A web-accessible MCP server that makes your personal knowledge base available via HTTP API.
 * Integrates with Cloudflare KV for data storage and R2 for file storage.
 */

import { z } from 'zod';

export interface Env {
  KNOWLEDGE_BASE: KVNamespace;
  FILES?: R2Bucket;
}

// Personal AI Assistant Worker
class PersonalAIWorker {
  private env: Env;
  private categories = {
    'github-projects': 'Personal GitHub repositories and code projects',
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
    <title>Santhosh Kumar Setty - MCP Discovery Page</title>
    <meta name="description" content="Connect with my AI-powered workspace through MCP server">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .animate-fade-in {
            animation: fadeIn 0.6s ease-in-out;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        /* Smooth scrolling */
        html {
            scroll-behavior: smooth;
        }
    </style>
</head>
<body class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
    <!-- Header -->
    <header class="w-full border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div class="container mx-auto px-6 py-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <div class="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-200 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl font-bold">
                        SK
                    </div>
                    <div>
                        <h1 class="text-xl font-bold text-gray-900">Santhosh Kumar Setty</h1>
                        <p class="text-sm text-gray-600">Product Leader | AI | B2B SaaS</p>
                    </div>
                </div>
                <div class="flex items-center space-x-4">
                    <a href="https://linkedin.com/in/santhoshkumarsetty" target="_blank" rel="noopener noreferrer" class="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                    </a>
                    <a href="https://github.com/santhoshkumarsetty" target="_blank" rel="noopener noreferrer" class="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                    </a>
                </div>
            </div>
        </div>
    </header>

    <!-- Hero Section -->
    <section class="py-20 px-6">
        <div class="container mx-auto max-w-4xl text-center">
            <div class="mb-8 animate-fade-in">
                <img 
                    src="https://i.ibb.co/vCw7xH33/Screenshot-2025-06-03-at-12-23-07.png" 
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
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const worker = new PersonalAIWorker(env);
    return worker.handleRequest(request);
  },
};
