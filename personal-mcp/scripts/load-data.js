#!/usr/bin/env node

/**
 * Knowledge Base Data Loader
 * 
 * This script loads exported data (GitHub, LinkedIn, etc.) into the 
 * Personal AI Assistant MCP Server's knowledge base.
 */

const fs = require('fs');
const path = require('path');

async function loadKnowledgeData(dataFile) {
  console.log('🔄 Knowledge Base Data Loader');
  console.log('==============================');

  if (!fs.existsSync(dataFile)) {
    console.log(`❌ Data file not found: ${dataFile}`);
    console.log('');
    console.log('Available data files:');
    
    const exportsDir = path.join(__dirname, '..', 'exports');
    if (fs.existsSync(exportsDir)) {
      const files = fs.readdirSync(exportsDir).filter(f => f.endsWith('.json'));
      if (files.length > 0) {
        files.forEach(file => {
          const filePath = path.join(exportsDir, file);
          const stats = fs.statSync(filePath);
          console.log(`  • ${file} (${(stats.size / 1024).toFixed(1)}KB, ${stats.mtime.toLocaleDateString()})`);
        });
        console.log('');
        console.log('Example usage:');
        console.log(`  node scripts/load-data.js exports/${files[0]}`);
      } else {
        console.log('  No export files found in exports/ directory');
        console.log('  Run export scripts first: scripts/export-github.js');
      }
    }
    process.exit(1);
  }

  try {
    console.log(`📁 Loading data from: ${dataFile}`);
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));

    if (!data.knowledge_entries || !Array.isArray(data.knowledge_entries)) {
      console.log('❌ Invalid data format. Expected "knowledge_entries" array.');
      process.exit(1);
    }

    console.log(`📊 Found ${data.knowledge_entries.length} knowledge entries`);

    // Group by category for summary
    const categories = {};
    data.knowledge_entries.forEach(entry => {
      categories[entry.category] = (categories[entry.category] || 0) + 1;
    });

    console.log('📋 Categories:');
    Object.entries(categories).forEach(([category, count]) => {
      console.log(`   • ${category}: ${count} entries`);
    });

    // Load each entry into the MCP server
    console.log('');
    console.log('🔄 Loading entries into MCP server...');

    let successful = 0;
    let failed = 0;

    for (let i = 0; i < data.knowledge_entries.length; i++) {
      const entry = data.knowledge_entries[i];
      
      try {
        // Create the MCP call
        const mcpCall = {
          jsonrpc: "2.0",
          id: i + 1,
          method: "tools/call",
          params: {
            name: "add_personal_knowledge",
            arguments: {
              category: entry.category,
              title: entry.title,
              content: entry.content,
              tags: entry.tags || [],
              metadata: entry.metadata || {}
            }
          }
        };

        // For now, we'll save these as individual files that can be imported
        // In a future version, we could pipe these directly to the MCP server
        
        successful++;
        if (i % 10 === 0) {
          process.stdout.write(`\r   Progress: ${i + 1}/${data.knowledge_entries.length} entries`);
        }

      } catch (error) {
        console.log(`\n   ⚠️  Error processing entry ${i + 1}: ${error.message}`);
        failed++;
      }
    }

    console.log(`\r   Progress: ${data.knowledge_entries.length}/${data.knowledge_entries.length} entries ✅`);

    // Create import commands file
    const commandsFile = path.join(path.dirname(dataFile), `import-commands-${Date.now()}.sh`);
    const commands = data.knowledge_entries.map((entry, i) => {
      const mcpCall = {
        jsonrpc: "2.0",
        id: i + 1,
        method: "tools/call",
        params: {
          name: "add_personal_knowledge",
          arguments: {
            category: entry.category,
            title: entry.title,
            content: entry.content,
            tags: entry.tags || [],
            metadata: entry.metadata || {}
          }
        }
      };

      const escapedJson = JSON.stringify(JSON.stringify(mcpCall)).slice(1, -1);
      return `echo '${escapedJson}' | node dist/index.js`;
    });

    const scriptContent = `#!/bin/bash
# Auto-generated import script for Personal AI Assistant MCP Server
# Generated from: ${path.basename(dataFile)}
# Date: ${new Date().toISOString()}

echo "🔄 Importing ${data.knowledge_entries.length} knowledge entries..."
cd "$(dirname "$0")/.."

${commands.join('\n')}

echo "✅ Import completed!"
`;

    fs.writeFileSync(commandsFile, scriptContent);
    fs.chmodSync(commandsFile, '755');

    console.log('');
    console.log('🎉 Data processing completed!');
    console.log(`📄 Import commands saved to: ${commandsFile}`);
    console.log(`✅ Successfully processed: ${successful} entries`);
    if (failed > 0) {
      console.log(`⚠️  Failed to process: ${failed} entries`);
    }
    console.log('');
    console.log('To import the data into your MCP server:');
    console.log(`  1. Build your MCP server: npm run build`);
    console.log(`  2. Run the import script: ${commandsFile}`);
    console.log('  3. Your data will be available to Claude Desktop!');

  } catch (error) {
    console.error('❌ Error loading data:', error.message);
    process.exit(1);
  }
}

// Get the data file from command line
const dataFile = process.argv[2];

if (!dataFile) {
  console.log('Usage: node load-data.js <path-to-export-file>');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/load-data.js exports/github-export-1234567890.json');
  console.log('  node scripts/load-data.js exports/linkedin-import-1234567890.json');
  process.exit(1);
}

// Run the loader
loadKnowledgeData(dataFile).catch(console.error);
