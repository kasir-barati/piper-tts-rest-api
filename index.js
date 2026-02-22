const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const { execSync } = require('child_process');

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
  
  try {
    // Write text to temp file
    const tempTextFile = outputFile.replace('.wav', '_temp.txt');
    fs.writeFileSync(tempTextFile, cleanedText);
    
    // Use espeak-ng to generate audio
    // -v en-us: US English voice
    // -s 150: Speaking speed (words per minute)
    // -w: Write to WAV file
    const command = `espeak-ng -v en-us -s 150 -w "${outputFile}" -f "${tempTextFile}"`;
    
    execSync(command, { stdio: 'pipe' });
    
    // Clean up temp file
    if (fs.existsSync(tempTextFile)) {
      fs.unlinkSync(tempTextFile);
    }
    
    console.log(`✓ Generated: ${outputFile}\n`);
  } catch (error) {
    throw new Error(`Failed to generate audio: ${error.message}`);
  }
}

async function main() {
  console.log('=== Markdown to Audio Converter (espeak-ng) ===\n');
  
  const inputDir = path.join(__dirname, 'input');
  const outputDir = path.join(__dirname, 'output');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Check if espeak-ng is available
  console.log('Checking espeak-ng installation...');
  try {
    execSync('which espeak-ng', { stdio: 'pipe' });
    console.log('✓ espeak-ng is installed\n');
  } catch (error) {
    console.error('✗ espeak-ng is not installed');
    console.error('Please install espeak-ng: apk add espeak-ng (Alpine) or apt install espeak-ng (Debian/Ubuntu)');
    process.exit(1);
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
    const outputPath = path.join(outputDir, file.replace('.md', '.wav'));
    
    try {
      await convertMarkdownToAudio(inputPath, outputPath);
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
    }
  }
  
  console.log('=== Conversion Complete ===');
  console.log(`Output files saved to: ${outputDir}`);
  console.log('Note: Audio files are in WAV format');
  console.log('\nℹ️  Using espeak-ng (lightweight, offline TTS)');
  console.log('   For higher quality voices, consider using Piper TTS or cloud services.');
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
