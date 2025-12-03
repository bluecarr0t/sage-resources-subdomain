#!/usr/bin/env python3
"""
Fetch Google Places API ratings and review counts, then update Supabase database.
This script fetches all properties from sage-glamping-data and updates them with Google ratings.
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
    
    def limit(self, count: int):
        self.limit_count = count
        return self
    
    def execute(self):
        """Execute the select query."""
        params = {}
        if hasattr(self, 'select_columns'):
            params['select'] = self.select_columns
        if hasattr(self, 'limit_count'):
            params['limit'] = str(self.limit_count)
        
        response = requests.get(self.url, headers=self.headers, params=params)
        response.raise_for_status()
        
        class Result:
            def __init__(self, data):
                self.data = data
        
        return Result(response.json())
    
    def update(self, data: dict):
        """Create an update query builder."""
        return UpdateBuilder(self.url, self.headers, data)

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
    # Try both naming conventions for the service role key
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_SECRET_KEY')
    
    if not supabase_url or not supabase_key:
        load_dotenv('.env')
        supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_SECRET_KEY')
    
    if not supabase_url or not supabase_key:
        print("Error: Supabase credentials not found in environment")
        print("Required: NEXT_PUBLIC_SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY")
        sys.exit(1)
    
    return SupabaseClient(supabase_url, supabase_key)

def search_place(api_key, property_name, city, state, address=None):
    """
    Search for a place using Places API (New) Text Search.
    Returns place data with rating and review count if found.
    """
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
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount"
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
            return {
                'place_id': place.get('id'),
                'rating': place.get('rating'),
                'user_rating_count': place.get('userRatingCount'),
                'name': place.get('displayName', {}).get('text', ''),
                'address': place.get('formattedAddress', '')
            }
    except requests.exceptions.RequestException as e:
        print(f"  ⚠ Search API error: {e}")
        return None
    
    return None

def get_place_details(api_key, place_id):
    """
    Get detailed place information using Places API (New) Place Details.
    Specifically fetches rating and review count.
    """
    url = f"https://places.googleapis.com/v1/places/{place_id}"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "id,rating,userRatingCount"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        return {
            'rating': data.get('rating'),
            'user_rating_count': data.get('userRatingCount')
        }
    except requests.exceptions.RequestException as e:
        print(f"  ⚠ Details API error: {e}")
        return None

def update_supabase_with_ratings(supabase, api_key: str, delay=0.1, limit=None, skip_existing=True):
    """
    Fetch properties from Supabase, get Google Places ratings, and update the database.
    
    Args:
        skip_existing: If True, skip properties that already have Google rating
        limit: Maximum number of properties to process (None for all)
    """
    print("Fetching properties from Supabase...")
    
    # Fetch properties that need updating
    # First try to select with rating columns, if that fails, select all columns
    try:
        if skip_existing:
            # Only get properties without Google rating
            query = supabase.table('sage-glamping-data').select('id,property_name,city,state,address,google_rating,google_user_rating_total')
            response = query.execute()
            
            # Filter in Python for properties without Google rating
            properties = [
                p for p in response.data 
                if not p.get('google_rating') and not p.get('google_user_rating_total')
            ]
        else:
            # Get all properties
            query = supabase.table('sage-glamping-data').select('id,property_name,city,state,address,google_rating,google_user_rating_total')
            if limit:
                query = query.limit(limit)
            response = query.execute()
            properties = response.data
    except requests.exceptions.HTTPError as e:
        # If columns don't exist, select all columns and filter in Python
        print("⚠ Rating columns may not exist yet. Fetching all properties...")
        query = supabase.table('sage-glamping-data').select('id,property_name,city,state,address')
        if limit:
            query = query.limit(limit)
        response = query.execute()
        all_properties = response.data
        
        if skip_existing:
            # Filter for properties that don't have rating data (they won't have it if columns don't exist)
            properties = all_properties
        else:
            properties = all_properties
    
    total = len(properties)
    if total == 0:
        print("No properties to update.")
        return
    
    print(f"Found {total} properties to process")
    print(f"API Key: {api_key[:10]}...{api_key[-4:]}")
    print()
    
    updated_count = 0
    not_found_count = 0
    error_count = 0
    skipped_count = 0
    
    for idx, prop in enumerate(properties, 1):
        prop_id = prop['id']
        prop_name = (prop.get('property_name') or '').strip()
        city = (prop.get('city') or '').strip()
        state = (prop.get('state') or '').strip()
        address = (prop.get('address') or '').strip()
        
        if not prop_name:
            skipped_count += 1
            print(f"[{idx}/{total}] ⏭ Skipping: No property name (ID: {prop_id})")
            continue
        
        print(f"[{idx}/{total}] Searching: {prop_name}, {city}, {state}...", end=' ', flush=True)
        
        # Search for place
        place_data = search_place(api_key, prop_name, city, state, address)
        
        if not place_data or not place_data.get('place_id'):
            not_found_count += 1
            print("✗ Not found")
            if idx < total:
                time.sleep(delay)
            continue
        
        # Get rating and review count
        rating = place_data.get('rating')
        review_count = place_data.get('user_rating_count')
        
        # If rating not in search results, try place details
        if rating is None:
            details = get_place_details(api_key, place_data['place_id'])
            if details:
                rating = details.get('rating')
                review_count = details.get('user_rating_count') or review_count
        
        if rating is None:
            not_found_count += 1
            print("✗ No rating found")
            if idx < total:
                time.sleep(delay)
            continue
        
        # Prepare update data
        update_data = {}
        if rating is not None:
            update_data['google_rating'] = float(rating)
        if review_count is not None:
            update_data['google_user_rating_total'] = int(review_count)
        
        if not update_data:
            not_found_count += 1
            print("✗ No data to update")
            if idx < total:
                time.sleep(delay)
            continue
        
        # Update in Supabase
        try:
            result = supabase.table('sage-glamping-data').update(update_data).eq('id', prop_id).execute()
            
            if result.data:
                updated_count += 1
                rating_str = f"{rating:.1f}" if rating else "N/A"
                review_str = f"{review_count:,}" if review_count else "N/A"
                print(f"✓ Updated: {rating_str} stars, {review_str} reviews")
            else:
                error_count += 1
                print("✗ Update failed")
        except requests.exceptions.HTTPError as e:
            error_count += 1
            if e.response.status_code == 400:
                print(f"✗ Error: Database columns may not exist. Please run scripts/add-google-rating-columns.sql first")
            else:
                print(f"✗ Error: {e}")
        except Exception as e:
            error_count += 1
            print(f"✗ Error: {e}")
        
        # Rate limiting
        if idx < total:
            time.sleep(delay)
    
    print()
    print("=" * 70)
    print("Summary:")
    print(f"  ✓ Updated: {updated_count} properties")
    print(f"  ✗ Not found: {not_found_count} properties")
    print(f"  ⚠ Errors: {error_count} properties")
    print(f"  - Skipped: {skipped_count} properties")
    print(f"  Total processed: {total} properties")
    print("=" * 70)

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Fetch Google Places ratings and update Supabase')
    parser.add_argument('--limit', type=int, help='Limit number of properties to process')
    parser.add_argument('--update-all', action='store_true', help='Update all properties, even if they already have ratings')
    parser.add_argument('--delay', type=float, default=0.1, help='Delay between API calls in seconds (default: 0.1)')
    
    args = parser.parse_args()
    
    api_key = get_api_key()
    supabase = get_supabase_client()
    
    print("Google Places API - Rating Fetcher for Supabase")
    print("=" * 70)
    print()
    
    update_supabase_with_ratings(
        supabase, 
        api_key, 
        delay=args.delay,
        limit=args.limit,
        skip_existing=not args.update_all
    )

