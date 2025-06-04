#!/usr/bin/env node

/**
 * Data Migration Script - Upload Knowledge Base to Cloudflare KV
 * 
 * This script uploads your local knowledge base to Cloudflare KV storage
 * so your web-accessible MCP server can access your personal data.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function migrateToCloudflare() {
  console.log('🚀 Migrating Personal Knowledge Base to Cloudflare');
  console.log('================================================');

  // Check if knowledge base exists
  const knowledgeBasePath = path.join(__dirname, '..', 'data', 'knowledge-base.json');
  
  if (!fs.existsSync(knowledgeBasePath)) {
    console.log('❌ Knowledge base not found at:', knowledgeBasePath);
    console.log('Please run the import scripts first to create your knowledge base.');
    return;
  }

  // Load knowledge base
  console.log('📚 Loading knowledge base...');
  const knowledgeBase = JSON.parse(fs.readFileSync(knowledgeBasePath, 'utf8'));
  
  console.log('📊 Knowledge base statistics:');
  for (const [category, entries] of Object.entries(knowledgeBase)) {
    console.log(`   ${category}: ${entries.length} entries`);
  }

  // Change to cloudflare directory
  const cloudflareDir = path.join(__dirname, '..', 'cloudflare');
  process.chdir(cloudflareDir);

  // Upload each category to KV
  console.log('');
  console.log('⬆️  Uploading to Cloudflare KV...');
  
  for (const [category, entries] of Object.entries(knowledgeBase)) {
    console.log(`   Uploading ${category}...`);
    
    // Create temporary file for this category
    const tempFile = path.join(cloudflareDir, `temp-${category}.json`);
    fs.writeFileSync(tempFile, JSON.stringify(entries, null, 2));
    
    try {
      // Upload to KV using wrangler (production environment)
      execSync(`npx wrangler kv:key put "${category}" --path="${tempFile}" --binding=KNOWLEDGE_BASE --preview false`, {
        stdio: 'pipe'
      });
      console.log(`   ✅ ${category} uploaded successfully`);
    } catch (error) {
      console.log(`   ❌ Failed to upload ${category}:`, error.message);
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  }

  console.log('');
  console.log('🎉 Migration completed!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Deploy your worker: npm run deploy');
  console.log('2. Your MCP server will be available at: https://personal-mcp-worker.your-account.workers.dev');
  console.log('3. Test the API endpoints in your browser');
}

if (require.main === module) {
  migrateToCloudflare().catch(console.error);
}

module.exports = { migrateToCloudflare };
