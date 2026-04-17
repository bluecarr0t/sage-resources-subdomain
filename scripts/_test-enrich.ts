#!/usr/bin/env npx tsx
import { config } from 'dotenv';
import { resolve } from 'path';
import { OpenAI } from 'openai';
config({ path: resolve(process.cwd(), '.env.local') });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

async function main() {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: `You are a glamping research assistant. Research this property:
Property: River Yurt Village
Location: Bandera, TX, USA
URL: https://riveryurtvillage.com/
Unit type: Yurt
Description: 9 luxury yurts, Medina River access, cedar hot tubs.

Return a JSON object with these fields. For Yes/No fields use exactly "Yes" or "No". For numeric fields use numbers.
unit_wifi, unit_hot_tub, unit_air_conditioning, unit_pets, property_waterfront, river_stream_or_creek, activities_swimming, setting_ranch, rate_avg_retail_daily_rate, minimum_nights, operating_season_months, rate_category

Return ONLY valid JSON.` }],
    temperature: 0.3,
    response_format: { type: 'json_object' },
    max_tokens: 500,
  });
  console.log('RAW:', res.choices[0]?.message?.content);
}
main().catch(console.error);
