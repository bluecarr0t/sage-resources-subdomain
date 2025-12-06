const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const imagesDir = path.join(__dirname, '../public/images');

// Initialize OpenAI if API key is available
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Generate a descriptive filename from image content
 */
function generateFilename(description) {
  return description
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 100); // Limit length
}

/**
 * Analyze image using OpenAI Vision API
 */
async function analyzeImage(imagePath) {
  if (!openai) {
    console.warn('⚠️  OpenAI API key not found. Using fallback naming based on metadata.');
    return null;
  }

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
              text: 'Describe this image in 3-5 words that would make a good filename. Focus on the main subject, setting, or theme. Return only the description, no other text. Examples: "mountain-lake-sunset", "cozy-cabin-interior", "forest-camping-tent"'
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
      max_tokens: 50
    });

    const description = response.choices[0].message.content.trim();
    return description;
  } catch (error) {
    console.error(`Error analyzing image: ${error.message}`);
    return null;
  }
}

/**
 * Analyze image using Python script for visual features
 */
async function analyzeImageWithPython(imagePath) {
  const { execSync } = require('child_process');
  const pythonScript = path.join(__dirname, 'analyze-image-content.py');
  
  try {
    const result = execSync(`python3 "${pythonScript}" "${imagePath}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    return result || null;
  } catch (error) {
    // Python script failed, return null to use other fallback
    return null;
  }
}

/**
 * Get fallback filename based on image metadata or original name
 */
async function getFallbackFilename(originalPath, metadata) {
  const originalName = path.basename(originalPath, path.extname(originalPath));
  
  // Try Python-based visual analysis first
  const visualAnalysis = await analyzeImageWithPython(originalPath);
  if (visualAnalysis) {
    return visualAnalysis;
  }
  
  // Try to extract meaningful parts from Unsplash-style names
  // e.g., "alex-batonisashvili-GlU-bGYgLlg-unsplash" -> "alex-batonisashvili"
  const unsplashMatch = originalName.match(/^([^-]+(?:-[^-]+)*?)(?:-unsplash)?$/);
  if (unsplashMatch && !originalName.startsWith('gradient')) {
    return unsplashMatch[1];
  }
  
  // For gradient images, keep the name
  if (originalName.startsWith('gradient')) {
    return originalName;
  }
  
  // Otherwise, use a generic name based on dimensions
  const aspectRatio = metadata.width / metadata.height;
  let category = 'image';
  if (aspectRatio > 1.5) category = 'landscape';
  else if (aspectRatio < 0.7) category = 'portrait';
  else category = 'square';
  
  return `${category}-${metadata.width}x${metadata.height}`;
}

/**
 * Optimize an image
 */
async function optimizeImage(inputPath, outputPath) {
  const originalStats = fs.statSync(inputPath);
  const originalSize = originalStats.size;
  
  try {
    const metadata = await sharp(inputPath).metadata();
    
    let pipeline = sharp(inputPath);
    
    // Resize if width > 1920px
    if (metadata.width > 1920) {
      pipeline = pipeline.resize(1920, null, {
        withoutEnlargement: true,
        fit: 'inside'
      });
    }
    
    // Determine output format based on input
    const ext = path.extname(inputPath).toLowerCase();
    const isJpeg = ['.jpg', '.jpeg'].includes(ext);
    
    if (isJpeg) {
      await pipeline
        .jpeg({ 
          quality: 85,
          progressive: true,
          mozjpeg: true
        })
        .toFile(outputPath);
    } else {
      // For other formats, convert to optimized JPEG
      await pipeline
        .jpeg({ 
          quality: 85,
          progressive: true,
          mozjpeg: true
        })
        .toFile(outputPath);
    }
    
    const newStats = fs.statSync(outputPath);
    const newSize = newStats.size;
    const savings = ((originalSize - newSize) / originalSize * 100).toFixed(1);
    
    return { originalSize, newSize, savings, metadata };
  } catch (error) {
    throw new Error(`Optimization failed: ${error.message}`);
  }
}

/**
 * Process a single image: analyze, optimize, and rename
 */
async function processImage(filename) {
  const inputPath = path.join(imagesDir, filename);
  const ext = path.extname(filename).toLowerCase() || '.jpg';
  
  console.log(`\n📸 Processing: ${filename}`);
  
  try {
    // Step 1: Analyze image
    console.log('  🔍 Analyzing image...');
    let description = await analyzeImage(inputPath);
    
    // Step 2: Get metadata for fallback
    const metadata = await sharp(inputPath).metadata();
    
    // Step 3: Generate new filename
    let newFilename;
    if (description) {
      const baseName = generateFilename(description);
      newFilename = `${baseName}${ext}`;
    } else {
      const baseName = await getFallbackFilename(inputPath, metadata);
      newFilename = `${baseName}${ext}`;
    }
    
    // Ensure unique filename
    let finalFilename = newFilename;
    let counter = 1;
    while (fs.existsSync(path.join(imagesDir, finalFilename)) && finalFilename !== filename) {
      const nameWithoutExt = path.basename(newFilename, ext);
      finalFilename = `${nameWithoutExt}-${counter}${ext}`;
      counter++;
    }
    
    console.log(`  📝 New filename: ${finalFilename}`);
    
    // Step 4: Optimize image to temporary file
    console.log('  ⚡ Optimizing image...');
    const tempPath = path.join(imagesDir, `.temp-${Date.now()}${ext}`);
    const { originalSize, newSize, savings } = await optimizeImage(inputPath, tempPath);
    
    console.log(`  💾 Size: ${(originalSize / 1024).toFixed(1)}KB → ${(newSize / 1024).toFixed(1)}KB (${savings}% reduction)`);
    
    // Step 5: Rename original to backup (if different name)
    if (finalFilename !== filename) {
      const backupPath = path.join(imagesDir, `.backup-${filename}`);
      fs.renameSync(inputPath, backupPath);
    }
    
    // Step 6: Move optimized file to final location
    const finalPath = path.join(imagesDir, finalFilename);
    fs.renameSync(tempPath, finalPath);
    
    // Step 7: Remove backup if rename was successful
    if (finalFilename !== filename) {
      const backupPath = path.join(imagesDir, `.backup-${filename}`);
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
    }
    
    console.log(`  ✅ Complete: ${finalFilename}`);
    
    return {
      original: filename,
      new: finalFilename,
      originalSize,
      newSize,
      savings: parseFloat(savings),
      description: description || 'fallback'
    };
  } catch (error) {
    console.error(`  ❌ Error processing ${filename}:`, error.message);
    return null;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting image analysis, optimization, and renaming...\n');
  
  // Get all image files
  const files = fs.readdirSync(imagesDir)
    .filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
    })
    .filter(file => !file.startsWith('.'));
  
  if (files.length === 0) {
    console.log('No images found in the directory.');
    return;
  }
  
  console.log(`Found ${files.length} image(s) to process.\n`);
  
  if (!openai) {
    console.log('ℹ️  Note: OpenAI API key not found. Using fallback naming strategy.\n');
    console.log('   To enable AI-powered image analysis, add OPENAI_API_KEY to .env.local\n');
  }
  
  const results = [];
  
  // Process images one by one (to avoid rate limits)
  for (const file of files) {
    const result = await processImage(file);
    if (result) {
      results.push(result);
    }
    
    // Small delay to avoid rate limits
    if (openai && files.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary');
  console.log('='.repeat(60));
  
  const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
  const totalNew = results.reduce((sum, r) => sum + r.newSize, 0);
  const totalSavings = ((totalOriginal - totalNew) / totalOriginal * 100).toFixed(1);
  
  console.log(`\nProcessed: ${results.length} image(s)`);
  console.log(`Total size: ${(totalOriginal / 1024 / 1024).toFixed(2)}MB → ${(totalNew / 1024 / 1024).toFixed(2)}MB`);
  console.log(`Total savings: ${totalSavings}%`);
  
  console.log('\n📋 Renamed files:');
  results.forEach(r => {
    if (r.original !== r.new) {
      console.log(`  ${r.original} → ${r.new}`);
    } else {
      console.log(`  ${r.original} (kept original name)`);
    }
  });
  
  console.log('\n✅ All done!');
}

main().catch(console.error);
