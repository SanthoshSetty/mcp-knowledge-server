#!/usr/bin/env node
"use strict";
/**
 * Personal AI Assistant MCP Server
 *
 * An advanced MCP server that transforms your personal digital life into an AI-accessible knowledge base.
 * Integrates with GitHub, LinkedIn, personal notes, and project data to create your digital twin.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const process = __importStar(require("process"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
// Personal AI Assistant Server
class PersonalAIServer {
    constructor() {
        this.knowledgeBase = new Map();
        this.dataFile = path.join(process.cwd(), 'data', 'processed-knowledge-base.json');
        this.fallbackDataFile = path.join(process.cwd(), 'data', 'knowledge-base.json');
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
        this.server = new index_js_1.Server({
            name: 'personal-ai-assistant',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupToolHandlers();
        this.setupRequestHandlers();
        this.loadKnowledgeBase(); // Load existing data on startup
    }
    setupRequestHandlers() {
        this.server.setRequestHandler(types_js_1.ListToolsRequestSchema, () => __awaiter(this, void 0, void 0, function* () {
            return ({
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
                    },
                    {
                        name: 'get_professional_profile',
                        description: 'Get comprehensive professional profile and summary',
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
                        description: 'Get detailed work experience and career history',
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
                        description: 'Get skills, competencies, and areas of expertise',
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
                        description: 'Get educational background and qualifications',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    }
                ]
            });
        }));
        this.server.setRequestHandler(types_js_1.CallToolRequestSchema, (request) => __awaiter(this, void 0, void 0, function* () {
            const { name, arguments: args } = request.params;
            try {
                switch (name) {
                    case 'search_personal_knowledge':
                        return yield this.searchPersonalKnowledge(args);
                    case 'get_github_projects':
                        return yield this.getGitHubProjects(args);
                    case 'get_linkedin_activity':
                        return yield this.getLinkedInActivity(args);
                    case 'add_personal_knowledge':
                        return yield this.addPersonalKnowledge(args);
                    case 'get_personal_timeline':
                        return yield this.getPersonalTimeline(args);
                    case 'analyze_growth_patterns':
                        return yield this.analyzeGrowthPatterns(args);
                    case 'export_github_data':
                        return yield this.exportGitHubData(args);
                    case 'get_professional_profile':
                        return yield this.getProfessionalProfile(args);
                    case 'get_work_experience':
                        return yield this.getWorkExperience(args);
                    case 'get_skills_expertise':
                        return yield this.getSkillsExpertise(args);
                    case 'get_education_background':
                        return yield this.getEducationBackground(args);
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            }
            catch (error) {
                return {
                    content: [{
                            type: 'text',
                            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
                        }],
                    isError: true
                };
            }
        }));
    }
    setupToolHandlers() {
        // Tool handlers are set up in setupRequestHandlers
        // Knowledge base is loaded in constructor via loadKnowledgeBase()
    }
    loadKnowledgeBase() {
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
            }
            else if (fs.existsSync(this.fallbackDataFile)) {
                // Fallback to original knowledge base
                const data = JSON.parse(fs.readFileSync(this.fallbackDataFile, 'utf-8'));
                this.knowledgeBase = new Map(Object.entries(data));
                console.error(`📚 Loaded ${this.knowledgeBase.size} knowledge categories from fallback data`);
            }
            else {
                // Initialize with default sample data
                this.initializeSampleData();
                console.error('🆕 Initialized with sample data');
            }
        }
        catch (error) {
            console.error('⚠️  Error loading knowledge base:', error);
            this.initializeSampleData();
        }
    }
    saveKnowledgeBase() {
        try {
            const dataDir = path.dirname(this.dataFile);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            const data = Object.fromEntries(this.knowledgeBase);
            fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
            console.error(`💾 Knowledge base saved to ${this.dataFile}`);
        }
        catch (error) {
            console.error('⚠️  Error saving knowledge base:', error);
        }
    }
    initializeSampleData() {
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
    searchPersonalKnowledge(args) {
        return __awaiter(this, void 0, void 0, function* () {
            const { query, category, limit = 10 } = args;
            const results = [];
            const categoriesToSearch = category ? [category] : Object.keys(this.categories);
            for (const cat of categoriesToSearch) {
                const data = this.knowledgeBase.get(cat) || [];
                const filtered = data.filter((item) => this.matchesQuery(item, query)).slice(0, limit);
                results.push(...filtered.map((item) => (Object.assign(Object.assign({}, item), { category: cat }))));
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
        });
    }
    matchesQuery(item, query) {
        const searchText = JSON.stringify(item).toLowerCase();
        return searchText.includes(query.toLowerCase());
    }
    getGitHubProjects(args) {
        return __awaiter(this, void 0, void 0, function* () {
            const { language, topic } = args;
            let projects = this.knowledgeBase.get('github-projects') || [];
            if (language) {
                projects = projects.filter((p) => {
                    var _a;
                    // Check both top-level language and metadata.language for imported data
                    const projectLanguage = p.language || ((_a = p.metadata) === null || _a === void 0 ? void 0 : _a.language);
                    return (projectLanguage === null || projectLanguage === void 0 ? void 0 : projectLanguage.toLowerCase()) === language.toLowerCase();
                });
            }
            if (topic) {
                projects = projects.filter((p) => {
                    // Check both top-level topics and tags for imported data
                    const projectTopics = p.topics || p.tags || [];
                    return projectTopics.some((t) => t.toLowerCase().includes(topic.toLowerCase()));
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
        });
    }
    getLinkedInActivity(args) {
        return __awaiter(this, void 0, void 0, function* () {
            const { type = 'all', timeframe = 'all' } = args;
            let activity = this.knowledgeBase.get('linkedin-posts') || [];
            if (type !== 'all') {
                activity = activity.filter((item) => item.type === type);
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
        });
    }
    addPersonalKnowledge(args) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
    getPersonalTimeline(args) {
        return __awaiter(this, void 0, void 0, function* () {
            const { timeframe = 'all', focus = 'all' } = args;
            // Aggregate timeline from all categories
            const timeline = [];
            for (const [category, items] of this.knowledgeBase.entries()) {
                for (const item of items) {
                    timeline.push(Object.assign(Object.assign({}, item), { category, date: item.date || item.dateAdded || item.lastUpdated }));
                }
            }
            // Sort by date
            timeline.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
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
        });
    }
    analyzeGrowthPatterns(args) {
        return __awaiter(this, void 0, void 0, function* () {
            const { dimension } = args;
            // Example analysis - in real implementation, would do deeper analytics
            const analysis = {
                dimension,
                insights: [],
                trends: {},
                recommendations: []
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
        });
    }
    exportGitHubData(args) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
    getProfessionalProfile(args) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
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
                        lastUpdated: (_a = profile.metadata) === null || _a === void 0 ? void 0 : _a.dateProcessed
                    }, null, 2);
                    break;
            }
            return {
                content: [{
                        type: 'text',
                        text: content
                    }]
            };
        });
    }
    getWorkExperience(args) {
        return __awaiter(this, void 0, void 0, function* () {
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
                filteredExperience = filteredExperience.filter((exp) => { var _a; return (_a = exp.company) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(company.toLowerCase()); });
            }
            if (role) {
                filteredExperience = filteredExperience.filter((exp) => {
                    var _a, _b;
                    return ((_a = exp.position) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(role.toLowerCase())) ||
                        ((_b = exp.title) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(role.toLowerCase()));
                });
            }
            if (timeframe === 'current') {
                filteredExperience = filteredExperience.filter((exp) => exp.endDate === 'Present' || exp.endDate === '');
            }
            else if (timeframe === 'recent') {
                // Filter for last 5 years
                const fiveYearsAgo = new Date();
                fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
                filteredExperience = filteredExperience.filter((exp) => {
                    const startDate = new Date(exp.startDate);
                    return startDate >= fiveYearsAgo;
                });
            }
            return {
                content: [{
                        type: 'text',
                        text: JSON.stringify({
                            totalExperience: filteredExperience.length,
                            experiences: filteredExperience.map((exp) => {
                                var _a, _b, _c;
                                return ({
                                    company: exp.company,
                                    position: exp.position,
                                    duration: `${exp.startDate} - ${exp.endDate}`,
                                    location: exp.location,
                                    description: ((_a = exp.description) === null || _a === void 0 ? void 0 : _a.substring(0, 500)) + (((_b = exp.description) === null || _b === void 0 ? void 0 : _b.length) > 500 ? '...' : ''),
                                    skills: (_c = exp.tags) === null || _c === void 0 ? void 0 : _c.filter((tag) => !['work-experience', 'career'].includes(tag))
                                });
                            })
                        }, null, 2)
                    }]
            };
        });
    }
    getSkillsExpertise(args) {
        return __awaiter(this, void 0, void 0, function* () {
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
                technical: allSkills.filter((skill) => ['Python', 'R', 'Machine Learning', 'AI', 'TypeScript', 'JavaScript', 'SQL', 'Data Analysis'].some(tech => skill.toLowerCase().includes(tech.toLowerCase()))),
                management: allSkills.filter((skill) => ['Product Management', 'Project Management', 'Leadership', 'Strategy'].some(mgmt => skill.toLowerCase().includes(mgmt.toLowerCase()))),
                analytical: allSkills.filter((skill) => ['Analysis', 'Analytics', 'Data', 'Research'].some(analytical => skill.toLowerCase().includes(analytical.toLowerCase())))
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
        });
    }
    getEducationBackground(args) {
        return __awaiter(this, void 0, void 0, function* () {
            const educationData = this.knowledgeBase.get('education-background') || [];
            if (educationData.length === 0) {
                return {
                    content: [{
                            type: 'text',
                            text: 'No education data available. Please run the data processing script first.'
                        }]
                };
            }
            const formattedEducation = educationData.map((edu) => ({
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
        });
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            const transport = new stdio_js_1.StdioServerTransport();
            yield this.server.connect(transport);
            console.error('Personal AI Assistant MCP Server running on stdio');
        });
    }
}
// Start the server
const server = new PersonalAIServer();
server.run().catch((error) => {
    console.error('Fatal error running server:', error);
    process.exit(1);
});
