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
Description: 9 luxury yurts, Medina River access, cedar hot tubs, AC, kitchenette.

Return a JSON object with any of the following fields you can confidently fill. Use null for unknown. For Yes/No fields use exactly "Yes" or "No". For numeric rate fields use numbers (no $ sign).

AMENITIES (Yes/No):
- unit_shower, unit_water, unit_electricity, unit_picnic_table, unit_wifi, unit_pets,
  unit_private_bathroom, unit_full_kitchen, unit_kitchenette, unit_patio, unit_hot_tub_or_sauna,
  unit_hot_tub, unit_sauna, unit_cable, unit_campfires, unit_charcoal_grill,
  unit_mini_fridge, unit_bathtub, unit_wood_burning_stove, unit_air_conditioning, unit_bed, unit_picnic_table

PROPERTY (Yes/No):
- property_pool, property_hot_tub, property_food_on_site, property_restaurant,
  property_waterfront, property_family_friendly, property_playground, property_dog_park,
  property_laundry, property_fitness_room, property_general_store, property_alcohol_available,
  property_clubhouse, property_pickball_courts

ACTIVITIES (Yes/No):
- activities_hiking, activities_fishing, activities_swimming, activities_horseback_riding,
  activities_biking, activities_stargazing, activities_canoeing_kayaking, activities_wildlife_watching,
  activities_boating

SETTING (Yes/No):
- setting_ranch, setting_forest, setting_field, setting_lake, setting_farm,
  river_stream_or_creek, setting_mountainous

OTHER:
- operating_season_months (integer 1–12, 12 = year-round)
- minimum_nights (string, e.g. "2 nights")
- rate_category (string: "Budget", "Mid-Range", "Upscale", or "Luxury")
- rate_avg_retail_daily_rate (number, average nightly rate in USD)
- rate_winter_weekday, rate_winter_weekend (numbers, USD)
- rate_spring_weekday, rate_spring_weekend (numbers, USD)
- rate_summer_weekday, rate_summer_weekend (numbers, USD)
- rate_fall_weekday, rate_fall_weekend (numbers, USD)

Return ONLY valid JSON. No markdown, no extra text.` }],
    temperature: 0.3,
    response_format: { type: 'json_object' },
    max_tokens: 2000,
  });
  console.log('TOP-LEVEL KEYS:', Object.keys(JSON.parse(res.choices[0]!.message.content!)));
  console.log('\nFULL RESPONSE:');
  console.log(res.choices[0]?.message?.content);
}
main().catch(console.error);
