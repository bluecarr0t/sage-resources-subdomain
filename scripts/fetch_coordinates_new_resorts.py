#!/usr/bin/env python3
"""
Fetch longitude and latitude for properties in NEW_GLAMPING_RESORTS_2024_2025_WITH_RATINGS.csv
using Google Places API (New). Compare with existing values if present.
"""

import csv
import os
import sys
import time
import requests
from dotenv import load_dotenv
import math

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

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two coordinates in kilometers using Haversine formula."""
    if not all([lat1, lon1, lat2, lon2]):
        return None
    
    try:
        lat1, lon1, lat2, lon2 = float(lat1), float(lon1), float(lat2), float(lon2)
    except (ValueError, TypeError):
        return None
    
    R = 6371.0  # Radius of Earth in kilometers
    
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    distance = R * c
    return distance

def search_place(api_key, property_name, city, state, address=None):
    """Search for a place using Places API (New) Text Search."""
    query_parts = [property_name]
    if city:
        query_parts.append(city)
    if state:
        query_parts.append(state)
    if address:
        query_parts.append(address)
    
    query = " ".join(query_parts)
    
    url = "https://places.googleapis.com/v1/places:searchText"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location"
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
                'place_id': place.get('id'),
                'latitude': location.get('latitude'),
                'longitude': location.get('longitude'),
                'name': place.get('displayName', {}).get('text', ''),
                'address': place.get('formattedAddress', '')
            }
    except requests.exceptions.RequestException as e:
        return {'error': str(e)}
    
    return None

def process_csv_with_coordinates(csv_file, api_key, delay=0.1):
    """Process CSV, fetch coordinates, and compare with existing values."""
    rows = []
    stats = {
        'total': 0,
        'fetched': 0,
        'not_found': 0,
        'matches': 0,
        'mismatches': 0,
        'no_existing': 0,
        'errors': 0
    }
    
    # Read all rows
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames)
        rows = list(reader)
    
    # Determine column names (case-insensitive)
    lat_col = None
    lon_col = None
    for fn in fieldnames:
        if 'lat' in fn.lower() and not lat_col:
            lat_col = fn
        if 'long' in fn.lower() and not lon_col:
            lon_col = fn
    
    if not lat_col or not lon_col:
        print(f"Error: Could not find Latitude/Longitude columns")
        print(f"Available columns: {fieldnames}")
        sys.exit(1)
    
    print(f"Using columns: Latitude='{lat_col}', Longitude='{lon_col}'")
    print()
    
    # Add new columns for fetched coordinates and comparison
    new_columns = ['Fetched Latitude', 'Fetched Longitude', 'Distance (km)', 'Coordinate Match']
    for col in new_columns:
        if col not in fieldnames:
            fieldnames.append(col)
    
    total = len(rows)
    print(f"Processing {total} properties...")
    print(f"API Key: {api_key[:10]}...{api_key[-4:]}")
    print()
    
    for idx, row in enumerate(rows, 1):
        stats['total'] += 1
        prop_name = row.get('Property Name', '').strip()
        city = row.get('City', '').strip()
        state = row.get('State', '').strip()
        address = row.get('Address', '').strip()
        
        existing_lat = row.get(lat_col, '').strip()
        existing_lon = row.get(lon_col, '').strip()
        
        if not prop_name:
            continue
        
        print(f"[{idx}/{total}] {prop_name[:50]}...", end=' ', flush=True)
        
        # Fetch coordinates
        place_data = search_place(api_key, prop_name, city, state, address)
        
        if place_data and 'error' not in place_data:
            fetched_lat = place_data.get('latitude')
            fetched_lon = place_data.get('longitude')
            
            if fetched_lat is not None and fetched_lon is not None:
                row['Fetched Latitude'] = str(fetched_lat)
                row['Fetched Longitude'] = str(fetched_lon)
                stats['fetched'] += 1
                
                # Compare with existing
                if existing_lat and existing_lon:
                    try:
                        distance = calculate_distance(
                            existing_lat, existing_lon,
                            fetched_lat, fetched_lon
                        )
                        
                        if distance is not None:
                            row['Distance (km)'] = f"{distance:.3f}"
                            
                            # Consider a match if within 1km
                            if distance < 1.0:
                                row['Coordinate Match'] = 'Match'
                                stats['matches'] += 1
                                print(f"✓ Match ({distance:.2f}km)")
                            else:
                                row['Coordinate Match'] = 'Mismatch'
                                stats['mismatches'] += 1
                                print(f"⚠ Mismatch ({distance:.2f}km)")
                        else:
                            row['Coordinate Match'] = 'Cannot Compare'
                            print("⚠ Cannot compare")
                    except Exception as e:
                        row['Coordinate Match'] = 'Error'
                        stats['errors'] += 1
                        print(f"✗ Error: {e}")
                else:
                    row['Coordinate Match'] = 'No Existing'
                    stats['no_existing'] += 1
                    print("✓ Fetched (no existing)")
            else:
                stats['not_found'] += 1
                print("✗ No coordinates")
        elif place_data and 'error' in place_data:
            stats['errors'] += 1
            print(f"✗ API Error: {place_data['error']}")
        else:
            stats['not_found'] += 1
            print("✗ Not found")
        
        # Rate limiting
        if idx < total:
            time.sleep(delay)
    
    # Write updated CSV
    output_file = csv_file.replace('.csv', '_COORDINATES_COMPARED.csv')
    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print()
    print("=" * 70)
    print("Summary:")
    print(f"  Total properties: {stats['total']}")
    print(f"  ✓ Coordinates fetched: {stats['fetched']}")
    print(f"  ✗ Not found: {stats['not_found']}")
    print(f"  ⚠ Errors: {stats['errors']}")
    print()
    print("Comparison Results:")
    print(f"  ✓ Matches (<1km): {stats['matches']}")
    print(f"  ⚠ Mismatches (≥1km): {stats['mismatches']}")
    print(f"  - No existing coordinates: {stats['no_existing']}")
    print("=" * 70)
    print(f"\nOutput saved to: {output_file}")
    
    return output_file

if __name__ == '__main__':
    csv_file = '/Users/nickharsell/Documents/Projects/sage-subdomain-marketing/csv/NEW_GLAMPING_RESORTS_2024_2025_WITH_RATINGS.csv'
    
    if not os.path.exists(csv_file):
        print(f"Error: {csv_file} not found!")
        sys.exit(1)
    
    api_key = get_api_key()
    
    print("Google Places API (New) - Coordinate Fetcher & Comparator")
    print("=" * 70)
    print()
    
    process_csv_with_coordinates(csv_file, api_key, delay=0.1)

