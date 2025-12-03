#!/usr/bin/env python3
"""
Update Google Business ratings and review counts in the CSV file.
This script updates the ratings based on a dictionary of property updates.
"""

import csv
import sys

def update_ratings_in_csv(csv_file, property_updates):
    """
    Update CSV with Google ratings.
    property_updates: dict with keys like "Property Name" 
                     and values like {"rating": "4.5", "review_count": "100"}
    """
    rows = []
    updated_count = 0
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames)
        
        for row in reader:
            prop_name = row.get('Property Name', '').strip()
            
            # Try to find matching update by property name
            if prop_name in property_updates:
                update = property_updates[prop_name]
                if 'rating' in update:
                    row['Google Rating'] = update['rating']
                if 'review_count' in update:
                    row['Google Review Count'] = update['review_count']
                updated_count += 1
            
            rows.append(row)
    
    # Write back
    with open(csv_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"Updated {updated_count} property entries with Google ratings")

if __name__ == '__main__':
    csv_file = 'csv/NEW_GLAMPING_RESORTS_2024_2025_WITH_RATINGS.csv'
    
    # Property updates - will be populated as we find ratings
    property_updates = {
        "Firefall Ranch": {"rating": "4.6", "review_count": "164"},
        "Camp Aramoni": {"rating": "4.9", "review_count": "363"},
        "Under Canvas Acadia": {"rating": "4.5", "review_count": "176"}
    }
    
    update_ratings_in_csv(csv_file, property_updates)

