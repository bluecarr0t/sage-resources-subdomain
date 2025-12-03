#!/usr/bin/env python3
"""
Script to add Google Business Rating and Review Count columns to the CSV file.
This script adds the columns and leaves them empty for manual or automated population.
"""

import csv
import sys

def add_google_rating_columns(input_file, output_file):
    """Add Google Rating and Google Review Count columns to the CSV."""
    
    with open(input_file, 'r', encoding='utf-8') as f_in:
        reader = csv.DictReader(f_in)
        fieldnames = reader.fieldnames
        
        # Add new columns after "Url" column
        if 'Url' in fieldnames:
            url_index = fieldnames.index('Url')
            new_fieldnames = fieldnames[:url_index+1] + ['Google Rating', 'Google Review Count'] + fieldnames[url_index+1:]
        else:
            # If Url column doesn't exist, add at the end
            new_fieldnames = list(fieldnames) + ['Google Rating', 'Google Review Count']
        
        rows = []
        for row in reader:
            # Clean row - remove None keys
            cleaned_row = {k: v for k, v in row.items() if k is not None}
            # Initialize new columns with empty values
            cleaned_row['Google Rating'] = ''
            cleaned_row['Google Review Count'] = ''
            rows.append(cleaned_row)
    
    # Write to output file
    with open(output_file, 'w', encoding='utf-8', newline='') as f_out:
        writer = csv.DictWriter(f_out, fieldnames=new_fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"Added Google Rating and Google Review Count columns to {output_file}")
    print(f"Total rows processed: {len(rows)}")

if __name__ == '__main__':
    input_file = 'csv/NEW_GLAMPING_RESORTS_2024_2025.csv'
    output_file = 'csv/NEW_GLAMPING_RESORTS_2024_2025.csv'
    
    add_google_rating_columns(input_file, output_file)

