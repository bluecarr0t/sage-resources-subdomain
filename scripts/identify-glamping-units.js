const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const imagesDir = path.join(__dirname, '../public/images');

// Initialize OpenAI
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  console.log('✅ OpenAI API key found\n');
} else {
  console.error('❌ OPENAI_API_KEY not found in .env.local');
  console.error('\n📝 To identify glamping unit types, please add your OpenAI API key:');
  console.error('   1. Open .env.local file');
  console.error('   2. Add this line: OPENAI_API_KEY=sk-your-key-here');
  console.error('   3. Get your key from: https://platform.openai.com/api-keys\n');
  console.error('   Then run this script again.\n');
  process.exit(1);
}

/**
 * Generate a clean filename from glamping unit type
 */
function generateFilename(unitType) {
  return unitType
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length
}

/**
 * Analyze image to identify glamping unit type
 */
async function identifyGlampingUnit(imagePath) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'What type of glamping accommodation or outdoor structure is shown in this image? Identify the specific type (e.g., "yurt", "safari-tent", "treehouse", "airstream", "cabin", "geodesic-dome", "bell-tent", "canvas-tent", "hut", "cottage", "tiny-house", "tent", "cabin", "lodge", etc.). If it\'s not a glamping unit but a landscape/nature scene, describe it briefly (e.g., "mountain-view", "forest-scene", "lake-view"). Return ONLY the accommodation type or scene description in 1-3 words, nothing else. Use hyphens for multi-word names.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 30
    });

    const unitType = response.choices[0].message.content.trim();
    return unitType;
  } catch (error) {
    console.error(`Error analyzing image: ${error.message}`);
    return null;
  }
}

/**
 * Process a single image: identify unit type and rename
 */
async function processImage(filename) {
  const inputPath = path.join(imagesDir, filename);
  const ext = path.extname(filename).toLowerCase() || '.jpg';
  
  console.log(`\n📸 Analyzing: ${filename}`);
  
  try {
    // Identify glamping unit type
    console.log('  🔍 Identifying glamping unit type...');
    const unitType = await identifyGlampingUnit(inputPath);
    
    if (!unitType) {
      console.log(`  ⚠️  Could not identify unit type, skipping`);
      return null;
    }
    
    console.log(`  ✅ Identified as: ${unitType}`);
    
    // Generate new filename
    const baseName = generateFilename(unitType);
    let newFilename = `${baseName}${ext}`;
    
    // Ensure unique filename
    let finalFilename = newFilename;
    let counter = 1;
    while (fs.existsSync(path.join(imagesDir, finalFilename)) && finalFilename !== filename) {
      finalFilename = `${baseName}-${counter}${ext}`;
      counter++;
    }
    
    if (finalFilename === filename) {
      console.log(`  ℹ️  Name already correct: ${filename}`);
      return { original: filename, new: finalFilename, unitType };
    }
    
    console.log(`  📝 Renaming to: ${finalFilename}`);
    
    // Rename file
    const finalPath = path.join(imagesDir, finalFilename);
    fs.renameSync(inputPath, finalPath);
    
    console.log(`  ✅ Complete!`);
    
    return { original: filename, new: finalFilename, unitType };
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return null;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🏕️  Identifying glamping unit types in images...\n');
  
  // Get all image files
  const files = fs.readdirSync(imagesDir)
    .filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    })
    .filter(file => !file.startsWith('.'));
  
  if (files.length === 0) {
    console.log('No images found in the directory.');
    return;
  }
  
  console.log(`Found ${files.length} image(s) to analyze.\n`);
  
  const results = [];
  
  // Process images one by one (to avoid rate limits)
  for (const file of files) {
    const result = await processImage(file);
    if (result) {
      results.push(result);
    }
    
    // Small delay to avoid rate limits
    if (files.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary');
  console.log('='.repeat(60));
  
  console.log(`\nProcessed: ${results.length} image(s)\n`);
  
  console.log('📋 Renamed files:');
  results.forEach(r => {
    if (r.original !== r.new) {
      console.log(`  ${r.original}`);
      console.log(`    → ${r.new} (${r.unitType})`);
    } else {
      console.log(`  ${r.original} (${r.unitType}) - kept original name`);
    }
  });
  
  console.log('\n✅ All done!');
}

main().catch(console.error);
