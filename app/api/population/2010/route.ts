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
    // Note: File has typo in name: "censes" instead of "census"
    const filePath = join(process.cwd(), 'csv', 'population', '2010-censes-by-county.csv');
    
    // Check if file exists before trying to read
    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
      console.error('2010 census CSV file not found:', filePath);
      return NextResponse.json(
        { error: '2010 census data file not found. This route is deprecated.' },
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
    console.error('Error reading 2010 census CSV:', error);
    return NextResponse.json(
      { error: 'Failed to load 2010 census data. This route is deprecated.' },
      { status: 500 }
    );
  }
}
