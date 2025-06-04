# Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

This is a Personal AI Assistant MCP Server project that creates an AI-accessible knowledge base from personal data sources.

## Project Overview
- **Purpose**: Transform personal digital data (GitHub repos, LinkedIn posts, personal notes) into an AI-accessible knowledge base
- **Tech Stack**: TypeScript, Model Context Protocol SDK, Cloudflare Workers
- **Target**: Personal use for creating an AI assistant that knows about your professional and personal history

## Key Features to Implement
1. **GitHub Integration**: Export and index all user repositories, README files, commit history
2. **LinkedIn Data**: Structure and store professional posts, articles, career milestones
3. **Personal Knowledge**: Categorized notes, learning materials, project decisions
4. **AI Tools**: Search, retrieval, and content management functions for MCP protocol
5. **Cloud Storage**: Cloudflare R2 for files, KV for metadata
6. **Smart Search**: Intelligent content discovery across all personal data

## Development Guidelines
- Follow MCP Server patterns and best practices
- Use TypeScript with strict typing
- Implement proper error handling for API integrations
- Design for scalability and personal data privacy
- Create intuitive tools for AI assistant interaction

## External References
- Model Context Protocol documentation: https://modelcontextprotocol.io/llms-full.txt
- MCP SDK examples: https://github.com/modelcontextprotocol/create-python-server
- Focus on personal data integration and AI accessibility
