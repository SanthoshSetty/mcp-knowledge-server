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
  private dataFile: string = path.join(process.cwd(), 'data', 'processed-knowledge-base.json');
  private fallbackDataFile: string = path.join(process.cwd(), 'data', 'knowledge-base.json');
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
          description: 'Search across Santhosh Kumar Setty\'s knowledge base (GitHub, LinkedIn, professional experience, skills, etc.)',
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
          description: 'Get information about Santhosh Kumar Setty\'s GitHub repositories and coding projects',
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
          description: 'Retrieve Santhosh Kumar Setty\'s LinkedIn posts, articles, and professional activity',
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
          description: 'Add new knowledge to Santhosh Kumar Setty\'s AI knowledge base (admin only)',
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
          description: 'Get a chronological view of Santhosh Kumar Setty\'s professional and personal development',
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
          description: 'Analyze Santhosh Kumar Setty\'s professional and technical growth patterns',
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
          description: 'Export Santhosh Kumar Setty\'s GitHub repositories data for knowledge base integration (admin only)',
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
        },
        {
          name: 'get_professional_profile',
          description: 'Get Santhosh Kumar Setty\'s comprehensive professional profile and summary',
          inputSchema: {
            type: 'object',
            properties: {
              section: {
                type: 'string',
                description: 'Specific section to retrieve',
                enum: ['summary', 'headline', 'industry', 'all']
              }
            }
          }
        },
        {
          name: 'get_work_experience',
          description: 'Get Santhosh Kumar Setty\'s detailed work experience and career history',
          inputSchema: {
            type: 'object',
            properties: {
              company: {
                type: 'string',
                description: 'Filter by specific company'
              },
              role: {
                type: 'string',
                description: 'Filter by role or title keywords'
              },
              timeframe: {
                type: 'string',
                description: 'Time period to focus on',
                enum: ['current', 'recent', 'all']
              }
            }
          }
        },
        {
          name: 'get_skills_expertise',
          description: 'Get Santhosh Kumar Setty\'s skills, competencies, and areas of expertise',
          inputSchema: {
            type: 'object',
            properties: {
              category: {
                type: 'string',
                description: 'Filter by skill category',
                enum: ['technical', 'management', 'analytical', 'all']
              }
            }
          }
        },
        {
          name: 'get_education_background',
          description: 'Get Santhosh Kumar Setty\'s educational background and qualifications',
          inputSchema: {
            type: 'object',
            properties: {}
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
          case 'get_professional_profile':
            return await this.getProfessionalProfile(args);
          case 'get_work_experience':
            return await this.getWorkExperience(args);
          case 'get_skills_expertise':
            return await this.getSkillsExpertise(args);
          case 'get_education_background':
            return await this.getEducationBackground(args);
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

      // Try to load processed knowledge base first
      if (fs.existsSync(this.dataFile)) {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf-8'));
        this.knowledgeBase = new Map(Object.entries(data));
        console.error(`📚 Loaded ${this.knowledgeBase.size} knowledge categories from processed data`);
        
        // Display summary of loaded data
        let totalEntries = 0;
        for (const [category, entries] of this.knowledgeBase.entries()) {
          if (Array.isArray(entries)) {
            totalEntries += entries.length;
            console.error(`   - ${category}: ${entries.length} entries`);
          }
        }
        console.error(`📊 Total entries loaded: ${totalEntries}`);
        
      } else if (fs.existsSync(this.fallbackDataFile)) {
        // Fallback to original knowledge base
        const data = JSON.parse(fs.readFileSync(this.fallbackDataFile, 'utf-8'));
        this.knowledgeBase = new Map(Object.entries(data));
        console.error(`📚 Loaded ${this.knowledgeBase.size} knowledge categories from fallback data`);
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

  private sanitizeData(data: any): any {
    if (typeof data === 'string') {
      return this.sanitizeText(data);
    } else if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    } else if (data && typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        // Skip potentially sensitive fields entirely
        if (this.isSensitiveField(key)) {
          continue;
        }
        sanitized[key] = this.sanitizeData(value);
      }
      return sanitized;
    }
    return data;
  }

  private sanitizeText(text: string): string {
    if (!text) return text;
    
    // Remove email addresses (comprehensive patterns)
    text = text.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL_REDACTED]');
    text = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');
    
    // Remove phone numbers (various international formats)
    text = text.replace(/[\+]?[\d\s\-\(\)\.\+]{7,}/g, '[PHONE_REDACTED]');
    text = text.replace(/(\+49|0049)\s*\d+[\s\d\-\(\)]+/g, '[PHONE_REDACTED]');
    
    // Remove IP addresses
    text = text.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP_REDACTED]');
    
    // Remove specific addresses but keep general location
    text = text.replace(/\b\d+\s+[A-Za-z\s]+(?:Str|Street|Ave|Avenue|Road|Rd)\b/gi, '[ADDRESS_REDACTED]');
    
    // Remove postal codes
    text = text.replace(/\b\d{5}(?:-\d{4})?\b/g, '[POSTAL_CODE_REDACTED]');
    text = text.replace(/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/gi, '[POSTAL_CODE_REDACTED]');
    
    // Remove social security numbers, tax IDs, or similar numeric identifiers
    text = text.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[ID_REDACTED]');
    text = text.replace(/\b\d{9,11}\b/g, '[ID_REDACTED]');
    
    // Remove credit card patterns
    text = text.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD_REDACTED]');
    
    // Remove bank account patterns
    text = text.replace(/\b[A-Z]{2}\d{2}[\s]?(\d{4}[\s]?){3,7}\d{1,4}\b/gi, '[ACCOUNT_REDACTED]');
    
    return text;
  }

  private isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = [
      'email', 'emails', 'emailAddress', 'email_address',
      'phone', 'phoneNumber', 'phone_number', 'mobile',
      'address', 'street', 'zipcode', 'postal_code',
      'ssn', 'social_security', 'tax_id', 'passport',
      'credit_card', 'bank_account', 'iban', 'swift',
      'ip_address', 'ip', 'user_agent', 'session_id',
      'password', 'token', 'api_key', 'secret'
    ];
    
    return sensitiveFields.some(sensitive => 
      fieldName.toLowerCase().includes(sensitive.toLowerCase())
    );
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
          results: this.sanitizeData(results.slice(0, limit))
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
          projects: this.sanitizeData(projects)
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

  private async getProfessionalProfile(args: any) {
    const { section = 'all' } = args;
    const profileData = this.knowledgeBase.get('professional-profile') || [];
    
    if (profileData.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No professional profile data available. Please run the data processing script first.'
        }]
      };
    }

    const profile = profileData[0]; // Assuming first entry is the main profile
    
    let content = '';
    switch (section) {
      case 'summary':
        content = profile.summary || 'No summary available';
        break;
      case 'headline':
        content = profile.headline || 'No headline available';
        break;
      case 'industry':
        content = profile.industry || 'No industry information available';
        break;
      case 'all':
      default:
        content = JSON.stringify({
          headline: profile.headline,
          summary: profile.summary,
          industry: profile.industry,
          location: profile.location,
          tags: profile.tags,
          lastUpdated: profile.metadata?.dateProcessed
        }, null, 2);
        break;
    }

    return {
      content: [{
        type: 'text',
        text: content
      }]
    };
  }

  private async getWorkExperience(args: any) {
    const { company, role, timeframe = 'all' } = args;
    const experienceData = this.knowledgeBase.get('work-experience') || [];
    
    if (experienceData.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No work experience data available. Please run the data processing script first.'
        }]
      };
    }

    let filteredExperience = experienceData;

    // Apply filters
    if (company) {
      filteredExperience = filteredExperience.filter((exp: any) => 
        exp.company?.toLowerCase().includes(company.toLowerCase())
      );
    }

    if (role) {
      filteredExperience = filteredExperience.filter((exp: any) => 
        exp.position?.toLowerCase().includes(role.toLowerCase()) ||
        exp.title?.toLowerCase().includes(role.toLowerCase())
      );
    }

    if (timeframe === 'current') {
      filteredExperience = filteredExperience.filter((exp: any) => 
        exp.endDate === 'Present' || exp.endDate === ''
      );
    } else if (timeframe === 'recent') {
      // Filter for last 5 years
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
      filteredExperience = filteredExperience.filter((exp: any) => {
        const startDate = new Date(exp.startDate);
        return startDate >= fiveYearsAgo;
      });
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          totalExperience: filteredExperience.length,
          experiences: filteredExperience.map((exp: any) => ({
            company: exp.company,
            position: exp.position,
            duration: `${exp.startDate} - ${exp.endDate}`,
            location: exp.location,
            description: exp.description?.substring(0, 500) + (exp.description?.length > 500 ? '...' : ''),
            skills: exp.tags?.filter((tag: string) => !['work-experience', 'career'].includes(tag))
          }))
        }, null, 2)
      }]
    };
  }

  private async getSkillsExpertise(args: any) {
    const { category = 'all' } = args;
    const skillsData = this.knowledgeBase.get('skills-expertise') || [];
    
    if (skillsData.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No skills data available. Please run the data processing script first.'
        }]
      };
    }

    const skillsEntry = skillsData[0]; // Assuming main skills entry
    const allSkills = skillsEntry.skills || [];
    
    // Categorize skills (basic categorization)
    const categorizedSkills = {
      technical: allSkills.filter((skill: string) => 
        ['Python', 'R', 'Machine Learning', 'AI', 'TypeScript', 'JavaScript', 'SQL', 'Data Analysis'].some(tech => 
          skill.toLowerCase().includes(tech.toLowerCase())
        )
      ),
      management: allSkills.filter((skill: string) => 
        ['Product Management', 'Project Management', 'Leadership', 'Strategy'].some(mgmt => 
          skill.toLowerCase().includes(mgmt.toLowerCase())
        )
      ),
      analytical: allSkills.filter((skill: string) => 
        ['Analysis', 'Analytics', 'Data', 'Research'].some(analytical => 
          skill.toLowerCase().includes(analytical.toLowerCase())
        )
      )
    };

    let response = {};
    switch (category) {
      case 'technical':
        response = { technicalSkills: categorizedSkills.technical };
        break;
      case 'management':
        response = { managementSkills: categorizedSkills.management };
        break;
      case 'analytical':
        response = { analyticalSkills: categorizedSkills.analytical };
        break;
      case 'all':
      default:
        response = {
          totalSkills: allSkills.length,
          categorizedSkills,
          allSkills: allSkills,
          topSkills: allSkills.slice(0, 10)
        };
        break;
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  }

  private async getEducationBackground(args: any) {
    const educationData = this.knowledgeBase.get('education-background') || [];
    
    if (educationData.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No education data available. Please run the data processing script first.'
        }]
      };
    }

    const formattedEducation = educationData.map((edu: any) => ({
      institution: edu.school,
      degree: edu.degree,
      fieldOfStudy: edu.fieldOfStudy,
      period: `${edu.startDate} - ${edu.endDate}`,
      summary: edu.content
    }));

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          totalEducation: educationData.length,
          education: formattedEducation
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
