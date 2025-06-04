# LinkedIn Data Export Guide

LinkedIn doesn't provide a public API for personal data export, but you can export your data manually and then import it into your Personal AI Assistant.

## Step 1: Export Your LinkedIn Data

1. **Go to LinkedIn Settings:**
   - Visit: https://www.linkedin.com/settings/
   - Click on "Data Privacy"
   - Click on "Get a copy of your data"

2. **Select Data to Export:**
   - ✅ Posts
   - ✅ Articles  
   - ✅ Comments
   - ✅ Profile
   - ✅ Connections
   - ✅ Messages (optional)

3. **Request Export:**
   - Click "Request archive"
   - LinkedIn will email you when ready (usually within 24 hours)
   - Download the ZIP file

## Step 2: Use the LinkedIn Import Script

Once you have your LinkedIn data export:

```bash
# Extract the LinkedIn data
unzip your-linkedin-export.zip -d linkedin-data/

# Run the import script
node scripts/import-linkedin.js linkedin-data/
```

## Step 3: Manual Data Entry (Alternative)

If you want to start immediately, you can manually add LinkedIn content:

### Add a LinkedIn Post
```bash
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "add_personal_knowledge", "arguments": {"category": "linkedin-posts", "title": "My thoughts on AI development", "content": "Today I shared insights about the future of AI in software development...", "tags": ["AI", "software-development", "career"], "metadata": {"post_date": "2024-06-01", "platform": "linkedin", "engagement": {"likes": 45, "comments": 12}}}}}' | node dist/index.js
```

### Add a Career Milestone
```bash
echo '{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "add_personal_knowledge", "arguments": {"category": "career-milestones", "title": "Promoted to Senior AI Engineer", "content": "Excited to announce my promotion to Senior AI Engineer at TechCorp. Leading the AI initiatives team...", "tags": ["promotion", "AI", "leadership"], "metadata": {"date": "2024-05-15", "company": "TechCorp", "role": "Senior AI Engineer"}}}}' | node dist/index.js
```

## LinkedIn Data Files Structure

When you get your LinkedIn export, look for these key files:

- **Posts.csv** - Your posts and updates
- **Articles.csv** - Published articles  
- **Comments.csv** - Comments you've made
- **Profile.csv** - Profile information
- **Positions.csv** - Work experience
- **Education.csv** - Educational background

## Privacy Note

Your LinkedIn data export contains personal information. The import script will:
- Only extract publicly shareable content
- Remove personal identifiers where appropriate
- Store data locally in your knowledge base
- Never send data to external services

## Troubleshooting

**Issue: LinkedIn export is too large**
- Solution: Process in smaller batches using the selective import options

**Issue: CSV parsing errors**
- Solution: Check CSV encoding (should be UTF-8)
- Try opening in Excel/Google Sheets first to verify format

**Issue: Missing expected files**
- Solution: Re-request export with all data types selected
