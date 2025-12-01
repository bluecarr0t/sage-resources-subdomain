const sharp = require('sharp');
const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../public/favicon.png');
const outputPath = path.join(__dirname, '../public/favicon.ico');

async function optimizeFavicon() {
  try {
    // Get original file size
    const originalStats = fs.statSync(inputPath);
    const originalSize = originalStats.size;
    
    console.log(`Original favicon.png: ${(originalSize / 1024).toFixed(2)}KB`);
    
    // First, optimize the PNG itself
    const optimizedPngPath = inputPath.replace('.png', '.optimized.png');
    
    await sharp(inputPath)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      })
      .png({
        quality: 90,
        compressionLevel: 9,
        palette: true
      })
      .toFile(optimizedPngPath);
    
    const optimizedStats = fs.statSync(optimizedPngPath);
    const optimizedSize = optimizedStats.size;
    const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
    
    console.log(`Optimized PNG: ${(optimizedSize / 1024).toFixed(2)}KB (${savings}% reduction)`);
    
    // Create multiple sizes for ICO file (common favicon sizes)
    const sizes = [16, 32, 48];
    const buffers = [];
    
    console.log('\nCreating ICO file with multiple sizes...');
    
    for (const size of sizes) {
      const buffer = await sharp(inputPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 1 }
        })
        .png()
        .toBuffer();
      
      buffers.push(buffer);
      console.log(`  ✓ Created ${size}x${size} version`);
    }
    
    // Create ICO file from buffers
    const icoBuffer = await toIco(buffers);
    fs.writeFileSync(outputPath, icoBuffer);
    
    const icoStats = fs.statSync(outputPath);
    const icoSize = icoStats.size;
    
    // Replace original PNG with optimized version
    fs.renameSync(optimizedPngPath, inputPath);
    
    console.log('\n✓ Favicon optimization complete!');
    console.log(`  Original PNG: ${(originalSize / 1024).toFixed(2)}KB`);
    console.log(`  Optimized PNG: ${(optimizedSize / 1024).toFixed(2)}KB (${savings}% reduction)`);
    console.log(`  ICO file: ${(icoSize / 1024).toFixed(2)}KB`);
    console.log(`  Total savings: ${(((originalSize - optimizedSize) / originalSize) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('Error optimizing favicon:', error);
    process.exit(1);
  }
}

optimizeFavicon();

