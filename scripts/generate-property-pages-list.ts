/**
 * Script to generate a documentation file listing example property pages
 * Run with: npx tsx scripts/generate-property-pages-list.ts
 */

import { createServerClient } from '@/lib/supabase';
import { slugifyPropertyName } from '@/lib/properties';

async function generatePropertyPagesList() {
  try {
    const supabase = createServerClient();
    
    // Fetch a sample of properties with various data
    const { data: properties, error } = await supabase
      .from('sage-glamping-data')
      .select('property_name, city, state, country, property_type, google_rating, google_user_rating_total')
      .not('property_name', 'is', null)
      .limit(100);

    if (error) {
      console.error('Error fetching properties:', error);
      process.exit(1);
    }

    if (!properties || properties.length === 0) {
      console.error('No properties found');
      process.exit(1);
    }

    // Get unique property names
    const uniqueNames = new Set<string>();
    const propertyMap = new Map<string, any>();
    
    properties.forEach((prop) => {
      const name = prop.property_name?.trim();
      if (name && !uniqueNames.has(name)) {
        uniqueNames.add(name);
        propertyMap.set(name, prop);
      }
    });

    // Select 10 diverse properties (try to get variety in locations)
    const selectedNames = Array.from(uniqueNames).slice(0, 10);
    const selectedProperties = selectedNames.map(name => propertyMap.get(name));

    // Generate documentation content
    const baseUrl = "https://resources.sageoutdooradvisory.com";
    const docContent = `# Individual Property Pages - Example Listings

This document provides examples of individual property pages dynamically generated from the \`sage-glamping-data\` table.

## Overview

- **Total Property Pages:** All unique property names from the database
- **Route Pattern:** \`/property/[slug]\` where slug is generated from property name
- **Dynamic Generation:** Pages are generated at build time via \`generateStaticParams()\`
- **Example Count:** This document lists **10 example property pages**

---

## Example Property Pages

${selectedProperties.map((prop, index) => {
  const propertyName = prop.property_name || 'Unnamed Property';
  const slug = slugifyPropertyName(propertyName);
  const locationParts = [];
  if (prop.city) locationParts.push(prop.city);
  if (prop.state) locationParts.push(prop.state);
  if (prop.country) locationParts.push(prop.country);
  const location = locationParts.join(", ") || "Location not specified";
  
  return `### ${index + 1}. ${propertyName}

- **Property Name:** ${propertyName}
- **Slug:** \`${slug}\`
- **URL:** \`${baseUrl}/property/${slug}\`
- **Location:** ${location}
${prop.property_type ? `- **Property Type:** ${prop.property_type}` : ''}
${prop.google_rating ? `- **Google Rating:** ${prop.google_rating.toFixed(1)}${prop.google_user_rating_total ? ` (${prop.google_user_rating_total} ${prop.google_user_rating_total === 1 ? 'review' : 'reviews'})` : ''}` : ''}
- **Full URL:** https://resources.sageoutdooradvisory.com/property/${slug}

#### Page Features:
- Property name and location details
- Google photos carousel (if available)
- All locations/units for this property name
- Property details (type, operating season, year opened, etc.)
- Amenities grid
- Google ratings and reviews
- Links to website and map
- Breadcrumb navigation: Home / Map / [Property Name]
- SEO optimized with structured data (LocalBusiness schema)

---
`;
}).join('\n')}

## How Property Pages Are Generated

### 1. Unique Property Names
The system fetches all unique property names from the \`sage-glamping-data\` table:
- Property names are trimmed and deduplicated
- Null or empty property names are excluded

### 2. Slug Generation
Each property name is converted to a URL-safe slug:
- Lowercase conversion
- Special characters removed
- Spaces replaced with hyphens
- Multiple hyphens collapsed to single hyphen

### 3. Route Generation
Each unique property name generates:
- A route at \`/property/[slug]\`
- A page with all locations/units for that property name
- Static generation at build time for optimal performance

### 4. Content Display
Each property page shows:
- **Header Section:** Property name, location, rating
- **Photos:** Google Places photos with carousel navigation
- **Locations/Units:** All properties with the same name (grouped by location)
- **Details:** Property type, operating season, capacity, rates
- **Amenities:** Visual grid of available amenities
- **Contact:** Website link, phone number, map link

## SEO Features

Each property page includes:
- **Meta Tags:** Title, description, keywords
- **OpenGraph Tags:** For social media sharing
- **Structured Data:**
  - BreadcrumbList schema (Home / Map / Property Name)
  - LocalBusiness schema (address, coordinates, rating, photos)
- **Canonical URL:** Prevents duplicate content issues
- **Mobile Optimized:** Responsive design

## Accessing Property Pages

### From Map Page
- Click any property marker on the map
- Property pages will be linked in the future from map markers

### Direct URLs
- Format: \`https://resources.sageoutdooradvisory.com/property/[slug]\`
- Example: \`https://resources.sageoutdooradvisory.com/property/example-glamping-resort\`

### Sitemap
- All property pages are automatically included in \`/sitemap.xml\`
- Priority: 0.8
- Change frequency: Monthly

---

## Total Property Pages

To see the total count of property pages, check:
- The sitemap.xml file (generated at build time)
- Run: \`npx tsx scripts/get-property-count.ts\` (if script exists)

---

**Last Updated:** ${new Date().toISOString().split('T')[0]}
**Generated by:** \`scripts/generate-property-pages-list.ts\`
`;

    // Write to file
    const fs = await import('fs/promises');
    await fs.writeFile('docs/PROPERTY_PAGES_EXAMPLES.md', docContent, 'utf-8');
    
    console.log('✅ Documentation file generated: docs/PROPERTY_PAGES_EXAMPLES.md');
    console.log(`📄 Listed ${selectedProperties.length} example property pages`);
    
  } catch (error) {
    console.error('Error generating property pages list:', error);
    process.exit(1);
  }
}

generatePropertyPagesList();