// @ts-check

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const gtts = require('gtts');

// Configure marked to output plain text
const renderer = new marked.Renderer();
renderer.heading = (text) => text + '\n\n';
renderer.paragraph = (text) => text + '\n\n';
renderer.list = (body) => body + '\n';
renderer.listitem = (text) => '- ' + text + '\n';
renderer.strong = (text) => text;
renderer.em = (text) => text;
renderer.codespan = (text) => text;
renderer.blockquote = (text) => text;
renderer.table = (header, body) => header + body;
renderer.tablerow = (content) => content + '\n';
renderer.tablecell = (content) => content + ' ';
renderer.link = (href, title, text) => text;
renderer.image = () => '';
renderer.br = () => '\n';
renderer.hr = () => '\n';

marked.setOptions({ renderer });

async function convertMarkdownToAudio(inputFile, outputFile) {
  return new Promise((resolve, reject) => {
    console.log(`Processing: ${inputFile}`);
    
    // Read markdown file
    const markdown = fs.readFileSync(inputFile, 'utf8');
    
    // Convert markdown to plain text
    const plainText = marked.parse(markdown);
    
    // Clean up extra whitespace
    const cleanedText = plainText
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    console.log(`Text length: ${cleanedText.length} characters`);
    console.log(`Preview: ${cleanedText.substring(0, 100)}...`);
    
    // Create text-to-speech
    const tts = new gtts(cleanedText, 'en');
    
    // Save as MP3
    tts.save(outputFile, (err) => {
      if (err) {
        reject(err);
      } else {
        console.log(`✓ Generated: ${outputFile}\n`);
        resolve();
      }
    });
  });
}

async function main() {
  console.log('=== Markdown to Audio Converter ===\n');
  
  const inputDir = path.join(__dirname, 'input');
  const outputDir = path.join(__dirname, 'output');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Find all markdown files
  const markdownFiles = fs.readdirSync(inputDir)
    .filter(file => file.endsWith('.md'));
  
  if (markdownFiles.length === 0) {
    console.log('No markdown files found in input directory.');
    return;
  }
  
  console.log(`Found ${markdownFiles.length} markdown file(s)\n`);
  
  // Process each markdown file
  for (const file of markdownFiles) {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, file.replace('.md', '.mp3'));
    
    try {
      await convertMarkdownToAudio(inputPath, outputPath);
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
    }
  }
  
  console.log('=== Conversion Complete ===');
  console.log(`Output files saved to: ${outputDir}`);
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
