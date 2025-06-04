# Development Guide

This guide will help you understand the Personal AI Assistant MCP Server codebase and how to extend it.

## 🏗 Architecture Overview

### Core Components

```typescript
PersonalAIServer
├── Constructor (initializes knowledge base with sample data)
├── Tool Handlers (7 specialized functions)
├── Knowledge Base (Map<string, KnowledgeEntry>)
└── MCP Protocol Implementation
```

### Knowledge Entry Structure

```typescript
interface KnowledgeEntry {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
  metadata: {
    created: Date;
    updated: Date;
    source?: string;
    url?: string;
    [key: string]: any;
  };
}
```

## 🛠 Adding New Tools

To add a new MCP tool:

1. **Define the tool in the constructor:**
```typescript
{
  name: "your_new_tool",
  description: "Description of what your tool does",
  inputSchema: {
    type: "object",
    properties: {
      // Define your parameters here
    },
    required: ["required_param"]
  }
}
```

2. **Add the handler in `handleCallTool`:**
```typescript
case "your_new_tool":
  return await this.yourNewToolMethod(args);
```

3. **Implement the method:**
```typescript
private async yourNewToolMethod(args: any) {
  // Your implementation here
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(result, null, 2)
    }]
  };
}
```

## 🔌 Adding New Knowledge Categories

1. **Update the category enum in tool schemas**
2. **Add sample data in the constructor**
3. **Update any category-specific logic**

Example:
```typescript
// Add to the enum in tool schemas
"new-category"

// Add sample data
this.knowledgeBase.set("sample-new-1", {
  id: "sample-new-1",
  category: "new-category",
  title: "Sample Entry",
  content: "Sample content for the new category",
  tags: ["sample", "new"],
  metadata: {
    created: new Date("2024-01-01"),
    updated: new Date("2024-01-01")
  }
});
```

## 🔍 Implementing Real Data Sources

### GitHub Integration Example

```typescript
import { Octokit } from "@octokit/rest";

private async syncGitHubData() {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
  });
  
  const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser();
  
  repos.forEach(repo => {
    this.knowledgeBase.set(`github-${repo.id}`, {
      id: `github-${repo.id}`,
      category: "github-projects",
      title: repo.name,
      content: repo.description || "",
      tags: repo.topics || [],
      metadata: {
        created: new Date(repo.created_at),
        updated: new Date(repo.updated_at),
        url: repo.html_url,
        language: repo.language,
        stars: repo.stargazers_count
      }
    });
  });
}
```

## 🧪 Testing

### Manual Testing with MCP Protocol

```bash
# Test tool listing
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node dist/index.js

# Test specific tool
echo '{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "search_personal_knowledge", "arguments": {"query": "test"}}}' | node dist/index.js
```

### Adding Unit Tests (Future)

```typescript
// tests/server.test.ts
import { PersonalAIServer } from '../src/index';

describe('PersonalAIServer', () => {
  let server: PersonalAIServer;
  
  beforeEach(() => {
    server = new PersonalAIServer();
  });
  
  it('should search knowledge base', async () => {
    const result = await server.searchPersonalKnowledge({
      query: 'TypeScript'
    });
    expect(result.content[0].text).toContain('results');
  });
});
```

## 🚀 Deployment Options

### Local Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Cloudflare Workers (Future)
```bash
# Add wrangler configuration
npx wrangler init
npx wrangler deploy
```

## 🎯 Best Practices

1. **Error Handling**: Always wrap async operations in try-catch
2. **Input Validation**: Use Zod schemas for runtime validation
3. **Logging**: Add meaningful logs for debugging
4. **Type Safety**: Use TypeScript strictly
5. **Documentation**: Document all public methods and complex logic

## 🔧 Common Issues

### Build Errors
- Check TypeScript configuration
- Ensure all imports are correctly typed
- Verify MCP SDK version compatibility

### Runtime Errors
- Check environment variables
- Verify file paths are absolute
- Ensure proper error handling in tool methods

### MCP Integration Issues
- Verify Claude Desktop configuration
- Check server output for initialization errors
- Test with simple tools first

## 📚 Useful Resources

- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Claude Desktop MCP Guide](https://docs.anthropic.com/claude/docs/mcp)
