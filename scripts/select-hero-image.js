const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const imagesDir = path.join(__dirname, '../public/images');

// Initialize OpenAI
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} else {
  console.error('❌ OPENAI_API_KEY not found in .env.local');
  process.exit(1);
}

/**
 * Analyze image for hero suitability
 */
async function analyzeImageForHero(imagePath, filename) {
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
              text: `Rate this image on a scale of 1-10 for use as a hero image on a homepage for an outdoor hospitality resources website. Consider:
1. Visual appeal and professionalism (1-10)
2. Suitability for hero/background use (1-10)
3. Represents outdoor hospitality/glamping well (1-10)
4. Has good composition for text overlay (1-10)
5. Overall hero image quality (1-10)

Return ONLY a JSON object with these 5 scores and a total score (sum of all 5), and a brief one-sentence reason. Format: {"visual": 8, "suitability": 7, "represents": 9, "composition": 8, "quality": 8, "total": 40, "reason": "brief reason"}`
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
      max_tokens: 200
    });

    const content = response.choices[0].message.content.trim();
    // Try to parse JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { total: 0, reason: 'Could not parse response' };
  } catch (error) {
    console.error(`Error analyzing ${filename}:`, error.message);
    return { total: 0, reason: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🎨 Analyzing images for hero image selection...\n');
  
  // Get all image files
  const files = fs.readdirSync(imagesDir)
    .filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg'].includes(ext);
    })
    .filter(file => !file.startsWith('.') && !file.includes('blur') && !file.includes('solid-color'));
  
  if (files.length === 0) {
    console.log('No suitable images found.');
    return;
  }
  
  console.log(`Found ${files.length} image(s) to analyze.\n`);
  
  const results = [];
  
  // Analyze each image
  for (const file of files) {
    const filePath = path.join(imagesDir, file);
    console.log(`📸 Analyzing: ${file}`);
    
    const analysis = await analyzeImageForHero(filePath, file);
    results.push({
      filename: file,
      ...analysis
    });
    
    console.log(`  Score: ${analysis.total}/50 - ${analysis.reason}\n`);
    
    // Small delay to avoid rate limits
    if (files.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Sort by total score
  results.sort((a, b) => b.total - a.total);
  
  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('🏆 Hero Image Rankings');
  console.log('='.repeat(60));
  console.log('\nTop 3 recommendations:\n');
  
  results.slice(0, 3).forEach((result, index) => {
    console.log(`${index + 1}. ${result.filename}`);
    console.log(`   Total Score: ${result.total}/50`);
    console.log(`   Visual: ${result.visual || 'N/A'}, Suitability: ${result.suitability || 'N/A'}, Represents: ${result.represents || 'N/A'}`);
    console.log(`   Reason: ${result.reason}\n`);
  });
  
  if (results.length > 0) {
    const best = results[0];
    console.log(`\n✅ Recommended Hero Image: ${best.filename}`);
    console.log(`   Path: /images/${best.filename}`);
  }
}

main().catch(console.error);
