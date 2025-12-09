#!/usr/bin/env python3
"""
Script to fix CSV data alignment after column reorganization
Maps values to their correct columns based on known correct positions
"""

import csv
import sys

def fix_csv_data_alignment(input_file, output_file):
    """Fix data alignment by mapping values to correct columns"""
    
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)
    
    # Create corrected rows
    corrected_rows = []
    for row in rows:
        corrected_row = dict(row)
        
        # For each row, check if we need to fix the alignment
        # The issue is that values got shifted. Let me check the pattern:
        # - Site Name has "Web Research..." but should have the site name
        # - Unit Type has URL but should have unit type
        # - State has "Yes" but should have state code
        # - Url has "Yes" but should have URL
        # - Source has state code but should have source
        
        # Check if this row has misaligned data (indicated by "Web Research" in Site Name)
        if 'Web Research' in str(corrected_row.get('Site Name', '')):
            # The values are shifted. Let me map them correctly:
            # Current -> Should be:
            # Site Name (has Source) -> needs to find actual Site Name
            # Unit Type (has Url) -> needs to find actual Unit Type  
            # State (has "Yes" or similar) -> needs to find actual State
            # Url (has "Yes" or similar) -> needs to find actual Url
            # Source (has State) -> needs to find actual Source
            
            # Look for the correct values in other columns
            # Site Name might be in "Shower" column
            if 'Grand Tent' in str(corrected_row.get('Shower', '')) or 'Tent' in str(corrected_row.get('Shower', '')):
                corrected_row['Site Name'] = corrected_row.get('Shower', '')
            
            # Unit Type might be in "Unit Guest Capacity" column
            if 'Safari Tent' in str(corrected_row.get('Unit Guest Capacity', '')) or 'Dome' in str(corrected_row.get('Unit Guest Capacity', '')) or 'Treehouse' in str(corrected_row.get('Unit Guest Capacity', '')):
                corrected_row['Unit Type'] = corrected_row.get('Unit Guest Capacity', '')
            
            # State is in "Source" column
            if corrected_row.get('Source', '') in ['TX', 'NC', 'FL', 'BC', 'MT', 'OR', 'UT', 'MN', 'WA']:
                corrected_row['State'] = corrected_row.get('Source', '')
            
            # Url is in "Unit Type" column
            if 'http' in str(corrected_row.get('Unit Type', '')):
                corrected_row['Url'] = corrected_row.get('Unit Type', '')
            
            # Source should be "Web Research..." which is currently in Site Name
            if 'Web Research' in str(corrected_row.get('Site Name', '')):
                corrected_row['Source'] = corrected_row.get('Site Name', '')
        
        # Also check for other misalignment patterns
        # If State has "Yes" or similar non-state value, try to find correct state
        state_val = corrected_row.get('State', '')
        if state_val and state_val not in ['TX', 'NC', 'FL', 'BC', 'MT', 'OR', 'UT', 'MN', 'WA', 'USA', 'Canada'] and 'Yes' in state_val:
            # Try to find state in Source column
            if corrected_row.get('Source', '') in ['TX', 'NC', 'FL', 'BC', 'MT', 'OR', 'UT', 'MN', 'WA']:
                corrected_row['State'] = corrected_row.get('Source', '')
        
        corrected_rows.append(corrected_row)
    
    # Write corrected CSV
    with open(output_file, 'w', encoding='utf-8', newline='') as f_out:
        writer = csv.DictWriter(f_out, fieldnames=fieldnames, quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        writer.writerows(corrected_rows)
    
    print(f"✅ Fixed data alignment in CSV")
    print(f"   Processed {len(corrected_rows)} rows")

if __name__ == '__main__':
    input_file = 'csv/new-properties/new-glamping-properties.csv'
    output_file = 'csv/new-properties/new-glamping-properties.csv'
    fix_csv_data_alignment(input_file, output_file)
