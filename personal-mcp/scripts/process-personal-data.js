#!/usr/bin/env node

/**
 * Personal Data Processor for MCP Knowledge Base
 * Processes LinkedIn and GitHub data while sanitizing personal information
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

class PersonalDataProcessor {
  constructor() {
    this.knowledgeBase = {
      'professional-profile': [],
      'work-experience': [],
      'skills-expertise': [],
      'education-background': [],
      'github-projects': [],
      'certifications': [],
      'recommendations': []
    };
  }

  // Sanitize personal information
  sanitizePersonalInfo(text) {
    if (!text) return text;
    
    // Remove email addresses
    text = text.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL_REDACTED]');
    
    // Remove phone numbers (various formats)
    text = text.replace(/[\+]?[\d\s\-\(\)]{10,}/g, '[PHONE_REDACTED]');
    
    // Remove specific personal identifiers but keep professional context
    text = text.replace(/\b\d{4,}\s*(Berlin|Germany|Singapore)\b/g, 'Berlin, Germany');
    
    return text;
  }

  async processLinkedInProfile() {
    const profilePath = path.join(__dirname, '../Linkedin data/Profile.csv');
    
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(profilePath)) {
        console.log('Profile.csv not found, skipping...');
        resolve();
        return;
      }

      fs.createReadStream(profilePath)
        .pipe(csv())
        .on('data', (row) => {
          const profileEntry = {
            id: 'professional-profile-linkedin',
            title: 'Professional Profile',
            headline: row.Headline || '',
            summary: this.sanitizePersonalInfo(row.Summary || ''),
            industry: row.Industry || '',
            location: 'Berlin, Germany', // Generalized location
            content: `Professional with ${row.Headline}. ${this.sanitizePersonalInfo(row.Summary)}`,
            tags: ['linkedin', 'profile', 'professional-summary'],
            metadata: {
              source: 'linkedin-export',
              industry: row.Industry,
              dateProcessed: new Date().toISOString()
            }
          };
          
          this.knowledgeBase['professional-profile'].push(profileEntry);
        })
        .on('end', resolve)
        .on('error', reject);
    });
  }

  async processWorkExperience() {
    const positionsPath = path.join(__dirname, '../Linkedin data/Positions.csv');
    
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(positionsPath)) {
        console.log('Positions.csv not found, skipping...');
        resolve();
        return;
      }

      fs.createReadStream(positionsPath)
        .pipe(csv())
        .on('data', (row) => {
          const workEntry = {
            id: `work-${row['Company Name'].toLowerCase().replace(/\s+/g, '-')}-${row['Started On']}`,
            title: `${row.Title} at ${row['Company Name']}`,
            company: row['Company Name'],
            position: row.Title,
            location: row.Location === 'Berlin, Germany' ? 'Berlin, Germany' : 'Various Locations',
            startDate: row['Started On'],
            endDate: row['Finished On'] || 'Present',
            description: this.sanitizePersonalInfo(row.Description || ''),
            content: `Role: ${row.Title} at ${row['Company Name']} (${row['Started On']} - ${row['Finished On'] || 'Present'}). ${this.sanitizePersonalInfo(row.Description)}`,
            tags: ['work-experience', 'career', row['Company Name'].toLowerCase().replace(/\s+/g, '-')],
            metadata: {
              source: 'linkedin-positions',
              duration: this.calculateDuration(row['Started On'], row['Finished On']),
              dateProcessed: new Date().toISOString()
            }
          };
          
          this.knowledgeBase['work-experience'].push(workEntry);
        })
        .on('end', resolve)
        .on('error', reject);
    });
  }

  async processSkills() {
    const skillsPath = path.join(__dirname, '../Linkedin data/Skills.csv');
    
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(skillsPath)) {
        console.log('Skills.csv not found, skipping...');
        resolve();
        return;
      }

      const skills = [];
      fs.createReadStream(skillsPath)
        .pipe(csv())
        .on('data', (row) => {
          if (row.Name && row.Name.trim()) {
            skills.push(row.Name.trim());
          }
        })
        .on('end', () => {
          const skillsEntry = {
            id: 'professional-skills-linkedin',
            title: 'Professional Skills and Expertise',
            content: `Core competencies include: ${skills.join(', ')}`,
            skills: skills,
            tags: ['skills', 'expertise', 'competencies'],
            metadata: {
              source: 'linkedin-skills',
              totalSkills: skills.length,
              dateProcessed: new Date().toISOString()
            }
          };
          
          this.knowledgeBase['skills-expertise'].push(skillsEntry);
          resolve();
        })
        .on('error', reject);
    });
  }

  async processEducation() {
    const educationPath = path.join(__dirname, '../Linkedin data/Education.csv');
    
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(educationPath)) {
        console.log('Education.csv not found, skipping...');
        resolve();
        return;
      }

      fs.createReadStream(educationPath)
        .pipe(csv())
        .on('data', (row) => {
          const educationEntry = {
            id: `education-${row['School Name']?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`,
            title: `${row['Degree Name'] || 'Education'} - ${row['School Name'] || 'Institution'}`,
            school: row['School Name'] || '',
            degree: row['Degree Name'] || '',
            fieldOfStudy: row['Field Of Study'] || '',
            startDate: row['Start Date'] || '',
            endDate: row['End Date'] || '',
            content: `${row['Degree Name'] || 'Education'} in ${row['Field Of Study'] || 'Various Fields'} from ${row['School Name'] || 'Educational Institution'}`,
            tags: ['education', 'academic-background'],
            metadata: {
              source: 'linkedin-education',
              dateProcessed: new Date().toISOString()
            }
          };
          
          this.knowledgeBase['education-background'].push(educationEntry);
        })
        .on('end', resolve)
        .on('error', reject);
    });
  }

  async processGitHubProjects() {
    const githubExportPath = path.join(__dirname, '../exports/github-export-1748939719229.json');
    
    if (!fs.existsSync(githubExportPath)) {
      console.log('GitHub export not found, skipping...');
      return;
    }

    try {
      const githubData = JSON.parse(fs.readFileSync(githubExportPath, 'utf8'));
      
      if (githubData.knowledge_entries) {
        githubData.knowledge_entries.forEach(entry => {
          const projectEntry = {
            id: entry.id,
            title: entry.title,
            content: this.sanitizePersonalInfo(entry.content),
            tags: entry.tags || [],
            metadata: {
              ...entry.metadata,
              source: 'github-export',
              dateProcessed: new Date().toISOString()
            }
          };
          
          this.knowledgeBase['github-projects'].push(projectEntry);
        });
      }
    } catch (error) {
      console.error('Error processing GitHub data:', error.message);
    }
  }

  async processCertifications() {
    const certificationsPath = path.join(__dirname, '../Linkedin data/Certifications.csv');
    
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(certificationsPath)) {
        console.log('Certifications.csv not found, skipping...');
        resolve();
        return;
      }

      fs.createReadStream(certificationsPath)
        .pipe(csv())
        .on('data', (row) => {
          const certEntry = {
            id: `cert-${row['Name']?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`,
            title: row['Name'] || 'Professional Certification',
            authority: row['Authority'] || '',
            startDate: row['Started On'] || '',
            endDate: row['Finished On'] || '',
            content: `Professional certification: ${row['Name']} issued by ${row['Authority']}`,
            tags: ['certification', 'professional-development'],
            metadata: {
              source: 'linkedin-certifications',
              dateProcessed: new Date().toISOString()
            }
          };
          
          this.knowledgeBase['certifications'].push(certEntry);
        })
        .on('end', resolve)
        .on('error', reject);
    });
  }

  calculateDuration(startDate, endDate) {
    if (!startDate) return 'Unknown duration';
    
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    
    if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''}, ${months} month${months > 1 ? 's' : ''}`;
    } else {
      return `${months} month${months > 1 ? 's' : ''}`;
    }
  }

  async processAllData() {
    console.log('🚀 Starting personal data processing...');
    
    try {
      await this.processLinkedInProfile();
      console.log('✅ LinkedIn profile processed');
      
      await this.processWorkExperience();
      console.log('✅ Work experience processed');
      
      await this.processSkills();
      console.log('✅ Skills processed');
      
      await this.processEducation();
      console.log('✅ Education processed');
      
      await this.processGitHubProjects();
      console.log('✅ GitHub projects processed');
      
      await this.processCertifications();
      console.log('✅ Certifications processed');
      
      // Save processed data
      const outputPath = path.join(__dirname, '../data/processed-knowledge-base.json');
      fs.writeFileSync(outputPath, JSON.stringify(this.knowledgeBase, null, 2));
      
      console.log(`✅ Personal knowledge base saved to: ${outputPath}`);
      console.log(`📊 Total entries processed: ${this.getTotalEntries()}`);
      
      return this.knowledgeBase;
      
    } catch (error) {
      console.error('❌ Error processing data:', error);
      throw error;
    }
  }

  getTotalEntries() {
    return Object.values(this.knowledgeBase).reduce((total, category) => total + category.length, 0);
  }
}

// Check if csv-parser is available, if not provide instructions
try {
  require('csv-parser');
} catch (error) {
  console.log('📦 Installing required dependency: csv-parser');
  const { execSync } = require('child_process');
  try {
    execSync('npm install csv-parser', { stdio: 'inherit' });
    console.log('✅ csv-parser installed successfully');
  } catch (installError) {
    console.error('❌ Failed to install csv-parser. Please run: npm install csv-parser');
    process.exit(1);
  }
}

// Run the processor if this file is executed directly
if (require.main === module) {
  const processor = new PersonalDataProcessor();
  processor.processAllData()
    .then(() => {
      console.log('🎉 Data processing completed successfully!');
    })
    .catch((error) => {
      console.error('💥 Data processing failed:', error);
      process.exit(1);
    });
}

module.exports = PersonalDataProcessor;
