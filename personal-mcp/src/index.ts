#!/usr/bin/env node

/**
 * Personal AI Assistant MCP Server
 * 
 * An advanced MCP server that transforms your personal digital life into an AI-accessible knowledge base.
 * Integrates with GitHub, LinkedIn, personal notes, and project data to create your digital twin.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as process from 'process';
import * as fs from 'fs';
import * as path from 'path';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Personal AI Assistant Server
class PersonalAIServer {
  private server: Server;
  private knowledgeBase: Map<string, any> = new Map();
  private dataFile: string = path.join(process.cwd(), 'data', 'knowledge-base.json');
  private categories = {
    'github-projects': 'Personal GitHub repositories and code projects',
    'linkedin-posts': 'Professional LinkedIn posts and articles', 
    'learning-notes': 'Programming tutorials, courses, and technical learning',
    'project-decisions': 'Architecture decisions and technical choices',
    'career-milestones': 'Professional achievements and career progression',
    'meeting-notes': 'Important meetings, discussions, and decisions',
    'personal-research': 'Research papers, articles, and industry insights'
  };

  constructor() {
    this.server = new Server(
      {
        name: 'personal-ai-assistant',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupRequestHandlers();
    this.loadKnowledgeBase(); // Load existing data on startup
  }

  private setupRequestHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_personal_knowledge',
          description: 'Search across all personal knowledge categories (GitHub, LinkedIn, notes, etc.)',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query (natural language or keywords)'
              },
              category: {
                type: 'string',
                description: 'Optional category filter',
                enum: Object.keys(this.categories)
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results (default: 10)',
                default: 10
              }
            },
            required: ['query']
          }
        },
        {
          name: 'get_github_projects',
          description: 'Get information about your GitHub repositories and projects',
          inputSchema: {
            type: 'object',
            properties: {
              language: {
                type: 'string',
                description: 'Filter by programming language (optional)'
              },
              topic: {
                type: 'string', 
                description: 'Filter by topic or technology (optional)'
              }
            }
          }
        },
        {
          name: 'get_linkedin_activity',
          description: 'Retrieve your LinkedIn posts, articles, and professional activity',
          inputSchema: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                description: 'Type of content',
                enum: ['posts', 'articles', 'comments', 'all']
              },
              timeframe: {
                type: 'string',
                description: 'Time period',
                enum: ['week', 'month', 'quarter', 'year', 'all']
              }
            }
          }
        },
        {
          name: 'add_personal_knowledge',
          description: 'Add new knowledge to your personal AI knowledge base',
          inputSchema: {
            type: 'object',
            properties: {
              category: {
                type: 'string',
                description: 'Knowledge category',
                enum: Object.keys(this.categories)
              },
              title: {
                type: 'string',
                description: 'Title or heading for the knowledge entry'
              },
              content: {
                type: 'string',
                description: 'The main content or notes'
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Tags for categorization and search'
              },
              metadata: {
                type: 'object',
                description: 'Additional metadata (dates, links, etc.)'
              }
            },
            required: ['category', 'title', 'content']
          }
        },
        {
          name: 'get_personal_timeline',
          description: 'Get a chronological view of your professional and personal development',
          inputSchema: {
            type: 'object',
            properties: {
              timeframe: {
                type: 'string',
                description: 'Time period to analyze',
                enum: ['month', 'quarter', 'year', 'all']
              },
              focus: {
                type: 'string',
                description: 'Focus area',
                enum: ['career', 'technical', 'learning', 'projects', 'all']
              }
            }
          }
        },
        {
          name: 'analyze_growth_patterns',
          description: 'Analyze your professional and technical growth patterns',
          inputSchema: {
            type: 'object',
            properties: {
              dimension: {
                type: 'string',
                description: 'What to analyze',
                enum: ['skills', 'projects', 'network', 'content', 'achievements']
              }
            },
            required: ['dimension']
          }
        },
        {
          name: 'export_github_data',
          description: 'Export your GitHub repositories data for knowledge base integration',
          inputSchema: {
            type: 'object',
            properties: {
              includeReadmes: {
                type: 'boolean',
                description: 'Include README content',
                default: true
              },
              includeCommits: {
                type: 'boolean',
                description: 'Include recent commit history',
                default: true
              }
            }
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_personal_knowledge':
            return await this.searchPersonalKnowledge(args);
          case 'get_github_projects':
            return await this.getGitHubProjects(args);
          case 'get_linkedin_activity':
            return await this.getLinkedInActivity(args);
          case 'add_personal_knowledge':
            return await this.addPersonalKnowledge(args);
          case 'get_personal_timeline':
            return await this.getPersonalTimeline(args);
          case 'analyze_growth_patterns':
            return await this.analyzeGrowthPatterns(args);
          case 'export_github_data':
            return await this.exportGitHubData(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }],
          isError: true
        };
      }
    });
  }

  private setupToolHandlers() {
    // Tool handlers are set up in setupRequestHandlers
    // Knowledge base is loaded in constructor via loadKnowledgeBase()
  }

  private loadKnowledgeBase() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.dataFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Load existing knowledge base if it exists
      if (fs.existsSync(this.dataFile)) {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf-8'));
        this.knowledgeBase = new Map(Object.entries(data));
        console.error(`📚 Loaded ${this.knowledgeBase.size} knowledge categories from ${this.dataFile}`);
      } else {
        // Initialize with default sample data
        this.initializeSampleData();
        console.error('🆕 Initialized with sample data');
      }
    } catch (error) {
      console.error('⚠️  Error loading knowledge base:', error);
      this.initializeSampleData();
    }
  }

  private saveKnowledgeBase() {
    try {
      const dataDir = path.dirname(this.dataFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const data = Object.fromEntries(this.knowledgeBase);
      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
      console.error(`💾 Knowledge base saved to ${this.dataFile}`);
    } catch (error) {
      console.error('⚠️  Error saving knowledge base:', error);
    }
  }

  private initializeSampleData() {
    // Sample knowledge structure - in real implementation, this would load from storage
    this.knowledgeBase.set('github-projects', [
      {
        id: 'mcp-knowledge-server',
        name: 'MCP Knowledge Server',
        description: 'Model Context Protocol server for personal knowledge base',
        language: 'TypeScript',
        topics: ['AI', 'MCP', 'Knowledge Management'],
        stars: 5,
        lastUpdated: '2024-12-02',
        readme: 'A comprehensive MCP server that makes personal documents AI-accessible...'
      }
    ]);

    this.knowledgeBase.set('linkedin-posts', [
      {
        id: 'ai-future-post',
        type: 'post',
        date: '2024-12-01',
        content: 'Just deployed my first MCP server! The future of AI-human collaboration is here.',
        engagement: { likes: 45, comments: 12, shares: 3 },
        topics: ['AI', 'MCP', 'Innovation']
      }
    ]);

    this.knowledgeBase.set('learning-notes', [
      {
        id: 'react-hooks-tutorial',
        title: 'Advanced React Hooks',
        content: 'Learned about useCallback and useMemo for performance optimization...',
        tags: ['React', 'Hooks', 'Performance'],
        date: '2024-11-28'
      }
    ]);
  }

  private async searchPersonalKnowledge(args: any) {
    const { query, category, limit = 10 } = args;
    const results: any[] = [];

    const categoriesToSearch = category ? [category] : Object.keys(this.categories);

    for (const cat of categoriesToSearch) {
      const data = this.knowledgeBase.get(cat) || [];
      const filtered = data.filter((item: any) => 
        this.matchesQuery(item, query)
      ).slice(0, limit);
      
      results.push(...filtered.map((item: any) => ({ ...item, category: cat })));
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          query,
          totalResults: results.length,
          results: results.slice(0, limit)
        }, null, 2)
      }]
    };
  }

  private matchesQuery(item: any, query: string): boolean {
    const searchText = JSON.stringify(item).toLowerCase();
    return searchText.includes(query.toLowerCase());
  }

  private async getGitHubProjects(args: any) {
    const { language, topic } = args;
    let projects = this.knowledgeBase.get('github-projects') || [];

    if (language) {
      projects = projects.filter((p: any) => {
        // Check both top-level language and metadata.language for imported data
        const projectLanguage = p.language || p.metadata?.language;
        return projectLanguage?.toLowerCase() === language.toLowerCase();
      });
    }

    if (topic) {
      projects = projects.filter((p: any) => {
        // Check both top-level topics and tags for imported data
        const projectTopics = p.topics || p.tags || [];
        return projectTopics.some((t: string) => t.toLowerCase().includes(topic.toLowerCase()));
      });
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          totalProjects: projects.length,
          projects
        }, null, 2)
      }]
    };
  }

  private async getLinkedInActivity(args: any) {
    const { type = 'all', timeframe = 'all' } = args;
    let activity = this.knowledgeBase.get('linkedin-posts') || [];

    if (type !== 'all') {
      activity = activity.filter((item: any) => item.type === type);
    }

    // In real implementation, would filter by timeframe
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          type,
          timeframe,
          totalItems: activity.length,
          activity
        }, null, 2)
      }]
    };
  }

  private async addPersonalKnowledge(args: any) {
    const { category, title, content, tags = [], metadata = {} } = args;

    const entry = {
      id: `${category}-${Date.now()}`,
      title,
      content,
      tags,
      metadata,
      dateAdded: new Date().toISOString()
    };

    const categoryData = this.knowledgeBase.get(category) || [];
    categoryData.push(entry);
    this.knowledgeBase.set(category, categoryData);

    this.saveKnowledgeBase(); // Save changes to disk

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          entry,
          message: `Added new knowledge entry to ${category}`
        }, null, 2)
      }]
    };
  }

  private async getPersonalTimeline(args: any) {
    const { timeframe = 'all', focus = 'all' } = args;
    
    // Aggregate timeline from all categories
    const timeline: any[] = [];
    
    for (const [category, items] of this.knowledgeBase.entries()) {
      for (const item of items as any[]) {
        timeline.push({
          ...item,
          category,
          date: item.date || item.dateAdded || item.lastUpdated
        });
      }
    }

    // Sort by date
    timeline.sort((a, b) => 
      new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    );

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          timeframe,
          focus,
          totalEvents: timeline.length,
          timeline: timeline.slice(0, 20) // Recent 20 events
        }, null, 2)
      }]
    };
  }

  private async analyzeGrowthPatterns(args: any) {
    const { dimension } = args;
    
    // Example analysis - in real implementation, would do deeper analytics
    const analysis = {
      dimension,
      insights: [] as string[],
      trends: {},
      recommendations: [] as string[]
    };

    switch (dimension) {
      case 'skills':
        analysis.insights.push('Strong growth in TypeScript and AI technologies');
        analysis.trends = { 'TypeScript': 'increasing', 'AI/ML': 'increasing' };
        break;
      case 'projects':
        analysis.insights.push('Focus shift towards AI and knowledge management projects');
        break;
      // Add more analysis types
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(analysis, null, 2)
      }]
    };
  }

  private async exportGitHubData(args: any) {
    const { includeReadmes = true, includeCommits = true } = args;
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          message: 'GitHub export functionality - would integrate with GitHub API to fetch real data',
          options: { includeReadmes, includeCommits },
          nextSteps: [
            'Set up GitHub Personal Access Token',
            'Configure GitHub API integration',
            'Export repositories, READMEs, and commit history',
            'Structure data for AI accessibility'
          ]
        }, null, 2)
      }]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Personal AI Assistant MCP Server running on stdio');
  }
}

// Start the server
const server = new PersonalAIServer();
server.run().catch((error) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
});
