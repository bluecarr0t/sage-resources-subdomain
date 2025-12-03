#!/usr/bin/env python3
"""
Create a detailed report of coordinate mismatches and updates.
"""

import csv
import os

def create_report(comparison_file, report_file):
    """Create a detailed report of coordinate comparisons."""
    
    rows = []
    with open(comparison_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    
    # Categorize results
    matches = []
    small_mismatches = []  # 1-10km
    medium_mismatches = []  # 10-100km
    large_mismatches = []  # >100km
    no_existing = []
    not_found = []
    
    for row in rows:
        prop_name = row.get('Property Name', '').strip()
        site_name = row.get('Site Name', '').strip()
        city = row.get('City', '').strip()
        state = row.get('State', '').strip()
        match_status = row.get('Coordinate Match', '').strip()
        distance_str = row.get('Distance (km)', '').strip()
        existing_lat = row.get('Latitude', '').strip()
        existing_lon = row.get('Longitude', '').strip()
        fetched_lat = row.get('Fetched Latitude', '').strip()
        fetched_lon = row.get('Fetched Longitude', '').strip()
        
        prop_info = {
            'name': prop_name,
            'site': site_name,
            'city': city,
            'state': state,
            'existing_lat': existing_lat,
            'existing_lon': existing_lon,
            'fetched_lat': fetched_lat,
            'fetched_lon': fetched_lon,
            'distance': distance_str
        }
        
        if match_status == 'Match':
            matches.append(prop_info)
        elif match_status == 'Mismatch':
            try:
                distance = float(distance_str) if distance_str else 0
                if distance < 10:
                    small_mismatches.append(prop_info)
                elif distance < 100:
                    medium_mismatches.append(prop_info)
                else:
                    large_mismatches.append(prop_info)
            except:
                large_mismatches.append(prop_info)
        elif match_status == 'No Existing':
            no_existing.append(prop_info)
        else:
            not_found.append(prop_info)
    
    # Write report
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write("=" * 80 + "\n")
        f.write("COORDINATE COMPARISON REPORT\n")
        f.write("=" * 80 + "\n\n")
        
        f.write(f"Total Properties: {len(rows)}\n")
        f.write(f"✓ Matches (<1km): {len(matches)} ({len(matches)/len(rows)*100:.1f}%)\n")
        f.write(f"⚠ Small Mismatches (1-10km): {len(small_mismatches)} ({len(small_mismatches)/len(rows)*100:.1f}%)\n")
        f.write(f"⚠ Medium Mismatches (10-100km): {len(medium_mismatches)} ({len(medium_mismatches)/len(rows)*100:.1f}%)\n")
        f.write(f"⚠ Large Mismatches (>100km): {len(large_mismatches)} ({len(large_mismatches)/len(rows)*100:.1f}%)\n")
        f.write(f"- No Existing Coordinates: {len(no_existing)}\n")
        f.write(f"✗ Not Found: {len(not_found)}\n\n")
        
        # Large mismatches (most critical)
        if large_mismatches:
            f.write("=" * 80 + "\n")
            f.write("LARGE MISMATCHES (>100km) - RECOMMENDED FOR UPDATE\n")
            f.write("=" * 80 + "\n\n")
            large_mismatches.sort(key=lambda x: float(x['distance']) if x['distance'] else 0, reverse=True)
            for prop in large_mismatches[:50]:  # Top 50
                f.write(f"Property: {prop['name']}\n")
                f.write(f"  Site: {prop['site']}\n")
                f.write(f"  Location: {prop['city']}, {prop['state']}\n")
                f.write(f"  Existing: {prop['existing_lat']}, {prop['existing_lon']}\n")
                f.write(f"  Fetched: {prop['fetched_lat']}, {prop['fetched_lon']}\n")
                f.write(f"  Distance: {prop['distance']} km\n")
                f.write("\n")
        
        # Medium mismatches
        if medium_mismatches:
            f.write("=" * 80 + "\n")
            f.write("MEDIUM MISMATCHES (10-100km) - REVIEW RECOMMENDED\n")
            f.write("=" * 80 + "\n\n")
            medium_mismatches.sort(key=lambda x: float(x['distance']) if x['distance'] else 0, reverse=True)
            for prop in medium_mismatches[:30]:  # Top 30
                f.write(f"{prop['name']} ({prop['site']}) - {prop['city']}, {prop['state']} - {prop['distance']} km\n")
            f.write("\n")
        
        # Small mismatches
        if small_mismatches:
            f.write("=" * 80 + "\n")
            f.write("SMALL MISMATCHES (1-10km) - MINOR DIFFERENCES\n")
            f.write("=" * 80 + "\n\n")
            f.write(f"Total: {len(small_mismatches)} properties\n")
            f.write("(These are likely acceptable differences)\n\n")
        
        # No existing coordinates
        if no_existing:
            f.write("=" * 80 + "\n")
            f.write("PROPERTIES WITHOUT EXISTING COORDINATES - UPDATED\n")
            f.write("=" * 80 + "\n\n")
            for prop in no_existing:
                f.write(f"{prop['name']} ({prop['site']}) - {prop['city']}, {prop['state']}\n")
                f.write(f"  Added: {prop['fetched_lat']}, {prop['fetched_lon']}\n\n")
    
    print(f"Report created: {report_file}")
    print(f"  - Large mismatches: {len(large_mismatches)}")
    print(f"  - Medium mismatches: {len(medium_mismatches)}")
    print(f"  - Small mismatches: {len(small_mismatches)}")
    print(f"  - No existing: {len(no_existing)}")

if __name__ == '__main__':
    comparison_file = 'csv/sage-glamping-sites_COORDINATES_COMPARED.csv'
    report_file = 'csv/COORDINATE_COMPARISON_REPORT.txt'
    
    if not os.path.exists(comparison_file):
        print(f"Error: {comparison_file} not found!")
        sys.exit(1)
    
    create_report(comparison_file, report_file)

