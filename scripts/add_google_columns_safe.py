#!/usr/bin/env python3
"""
Safely add Google Rating and Google Review Count columns to CSV.
This script preserves all existing data.
"""

import csv
import sys
import os

def add_google_columns(csv_file):
    """Add Google Rating and Google Review Count columns after Url column."""
    
    # Read all data first
    rows = []
    fieldnames = None
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames)
        
        # Check if columns already exist
        if 'Google Rating' in fieldnames and 'Google Review Count' in fieldnames:
            print("Columns already exist!")
            return
        
        # Find Url column index
        if 'Url' in fieldnames:
            url_idx = fieldnames.index('Url')
            # Insert after Url
            fieldnames.insert(url_idx + 1, 'Google Rating')
            fieldnames.insert(url_idx + 2, 'Google Review Count')
        else:
            # Add at end if Url not found
            fieldnames.extend(['Google Rating', 'Google Review Count'])
        
        # Read all rows
        for row in reader:
            # Clean row - remove None keys
            cleaned_row = {k: v for k, v in row.items() if k is not None}
            # Initialize new columns
            cleaned_row['Google Rating'] = ''
            cleaned_row['Google Review Count'] = ''
            rows.append(cleaned_row)
    
    # Write back to file
    with open(csv_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"Successfully added Google Rating and Google Review Count columns")
    print(f"Total rows processed: {len(rows)}")

if __name__ == '__main__':
    csv_file = 'csv/NEW_GLAMPING_RESORTS_2024_2025.csv'
    
    if not os.path.exists(csv_file):
        print(f"Error: {csv_file} not found!")
        sys.exit(1)
    
    add_google_columns(csv_file)

