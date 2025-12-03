import * as fs from 'fs';
import * as path from 'path';

interface CSVRow {
  'Property Name': string;
  'Avg. Rate (Next 12 Months)': string;
}

/**
 * Parse CSV file and analyze rate categories
 */
function analyzeRateCategories() {
  const csvPath = path.join(__dirname, '../csv/sites-Sage-United States,Canada-.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');
  
  // Parse header
  const header = lines[0].split(',');
  const propertyNameIndex = header.indexOf('Property Name');
  const avgRateIndex = header.indexOf('Avg. Rate (Next 12 Months)');
  
  if (propertyNameIndex === -1 || avgRateIndex === -1) {
    console.error('Could not find required columns in CSV');
    console.log('Available columns:', header);
    return;
  }
  
  // Group by property name and collect rates
  const propertyRates = new Map<string, number[]>();
  
  // Process each row (skip header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line (handling quoted values)
    const values: string[] = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue); // Add last value
    
    const propertyName = values[propertyNameIndex]?.trim();
    const avgRateStr = values[avgRateIndex]?.trim();
    
    if (!propertyName) continue;
    
    // Parse rate
    const avgRate = parseFloat(avgRateStr);
    if (!isNaN(avgRate) && isFinite(avgRate) && avgRate > 0) {
      if (!propertyRates.has(propertyName)) {
        propertyRates.set(propertyName, []);
      }
      propertyRates.get(propertyName)!.push(avgRate);
    }
  }
  
  // Calculate average rate per property
  const propertyAverages = new Map<string, number>();
  propertyRates.forEach((rates, propertyName) => {
    const average = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    propertyAverages.set(propertyName, average);
  });
  
  // Categorize properties
  const categories = {
    '≤$149': 0,
    '$150-$249': 0,
    '$250-$399': 0,
    '$400-$549': 0,
    '$550+': 0,
  };
  
  const categoryDetails: Record<string, string[]> = {
    '≤$149': [],
    '$150-$249': [],
    '$250-$399': [],
    '$400-$549': [],
    '$550+': [],
  };
  
  propertyAverages.forEach((avgRate, propertyName) => {
    if (avgRate <= 149) {
      categories['≤$149']++;
      categoryDetails['≤$149'].push(`${propertyName} ($${avgRate.toFixed(2)})`);
    } else if (avgRate >= 150 && avgRate <= 249) {
      categories['$150-$249']++;
      categoryDetails['$150-$249'].push(`${propertyName} ($${avgRate.toFixed(2)})`);
    } else if (avgRate >= 250 && avgRate <= 399) {
      categories['$250-$399']++;
      categoryDetails['$250-$399'].push(`${propertyName} ($${avgRate.toFixed(2)})`);
    } else if (avgRate >= 400 && avgRate <= 549) {
      categories['$400-$549']++;
      categoryDetails['$400-$549'].push(`${propertyName} ($${avgRate.toFixed(2)})`);
    } else if (avgRate >= 550) {
      categories['$550+']++;
      categoryDetails['$550+'].push(`${propertyName} ($${avgRate.toFixed(2)})`);
    }
  });
  
  // Print results
  console.log('\n📊 Rate Category Analysis\n');
  console.log('='.repeat(60));
  console.log(`Total Properties Analyzed: ${propertyAverages.size}`);
  console.log('='.repeat(60));
  console.log('\nProperty Count by Rate Category:\n');
  
  Object.entries(categories).forEach(([category, count]) => {
    const percentage = ((count / propertyAverages.size) * 100).toFixed(1);
    console.log(`${category.padEnd(15)}: ${count.toString().padStart(4)} properties (${percentage}%)`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('\nDetailed Breakdown:\n');
  
  Object.entries(categoryDetails).forEach(([category, properties]) => {
    console.log(`\n${category} (${properties.length} properties):`);
    properties.slice(0, 10).forEach(prop => console.log(`  - ${prop}`));
    if (properties.length > 10) {
      console.log(`  ... and ${properties.length - 10} more`);
    }
  });
  
  // Summary statistics
  const allRates = Array.from(propertyAverages.values());
  const minRate = Math.min(...allRates);
  const maxRate = Math.max(...allRates);
  const overallAvg = allRates.reduce((sum, rate) => sum + rate, 0) / allRates.length;
  const median = allRates.sort((a, b) => a - b)[Math.floor(allRates.length / 2)];
  
  console.log('\n' + '='.repeat(60));
  console.log('\nSummary Statistics:\n');
  console.log(`Minimum Rate: $${minRate.toFixed(2)}`);
  console.log(`Maximum Rate: $${maxRate.toFixed(2)}`);
  console.log(`Average Rate: $${overallAvg.toFixed(2)}`);
  console.log(`Median Rate: $${median.toFixed(2)}`);
  console.log('\n' + '='.repeat(60));
}

// Run the analysis
analyzeRateCategories();

