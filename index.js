const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const { execFileSync, spawnSync } = require('child_process');

const DEFAULT_INPUT_DIR = path.join(__dirname, 'input');
const DEFAULT_OUTPUT_DIR = path.join(__dirname, 'output');
const PIPER_MODEL_PATH = process.env.PIPER_MODEL || '/app/models/en_US-lessac-medium.onnx';

function configureMarkdownRenderer() {
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
}

function ensureDirectoryExists(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}

function getMarkdownFiles(inputDir) {
  if (!fs.existsSync(inputDir)) {
    throw new Error(`Input directory not found: ${inputDir}`);
  }

  return fs.readdirSync(inputDir).filter((file) => file.endsWith('.md'));
}

function markdownToPlainText(markdownContent) {
  const plainText = marked.parse(markdownContent);
  return plainText.replace(/\n{3,}/g, '\n\n').trim();
}

function runPiperTTS(text, outputFile, modelPath) {
  const piperArgs = ['--model', modelPath, '--output_file', outputFile];
  const result = spawnSync('piper', piperArgs, {
    input: text,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    throw new Error(stderr || 'Piper exited with a non-zero status code.');
  }
}

async function convertMarkdownToAudio(inputFile, outputFile, modelPath) {
  console.log(`Processing: ${inputFile}`);
  
  const markdown = fs.readFileSync(inputFile, 'utf8');
  const cleanedText = markdownToPlainText(markdown);
  
  console.log(`Text length: ${cleanedText.length} characters`);
  console.log(`Preview: ${cleanedText.substring(0, 100)}...`);
  
  try {
    runPiperTTS(cleanedText, outputFile, modelPath);
    
    console.log(`✓ Generated: ${outputFile}\n`);
  } catch (error) {
    throw new Error(`Failed to generate audio: ${error.message}`);
  }
}

function verifyPiperInstallation(modelPath) {
  console.log('Checking Piper installation...');

  try {
    execFileSync('piper', ['--help'], { stdio: 'pipe' });
  } catch (error) {
    console.error('✗ Piper is not installed or not available in PATH');
    process.exit(1);
  }

  if (!fs.existsSync(modelPath)) {
    console.error(`✗ Piper model not found: ${modelPath}`);
    process.exit(1);
  }

  console.log('✓ Piper is installed');
  console.log(`✓ Using model: ${modelPath}\n`);
}

async function main() {
  configureMarkdownRenderer();

  console.log('=== Markdown to Audio Converter (Piper TTS) ===\n');
  
  const inputDir = DEFAULT_INPUT_DIR;
  const outputDir = DEFAULT_OUTPUT_DIR;
  const modelPath = PIPER_MODEL_PATH;
  
  ensureDirectoryExists(outputDir);
  
  verifyPiperInstallation(modelPath);
  
  const markdownFiles = getMarkdownFiles(inputDir);
  
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
      await convertMarkdownToAudio(inputPath, outputPath, modelPath);
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
    }
  }
  
  console.log('=== Conversion Complete ===');
  console.log(`Output files saved to: ${outputDir}`);
  console.log('Note: Audio files are in WAV format');
  console.log('\nℹ️  Using Piper TTS (offline neural voice synthesis)');
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
