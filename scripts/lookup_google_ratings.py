#!/usr/bin/env python3
"""
Script to look up Google Business ratings and review counts for properties.
This script reads the CSV and attempts to find Google Business ratings.
Note: This requires manual data entry or Google Places API access.
"""

import csv
import sys
import re

def extract_rating_from_text(text):
    """Extract rating from text if present."""
    # Look for patterns like "4.5 stars" or "4.5/5" or "4.5 rating"
    rating_pattern = r'(\d+\.\d+)\s*(?:stars?|/5|rating)'
    match = re.search(rating_pattern, text, re.IGNORECASE)
    if match:
        return match.group(1)
    return None

def extract_review_count_from_text(text):
    """Extract review count from text if present."""
    # Look for patterns like "150 reviews" or "150 review"
    review_pattern = r'(\d+)\s*reviews?'
    match = re.search(review_pattern, text, re.IGNORECASE)
    if match:
        return match.group(1)
    return None

def read_csv_properties(csv_file):
    """Read properties from CSV and return list of unique properties."""
    properties = []
    seen = set()
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            prop_name = row.get('Property Name', '').strip()
            city = row.get('City', '').strip()
            state = row.get('State', '').strip()
            
            if prop_name and (prop_name, city, state) not in seen:
                seen.add((prop_name, city, state))
                properties.append({
                    'name': prop_name,
                    'city': city,
                    'state': state,
                    'address': row.get('Address', '').strip(),
                    'url': row.get('Url', '').strip()
                })
    
    return properties

if __name__ == '__main__':
    csv_file = 'csv/NEW_GLAMPING_RESORTS_2024_2025.csv'
    properties = read_csv_properties(csv_file)
    
    print(f"Found {len(properties)} unique properties")
    print("\nSample properties:")
    for i, prop in enumerate(properties[:10], 1):
        print(f"{i}. {prop['name']}, {prop['city']}, {prop['state']}")

