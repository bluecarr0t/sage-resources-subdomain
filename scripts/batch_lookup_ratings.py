#!/usr/bin/env python3
"""
Script to update CSV with Google Business ratings and review counts.
This script reads the CSV, allows manual entry or API-based lookup of ratings.
"""

import csv
import sys

def update_csv_with_ratings(csv_file, ratings_data):
    """Update CSV file with Google Business ratings and review counts."""
    
    rows = []
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        
        for row in reader:
            prop_name = row.get('Property Name', '').strip()
            city = row.get('City', '').strip()
            state = row.get('State', '').strip()
            
            # Create a key for lookup
            key = f"{prop_name}|{city}|{state}"
            
            # Look up rating data
            if key in ratings_data:
                row['Google Rating'] = ratings_data[key].get('rating', '')
                row['Google Review Count'] = ratings_data[key].get('review_count', '')
            
            rows.append(row)
    
    # Write updated data
    with open(csv_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"Updated {len(rows)} rows in CSV")

if __name__ == '__main__':
    # Example usage - this would be populated with actual data
    ratings_data = {
        "Firefall Ranch|Groveland|CA": {"rating": "4.6", "review_count": "164"}
    }
    
    csv_file = 'csv/NEW_GLAMPING_RESORTS_2024_2025.csv'
    update_csv_with_ratings(csv_file, ratings_data)

