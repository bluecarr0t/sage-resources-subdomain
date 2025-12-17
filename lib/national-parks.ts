/**
 * Utility functions for National Parks data management
 */
import { createServerClient } from '@/lib/supabase';
import { NationalPark } from '@/lib/types/national-parks';
import { slugifyPropertyName } from '@/lib/properties';

/**
 * Get all unique national park slugs for generateStaticParams
 */
export async function getAllNationalParkSlugs(): Promise<Array<{ slug: string }>> {
  try {
    const supabase = createServerClient();
    
    const { data: parks, error } = await supabase
      .from('national-parks')
      .select('slug, name')
      .not('slug', 'is', null)
      .not('name', 'is', null)
      .limit(1000);

    if (error) {
      console.error('Error fetching national park slugs:', error);
      return [];
    }

    // Return unique slugs (in case of duplicates)
    const uniqueSlugs = Array.from(new Set(
      (parks || [])
        .map((park: { slug?: string | null; name?: string | null }) => park.slug?.trim())
        .filter((slug): slug is string => slug !== undefined && slug !== '')
    ));

    return uniqueSlugs.sort().map((slug) => ({ slug }));
  } catch (error) {
    console.error('Error in getAllNationalParkSlugs:', error);
    return [];
  }
}

/**
 * Get national park by slug
 */
export async function getNationalParkBySlug(slug: string): Promise<NationalPark | null> {
  try {
    const supabase = createServerClient();
    
    const { data: parks, error } = await supabase
      .from('national-parks')
      .select('*')
      .eq('slug', slug.trim())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No matching park found
        return null;
      }
      console.error('Error fetching national park by slug:', error);
      return null;
    }

    return parks as NationalPark | null;
  } catch (error) {
    console.error('Error in getNationalParkBySlug:', error);
    return null;
  }
}

/**
 * Get national parks by name (fallback if slug doesn't exist)
 */
export async function getNationalParkByName(name: string): Promise<NationalPark | null> {
  try {
    const supabase = createServerClient();
    
    const { data: parks, error } = await supabase
      .from('national-parks')
      .select('*')
      .eq('name', name.trim())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching national park by name:', error);
      return null;
    }

    return parks as NationalPark | null;
  } catch (error) {
    console.error('Error in getNationalParkByName:', error);
    return null;
  }
}

/**
 * Determine if a slug belongs to a national park or a glamping property
 * This checks both tables to see which one has the slug
 */
export async function getSlugType(slug: string): Promise<'national-park' | 'glamping-property' | null> {
  try {
    const supabase = createServerClient();
    
    // Check national parks first
    const { data: park, error: parkError } = await supabase
      .from('national-parks')
      .select('id')
      .eq('slug', slug.trim())
      .limit(1)
      .single();

    if (!parkError && park) {
      return 'national-park';
    }

    // Check glamping properties
    const { data: property, error: propertyError } = await supabase
      .from('sage-glamping-data')
      .select('id')
      .eq('slug', slug.trim())
      .limit(1)
      .single();

    if (!propertyError && property) {
      return 'glamping-property';
    }

    return null;
  } catch (error) {
    console.error('Error in getSlugType:', error);
    return null;
  }
}
