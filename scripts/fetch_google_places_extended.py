#!/usr/bin/env python3
"""
Fetch extended Google Places API data and update Supabase database.
This script fetches contact info, amenities, categorization, photos, and reservation fields.
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
    
    def range(self, start: int, end: int):
        """Add range (pagination) to query."""
        self.range_start = start
        self.range_end = end
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
            
            # Supabase REST API uses Range header for pagination
            headers_with_range = self.headers.copy()
            headers_with_range['Range'] = f'{start}-{start + batch_size - 1}'
            
            response = requests.get(self.url, headers=headers_with_range, params=params)
            response.raise_for_status()
            
            batch_data = response.json()
            all_data.extend(batch_data)
            
            # Check if we got a full batch (more might be available)
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
        
        # Convert Python lists/dicts to JSON strings for JSONB columns
        update_data = {}
        for key, value in self.data.items():
            if isinstance(value, (list, dict)):
                update_data[key] = json.dumps(value)
            else:
                update_data[key] = value
        
        response = requests.patch(url, headers=self.headers, json=update_data)
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
    Returns place_id if found, None otherwise.
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
        print(f"  ⚠ Search API error: {e}")
        return None
    
    return None

def get_place_details(api_key, place_id):
    """
    Get detailed place information using Places API (New) Place Details.
    Fetches: contact info, amenities, categorization, photos (top 5), reservation fields,
    business status, opening hours, parking options, price level, payment options,
    accessibility options, allows dogs, and description (editorialSummary with generativeSummary fallback).
    """
    url = f"https://places.googleapis.com/v1/places/{place_id}"
    
    # Field mask for all requested fields
    # Note: Accessibility fields are accessed via accessibilityOptions object
    # Some fields may require Atmosphere Details SKU (increases cost)
    field_mask = (
        "id,"
        "internationalPhoneNumber,"
        "websiteUri,"
        "dineIn,"
        "takeout,"
        "delivery,"
        "servesBreakfast,"
        "servesLunch,"
        "servesDinner,"
        "servesBrunch,"
        "outdoorSeating,"
        "liveMusic,"
        "types,"
        "primaryType,"
        "primaryTypeDisplayName,"
        "photos,"
        "reservable,"
        "businessStatus,"
        "regularOpeningHours,"
        "currentOpeningHours,"
        "parkingOptions,"
        "priceLevel,"
        "paymentOptions,"
        "accessibilityOptions,"
        "allowsDogs,"
        "editorialSummary,"
        "generativeSummary"
    )
    
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": field_mask
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        
        # Check for errors and provide more detail
        if response.status_code != 200:
            error_text = response.text
            # Try to parse error if it's JSON
            try:
                error_data = response.json()
                if 'error' in error_data:
                    error_msg = error_data['error'].get('message', error_text)
                    print(f"  ⚠ API error details: {error_msg}")
            except:
                pass
            response.raise_for_status()
        
        data = response.json()
        
        # Extract top 5 photos
        photos = []
        if 'photos' in data and data['photos']:
            photos = data['photos'][:5]  # Limit to top 5
            # Simplify photo structure for storage
            photos = [
                {
                    'name': photo.get('name', ''),
                    'widthPx': photo.get('widthPx'),
                    'heightPx': photo.get('heightPx'),
                    'authorAttributions': photo.get('authorAttributions', [])
                }
                for photo in photos
            ]
        
        # Extract accessibility options (nested object)
        accessibility = data.get('accessibilityOptions', {})
        
        # Extract description: prioritize editorialSummary, fallback to generativeSummary
        description = None
        
        # Try editorialSummary first (Google's curated description)
        editorial_summary = data.get('editorialSummary', {})
        if isinstance(editorial_summary, dict):
            description = editorial_summary.get('text')
        elif isinstance(editorial_summary, str):
            description = editorial_summary
        
        # Fallback to generativeSummary (AI-generated description) if editorialSummary not available
        if not description:
            generative_summary = data.get('generativeSummary', {})
            if isinstance(generative_summary, dict):
                # generativeSummary has 'text' field with the description
                description = generative_summary.get('text')
            elif isinstance(generative_summary, str):
                description = generative_summary
        
        return {
            'phone_number': data.get('internationalPhoneNumber'),
            'website_uri': data.get('websiteUri'),
            'dine_in': data.get('dineIn'),
            'takeout': data.get('takeout'),
            'delivery': data.get('delivery'),
            'serves_breakfast': data.get('servesBreakfast'),
            'serves_lunch': data.get('servesLunch'),
            'serves_dinner': data.get('servesDinner'),
            'serves_brunch': data.get('servesBrunch'),
            'outdoor_seating': data.get('outdoorSeating'),
            'live_music': data.get('liveMusic'),
            'menu_uri': None,  # Not available in Places API (New)
            'place_types': data.get('types', []),
            'primary_type': data.get('primaryType'),
            'primary_type_display_name': data.get('primaryTypeDisplayName', {}).get('text') if data.get('primaryTypeDisplayName') else None,
            'photos': photos if photos else None,
            'icon_uri': None,  # Not available in Places API (New)
            'icon_background_color': None,  # Not available in Places API (New)
            'reservable': data.get('reservable'),
            # New fields
            'business_status': data.get('businessStatus'),
            'opening_hours': data.get('regularOpeningHours'),
            'current_opening_hours': data.get('currentOpeningHours'),
            'parking_options': data.get('parkingOptions'),
            'price_level': data.get('priceLevel'),
            'payment_options': data.get('paymentOptions'),
            'wheelchair_accessible_parking': accessibility.get('wheelchairAccessibleParking') if isinstance(accessibility, dict) else None,
            'wheelchair_accessible_entrance': accessibility.get('wheelchairAccessibleEntrance') if isinstance(accessibility, dict) else None,
            'wheelchair_accessible_restroom': accessibility.get('wheelchairAccessibleRestroom') if isinstance(accessibility, dict) else None,
            'wheelchair_accessible_seating': accessibility.get('wheelchairAccessibleSeating') if isinstance(accessibility, dict) else None,
            'allows_dogs': data.get('allowsDogs'),
            'description': description
        }
    except requests.exceptions.RequestException as e:
        print(f"  ⚠ Details API error: {e}")
        return None

def update_supabase_with_google_data(supabase, api_key: str, delay=0.1, limit=None, skip_existing=False, update_all=False):
    """
    Fetch properties from Supabase, get Google Places data, and update the database.
    
    Args:
        skip_existing: If True, skip properties that already have Google phone number or website
        update_all: If True, update ALL properties regardless of existing data (overwrites)
    """
    print("Fetching properties from Supabase...")
    
    # Fetch properties that need updating
    if update_all:
        # Get ALL properties - will update/overwrite existing data
        # Use pagination to fetch all records (Supabase REST API has default limit of 1000)
        query = supabase.table('all_glamping_properties').select('id,property_name,city,state,address')
        if limit:
            query = query.limit(limit)
            response = query.execute()
            properties = response.data
        else:
            # Fetch all records using pagination
            response = query.execute_with_pagination()
            properties = response.data
    elif skip_existing:
        # Only get properties without Google data
        query = supabase.table('all_glamping_properties').select('id,property_name,city,state,address,google_phone_number,google_website_uri')
        # Filter for properties without Google data
        # Note: Supabase REST API doesn't support OR filters easily, so we'll filter in Python
        # Use pagination to fetch all records
        response = query.execute_with_pagination()
        
        # Filter in Python for properties without Google data
        properties = [
            p for p in response.data 
            if not p.get('google_phone_number') and not p.get('google_website_uri')
        ]
    else:
        # Get all properties
        query = supabase.table('all_glamping_properties').select('id,property_name,city,state,address')
        if limit:
            query = query.limit(limit)
            response = query.execute()
            properties = response.data
        else:
            # Fetch all records using pagination
            response = query.execute_with_pagination()
            properties = response.data
    
    if not properties:
        print("No properties found that need Google data")
        return
    
    total = len(properties)
    
    print(f"Processing {total} properties...")
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
            continue
        
        print(f"[{idx}/{total}] {prop_name[:50]}...", end=' ', flush=True)
        
        # Search for place
        place_id = search_place(api_key, prop_name, city, state, address)
        
        if not place_id:
            not_found_count += 1
            print("✗ Not found")
            if idx < total:
                time.sleep(delay)
            continue
        
        # Get place details
        place_data = get_place_details(api_key, place_id)
        
        if not place_data:
            error_count += 1
            print("✗ Error fetching details")
            if idx < total:
                time.sleep(delay)
            continue
        
        # Prepare update data (map to database column names)
        # Note: Supabase Python client handles Python lists/dicts for JSONB automatically
        update_data = {
            'google_phone_number': place_data.get('phone_number'),
            'google_website_uri': place_data.get('website_uri'),
            'google_dine_in': place_data.get('dine_in'),
            'google_takeout': place_data.get('takeout'),
            'google_delivery': place_data.get('delivery'),
            'google_serves_breakfast': place_data.get('serves_breakfast'),
            'google_serves_lunch': place_data.get('serves_lunch'),
            'google_serves_dinner': place_data.get('serves_dinner'),
            'google_serves_brunch': place_data.get('serves_brunch'),
            'google_outdoor_seating': place_data.get('outdoor_seating'),
            'google_live_music': place_data.get('live_music'),
            'google_menu_uri': place_data.get('menu_uri'),
            'google_place_types': place_data.get('place_types'),  # List - will be stored as JSONB
            'google_primary_type': place_data.get('primary_type'),
            'google_primary_type_display_name': place_data.get('primary_type_display_name'),
            'google_photos': place_data.get('photos'),  # List of dicts - will be stored as JSONB
            'google_icon_uri': place_data.get('icon_uri'),
            'google_icon_background_color': place_data.get('icon_background_color'),
            'google_reservable': place_data.get('reservable'),
            # New fields
            'google_business_status': place_data.get('business_status'),
            'google_opening_hours': place_data.get('opening_hours'),  # Dict - will be stored as JSONB
            'google_current_opening_hours': place_data.get('current_opening_hours'),  # Dict - will be stored as JSONB
            'google_parking_options': place_data.get('parking_options'),  # Dict - will be stored as JSONB
            'google_price_level': place_data.get('price_level'),
            'google_payment_options': place_data.get('payment_options'),  # Dict - will be stored as JSONB
            'google_wheelchair_accessible_parking': place_data.get('wheelchair_accessible_parking'),
            'google_wheelchair_accessible_entrance': place_data.get('wheelchair_accessible_entrance'),
            'google_wheelchair_accessible_restroom': place_data.get('wheelchair_accessible_restroom'),
            'google_wheelchair_accessible_seating': place_data.get('wheelchair_accessible_seating'),
            'google_allows_dogs': place_data.get('allows_dogs'),
            'google_description': place_data.get('description')
        }
        
        # Remove None values to avoid overwriting with null
        update_data = {k: v for k, v in update_data.items() if v is not None}
        
        # Update in Supabase
        try:
            result = supabase.table('all_glamping_properties').update(update_data).eq('id', prop_id).execute()
            
            if result.data:
                updated_count += 1
                print(f"✓ Updated")
            else:
                error_count += 1
                print("✗ Update failed")
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
    
    parser = argparse.ArgumentParser(description='Fetch Google Places API extended data and update Supabase')
    parser.add_argument('--limit', type=int, help='Limit number of properties to process (for testing)')
    parser.add_argument('--delay', type=float, default=0.15, help='Delay between API calls in seconds (default: 0.15)')
    parser.add_argument('--update-all', action='store_true', help='Update ALL properties, including those with existing Google data (overwrites)')
    parser.add_argument('--skip-existing', action='store_true', help='Skip properties that already have Google phone number or website')
    
    args = parser.parse_args()
    
    api_key = get_api_key()
    supabase = get_supabase_client()
    
    print("Google Places API (New) - Extended Data Fetcher")
    print("=" * 70)
    print()
    
    update_supabase_with_google_data(
        supabase, 
        api_key, 
        delay=args.delay, 
        limit=args.limit,
        update_all=args.update_all,
        skip_existing=args.skip_existing
    )

