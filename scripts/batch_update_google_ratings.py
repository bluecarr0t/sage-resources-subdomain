#!/usr/bin/env python3
"""
Batch update Google Business ratings and review counts in the CSV file.
This script allows you to update multiple properties at once.

Usage:
    python3 batch_update_google_ratings.py

Edit the property_updates dictionary below with ratings you've found.
"""

import csv
import sys

def batch_update_ratings(csv_file, property_updates):
    """
    Update CSV with Google ratings for multiple properties.
    
    property_updates: dict with keys like "Property Name" 
                     and values like {"rating": "4.5", "review_count": "100"}
    """
    rows = []
    updated_count = 0
    not_found = []
    
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
            else:
                # Track properties that weren't found
                if prop_name and prop_name not in not_found:
                    # Check if any property in updates might match (case-insensitive)
                    found_match = False
                    for update_key in property_updates.keys():
                        if prop_name.lower() == update_key.lower():
                            update = property_updates[update_key]
                            if 'rating' in update:
                                row['Google Rating'] = update['rating']
                            if 'review_count' in update:
                                row['Google Review Count'] = update['review_count']
                            updated_count += 1
                            found_match = True
                            break
                    if not found_match:
                        pass  # Property not in updates list
            
            rows.append(row)
    
    # Write back
    with open(csv_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"✓ Updated {updated_count} property entries with Google ratings")
    print(f"  Total properties in CSV: {len(rows)}")
    
    return updated_count

if __name__ == '__main__':
    csv_file = 'csv/NEW_GLAMPING_RESORTS_2024_2025_WITH_RATINGS.csv'
    
    # ============================================================
    # EDIT THIS DICTIONARY WITH RATINGS YOU'VE FOUND
    # Format: "Property Name": {"rating": "4.5", "review_count": "100"}
    # ============================================================
    property_updates = {
        # Already updated from previous lookups:
        "Firefall Ranch": {"rating": "4.6", "review_count": "164"},
        "Camp Aramoni": {"rating": "4.9", "review_count": "363"},
        "Under Canvas Acadia": {"rating": "4.5", "review_count": "176"},
        
        # Add more ratings here as you find them:
        # "Jellystone Park Zion": {"rating": "4.2", "review_count": "450"},
        # "Terramor Outdoor Resort": {"rating": "4.7", "review_count": "280"},
        # "Silver Birch Resort": {"rating": "4.8", "review_count": "120"},
        # ... add more as you research them
    }
    
    print("Updating Google Business ratings in CSV...")
    print(f"Properties to update: {len(property_updates)}")
    print()
    
    updated = batch_update_ratings(csv_file, property_updates)
    
    if updated > 0:
        print(f"\n✓ Successfully updated {updated} properties!")
    else:
        print("\n⚠ No properties were updated. Check that property names match exactly.")

