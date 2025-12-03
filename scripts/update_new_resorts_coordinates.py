#!/usr/bin/env python3
"""
Update NEW_GLAMPING_RESORTS_2024_2025_WITH_RATINGS.csv with fetched coordinates.
Prioritizes updating mismatches and properties without existing coordinates.
"""

import csv
import os
import sys

def update_coordinates(comparison_file, original_file, output_file, update_threshold_km=1.0):
    """Update original CSV with fetched coordinates."""
    
    # Read comparison file to get fetched coordinates
    comparison_data = {}
    with open(comparison_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            prop_name = row.get('Property Name', '').strip()
            site_name = row.get('Site Name', '').strip()
            key = f"{prop_name}|{site_name}"
            
            fetched_lat = row.get('Fetched Latitude', '').strip()
            fetched_lon = row.get('Fetched Longitude', '').strip()
            distance = row.get('Distance (km)', '').strip()
            match_status = row.get('Coordinate Match', '').strip()
            
            if fetched_lat and fetched_lon:
                try:
                    dist_km = float(distance) if distance else 0
                except:
                    dist_km = 0
                
                comparison_data[key] = {
                    'lat': fetched_lat,
                    'lon': fetched_lon,
                    'distance': dist_km,
                    'match': match_status
                }
    
    # Read original file
    rows = []
    with open(original_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames)
        rows = list(reader)
    
    # Determine column names
    lat_col = None
    lon_col = None
    for fn in fieldnames:
        if 'lat' in fn.lower() and not lat_col:
            lat_col = fn
        if 'long' in fn.lower() and not lon_col:
            lon_col = fn
    
    if not lat_col or not lon_col:
        print(f"Error: Could not find Latitude/Longitude columns")
        sys.exit(1)
    
    stats = {
        'total': 0,
        'updated_mismatches': 0,
        'updated_no_existing': 0,
        'kept_matches': 0,
        'not_found': 0
    }
    
    # Update rows
    for row in rows:
        stats['total'] += 1
        prop_name = row.get('Property Name', '').strip()
        site_name = row.get('Site Name', '').strip()
        key = f"{prop_name}|{site_name}"
        
        existing_lat = row.get(lat_col, '').strip()
        existing_lon = row.get(lon_col, '').strip()
        
        if key in comparison_data:
            comp_data = comparison_data[key]
            fetched_lat = comp_data['lat']
            fetched_lon = comp_data['lon']
            distance = comp_data['distance']
            match_status = comp_data['match']
            
            # Update based on match status
            if match_status == 'No Existing':
                # Always update if no existing coordinates
                row[lat_col] = fetched_lat
                row[lon_col] = fetched_lon
                stats['updated_no_existing'] += 1
            elif match_status == 'Mismatch' and distance > update_threshold_km:
                # Update if mismatch is significant
                row[lat_col] = fetched_lat
                row[lon_col] = fetched_lon
                stats['updated_mismatches'] += 1
            elif match_status == 'Match':
                # Keep existing (already correct)
                stats['kept_matches'] += 1
            else:
                # Small mismatch, keep existing
                stats['kept_matches'] += 1
        else:
            stats['not_found'] += 1
    
    # Write updated CSV
    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print("=" * 70)
    print("Coordinate Update Summary:")
    print(f"  Total properties: {stats['total']}")
    print(f"  ✓ Updated (mismatches >{update_threshold_km}km): {stats['updated_mismatches']}")
    print(f"  ✓ Updated (no existing): {stats['updated_no_existing']}")
    print(f"  ✓ Kept (matches or small differences): {stats['kept_matches']}")
    print(f"  ✗ Not found in comparison: {stats['not_found']}")
    print("=" * 70)
    print(f"\nUpdated CSV saved to: {output_file}")
    
    return stats

if __name__ == '__main__':
    comparison_file = 'csv/NEW_GLAMPING_RESORTS_2024_2025_WITH_RATINGS_COORDINATES_COMPARED.csv'
    original_file = 'csv/NEW_GLAMPING_RESORTS_2024_2025_WITH_RATINGS.csv'
    output_file = 'csv/NEW_GLAMPING_RESORTS_2024_2025_WITH_RATINGS_UPDATED.csv'
    
    if not os.path.exists(comparison_file):
        print(f"Error: {comparison_file} not found!")
        sys.exit(1)
    
    if not os.path.exists(original_file):
        print(f"Error: {original_file} not found!")
        sys.exit(1)
    
    print("Updating coordinates in NEW_GLAMPING_RESORTS_2024_2025_WITH_RATINGS.csv...")
    print("=" * 70)
    print()
    
    # Update with threshold of 1km (update mismatches greater than 1km)
    update_coordinates(comparison_file, original_file, output_file, update_threshold_km=1.0)

