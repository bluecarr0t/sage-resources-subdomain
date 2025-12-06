const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const imagesDir = path.join(__dirname, '../public/images');
const pythonScript = path.join(__dirname, 'analyze-image-content.py');

/**
 * Analyze image using Python script
 */
function analyzeImage(imagePath) {
  try {
    const result = execSync(`python3 "${pythonScript}" "${imagePath}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    return result || null;
  } catch (error) {
    return null;
  }
}

/**
 * Rename images based on visual analysis
 */
async function renameImages() {
  console.log('🔍 Analyzing and renaming images based on visual content...\n');
  
  const files = fs.readdirSync(imagesDir)
    .filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    })
    .filter(file => !file.startsWith('.'));
  
  if (files.length === 0) {
    console.log('No images found.');
    return;
  }
  
  console.log(`Found ${files.length} image(s) to analyze.\n`);
  
  const results = [];
  
  for (const file of files) {
    const filePath = path.join(imagesDir, file);
    const ext = path.extname(file);
    
    console.log(`📸 Analyzing: ${file}`);
    
    const analysis = analyzeImage(filePath);
    
    if (analysis) {
      // Ensure unique filename
      let newFilename = `${analysis}${ext}`;
      let counter = 1;
      let finalPath = path.join(imagesDir, newFilename);
      
      while (fs.existsSync(finalPath) && finalPath !== filePath) {
        newFilename = `${analysis}-${counter}${ext}`;
        finalPath = path.join(imagesDir, newFilename);
        counter++;
      }
      
      if (newFilename !== file) {
        fs.renameSync(filePath, finalPath);
        console.log(`  ✅ Renamed to: ${newFilename}\n`);
        results.push({ original: file, new: newFilename });
      } else {
        console.log(`  ℹ️  Name already appropriate: ${file}\n`);
      }
    } else {
      console.log(`  ⚠️  Could not analyze, keeping: ${file}\n`);
    }
  }
  
  // Summary
  if (results.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('📋 Renamed Files:');
    console.log('='.repeat(60));
    results.forEach(r => {
      console.log(`  ${r.original} → ${r.new}`);
    });
  }
  
  console.log('\n✅ Done!');
}

renameImages().catch(console.error);
