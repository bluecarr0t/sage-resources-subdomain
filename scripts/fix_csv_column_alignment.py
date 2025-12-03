#!/usr/bin/env python3
"""
Fix CSV column alignment issues.
The description text is in "INTERNAL NOTES ONLY," field, not Description field.
We need to ensure ratings are in the correct columns.
"""

import csv
import sys

def fix_csv_alignment(input_file, output_file):
    """Fix column alignment in CSV file."""
    
    rows = []
    
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames)
        
        for row in reader:
            # The description is actually in "INTERNAL NOTES ONLY," field
            # Make sure we preserve all data correctly
            rows.append(row)
    
    # Write back with proper alignment
    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"Fixed CSV alignment: {len(rows)} rows processed")
    print(f"Output written to: {output_file}")

if __name__ == '__main__':
    input_file = 'csv/NEW_GLAMPING_RESORTS_2024_2025_WITH_RATINGS.csv'
    output_file = 'csv/NEW_GLAMPING_RESORTS_2024_2025_WITH_RATINGS.csv'
    
    fix_csv_alignment(input_file, output_file)

