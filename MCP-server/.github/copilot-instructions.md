# Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

This is an MCP (Model Context Protocol) server project for Cloudflare Workers that provides personal knowledge base functionality.

## Project Goals
- Create an MCP server that stores personal data as PDF/TXT files
- Deploy on Cloudflare Workers for global accessibility
- Enable Claude Desktop users to interact with the knowledge base
- Support file upload, storage, and intelligent retrieval

## Key Technologies
- TypeScript
- Model Context Protocol SDK
- Cloudflare Workers
- Cloudflare KV Storage for file metadata
- Cloudflare R2 for file storage
- PDF parsing capabilities

## MCP Server Resources
You can find more info and examples at https://modelcontextprotocol.io/llms-full.txt
SDK documentation: https://github.com/modelcontextprotocol/create-python-server

## Architecture
- MCP server handles tool registration and communication
- Cloudflare Workers provides serverless hosting
- R2 storage for PDF/TXT files
- KV storage for file metadata and search indexing
- PDF parsing for content extraction
