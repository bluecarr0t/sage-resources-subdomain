/**
 * DEPRECATED: This API route is deprecated in favor of Supabase queries.
 * The map now loads population data directly from the 'county-population' Supabase table.
 * This route is kept as a fallback option only.
 */

import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

// Mark route as dynamic since it may read files at runtime
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'csv', 'population', '2020-census-by-county.csv');
    
    // Check if file exists before trying to read
    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
      console.error('2020 census CSV file not found:', filePath);
      return NextResponse.json(
        { error: '2020 census data file not found. This route is deprecated.' },
        { status: 404 }
      );
    }
    
    const fileContent = readFileSync(filePath, 'utf-8');
    
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error reading 2020 census CSV:', error);
    return NextResponse.json(
      { error: 'Failed to load 2020 census data. This route is deprecated.' },
      { status: 500 }
    );
  }
}
