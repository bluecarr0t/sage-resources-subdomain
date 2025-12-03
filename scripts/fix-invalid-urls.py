#!/usr/bin/env python3
"""
Fix invalid URLs by replacing them with Google Website URI where available.
"""

import csv
import os
from urllib.parse import urlparse

def is_valid_url(url):
    """Check if URL is valid."""
    if not url or url.strip() == '':
        return False
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except:
        return False

def fix_invalid_urls(input_path, output_path):
    """Fix invalid URLs by replacing with Google Website URI."""
    print('=' * 70)
    print('FIXING INVALID URLs')
    print('=' * 70)
    print()
    
    # Read CSV
    print(f'Reading CSV: {input_path}')
    with open(input_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fieldnames = reader.fieldnames
    
    print(f'  Total rows: {len(rows)}')
    print()
    
    # First, build a lookup of property names to Google URIs
    # (in case one row has invalid URL but another row with same property has Google URI)
    property_google_uris = {}
    for row in rows:
        prop_name = row.get('Property Name', '').strip()
        google_uri = row.get('Google Website URI', '').strip()
        if prop_name and google_uri and is_valid_url(google_uri):
            # Store the first valid Google URI we find for this property
            if prop_name not in property_google_uris:
                property_google_uris[prop_name] = google_uri
    
    print(f'  Found Google URIs for {len(property_google_uris)} unique properties')
    print()
    
    # Find and fix invalid URLs
    invalid_count = 0
    fixed_count = 0
    fixed_from_same_row = 0
    fixed_from_property_lookup = 0
    no_replacement = 0
    
    print('Analyzing and fixing URLs...')
    for i, row in enumerate(rows):
        url = row.get('Url', '').strip()
        google_uri = row.get('Google Website URI', '').strip()
        prop_name = row.get('Property Name', '').strip()
        
        replacement_uri = None
        source = None
        
        # Case 1: URL is invalid (contains text that's not a URL)
        if url and not is_valid_url(url):
            invalid_count += 1
            
            # Priority 1: Use Google URI from same row if available
            if google_uri and is_valid_url(google_uri):
                replacement_uri = google_uri
                source = 'same_row'
                fixed_from_same_row += 1
            # Priority 2: Use Google URI from another row with same property name
            elif prop_name in property_google_uris:
                replacement_uri = property_google_uris[prop_name]
                source = 'property_lookup'
                fixed_from_property_lookup += 1
            
            if replacement_uri:
                row['Url'] = replacement_uri
                fixed_count += 1
                if fixed_count <= 15:  # Show first 15 fixes
                    print(f'  [{fixed_count}] {prop_name[:50]}...')
                    print(f'      Replaced invalid: "{url[:60]}..."')
                    print(f'      With: "{replacement_uri}" ({source})')
            else:
                # No valid replacement available - set to empty
                row['Url'] = ''
                no_replacement += 1
                if no_replacement <= 5:  # Show first 5 with no replacement
                    print(f'  ⚠ No replacement for: {prop_name[:50]}...')
                    print(f'      Invalid URL: "{url[:60]}..."')
        
        # Case 2: URL is empty but we have Google URI
        elif not url and google_uri and is_valid_url(google_uri):
            row['Url'] = google_uri
            fixed_count += 1
            fixed_from_same_row += 1
            if fixed_count <= 15:
                print(f'  [{fixed_count}] {prop_name[:50]}...')
                print(f'      Filled empty URL with: "{google_uri}"')
    
    print()
    print('=' * 70)
    print('SUMMARY')
    print('=' * 70)
    print(f'  Invalid URLs found: {invalid_count}')
    print(f'  Fixed with Google URI: {fixed_count}')
    print(f'    - From same row: {fixed_from_same_row}')
    print(f'    - From property lookup: {fixed_from_property_lookup}')
    print(f'  No replacement available: {no_replacement}')
    print()
    
    # Write fixed CSV
    print(f'Writing fixed CSV: {output_path}')
    with open(output_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f'  ✓ Successfully wrote {len(rows)} rows')
    print()
    print('=' * 70)
    print('COMPLETE!')
    print('=' * 70)
    print()
    print(f'✅ Fixed {fixed_count} invalid URLs using Google Website URI')
    if no_replacement > 0:
        print(f'⚠️  {no_replacement} URLs had no valid replacement (set to empty)')
    
    return {
        'invalid_count': invalid_count,
        'fixed_count': fixed_count,
        'no_replacement': no_replacement
    }

if __name__ == '__main__':
    input_file = '/Users/nickharsell/Documents/Projects/sage-subdomain-marketing/csv/Main/sage-glamping-combined-with-google-data-FIXED.csv'
    output_file = '/Users/nickharsell/Documents/Projects/sage-subdomain-marketing/csv/Main/sage-glamping-combined-with-google-data-FIXED.csv'
    
    # Use same file for input/output (will overwrite)
    fix_invalid_urls(input_file, output_file)

