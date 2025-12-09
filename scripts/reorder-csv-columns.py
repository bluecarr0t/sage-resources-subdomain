#!/usr/bin/env python3
"""
Script to reorganize CSV columns to put key columns first
"""

import csv
import sys

# Define the new column order - key columns first, then all others
KEY_COLUMNS = [
    'Property Name',
    'Site Name',
    'Unit Type',
    'Address',
    'City',
    'State',
    'Country',
    'Url'
]

def reorder_csv(input_file, output_file):
    """Reorder CSV columns with key columns first"""
    
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        
        if not fieldnames:
            print("Error: No fieldnames found in CSV")
            return
        
        # Create new fieldnames list with key columns first
        new_fieldnames = []
        remaining_columns = []
        
        # Add key columns first (if they exist)
        for col in KEY_COLUMNS:
            if col in fieldnames:
                new_fieldnames.append(col)
            else:
                print(f"Warning: Column '{col}' not found in CSV")
        
        # Add all other columns in their original order (excluding key columns)
        for col in fieldnames:
            if col not in KEY_COLUMNS:
                remaining_columns.append(col)
        
        new_fieldnames.extend(remaining_columns)
        
        # Read all rows
        rows = list(reader)
        
        # Write reordered CSV
        with open(output_file, 'w', encoding='utf-8', newline='') as f_out:
            writer = csv.DictWriter(f_out, fieldnames=new_fieldnames)
            writer.writeheader()
            
            for row in rows:
                # Create new row with reordered columns
                new_row = {}
                for col in new_fieldnames:
                    new_row[col] = row.get(col, '')
                writer.writerow(new_row)
        
        print(f"✅ Successfully reordered CSV columns")
        print(f"   Input: {input_file}")
        print(f"   Output: {output_file}")
        print(f"   Total columns: {len(new_fieldnames)}")
        print(f"   Key columns moved to front: {len([c for c in KEY_COLUMNS if c in fieldnames])}")

if __name__ == '__main__':
    input_file = 'csv/new-properties/new-glamping-properties.csv'
    output_file = 'csv/new-properties/new-glamping-properties.csv'
    
    reorder_csv(input_file, output_file)
