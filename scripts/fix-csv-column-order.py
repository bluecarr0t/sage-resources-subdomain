#!/usr/bin/env python3
"""
Script to fix CSV column order - properly reorganize with data preservation
"""

import csv
import sys
from collections import OrderedDict

# Define the new column order - key columns first
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

def fix_csv_column_order(input_file, output_file):
    """Fix CSV column order with proper data preservation"""
    
    # Read the current file
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        
        if not fieldnames:
            print("Error: No fieldnames found in CSV")
            return
        
        # Read all rows with their data
        rows = []
        for row in reader:
            rows.append(dict(row))
        
        # Create new fieldnames list with key columns first
        new_fieldnames = []
        
        # Add key columns first (if they exist)
        for col in KEY_COLUMNS:
            if col in fieldnames:
                new_fieldnames.append(col)
            else:
                print(f"Warning: Column '{col}' not found in CSV")
        
        # Add all other columns in their original order (excluding key columns)
        for col in fieldnames:
            if col not in KEY_COLUMNS:
                new_fieldnames.append(col)
        
        # Write reordered CSV with proper data mapping
        with open(output_file, 'w', encoding='utf-8', newline='') as f_out:
            writer = csv.DictWriter(f_out, fieldnames=new_fieldnames, quoting=csv.QUOTE_MINIMAL)
            writer.writeheader()
            
            for row in rows:
                # Create new row preserving all data
                new_row = OrderedDict()
                for col in new_fieldnames:
                    # Get the value from the original row using the column name
                    new_row[col] = row.get(col, '')
                writer.writerow(new_row)
        
        print(f"✅ Successfully fixed CSV column order")
        print(f"   Input: {input_file}")
        print(f"   Output: {output_file}")
        print(f"   Total columns: {len(new_fieldnames)}")
        print(f"   Key columns moved to front: {len([c for c in KEY_COLUMNS if c in fieldnames])}")

if __name__ == '__main__':
    input_file = 'csv/new-properties/new-glamping-properties.csv'
    output_file = 'csv/new-properties/new-glamping-properties.csv'
    
    fix_csv_column_order(input_file, output_file)
