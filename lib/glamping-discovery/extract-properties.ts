/**
 * Extract glamping properties from article text using OpenAI
 * Adapted from process-afar-article-text.ts for generic article content
 */

import { OpenAI } from 'openai';

export interface ExtractedProperty {
  property_name: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  url?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lon?: number;
  unit_type?: string;
  property_type?: string;
  phone_number?: string;
  site_name?: string;
  year_opened?: number;
  number_of_units?: number;
  amenities?: string[];
  [key: string]: unknown;
}

const EXTRACTION_PROMPT = `Extract all glamping resort/campground/property information from the following article.

Focus ONLY on properties located in North America (United States and Canada). Ignore properties in other countries.

Only include properties with at least 4 glamping units (standalone accommodations with beds and linens). Exclude: RV parks, tent campgrounds (basic tent sites), hotels, motels, and inns. We target glamping-first operations, not traditional campgrounds with a few cabins.

Return a JSON object with a "properties" array containing one object for each qualifying North American glamping property mentioned in the article. Each property object should have:
- property_name (required): The exact name of the property/resort as mentioned in the article
- city (optional): City where it's located
- state (optional): State/province abbreviation (2 letters for US, full for Canadian provinces)
- country (optional): "USA" or "Canada"
- address (optional): Full street address if mentioned
- url (optional): Website URL if mentioned
- description (optional): Brief description of the property from the article
- unit_type (optional): Types of accommodations (e.g., "tents", "yurts", "cabins", "pavilions")
- property_type (optional): Type of property (e.g., "Glamping Resort", "Luxury Campground")
- year_opened (optional): Year the property opened if mentioned
- number_of_units (optional): Number of accommodations if mentioned

Be VERY thorough - extract ALL North American properties mentioned.

Return ONLY valid JSON in this format:
{
  "properties": [
    {
      "property_name": "Example Glamping Resort",
      "city": "City Name",
      "state": "ST",
      "country": "USA",
      "url": "https://example.com",
      "description": "Brief description from article...",
      "unit_type": "tents",
      "property_type": "Glamping Resort",
      "year_opened": 2020,
      "number_of_units": 10
    }
  ]
}

Article text:
`;

export async function extractPropertiesFromArticle(
  articleText: string,
  openai: OpenAI
): Promise<ExtractedProperty[]> {
  const prompt = EXTRACTION_PROMPT + articleText.substring(0, 50000);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    response_format: { type: 'json_object' },
    max_tokens: 4000,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  const parsed = JSON.parse(content);
  let properties: ExtractedProperty[] = [];

  if (parsed.properties && Array.isArray(parsed.properties)) {
    properties = parsed.properties;
  } else if (Array.isArray(parsed)) {
    properties = parsed;
  }

  return properties
    .filter((p: ExtractedProperty) => p && p.property_name && String(p.property_name).trim().length > 0)
    .map((p: ExtractedProperty) => ({
      ...p,
      property_name: String(p.property_name).trim(),
      city: p.city?.trim() || undefined,
      state: p.state?.trim()?.toUpperCase() || undefined,
      country: p.country?.trim() || (p.state ? 'USA' : undefined),
    }));
}
