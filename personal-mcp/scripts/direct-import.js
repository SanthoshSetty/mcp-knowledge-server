#!/usr/bin/env node

/**
 * Direct Knowledge Base Importer
 * 
 * This script directly imports exported data into the knowledge base JSON file,
 * bypassing the MCP server for bulk imports.
 */

const fs = require('fs');
const path = require('path');

async function directImport(dataFile) {
  console.log('🔄 Direct Knowledge Base Importer');
  console.log('=================================');

  if (!fs.existsSync(dataFile)) {
    console.log(`❌ Data file not found: ${dataFile}`);
    process.exit(1);
  }

  const knowledgeBaseFile = path.join(__dirname, '..', 'data', 'knowledge-base.json');
  
  try {
    console.log(`📁 Loading export data from: ${dataFile}`);
    const exportData = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));

    if (!exportData.knowledge_entries || !Array.isArray(exportData.knowledge_entries)) {
      console.log('❌ Invalid data format. Expected "knowledge_entries" array.');
      process.exit(1);
    }

    // Load existing knowledge base or create empty one
    let knowledgeBase = {};
    if (fs.existsSync(knowledgeBaseFile)) {
      console.log('📚 Loading existing knowledge base...');
      knowledgeBase = JSON.parse(fs.readFileSync(knowledgeBaseFile, 'utf-8'));
    } else {
      console.log('🆕 Creating new knowledge base...');
      // Ensure data directory exists
      const dataDir = path.dirname(knowledgeBaseFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
    }

    console.log(`📊 Importing ${exportData.knowledge_entries.length} knowledge entries...`);

    // Group by category for summary
    const categories = {};
    exportData.knowledge_entries.forEach(entry => {
      categories[entry.category] = (categories[entry.category] || 0) + 1;
    });

    console.log('📋 Categories to import:');
    Object.entries(categories).forEach(([category, count]) => {
      console.log(`   • ${category}: ${count} entries`);
    });

    let imported = 0;
    let skipped = 0;

    // Import each entry
    for (const entry of exportData.knowledge_entries) {
      const { category, title, content, tags = [], metadata = {} } = entry;
      
      // Ensure category exists in knowledge base
      if (!knowledgeBase[category]) {
        knowledgeBase[category] = [];
      }

      // Check if entry already exists (by title in the same category)
      const existingEntry = knowledgeBase[category].find(existing => 
        existing.title === title || existing.id === entry.id
      );

      if (existingEntry) {
        console.log(`   ⚠️  Skipping duplicate: ${title} (${category})`);
        skipped++;
        continue;
      }

      // Create new entry
      const newEntry = {
        id: entry.id || `${category}-${Date.now()}-${imported}`,
        title,
        content,
        tags,
        metadata: {
          ...metadata,
          importedAt: new Date().toISOString(),
          importSource: path.basename(dataFile)
        },
        dateAdded: entry.dateAdded || new Date().toISOString()
      };

      knowledgeBase[category].push(newEntry);
      imported++;

      if (imported % 10 === 0) {
        process.stdout.write(`\r   Progress: ${imported}/${exportData.knowledge_entries.length} entries imported`);
      }
    }

    console.log(`\r   Progress: ${imported}/${exportData.knowledge_entries.length} entries imported ✅`);

    // Save updated knowledge base
    fs.writeFileSync(knowledgeBaseFile, JSON.stringify(knowledgeBase, null, 2));
    
    console.log('');
    console.log('🎉 Import completed!');
    console.log(`📄 Knowledge base saved to: ${knowledgeBaseFile}`);
    console.log(`✅ Successfully imported: ${imported} entries`);
    if (skipped > 0) {
      console.log(`⚠️  Skipped duplicates: ${skipped} entries`);
    }
    console.log('');
    console.log('🔍 Next steps:');
    console.log('  1. Your data is now available in the knowledge base');
    console.log('  2. Start the MCP server: npm run dev');
    console.log('  3. Test with Claude Desktop or direct MCP calls');

  } catch (error) {
    console.error('❌ Error during import:', error.message);
    process.exit(1);
  }
}

// Get the data file from command line
const dataFile = process.argv[2];

if (!dataFile) {
  console.log('Usage: node scripts/direct-import.js <path-to-export-file>');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/direct-import.js exports/github-export-1234567890.json');
  console.log('  node scripts/direct-import.js exports/linkedin-import-1234567890.json');
  console.log('  node scripts/direct-import.js exports/demo-github-export.json');
  process.exit(1);
}

// Run the importer
directImport(dataFile).catch(console.error);
