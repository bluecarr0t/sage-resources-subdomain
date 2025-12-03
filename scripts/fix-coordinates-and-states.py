#!/usr/bin/env python3
"""
Fix missing coordinates and standardize state fields in the combined CSV.
- Geocodes missing coordinates using Google Places API
- Converts state field to 2-letter abbreviations
"""

import csv
import os
import sys
import time
import requests
from dotenv import load_dotenv
import re

# US State mapping
US_STATES = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
    'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
    'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
    'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
    'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
    'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
    'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
    'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
    'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
    'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
    'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC'
}

# Zip code to state mapping (common zip code ranges)
ZIP_TO_STATE = {
    # North Carolina zip codes (28000-28999)
    '28000': 'NC', '28100': 'NC', '28200': 'NC', '28300': 'NC', '28400': 'NC',
    '28500': 'NC', '28600': 'NC', '28700': 'NC', '28800': 'NC', '28900': 'NC',
    # Texas zip codes
    '76000': 'TX', '76500': 'TX', '77000': 'TX',
    # Add more as needed
}

def get_api_key():
    """Get Google Maps API key from environment."""
    env_path = '.env.local'
    if os.path.exists(env_path):
        load_dotenv(env_path)
    
    api_key = os.getenv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY')
    if not api_key:
        load_dotenv('.env')
        api_key = os.getenv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY')
    
    if not api_key:
        print("Error: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not found in environment")
        sys.exit(1)
    return api_key

def geocode_address(api_key, address, city, state, zip_code):
    """Geocode an address using Google Places API Text Search."""
    # Build search query
    query_parts = []
    if address:
        query_parts.append(address)
    if city:
        query_parts.append(city)
    if state:
        query_parts.append(state)
    if zip_code:
        query_parts.append(zip_code)
    
    query = " ".join(query_parts)
    
    url = "https://places.googleapis.com/v1/places:searchText"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "places.id,places.location"
    }
    payload = {
        "textQuery": query,
        "maxResultCount": 1
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if 'places' in data and len(data['places']) > 0:
            place = data['places'][0]
            location = place.get('location', {})
            return {
                'latitude': location.get('latitude'),
                'longitude': location.get('longitude')
            }
    except requests.exceptions.RequestException as e:
        print(f"  ⚠ Geocoding error: {e}")
        return None
    
    return None

def get_state_from_zip(zip_code):
    """Get state abbreviation from zip code."""
    if not zip_code or not zip_code.strip():
        return None
    
    zip_str = str(zip_code).strip()[:5]
    if not zip_str.isdigit():
        return None
    
    # North Carolina: 27000-28999
    if zip_str.startswith('27') or zip_str.startswith('28'):
        return 'NC'
    # Texas: 75000-79999, 76000-79999
    if zip_str.startswith('75') or zip_str.startswith('76') or zip_str.startswith('77') or zip_str.startswith('78') or zip_str.startswith('79'):
        return 'TX'
    # New York: 10000-14999
    if zip_str.startswith('10') or zip_str.startswith('11') or zip_str.startswith('12') or zip_str.startswith('13') or zip_str.startswith('14'):
        return 'NY'
    # California: 90000-96999
    if zip_str.startswith('90') or zip_str.startswith('91') or zip_str.startswith('92') or zip_str.startswith('93') or zip_str.startswith('94') or zip_str.startswith('95') or zip_str.startswith('96'):
        return 'CA'
    # Florida: 32000-34999
    if zip_str.startswith('32') or zip_str.startswith('33') or zip_str.startswith('34'):
        return 'FL'
    # Pennsylvania: 15000-19999
    if zip_str.startswith('15') or zip_str.startswith('16') or zip_str.startswith('17') or zip_str.startswith('18') or zip_str.startswith('19'):
        return 'PA'
    # Michigan: 48000-49999
    if zip_str.startswith('48') or zip_str.startswith('49'):
        return 'MI'
    # New Mexico: 87000-88999
    if zip_str.startswith('87') or zip_str.startswith('88'):
        return 'NM'
    # South Carolina: 29000-29999
    if zip_str.startswith('29'):
        return 'SC'
    # Maine: 03900-04999
    if zip_str.startswith('03') or zip_str.startswith('04'):
        return 'ME'
    # New Hampshire: 03000-03999
    if zip_str.startswith('03'):
        return 'NH'
    
    return None

def normalize_state(state_value, city=None, zip_code=None):
    """
    Normalize state field to 2-letter abbreviation.
    Handles:
    - Already correct (2 letters)
    - Full state names
    - Zip codes in state field
    - City names in state field
    - Swapped city/state fields
    """
    if not state_value:
        return None
    
    state_value = state_value.strip()
    
    # Already a 2-letter abbreviation
    if len(state_value) == 2 and state_value.isalpha():
        return state_value.upper()
    
    # Check if it's a zip code (5 digits)
    if state_value.isdigit() and len(state_value) == 5:
        state_from_zip = get_state_from_zip(state_value)
        if state_from_zip:
            return state_from_zip
        return None
    
    # Check if it's a full state name
    state_lower = state_value.lower()
    if state_lower in US_STATES:
        return US_STATES[state_lower]
    
    # Check for common city names that might be in state field
    # If city field looks like a state abbreviation, they might be swapped
    if city and len(city) == 2 and city.isalpha():
        # City is actually state, state is actually city
        # Return the city as state
        return city.upper()
    
    # Try to get state from zip code if available
    if zip_code:
        state_from_zip = get_state_from_zip(zip_code)
        if state_from_zip:
            return state_from_zip
    
    # If state looks like a city name and we have zip, use zip
    if len(state_value) > 2 and zip_code:
        state_from_zip = get_state_from_zip(zip_code)
        if state_from_zip:
            return state_from_zip
    
    # Can't determine, return None (will need manual review)
    return None

def fix_csv(input_path, output_path, api_key):
    """Fix coordinates and state fields in CSV."""
    print('=' * 70)
    print('FIXING COORDINATES AND STATE FIELDS')
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
    
    # Find rows needing fixes
    missing_coords = []
    state_issues = []
    
    for i, row in enumerate(rows):
        lat = row.get('Latitude', '').strip()
        lon = row.get('Longitude', '').strip()
        state = row.get('State', '').strip()
        
        if not lat or not lon:
            missing_coords.append(i)
        
        # Check if state needs normalization
        if state:
            normalized = normalize_state(state, row.get('City', ''), row.get('Zip Code', ''))
            if normalized != state.upper() and normalized != state:
                state_issues.append(i)
    
    print(f'📍 Missing coordinates: {len(missing_coords)} rows')
    print(f'🏷️  State field issues: {len(state_issues)} rows')
    print()
    
    # Fix missing coordinates
    if missing_coords:
        print('Geocoding missing coordinates...')
        geocoded_count = 0
        
        for idx in missing_coords:
            row = rows[idx]
            prop_name = row.get('Property Name', '').strip()
            address = row.get('Address', '').strip()
            city = row.get('City', '').strip()
            state = row.get('State', '').strip()
            zip_code = row.get('Zip Code', '').strip()
            
            print(f'  [{geocoded_count + 1}/{len(missing_coords)}] {prop_name}...', end=' ', flush=True)
            
            coords = geocode_address(api_key, address, city, state, zip_code)
            
            if coords and coords.get('latitude') and coords.get('longitude'):
                row['Latitude'] = str(coords['latitude'])
                row['Longitude'] = str(coords['longitude'])
                geocoded_count += 1
                print(f'✓ ({coords["latitude"]:.6f}, {coords["longitude"]:.6f})')
            else:
                print('✗ Not found')
            
            # Rate limiting
            if geocoded_count < len(missing_coords):
                time.sleep(0.1)
        
        print(f'  ✓ Geocoded {geocoded_count}/{len(missing_coords)} properties')
        print()
    
    # Fix state fields
    if state_issues:
        print('Standardizing state fields...')
        fixed_count = 0
        swapped_count = 0
        
        for idx in state_issues:
            row = rows[idx]
            original_state = row.get('State', '').strip()
            city = row.get('City', '').strip()
            zip_code = row.get('Zip Code', '').strip()
            
            normalized = normalize_state(original_state, city, zip_code)
            
            # Special case: if city and state seem swapped
            # City field has 2-letter code, state field has city name
            if city and len(city) == 2 and city.isalpha() and original_state and len(original_state) > 2:
                # They're swapped - city is actually state, state is actually city
                row['City'] = original_state
                row['State'] = city.upper()
                fixed_count += 1
                swapped_count += 1
                continue
            
            # Normal normalization
            if normalized and normalized != original_state.upper():
                row['State'] = normalized
                fixed_count += 1
        
        print(f'  ✓ Fixed {fixed_count}/{len(state_issues)} state fields')
        if swapped_count > 0:
            print(f'    ({swapped_count} were city/state swaps)')
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
    
    # Summary
    print()
    print('Summary:')
    if missing_coords:
        remaining = sum(1 for idx in missing_coords if not rows[idx].get('Latitude', '').strip())
        print(f'  Coordinates: {len(missing_coords) - remaining} geocoded, {remaining} still missing')
    if state_issues:
        print(f'  States: {fixed_count} fixed')

if __name__ == '__main__':
    input_file = '/Users/nickharsell/Documents/Projects/sage-subdomain-marketing/csv/Main/sage-glamping-combined-with-google-data.csv'
    output_file = '/Users/nickharsell/Documents/Projects/sage-subdomain-marketing/csv/Main/sage-glamping-combined-with-google-data-FIXED.csv'
    
    api_key = get_api_key()
    fix_csv(input_file, output_file, api_key)

