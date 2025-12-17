#!/usr/bin/env python3
"""
Compare CSV file with live Supabase database to find and remove duplicates
"""

import csv
import sys
import os
import re
from typing import List, Dict, Set, Tuple
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

try:
    from supabase import Client, create_client
except ImportError:
    print("Error: supabase-py not installed. Install with: pip install supabase")
    sys.exit(1)

def normalize_property_name(name: str) -> str:
    """Normalize property name for comparison."""
    if not name:
        return ""
    
    # Normalize to lowercase and strip whitespace
    normalized = name.lower().strip()
    
    # Remove common variations: dashes, parentheses with state codes, extra spaces
    normalized = normalized.replace('-', ' ')
    # Remove anything in parentheses
    normalized = re.sub(r'\([^)]*\)', '', normalized)
    # Normalize multiple spaces to single space
    normalized = ' '.join(normalized.split())
    
    return normalized


def get_database_properties() -> Set[str]:
    """Query Supabase database for all unique property names."""
    supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    # Try both naming conventions for the service role key
    secret_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_SECRET_KEY')
    
    if not supabase_url or not secret_key:
        print('Error: Supabase credentials not found in .env.local')
        print('Required: NEXT_PUBLIC_SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY')
        sys.exit(1)
    
    try:
        supabase: Client = create_client(supabase_url, secret_key)
        
        print('📥 Fetching all property names from database...')
        
        # Fetch all unique property names (in batches)
        all_properties = []
        offset = 0
        batch_size = 1000
        has_more = True
        
        while has_more:
            response = supabase.table('all_glamping_properties')\
                .select('property_name')\
                .not_('property_name', 'is', None)\
                .range(offset, offset + batch_size - 1)\
                .execute()
            
            if not response.data:
                break
            
            # Extract property names
            property_names = [
                row.get('property_name', '').strip() 
                for row in response.data 
                if row.get('property_name', '').strip()
            ]
            
            all_properties.extend(property_names)
            offset += batch_size
            has_more = len(response.data) == batch_size
            
            print(f'  Fetched {len(all_properties)} property names...')
        
        # Get unique property names
        unique_properties = set(all_properties)
        print(f'✅ Found {len(unique_properties)} unique property names in database\n')
        
        return unique_properties
        
    except Exception as e:
        print(f'Error querying database: {e}')
        sys.exit(1)


def find_match_in_database(
    csv_property_name: str,
    db_properties: Set[str]
) -> Tuple[bool, str]:
    """Check if a CSV property matches any database property."""
    normalized_csv = normalize_property_name(csv_property_name)
    
    # Create normalized mapping
    normalized_db_map = {normalize_property_name(p): p for p in db_properties}
    
    # Direct exact match
    if normalized_csv in normalized_db_map:
        return True, normalized_db_map[normalized_csv]
    
    # Extract the location/region name (everything after brand name)
    brand_patterns = [
        'postcard cabins',
        'huttopia',
        'under canvas',
        'glamping.com',
        'field mag',
        'us news travel'
    ]
    
    csv_location = normalized_csv
    for brand in brand_patterns:
        if normalized_csv.startswith(brand):
            csv_location = normalized_csv[len(brand):].strip()
            break
    
    # Check if any database property has the same location
    for db_normalized, db_original in normalized_db_map.items():
        db_location = db_normalized
        for brand in brand_patterns:
            if db_normalized.startswith(brand):
                db_location = db_normalized[len(brand):].strip()
                break
        
        # Exact location match
        if csv_location and db_location and csv_location == db_location:
            return True, db_original
        
        # Check if locations match (exact or one contains the other)
        if csv_location and db_location and len(csv_location) > 3 and len(db_location) > 3:
            # Exact match after cleaning
            if csv_location == db_location:
                return True, db_original
            # One contains the other (for cases like "Shenandoah" vs "Shenandoah North")
            if csv_location in db_location or db_location in csv_location:
                # Make sure it's not too short to avoid false matches
                if len(csv_location) > 5 and len(db_location) > 5:
                    return True, db_original
    
    return False, ""


def main():
    csv_file = 'csv/glamping-com-north-america-missing-properties.csv'
    
    print('=' * 70)
    print('Comparing CSV with Live Database to Find Duplicates')
    print('=' * 70)
    print()
    
    # Read CSV file
    print(f'📖 Reading CSV file: {csv_file}')
    csv_properties = []
    fieldnames = None
    try:
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            fieldnames = list(reader.fieldnames)
            csv_properties = list(reader)
    except Exception as e:
        print(f'Error reading CSV: {e}')
        sys.exit(1)
    
    print(f'✅ Found {len(csv_properties)} properties in CSV\n')
    
    # Get database properties
    db_properties = get_database_properties()
    
    # Check each CSV property against database
    print('🔍 Checking for duplicates...\n')
    duplicates: List[Dict] = []
    unique: List[Dict] = []
    
    for row in csv_properties:
        property_name = row.get('Property Name', '').strip()
        if not property_name:
            unique.append(row)
            continue
        
        found, match = find_match_in_database(property_name, db_properties)
        
        if found:
            print(f'  ✗ DUPLICATE: {property_name}')
            print(f'    Matches database: {match}')
            duplicates.append({'row': row, 'match': match})
        else:
            unique.append(row)
    
    print()
    print('📊 Summary:')
    print(f'   Total in CSV: {len(csv_properties)}')
    print(f'   Duplicates found: {len(duplicates)}')
    print(f'   Unique properties: {len(unique)}')
    print()
    
    # Remove duplicates from CSV if any found
    if len(duplicates) > 0:
        print('🗑️  Removing duplicates from CSV...\n')
        
        # Write updated CSV
        with open(csv_file, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(unique)
        
        print(f'✅ Updated CSV file: {csv_file}')
        print(f'   Removed {len(duplicates)} duplicate properties')
        print(f'   Remaining properties: {len(unique)}')
        print()
        print('Removed duplicates:')
        for i, dup in enumerate(duplicates, 1):
            print(f'  {i}. {dup["row"]["Property Name"]} (matched: {dup["match"]})')
    else:
        print('✅ No duplicates found - CSV is clean!')
    
    print()
    print('=' * 70)
    print('Analysis complete!')
    print('=' * 70)


if __name__ == '__main__':
    main()
