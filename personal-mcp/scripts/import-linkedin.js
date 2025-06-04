#!/usr/bin/env node

/**
 * LinkedIn Data Import Script
 * 
 * This script processes LinkedIn data exports and creates knowledge entries
 * for the Personal AI Assistant MCP Server.
 */

const fs = require('fs');
const path = require('path');

// Check if we have the required dependencies
try {
  require('csv-parser');
} catch (error) {
  console.log('📦 Installing CSV parsing dependency...');
  require('child_process').execSync('npm install csv-parser', { stdio: 'inherit' });
}

const csv = require('csv-parser');

async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    if (!fs.existsSync(filePath)) {
      resolve([]);
      return;
    }

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

async function importLinkedInData(linkedinDataDir) {
  console.log('🔗 LinkedIn Data Import Tool');
  console.log('============================');

  if (!fs.existsSync(linkedinDataDir)) {
    console.log(`❌ LinkedIn data directory not found: ${linkedinDataDir}`);
    console.log('');
    console.log('Please follow these steps:');
    console.log('1. Export your LinkedIn data from https://www.linkedin.com/settings/');
    console.log('2. Extract the ZIP file to a directory');
    console.log('3. Run this script with the path to that directory');
    console.log('');
    console.log('Example: node scripts/import-linkedin.js ~/Downloads/linkedin-export/');
    process.exit(1);
  }

  const knowledgeEntries = [];

  // Import Posts
  console.log('📝 Processing posts...');
  const postsFile = path.join(linkedinDataDir, 'Posts.csv');
  const posts = await parseCSV(postsFile);
  
  for (const post of posts) {
    if (post.Text && post.Text.trim()) {
      const entry = {
        id: `linkedin-post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        category: 'linkedin-posts',
        title: post.Text.substring(0, 100) + (post.Text.length > 100 ? '...' : ''),
        content: post.Text,
        tags: ['linkedin', 'post', 'social-media'],
        metadata: {
          created: post.Date || new Date().toISOString(),
          updated: post.Date || new Date().toISOString(),
          source: 'linkedin-export',
          platform: 'linkedin',
          type: 'post'
        }
      };
      knowledgeEntries.push(entry);
    }
  }

  // Import Articles
  console.log('📰 Processing articles...');
  const articlesFile = path.join(linkedinDataDir, 'Articles.csv');
  const articles = await parseCSV(articlesFile);
  
  for (const article of articles) {
    if (article.Title) {
      const entry = {
        id: `linkedin-article-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        category: 'linkedin-posts',
        title: article.Title,
        content: `${article.Subtitle || ''}\n\n${article.Content || ''}`.trim(),
        tags: ['linkedin', 'article', 'published'],
        metadata: {
          created: article['Published Date'] || new Date().toISOString(),
          updated: article['Published Date'] || new Date().toISOString(),
          source: 'linkedin-export',
          platform: 'linkedin',
          type: 'article',
          url: article.Url
        }
      };
      knowledgeEntries.push(entry);
    }
  }

  // Import Positions (Career Milestones)
  console.log('💼 Processing career positions...');
  const positionsFile = path.join(linkedinDataDir, 'Positions.csv');
  const positions = await parseCSV(positionsFile);
  
  for (const position of positions) {
    if (position['Company Name'] && position.Title) {
      const entry = {
        id: `career-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        category: 'career-milestones',
        title: `${position.Title} at ${position['Company Name']}`,
        content: position.Description || `${position.Title} role at ${position['Company Name']}`,
        tags: ['career', 'work-experience', position['Company Name'].toLowerCase().replace(/\s+/g, '-')],
        metadata: {
          created: position['Started On'] || new Date().toISOString(),
          updated: position['Finished On'] || new Date().toISOString(),
          source: 'linkedin-export',
          company: position['Company Name'],
          title: position.Title,
          location: position.Location,
          start_date: position['Started On'],
          end_date: position['Finished On'],
          current: !position['Finished On']
        }
      };
      knowledgeEntries.push(entry);
    }
  }

  // Import Education
  console.log('🎓 Processing education...');
  const educationFile = path.join(linkedinDataDir, 'Education.csv');
  const education = await parseCSV(educationFile);
  
  for (const edu of education) {
    if (edu['School Name']) {
      const entry = {
        id: `education-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        category: 'career-milestones',
        title: `${edu['Degree Name'] || 'Education'} at ${edu['School Name']}`,
        content: `${edu['Degree Name'] || ''} ${edu['Field Of Study'] || ''}\n${edu['Notes'] || ''}`.trim(),
        tags: ['education', 'learning', edu['School Name'].toLowerCase().replace(/\s+/g, '-')],
        metadata: {
          created: edu['Start Date'] || new Date().toISOString(),
          updated: edu['End Date'] || new Date().toISOString(),
          source: 'linkedin-export',
          school: edu['School Name'],
          degree: edu['Degree Name'],
          field: edu['Field Of Study'],
          start_date: edu['Start Date'],
          end_date: edu['End Date']
        }
      };
      knowledgeEntries.push(entry);
    }
  }

  // Save the import
  const exportDir = path.join(__dirname, '..', 'exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const importFile = path.join(exportDir, `linkedin-import-${Date.now()}.json`);
  const importData = {
    import_info: {
      source: 'linkedin-export',
      import_date: new Date().toISOString(),
      total_entries: knowledgeEntries.length,
      tool: 'LinkedIn Import Script v1.0',
      categories: {
        'linkedin-posts': knowledgeEntries.filter(e => e.category === 'linkedin-posts').length,
        'career-milestones': knowledgeEntries.filter(e => e.category === 'career-milestones').length
      }
    },
    knowledge_entries: knowledgeEntries
  };

  fs.writeFileSync(importFile, JSON.stringify(importData, null, 2));

  console.log('');
  console.log('🎉 LinkedIn import completed successfully!');
  console.log(`📄 Data saved to: ${importFile}`);
  console.log(`📊 Imported ${knowledgeEntries.length} entries:`);
  console.log(`   • ${importData.import_info.categories['linkedin-posts']} LinkedIn posts/articles`);
  console.log(`   • ${importData.import_info.categories['career-milestones']} career milestones`);
  console.log('');
  console.log('Next steps:');
  console.log('1. Review the imported data in the JSON file');
  console.log('2. Use the data loader to import this into your MCP server');
  console.log('3. Restart your MCP server to see the new data');
}

// Get the LinkedIn data directory from command line
const linkedinDataDir = process.argv[2];

if (!linkedinDataDir) {
  console.log('Usage: node import-linkedin.js <path-to-linkedin-export-directory>');
  console.log('');
  console.log('Example: node import-linkedin.js ~/Downloads/Basic_LinkedInDataExport_06-01-2024/');
  process.exit(1);
}

// Run the import
importLinkedInData(linkedinDataDir).catch(console.error);
