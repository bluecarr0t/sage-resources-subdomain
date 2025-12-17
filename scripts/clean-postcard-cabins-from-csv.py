#!/usr/bin/env python3
"""
Reanalyze all_glamping_properties for Postcard Cabins and remove duplicates from CSV.
"""

import csv
import sys
from typing import List, Dict, Set

def normalize_property_name(name: str) -> str:
    """Normalize property name for comparison."""
    # Normalize to lowercase and strip whitespace
    normalized = name.lower().strip()
    # Remove common variations: dashes, parentheses with state codes, extra spaces
    normalized = normalized.replace('-', ' ').replace('(', '').replace(')', '')
    normalized = normalized.replace('(al)', '').replace('(in)', '').replace('(oh)', '').replace('(fl)', '')
    normalized = normalized.replace('(dc)', '').replace('(mi)', '').replace('(ca)', '').replace('(tx)', '')
    # Normalize multiple spaces to single space
    normalized = ' '.join(normalized.split())
    return normalized


def read_database_properties(csv_file: str) -> Set[str]:
    """Read Postcard Cabins properties from main database."""
    existing = set()
    try:
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                prop_name = row.get('Property Name', '').strip()
                if 'postcard' in prop_name.lower() and 'cabin' in prop_name.lower():
                    normalized = normalize_property_name(prop_name)
                    existing.add(normalized)
    except Exception as e:
        print(f'Error reading database CSV: {e}')
        sys.exit(1)
    
    return existing


def read_csv_properties(csv_file: str) -> List[Dict]:
    """Read all properties from the missing properties CSV."""
    properties = []
    try:
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            fieldnames = reader.fieldnames
            for row in reader:
                properties.append(row)
        return properties, fieldnames
    except Exception as e:
        print(f'Error reading CSV: {e}')
        sys.exit(1)


def find_matches_in_database(csv_prop_name: str, db_properties: Set[str]) -> bool:
    """Check if a CSV property matches any database property."""
    normalized_csv = normalize_property_name(csv_prop_name)
    
    # Direct exact match
    if normalized_csv in db_properties:
        return True
    
    # Extract the location/region name (everything after "postcard cabins")
    csv_location = normalized_csv.replace('postcard cabins', '').strip()
    
    # Check if any database property has the same location
    for db_prop in db_properties:
        db_location = db_prop.replace('postcard cabins', '').strip()
        
        # Exact location match
        if csv_location and db_location and csv_location == db_location:
            return True
        
        # Check if locations contain each other (for variations like "Hill Country" vs "Hill Country (TX)")
        if csv_location and db_location:
            # Remove state codes and extra info for comparison
            csv_clean = csv_location.split('(')[0].strip()
            db_clean = db_location.split('(')[0].strip()
            
            if csv_clean and db_clean:
                # Exact match after cleaning
                if csv_clean == db_clean:
                    return True
                # One contains the other (for cases like "Shenandoah" vs "Shenandoah North")
                if len(csv_clean) > 3 and len(db_clean) > 3:
                    if csv_clean in db_clean or db_clean in csv_clean:
                        return True
    
    return False


def main():
    database_file = 'csv/Main/sage-glamping-combined-with-google-data-FIXED.csv'
    csv_file = 'csv/glamping-com-north-america-missing-properties.csv'
    
    print('=' * 70)
    print('Reanalyzing Postcard Cabins in Database vs CSV')
    print('=' * 70)
    print()
    
    # Read database properties
    print(f'Reading Postcard Cabins from database: {database_file}')
    db_properties = read_database_properties(database_file)
    print(f'Found {len(db_properties)} Postcard Cabins properties in database')
    print()
    
    # Show database properties
    print('Database Postcard Cabins properties:')
    for i, prop in enumerate(sorted(db_properties), 1):
        print(f'  {i}. {prop}')
    print()
    
    # Read CSV properties
    print(f'Reading properties from CSV: {csv_file}')
    csv_properties, fieldnames = read_csv_properties(csv_file)
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
        found = find_matches_in_database(prop_name, db_properties)
        
        if found:
            print(f'  ✗ REMOVE: {prop_name} (already in database)')
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
