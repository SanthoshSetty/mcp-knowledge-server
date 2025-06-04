#!/usr/bin/env node

/**
 * GitHub Data Export Script
 * 
 * This script exports your GitHub repositories and creates knowledge entries
 * that can be imported into the Personal AI Assistant MCP Server.
 */

const fs = require('fs');
const path = require('path');

// Check if we have the required dependencies
try {
  require('@octokit/rest');
} catch (error) {
  console.log('📦 Installing GitHub API dependency...');
  require('child_process').execSync('npm install @octokit/rest', { stdio: 'inherit' });
}

const { Octokit } = require('@octokit/rest');

async function exportGitHubData() {
  console.log('🚀 GitHub Data Export Tool');
  console.log('===========================');

  // Check for GitHub token
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.log('❌ GITHUB_TOKEN environment variable not found.');
    console.log('');
    console.log('To get your GitHub token:');
    console.log('1. Go to https://github.com/settings/tokens');
    console.log('2. Click "Generate new token (classic)"');
    console.log('3. Select scopes: repo, user');
    console.log('4. Copy the token and set it as environment variable:');
    console.log('   export GITHUB_TOKEN=your_token_here');
    console.log('');
    console.log('Then run this script again.');
    process.exit(1);
  }

  try {
    const octokit = new Octokit({ auth: token });

    console.log('👤 Fetching user information...');
    const { data: user } = await octokit.rest.users.getAuthenticated();
    console.log(`✅ Authenticated as: ${user.login} (${user.name})`);

    console.log('📁 Fetching repositories...');
    const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100
    });

    console.log(`✅ Found ${repos.length} repositories`);

    const knowledgeEntries = [];

    for (const repo of repos) {
      console.log(`📝 Processing: ${repo.name}`);

      let readmeContent = '';
      try {
        const { data: readme } = await octokit.rest.repos.getReadme({
          owner: repo.owner.login,
          repo: repo.name
        });
        readmeContent = Buffer.from(readme.content, 'base64').toString('utf-8');
      } catch (error) {
        console.log(`   ⚠️  No README found for ${repo.name}`);
      }

      // Get recent commits
      let recentCommits = [];
      try {
        const { data: commits } = await octokit.rest.repos.listCommits({
          owner: repo.owner.login,
          repo: repo.name,
          per_page: 5
        });
        recentCommits = commits.map(commit => ({
          sha: commit.sha.substring(0, 7),
          message: commit.commit.message.split('\n')[0],
          date: commit.commit.author.date,
          author: commit.commit.author.name
        }));
      } catch (error) {
        console.log(`   ⚠️  Could not fetch commits for ${repo.name}`);
      }

      const entry = {
        id: `github-${repo.id}`,
        category: 'github-projects',
        title: repo.name,
        content: `${repo.description || 'No description'}\n\n## README\n${readmeContent}`,
        tags: [...(repo.topics || []), repo.language].filter(Boolean),
        metadata: {
          created: repo.created_at,
          updated: repo.updated_at,
          source: 'github-export',
          url: repo.html_url,
          language: repo.language,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          private: repo.private,
          recent_commits: recentCommits,
          owner: repo.owner.login
        }
      };

      knowledgeEntries.push(entry);
    }

    // Create export directory
    const exportDir = path.join(__dirname, '..', 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // Save the export
    const exportFile = path.join(exportDir, `github-export-${Date.now()}.json`);
    const exportData = {
      export_info: {
        user: user.login,
        name: user.name,
        export_date: new Date().toISOString(),
        total_repos: repos.length,
        tool: 'GitHub Export Script v1.0'
      },
      knowledge_entries: knowledgeEntries
    };

    fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));

    console.log('');
    console.log('🎉 Export completed successfully!');
    console.log(`📄 Data saved to: ${exportFile}`);
    console.log(`📊 Exported ${knowledgeEntries.length} repository entries`);
    console.log('');
    console.log('Next steps:');
    console.log('1. Review the exported data in the JSON file');
    console.log('2. Use the import script to load this data into your MCP server');
    console.log('3. Restart your MCP server to see the new data');

  } catch (error) {
    console.error('❌ Error during export:', error.message);
    if (error.status === 401) {
      console.log('   Check that your GITHUB_TOKEN is valid and has the right permissions');
    }
    process.exit(1);
  }
}

// Run the export
exportGitHubData().catch(console.error);
