#!/usr/bin/env python3
"""
Add missing websites to all_glamping_properties table from Google Places API.
Prioritizes google_website_uri, then fetches from Google Places API if needed.
"""

import os
import sys
import time
import requests
import json
from dotenv import load_dotenv

def get_api_key():
    """Get Google Maps API key from environment."""
    env_path = '.env.local'
    if os.path.exists(env_path):
        load_dotenv(env_path)
    
    api_key = os.getenv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY')
    if not api_key:
        load_dotenv('.env')
        api_key = os.getenv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY')
    
    if not api_key:
        print("Error: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not found in environment")
        sys.exit(1)
    return api_key

class SupabaseClient:
    """Simple Supabase REST API client."""
    def __init__(self, url: str, key: str):
        self.url = url.rstrip('/')
        self.key = key
        self.headers = {
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
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
    
    def execute_with_pagination(self):
        """Execute query with pagination to fetch all records."""
        all_data = []
        start = 0
        batch_size = 1000
        has_more = True
        
        while has_more:
            params = {}
            if hasattr(self, 'select_columns'):
                params['select'] = self.select_columns
            
            headers_with_range = self.headers.copy()
            headers_with_range['Range'] = f'{start}-{start + batch_size - 1}'
            
            response = requests.get(self.url, headers=headers_with_range, params=params)
            response.raise_for_status()
            
            batch_data = response.json()
            all_data.extend(batch_data)
            
            has_more = len(batch_data) == batch_size
            start += batch_size
        
        class Result:
            def __init__(self, data):
                self.data = data
        
        return Result(all_data)
    
    def update(self, data: dict):
        """Create an update query builder."""
        return UpdateBuilder(self.url, self.headers, data)
    
    def eq(self, column: str, value):
        """Add an equality filter."""
        self.filter_column = column
        self.filter_value = value
        return self

class UpdateBuilder:
    """Builder for update operations."""
    def __init__(self, url: str, headers: dict, data: dict):
        self.url = url
        self.headers = headers
        self.data = data
        self.filter_column = None
        self.filter_value = None
    
    def eq(self, column: str, value):
        """Add an equality filter."""
        self.filter_column = column
        self.filter_value = value
        return self
    
    def execute(self):
        """Execute the update."""
        url = self.url
        if self.filter_column:
            url += f"?{self.filter_column}=eq.{self.filter_value}"
        
        response = requests.patch(url, headers=self.headers, json=self.data)
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

def search_place(api_key, property_name, city, state, address=None):
    """Search for a place using Places API (New) Text Search."""
    query_parts = [property_name]
    if city:
        query_parts.append(city)
    if state:
        query_parts.append(state)
    if address:
        query_parts.append(address)
    
    query = " ".join(query_parts)
    
    url = "https://places.googleapis.com/v1/places:searchText"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "places.id,places.displayName"
    }
    payload = {
        "textQuery": query,
        "maxResultCount": 1
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if 'places' in data and len(data['places']) > 0:
            place = data['places'][0]
            return place.get('id')
    except requests.exceptions.RequestException as e:
        return None
    
    return None

def get_place_website(api_key, place_id):
    """Get website URI from Google Places API."""
    url = f"https://places.googleapis.com/v1/places/{place_id}"
    
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "websiteUri"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200:
            return None
        
        data = response.json()
        return data.get('websiteUri')
    except requests.exceptions.RequestException:
        return None

def add_missing_websites(supabase, api_key: str, delay=0.15):
    """Add missing websites to properties."""
    print("Fetching properties missing website data...")
    
    # Fetch all properties
    query = supabase.table('all_glamping_properties').select('id,property_name,city,state,address,url,google_website_uri')
    response = query.execute_with_pagination()
    all_properties = response.data
    
    # Filter for properties missing website
    properties_needing_website = [
        p for p in all_properties
        if (not p.get('url') or p.get('url', '').strip() == '') and 
           (not p.get('google_website_uri') or p.get('google_website_uri', '').strip() == '')
    ]
    
    # Also include properties with google_website_uri but not url
    properties_with_google_uri_only = [
        p for p in all_properties
        if (not p.get('url') or p.get('url', '').strip() == '') and 
           p.get('google_website_uri') and p.get('google_website_uri', '').strip() != ''
    ]
    
    total_to_process = len(properties_needing_website) + len(properties_with_google_uri_only)
    
    print(f"\nFound {len(properties_with_google_uri_only)} properties with google_website_uri but not url")
    print(f"Found {len(properties_needing_website)} properties completely missing website")
    print(f"Total to process: {total_to_process}\n")
    
    updated_from_google_uri = 0
    updated_from_api = 0
    not_found = 0
    errors = 0
    
    # First, update properties that have google_website_uri but not url
    print("Step 1: Updating properties with google_website_uri but missing url...")
    for idx, prop in enumerate(properties_with_google_uri_only, 1):
        prop_id = prop['id']
        prop_name = (prop.get('property_name') or '').strip()
        google_uri = prop.get('google_website_uri')
        
        if not prop_name or not google_uri:
            continue
        
        print(f"[{idx}/{len(properties_with_google_uri_only)}] {prop_name[:50]}...", end=' ', flush=True)
        
        try:
            result = supabase.table('all_glamping_properties').update({'url': google_uri}).eq('id', prop_id).execute()
            if result.data:
                updated_from_google_uri += 1
                print(f"✓ Updated from google_website_uri")
            else:
                errors += 1
                print("✗ Update failed")
        except Exception as e:
            errors += 1
            print(f"✗ Error: {e}")
        
        if idx < len(properties_with_google_uri_only):
            time.sleep(0.05)  # Small delay
    
    print()
    
    # Second, fetch missing websites from Google Places API
    print("Step 2: Fetching missing websites from Google Places API...")
    for idx, prop in enumerate(properties_needing_website, 1):
        prop_id = prop['id']
        prop_name = (prop.get('property_name') or '').strip()
        city = (prop.get('city') or '').strip()
        state = (prop.get('state') or '').strip()
        address = (prop.get('address') or '').strip()
        
        if not prop_name:
            continue
        
        print(f"[{idx}/{len(properties_needing_website)}] {prop_name[:50]}...", end=' ', flush=True)
        
        # Search for place
        place_id = search_place(api_key, prop_name, city, state, address)
        
        if not place_id:
            not_found += 1
            print("✗ Not found in Google Places")
            if idx < len(properties_needing_website):
                time.sleep(delay)
            continue
        
        # Get website
        website = get_place_website(api_key, place_id)
        
        if not website:
            not_found += 1
            print("✗ No website in Google Places")
            if idx < len(properties_needing_website):
                time.sleep(delay)
            continue
        
        # Update database
        try:
            update_data = {
                'url': website,
                'google_website_uri': website  # Also update google_website_uri for consistency
            }
            result = supabase.table('all_glamping_properties').update(update_data).eq('id', prop_id).execute()
            
            if result.data:
                updated_from_api += 1
                print(f"✓ Added: {website[:50]}...")
            else:
                errors += 1
                print("✗ Update failed")
        except Exception as e:
            errors += 1
            print(f"✗ Error: {e}")
        
        if idx < len(properties_needing_website):
            time.sleep(delay)
    
    print()
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"  ✓ Updated from google_website_uri: {updated_from_google_uri} properties")
    print(f"  ✓ Updated from Google Places API: {updated_from_api} properties")
    print(f"  ✗ Not found: {not_found} properties")
    print(f"  ⚠ Errors: {errors} properties")
    print(f"  Total processed: {total_to_process} properties")
    print("=" * 70)

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Add missing websites from Google Places API')
    parser.add_argument('--delay', type=float, default=0.15, help='Delay between API calls in seconds (default: 0.15)')
    
    args = parser.parse_args()
    
    api_key = get_api_key()
    supabase = get_supabase_client()
    
    print("Add Missing Websites from Google Places API")
    print("=" * 70)
    print()
    
    add_missing_websites(supabase, api_key, delay=args.delay)
