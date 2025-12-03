#!/usr/bin/env python3
"""
Combine CSV files with Google Places API data from Supabase.
Creates a unified CSV with all original columns plus new Google Places fields.
"""

import csv
import os
import sys
import json
import requests
from dotenv import load_dotenv
from pathlib import Path

class SupabaseClient:
    """Simple Supabase REST API client."""
    def __init__(self, url: str, key: str):
        self.url = url.rstrip('/')
        self.key = key
        self.headers = {
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json',
        }
    
    def table(self, table_name: str):
        return SupabaseTable(self.url, self.headers, table_name)

class SupabaseTable:
    """Represents a Supabase table for REST API operations."""
    def __init__(self, base_url: str, headers: dict, table_name: str):
        self.base_url = base_url
        self.headers = headers
        self.table_name = table_name
        self.url = f"{base_url}/rest/v1/{table_name}"
    
    def select(self, columns: str = '*'):
        self.select_columns = columns
        return self
    
    def execute(self):
        """Execute the select query."""
        params = {}
        if hasattr(self, 'select_columns'):
            params['select'] = self.select_columns
        
        response = requests.get(self.url, headers=self.headers, params=params)
        response.raise_for_status()
        
        class Result:
            def __init__(self, data):
                self.data = data
        
        return Result(response.json())

def get_supabase_client():
    """Get Supabase client from environment."""
    env_path = '.env.local'
    if os.path.exists(env_path):
        load_dotenv(env_path)
    
    supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_SECRET_KEY')
    
    if not supabase_url or not supabase_key:
        load_dotenv('.env')
        supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_SECRET_KEY')
    
    if not supabase_url or not supabase_key:
        print("Error: Supabase credentials not found in environment")
        sys.exit(1)
    
    return SupabaseClient(supabase_url, supabase_key)

def read_csv_file(file_path):
    """Read a CSV file and return rows as list of dicts."""
    if not os.path.exists(file_path):
        print(f"Warning: File not found: {file_path}")
        return []
    
    rows = []
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    
    print(f"  Read {len(rows)} rows from {os.path.basename(file_path)}")
    return rows

def fetch_google_data_from_supabase(supabase):
    """Fetch all properties with Google Places data from Supabase."""
    print("Fetching Google Places data from Supabase...")
    
    # Select all columns including Google Places fields
    google_fields = [
        'id',
        'property_name',
        'google_phone_number',
        'google_website_uri',
        'google_dine_in',
        'google_takeout',
        'google_delivery',
        'google_serves_breakfast',
        'google_serves_lunch',
        'google_serves_dinner',
        'google_serves_brunch',
        'google_outdoor_seating',
        'google_live_music',
        'google_menu_uri',
        'google_place_types',
        'google_primary_type',
        'google_primary_type_display_name',
        'google_photos',
        'google_icon_uri',
        'google_icon_background_color',
        'google_reservable'
    ]
    
    try:
        result = supabase.table('sage-glamping-data').select(','.join(google_fields)).execute()
        print(f"  Fetched {len(result.data)} properties with Google data")
        return result.data
    except Exception as e:
        print(f"  Error fetching from Supabase: {e}")
        return []

def create_property_lookup(google_data):
    """Create a lookup dictionary by property_name."""
    lookup = {}
    for prop in google_data:
        prop_name = prop.get('property_name', '').strip()
        if prop_name:
            # Store the first occurrence (or you could merge if there are duplicates)
            if prop_name not in lookup:
                lookup[prop_name] = prop
            else:
                # If duplicate, prefer the one with more Google data
                existing = lookup[prop_name]
                existing_count = sum(1 for k, v in existing.items() 
                                   if k.startswith('google_') and v is not None)
                new_count = sum(1 for k, v in prop.items() 
                              if k.startswith('google_') and v is not None)
                if new_count > existing_count:
                    lookup[prop_name] = prop
    
    return lookup

def add_google_columns_to_row(row, google_data_lookup):
    """Add Google Places columns to a CSV row."""
    prop_name = row.get('Property Name', '').strip()
    
    if not prop_name or prop_name not in google_data_lookup:
        # Add empty Google columns
        return add_empty_google_columns(row)
    
    google_prop = google_data_lookup[prop_name]
    
    # Add Google Places columns
    row['Google Phone Number'] = google_prop.get('google_phone_number') or ''
    row['Google Website URI'] = google_prop.get('google_website_uri') or ''
    row['Google Dine In'] = 'Yes' if google_prop.get('google_dine_in') else 'No' if google_prop.get('google_dine_in') is False else ''
    row['Google Takeout'] = 'Yes' if google_prop.get('google_takeout') else 'No' if google_prop.get('google_takeout') is False else ''
    row['Google Delivery'] = 'Yes' if google_prop.get('google_delivery') else 'No' if google_prop.get('google_delivery') is False else ''
    row['Google Serves Breakfast'] = 'Yes' if google_prop.get('google_serves_breakfast') else 'No' if google_prop.get('google_serves_breakfast') is False else ''
    row['Google Serves Lunch'] = 'Yes' if google_prop.get('google_serves_lunch') else 'No' if google_prop.get('google_serves_lunch') is False else ''
    row['Google Serves Dinner'] = 'Yes' if google_prop.get('google_serves_dinner') else 'No' if google_prop.get('google_serves_dinner') is False else ''
    row['Google Serves Brunch'] = 'Yes' if google_prop.get('google_serves_brunch') else 'No' if google_prop.get('google_serves_brunch') is False else ''
    row['Google Outdoor Seating'] = 'Yes' if google_prop.get('google_outdoor_seating') else 'No' if google_prop.get('google_outdoor_seating') is False else ''
    row['Google Live Music'] = 'Yes' if google_prop.get('google_live_music') else 'No' if google_prop.get('google_live_music') is False else ''
    row['Google Menu URI'] = google_prop.get('google_menu_uri') or ''
    
    # Handle JSONB fields
    place_types = google_prop.get('google_place_types')
    if place_types:
        if isinstance(place_types, str):
            try:
                place_types = json.loads(place_types)
            except:
                place_types = []
        row['Google Place Types'] = ', '.join(place_types) if isinstance(place_types, list) else str(place_types)
    else:
        row['Google Place Types'] = ''
    
    row['Google Primary Type'] = google_prop.get('google_primary_type') or ''
    row['Google Primary Type Display Name'] = google_prop.get('google_primary_type_display_name') or ''
    
    # Handle photos (JSONB array)
    photos = google_prop.get('google_photos')
    if photos:
        if isinstance(photos, str):
            try:
                photos = json.loads(photos)
            except:
                photos = []
        # Store photo count and first photo name
        row['Google Photos Count'] = str(len(photos)) if isinstance(photos, list) else '0'
        if isinstance(photos, list) and len(photos) > 0:
            row['Google Photos'] = json.dumps(photos[:5])  # Top 5 photos as JSON string
        else:
            row['Google Photos'] = ''
    else:
        row['Google Photos Count'] = '0'
        row['Google Photos'] = ''
    
    row['Google Icon URI'] = google_prop.get('google_icon_uri') or ''
    row['Google Icon Background Color'] = google_prop.get('google_icon_background_color') or ''
    row['Google Reservable'] = 'Yes' if google_prop.get('google_reservable') else 'No' if google_prop.get('google_reservable') is False else ''
    
    return row

def add_empty_google_columns(row):
    """Add empty Google Places columns to a row."""
    google_columns = [
        'Google Phone Number',
        'Google Website URI',
        'Google Dine In',
        'Google Takeout',
        'Google Delivery',
        'Google Serves Breakfast',
        'Google Serves Lunch',
        'Google Serves Dinner',
        'Google Serves Brunch',
        'Google Outdoor Seating',
        'Google Live Music',
        'Google Menu URI',
        'Google Place Types',
        'Google Primary Type',
        'Google Primary Type Display Name',
        'Google Photos Count',
        'Google Photos',
        'Google Icon URI',
        'Google Icon Background Color',
        'Google Reservable'
    ]
    
    for col in google_columns:
        if col not in row:
            row[col] = ''
    
    return row

def combine_csv_files(file1_path, file2_path, output_path, supabase):
    """Combine two CSV files and add Google Places data."""
    print("=" * 70)
    print("Combining CSV Files with Google Places Data")
    print("=" * 70)
    print()
    
    # Read both CSV files
    print("Reading CSV files...")
    rows1 = read_csv_file(file1_path)
    rows2 = read_csv_file(file2_path)
    
    if not rows1 and not rows2:
        print("Error: No data found in either CSV file")
        return
    
    # Fetch Google data from Supabase
    google_data = fetch_google_data_from_supabase(supabase)
    google_lookup = create_property_lookup(google_data)
    print(f"  Created lookup for {len(google_lookup)} unique properties")
    print()
    
    # Combine rows
    all_rows = rows1 + rows2
    print(f"Combining {len(rows1)} + {len(rows2)} = {len(all_rows)} total rows")
    print()
    
    # Get all unique column names from both files
    all_columns = set()
    for row in all_rows:
        all_columns.update(row.keys())
    
    # Add Google columns
    google_columns = [
        'Google Phone Number',
        'Google Website URI',
        'Google Dine In',
        'Google Takeout',
        'Google Delivery',
        'Google Serves Breakfast',
        'Google Serves Lunch',
        'Google Serves Dinner',
        'Google Serves Brunch',
        'Google Outdoor Seating',
        'Google Live Music',
        'Google Menu URI',
        'Google Place Types',
        'Google Primary Type',
        'Google Primary Type Display Name',
        'Google Photos Count',
        'Google Photos',
        'Google Icon URI',
        'Google Icon Background Color',
        'Google Reservable'
    ]
    
    all_columns.update(google_columns)
    
    # Sort columns: original columns first, then Google columns at the end
    original_columns = sorted([c for c in all_columns if not c.startswith('Google ')])
    google_columns_sorted = sorted([c for c in all_columns if c.startswith('Google ')])
    final_columns = original_columns + google_columns_sorted
    
    # Process rows and add Google data
    print("Adding Google Places data to rows...")
    processed_rows = []
    matched_count = 0
    
    for row in all_rows:
        prop_name = row.get('Property Name', '').strip()
        if prop_name in google_lookup:
            matched_count += 1
        processed_row = add_google_columns_to_row(row, google_lookup)
        processed_rows.append(processed_row)
    
    print(f"  Matched {matched_count} properties with Google data")
    print()
    
    # Ensure output directory exists
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Write combined CSV
    print(f"Writing combined CSV to: {output_path}")
    with open(output_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=final_columns)
        writer.writeheader()
        writer.writerows(processed_rows)
    
    print(f"  ✓ Successfully wrote {len(processed_rows)} rows")
    print(f"  ✓ Total columns: {len(final_columns)}")
    print(f"  ✓ Google columns added: {len(google_columns_sorted)}")
    print()
    print("=" * 70)
    print("Complete!")
    print("=" * 70)

if __name__ == '__main__':
    # File paths
    file1 = '/Users/nickharsell/Documents/Projects/sage-subdomain-marketing/csv/NEW_GLAMPING_RESORTS_2024_2025_WITH_RATINGS_UPDATED.csv'
    file2 = '/Users/nickharsell/Documents/Projects/sage-subdomain-marketing/csv/sage-glamping-sites_UPDATED.csv'
    output = '/Users/nickharsell/Documents/Projects/sage-subdomain-marketing/csv/Main/sage-glamping-combined-with-google-data.csv'
    
    # Get Supabase client
    supabase = get_supabase_client()
    
    # Combine files
    combine_csv_files(file1, file2, output, supabase)

