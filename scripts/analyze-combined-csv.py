#!/usr/bin/env python3
"""
Analyze the combined CSV file for data quality issues and cleaning recommendations.
"""

import csv
import json
import re
from collections import Counter, defaultdict
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

def is_valid_phone(phone):
    """Check if phone number format is reasonable."""
    if not phone or phone.strip() == '':
        return False
    # Remove common separators
    digits = re.sub(r'[^\d+]', '', phone)
    # Should have at least 10 digits (US/Canada) or start with +
    return len(digits) >= 10 or phone.startswith('+')

def is_valid_coordinate(coord):
    """Check if coordinate is valid."""
    if not coord or coord.strip() == '':
        return False
    try:
        val = float(coord)
        return -180 <= val <= 180
    except:
        return False

def analyze_csv(file_path):
    """Analyze CSV for data quality issues."""
    print('=' * 70)
    print('CSV DATA QUALITY ANALYSIS')
    print('=' * 70)
    print()
    
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fieldnames = reader.fieldnames
    
    print(f'📊 FILE OVERVIEW')
    print(f'   Total rows: {len(rows)}')
    print(f'   Total columns: {len(fieldnames)}')
    print()
    
    # 1. Check for duplicates
    print('🔍 DUPLICATE ANALYSIS')
    property_names = [row.get('Property Name', '').strip() for row in rows if row.get('Property Name', '').strip()]
    name_counts = Counter(property_names)
    duplicates = {name: count for name, count in name_counts.items() if count > 1}
    
    if duplicates:
        print(f'   ⚠️  Found {len(duplicates)} duplicate property names:')
        for name, count in list(duplicates.items())[:10]:
            print(f'      - "{name}": {count} occurrences')
        if len(duplicates) > 10:
            print(f'      ... and {len(duplicates) - 10} more')
    else:
        print('   ✓ No duplicate property names found')
    print()
    
    # 2. Missing critical data
    print('📋 MISSING CRITICAL DATA')
    critical_fields = {
        'Property Name': 'Property Name',
        'Address': 'Address',
        'City': 'City',
        'State': 'State',
        'Latitude': 'Latitude',
        'Longitude': 'Longitude',
        'Url': 'Url'
    }
    
    missing_counts = {}
    for field_key, field_name in critical_fields.items():
        missing = sum(1 for row in rows if not row.get(field_name, '').strip())
        missing_counts[field_name] = missing
        percentage = (missing / len(rows)) * 100
        status = '⚠️' if missing > 0 else '✓'
        print(f'   {status} {field_name}: {missing} missing ({percentage:.1f}%)')
    print()
    
    # 3. Coordinate validation
    print('📍 COORDINATE VALIDATION')
    invalid_coords = []
    missing_coords = 0
    
    for i, row in enumerate(rows, 1):
        lat = row.get('Latitude', '').strip()
        lon = row.get('Longitude', '').strip()
        prop_name = row.get('Property Name', '').strip()
        
        if not lat or not lon:
            missing_coords += 1
        elif not is_valid_coordinate(lat) or not is_valid_coordinate(lon):
            invalid_coords.append((i, prop_name, lat, lon))
    
    print(f'   Missing coordinates: {missing_coords} ({missing_coords/len(rows)*100:.1f}%)')
    if invalid_coords:
        print(f'   ⚠️  Invalid coordinates: {len(invalid_coords)}')
        for idx, name, lat, lon in invalid_coords[:5]:
            print(f'      Row {idx}: "{name}" - Lat: {lat}, Lon: {lon}')
        if len(invalid_coords) > 5:
            print(f'      ... and {len(invalid_coords) - 5} more')
    else:
        print('   ✓ All coordinates are valid')
    print()
    
    # 4. URL validation
    print('🔗 URL VALIDATION')
    url_field = 'Url'
    invalid_urls = []
    missing_urls = 0
    
    for i, row in enumerate(rows, 1):
        url = row.get(url_field, '').strip()
        prop_name = row.get('Property Name', '').strip()
        
        if not url:
            missing_urls += 1
        elif not is_valid_url(url):
            invalid_urls.append((i, prop_name, url))
    
    print(f'   Missing URLs: {missing_urls} ({missing_urls/len(rows)*100:.1f}%)')
    if invalid_urls:
        print(f'   ⚠️  Invalid URLs: {len(invalid_urls)}')
        for idx, name, url in invalid_urls[:5]:
            print(f'      Row {idx}: "{name}" - "{url}"')
        if len(invalid_urls) > 5:
            print(f'      ... and {len(invalid_urls) - 5} more')
    else:
        print('   ✓ All URLs are valid')
    print()
    
    # 5. Google data coverage
    print('🔍 GOOGLE PLACES DATA COVERAGE')
    google_fields = {
        'Google Phone Number': 'Google Phone Number',
        'Google Website URI': 'Google Website URI',
        'Google Primary Type': 'Google Primary Type',
        'Google Place Types': 'Google Place Types',
        'Google Photos Count': 'Google Photos Count',
        'Google Rating': 'Google Rating',
        'Google Review Count': 'Google Review Count'
    }
    
    for field_key, field_name in google_fields.items():
        has_data = sum(1 for row in rows if row.get(field_name, '').strip())
        percentage = (has_data / len(rows)) * 100
        print(f'   {field_name}: {has_data} rows ({percentage:.1f}%)')
    print()
    
    # 6. Phone number validation
    print('📞 PHONE NUMBER VALIDATION')
    phone_fields = ['Google Phone Number']
    for field in phone_fields:
        invalid_phones = []
        for i, row in enumerate(rows, 1):
            phone = row.get(field, '').strip()
            if phone and not is_valid_phone(phone):
                invalid_phones.append((i, row.get('Property Name', '').strip(), phone))
        
        if invalid_phones:
            print(f'   ⚠️  {field}: {len(invalid_phones)} invalid phone numbers')
            for idx, name, phone in invalid_phones[:5]:
                print(f'      Row {idx}: "{name}" - "{phone}"')
        else:
            print(f'   ✓ {field}: All phone numbers are valid')
    print()
    
    # 7. Data consistency checks
    print('🔄 DATA CONSISTENCY CHECKS')
    
    # Check for inconsistent state abbreviations
    states = [row.get('State', '').strip().upper() for row in rows if row.get('State', '').strip()]
    state_counts = Counter(states)
    unusual_states = [s for s in state_counts.keys() if len(s) > 2 or (len(s) == 2 and not s.isalpha())]
    if unusual_states:
        print(f'   ⚠️  Unusual state values: {unusual_states[:10]}')
    
    # Check for empty rows (all fields empty)
    empty_rows = []
    for i, row in enumerate(rows, 1):
        if all(not v or not str(v).strip() for v in row.values()):
            empty_rows.append(i)
    
    if empty_rows:
        print(f'   ⚠️  Found {len(empty_rows)} completely empty rows: {empty_rows[:10]}')
    else:
        print('   ✓ No completely empty rows')
    print()
    
    # 8. Google Website URI vs Url comparison
    print('🔗 URL CONSISTENCY (Google vs Original)')
    url_matches = 0
    url_mismatches = 0
    google_only = 0
    original_only = 0
    
    for row in rows:
        original_url = row.get('Url', '').strip().lower()
        google_url = row.get('Google Website URI', '').strip().lower()
        
        if google_url and original_url:
            # Normalize URLs for comparison
            orig_norm = original_url.replace('http://', '').replace('https://', '').rstrip('/')
            google_norm = google_url.replace('http://', '').replace('https://', '').rstrip('/')
            
            if orig_norm == google_norm:
                url_matches += 1
            else:
                url_mismatches += 1
        elif google_url:
            google_only += 1
        elif original_url:
            original_only += 1
    
    print(f'   URLs match: {url_matches}')
    print(f'   URLs differ: {url_mismatches}')
    print(f'   Google only: {google_only}')
    print(f'   Original only: {original_only}')
    print()
    
    # 9. Recommendations
    print('=' * 70)
    print('📝 CLEANING RECOMMENDATIONS')
    print('=' * 70)
    print()
    
    recommendations = []
    
    if duplicates:
        recommendations.append({
            'priority': 'HIGH',
            'issue': f'{len(duplicates)} duplicate property names found',
            'action': 'Review and merge or remove duplicate entries',
            'count': len(duplicates)
        })
    
    if missing_coords > len(rows) * 0.1:  # More than 10% missing
        recommendations.append({
            'priority': 'HIGH',
            'issue': f'{missing_coords} rows missing coordinates ({missing_coords/len(rows)*100:.1f}%)',
            'action': 'Geocode missing addresses using Google Places API',
            'count': missing_coords
        })
    
    if invalid_coords:
        recommendations.append({
            'priority': 'HIGH',
            'issue': f'{len(invalid_coords)} rows with invalid coordinates',
            'action': 'Fix or remove invalid coordinate values',
            'count': len(invalid_coords)
        })
    
    if invalid_urls:
        recommendations.append({
            'priority': 'MEDIUM',
            'issue': f'{len(invalid_urls)} rows with invalid URLs',
            'action': 'Fix or remove invalid URL values',
            'count': len(invalid_urls)
        })
    
    if url_mismatches > 0:
        recommendations.append({
            'priority': 'LOW',
            'issue': f'{url_mismatches} rows where Google URL differs from original',
            'action': 'Review and decide which URL to keep (prefer Google if verified)',
            'count': url_mismatches
        })
    
    if google_only > len(rows) * 0.2:  # More than 20% have Google URLs but not original
        recommendations.append({
            'priority': 'MEDIUM',
            'issue': f'{google_only} rows have Google URLs but missing original URLs',
            'action': 'Consider updating original URL field with Google data',
            'count': google_only
        })
    
    if empty_rows:
        recommendations.append({
            'priority': 'HIGH',
            'issue': f'{len(empty_rows)} completely empty rows',
            'action': 'Remove empty rows',
            'count': len(empty_rows)
        })
    
    if not recommendations:
        print('   ✓ No major issues found! Data quality looks good.')
    else:
        for i, rec in enumerate(recommendations, 1):
            print(f'   {i}. [{rec["priority"]}] {rec["issue"]}')
            print(f'      Action: {rec["action"]}')
            print()
    
    print('=' * 70)
    print('ANALYSIS COMPLETE')
    print('=' * 70)
    
    return {
        'total_rows': len(rows),
        'duplicates': len(duplicates),
        'missing_coords': missing_coords,
        'invalid_coords': len(invalid_coords),
        'invalid_urls': len(invalid_urls),
        'url_mismatches': url_mismatches,
        'recommendations': recommendations
    }

if __name__ == '__main__':
    file_path = '/Users/nickharsell/Documents/Projects/sage-subdomain-marketing/csv/Main/sage-glamping-combined-with-google-data.csv'
    analyze_csv(file_path)

