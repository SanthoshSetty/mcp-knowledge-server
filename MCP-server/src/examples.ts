import fs from 'fs';
import path from 'path';

/**
 * Example script showing how to upload files to the MCP server
 * This demonstrates the base64 encoding process for file uploads
 */

// Example function to encode a file to base64
function encodeFileToBase64(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return fileBuffer.toString('base64');
}

// Example usage
async function exampleUpload() {
  // This would typically be called through Claude Desktop
  // but here's how the data would be prepared
  
  const exampleTextFile = "Hello, this is a sample text document for my knowledge base.";
  const base64Content = Buffer.from(exampleTextFile).toString('base64');
  
  console.log("Example MCP tool call for uploading a text file:");
  console.log(JSON.stringify({
    tool: "upload-file",
    parameters: {
      filename: "example.txt",
      content: base64Content,
      type: "txt"
    }
  }, null, 2));
  
  console.log("\nExample search query:");
  console.log(JSON.stringify({
    tool: "search-knowledge",
    parameters: {
      query: "sample text document",
      limit: 5
    }
  }, null, 2));
}

// Example owner information update
async function exampleOwnerUpdate() {
  console.log("\nExample owner info update:");
  console.log(JSON.stringify({
    tool: "update-owner-info",
    parameters: {
      name: "John Doe",
      description: "Software Engineer and AI Enthusiast",
      background: "I'm a full-stack developer with 5 years of experience in web technologies, machine learning, and cloud infrastructure. I'm passionate about AI and automation."
    }
  }, null, 2));
}

if (require.main === module) {
  exampleUpload();
  exampleOwnerUpdate();
}
