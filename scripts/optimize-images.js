const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, '../public/images');
const images = ['gradient-1.jpg', 'gradient-2.jpg', 'gradient-3.jpg', 'gradient-4.jpg'];

async function optimizeImage(filename) {
  const inputPath = path.join(imagesDir, filename);
  const tempPath = path.join(imagesDir, filename.replace('.jpg', '.tmp.jpg'));
  
  // Get original file size
  const originalStats = fs.statSync(inputPath);
  const originalSize = originalStats.size;
  
  try {
    // Get image metadata
    const metadata = await sharp(inputPath).metadata();
    
    // Optimize: resize if too large, compress with quality 85
    let pipeline = sharp(inputPath);
    
    // Resize if width > 1920px (common max width for hero images)
    if (metadata.width > 1920) {
      pipeline = pipeline.resize(1920, null, {
        withoutEnlargement: true,
        fit: 'inside'
      });
    }
    
    // Compress with quality 85 (good balance between quality and size)
    await pipeline
      .jpeg({ 
        quality: 85,
        progressive: true,
        mozjpeg: true
      })
      .toFile(tempPath);
    
    // Replace original with optimized version
    fs.renameSync(tempPath, inputPath);
    
    // Get new file size
    const newStats = fs.statSync(inputPath);
    const newSize = newStats.size;
    const savings = ((originalSize - newSize) / originalSize * 100).toFixed(1);
    
    console.log(`✓ ${filename}: ${(originalSize / 1024).toFixed(1)}KB → ${(newSize / 1024).toFixed(1)}KB (${savings}% reduction)`);
    
    return { filename, originalSize, newSize, savings };
  } catch (error) {
    // Clean up temp file if it exists
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    console.error(`✗ Error optimizing ${filename}:`, error.message);
    return null;
  }
}

async function optimizeAll() {
  console.log('Optimizing images...\n');
  
  const results = [];
  for (const image of images) {
    const result = await optimizeImage(image);
    if (result) {
      results.push(result);
    }
  }
  
  console.log('\n--- Summary ---');
  const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
  const totalNew = results.reduce((sum, r) => sum + r.newSize, 0);
  const totalSavings = ((totalOriginal - totalNew) / totalOriginal * 100).toFixed(1);
  
  console.log(`Total: ${(totalOriginal / 1024 / 1024).toFixed(2)}MB → ${(totalNew / 1024 / 1024).toFixed(2)}MB (${totalSavings}% reduction)`);
}

optimizeAll().catch(console.error);

