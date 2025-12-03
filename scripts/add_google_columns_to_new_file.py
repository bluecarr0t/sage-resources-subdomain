#!/usr/bin/env python3
"""
Create a new CSV file with Google Rating and Google Review Count columns added.
This script reads the existing CSV and creates a new file with the additional columns.
"""

import csv
import sys
import os

def create_csv_with_google_columns(input_file, output_file):
    """Add Google Rating and Google Review Count columns to CSV and save to new file."""
    
    rows = []
    fieldnames = None
    
    # Read the input CSV
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames)
        
        # Check if columns already exist
        if 'Google Rating' in fieldnames and 'Google Review Count' in fieldnames:
            print("Columns already exist in input file!")
            # Still create output file
            for row in reader:
                rows.append(row)
        else:
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
                # Initialize new columns with empty values
                cleaned_row['Google Rating'] = ''
                cleaned_row['Google Review Count'] = ''
                rows.append(cleaned_row)
    
    # Write to new output file
    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"Successfully created {output_file} with Google Rating and Google Review Count columns")
    print(f"Total rows processed: {len(rows)}")
    print(f"New columns added after 'Url' column")

if __name__ == '__main__':
    input_file = 'csv/NEW_GLAMPING_RESORTS_2024_2025.csv'
    output_file = 'csv/NEW_GLAMPING_RESORTS_2024_2025_WITH_RATINGS.csv'
    
    if not os.path.exists(input_file):
        print(f"Error: {input_file} not found!")
        sys.exit(1)
    
    create_csv_with_google_columns(input_file, output_file)

