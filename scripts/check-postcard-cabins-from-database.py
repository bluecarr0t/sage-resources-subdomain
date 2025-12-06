#!/usr/bin/env python3
"""
Query Supabase database directly to check for Postcard Cabins properties
and update the CSV file accordingly.
"""

import csv
import sys
import os
from typing import List, Dict, Set
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv('.env.local')

def normalize_property_name(name: str) -> str:
    """Normalize property name for comparison."""
    if not name:
        return ""
    normalized = name.lower().strip()
    # Remove common variations: dashes, parentheses with state codes, extra spaces
    normalized = normalized.replace('-', ' ').replace('(', '').replace(')', '')
    normalized = normalized.replace('(al)', '').replace('(in)', '').replace('(oh)', '').replace('(fl)', '')
    normalized = normalized.replace('(dc)', '').replace('(mi)', '').replace('(ca)', '').replace('(tx)', '')
    # Normalize multiple spaces to single space
    normalized = ' '.join(normalized.split())
    return normalized


def get_postcard_cabins_from_database() -> Set[str]:
    """Query Supabase database for Postcard Cabins properties."""
    supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    supabase_key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    
    if not supabase_url or not supabase_key:
        print('Error: Supabase credentials not found in .env.local')
        sys.exit(1)
    
    try:
        supabase: Client = create_client(supabase_url, supabase_key)
        
        print('Querying Supabase database for Postcard Cabins properties...')
        
        # Query for all Postcard Cabins properties
        # Get unique property names (ignoring site_name)
        response = supabase.table('sage-glamping-data').select('property_name').ilike('property_name', '%Postcard Cabins%').execute()
        
        if not response.data:
            print('No Postcard Cabins properties found in database')
            return set()
        
        # Get unique property names
        unique_properties = set()
        for row in response.data:
            prop_name = row.get('property_name', '').strip()
            if prop_name:
                unique_properties.add(prop_name)
        
        print(f'Found {len(unique_properties)} unique Postcard Cabins properties in database')
        return unique_properties
        
    except Exception as e:
        print(f'Error querying database: {e}')
        print('Falling back to CSV file...')
        return get_postcard_cabins_from_csv()


def get_postcard_cabins_from_csv() -> Set[str]:
    """Fallback: Read Postcard Cabins from CSV file."""
    csv_file = 'csv/Main/sage-glamping-combined-with-google-data-FIXED.csv'
    existing = set()
    try:
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                prop_name = row.get('Property Name', '').strip()
                if prop_name and 'postcard' in prop_name.lower() and 'cabin' in prop_name.lower():
                    existing.add(prop_name)
    except Exception as e:
        print(f'Error reading CSV: {e}')
        sys.exit(1)
    
    return existing


def find_matches_in_database(csv_prop_name: str, db_properties: Set[str]) -> tuple[bool, str]:
    """Check if a CSV property matches any database property."""
    normalized_csv = normalize_property_name(csv_prop_name)
    
    # Check against normalized database properties
    normalized_db = {normalize_property_name(p): p for p in db_properties}
    
    # Direct exact match
    if normalized_csv in normalized_db:
        return True, normalized_db[normalized_csv]
    
    # Extract the location/region name (everything after "postcard cabins")
    csv_location = normalized_csv.replace('postcard cabins', '').strip()
    
    # Check if any database property has the same location
    for db_normalized, db_original in normalized_db.items():
        db_location = db_normalized.replace('postcard cabins', '').strip()
        
        # Exact location match
        if csv_location and db_location and csv_location == db_location:
            return True, db_original
        
        # Check if locations contain each other (for variations)
        if csv_location and db_location:
            # Remove state codes and extra info for comparison
            csv_clean = csv_location.split('(')[0].strip()
            db_clean = db_location.split('(')[0].strip()
            
            if csv_clean and db_clean:
                # Exact match after cleaning
                if csv_clean == db_clean:
                    return True, db_original
                # One contains the other (for cases like "Shenandoah" vs "Shenandoah North")
                if len(csv_clean) > 3 and len(db_clean) > 3:
                    if csv_clean in db_clean or db_clean in csv_clean:
                        return True, db_original
    
    return False, ""


def main():
    csv_file = 'csv/glamping-com-north-america-missing-properties.csv'
    
    print('=' * 70)
    print('Reanalyzing Postcard Cabins from Live Database vs CSV')
    print('=' * 70)
    print()
    
    # Get database properties (try Supabase first, fallback to CSV)
    try:
        db_properties = get_postcard_cabins_from_database()
    except:
        print('Could not query database, using CSV file...')
        db_properties = get_postcard_cabins_from_csv()
    
    print()
    print('Postcard Cabins properties in database:')
    for i, prop in enumerate(sorted(db_properties), 1):
        print(f'  {i}. {prop}')
    print()
    
    # Read CSV properties
    print(f'Reading properties from CSV: {csv_file}')
    csv_properties = []
    fieldnames = None
    try:
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            fieldnames = list(reader.fieldnames)
            for row in reader:
                csv_properties.append(row)
    except Exception as e:
        print(f'Error reading CSV: {e}')
        sys.exit(1)
    
    print(f'Found {len(csv_properties)} total properties in CSV')
    print()
    
    # Find Postcard Cabins in CSV
    postcard_in_csv = [p for p in csv_properties if p.get('Source') == 'Postcard Cabins']
    print(f'Found {len(postcard_in_csv)} Postcard Cabins properties in CSV')
    print()
    
    # Check each Postcard Cabins property
    to_remove = []
    to_keep = []
    
    print('Checking Postcard Cabins properties:')
    for prop in postcard_in_csv:
        prop_name = prop.get('Property Name', '').strip()
        found, match = find_matches_in_database(prop_name, db_properties)
        
        if found:
            print(f'  ✗ REMOVE: {prop_name} (matches database: {match})')
            to_remove.append(prop_name)
        else:
            print(f'  ✓ KEEP: {prop_name} (not in database)')
            to_keep.append(prop_name)
    print()
    
    # Filter out properties to remove
    filtered_properties = []
    removed_count = 0
    
    for prop in csv_properties:
        if prop.get('Source') == 'Postcard Cabins':
            prop_name = prop.get('Property Name', '').strip()
            if prop_name in to_remove:
                removed_count += 1
                continue
        filtered_properties.append(prop)
    
    print(f'Removed {removed_count} Postcard Cabins properties that are already in database')
    print(f'Kept {len(to_keep)} Postcard Cabins properties')
    print()
    
    # Write updated CSV
    if removed_count > 0:
        with open(csv_file, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(filtered_properties)
        
        print(f'✅ Updated CSV file: {csv_file}')
        print(f'   Removed {removed_count} duplicate Postcard Cabins properties')
        print(f'   Total properties remaining: {len(filtered_properties)}')
    else:
        print('No changes needed - all Postcard Cabins in CSV are unique')
    
    print()
    print('=' * 70)
    print('Analysis complete!')
    print('=' * 70)


if __name__ == '__main__':
    main()
