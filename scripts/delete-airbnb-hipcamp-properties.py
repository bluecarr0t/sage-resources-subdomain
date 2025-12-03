#!/usr/bin/env python3
"""
Delete properties from sage-glamping-data that have Airbnb or Hipcamp in their website URLs.
Only keeps professional glamping resorts with their own websites.
"""

import os
import sys
import requests
from dotenv import load_dotenv

def get_supabase_credentials():
    """Get Supabase credentials from environment."""
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
        print("Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY")
        sys.exit(1)
    
    return supabase_url, supabase_key

def find_properties_to_delete(supabase_url, supabase_key):
    """Find all properties with Airbnb or Hipcamp in their URLs."""
    headers = {
        'apikey': supabase_key,
        'Authorization': f'Bearer {supabase_key}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
    
    # Search for properties with Airbnb or Hipcamp in URL or Google Website URI
    # Using ilike for case-insensitive search
    url = f"{supabase_url}/rest/v1/sage-glamping-data"
    
    # Get all records and filter in Python (Supabase OR filter syntax can be tricky)
    params = {
        'select': 'id,property_name,url,google_website_uri'
    }
    
    response = requests.get(url, headers=headers, params=params)
    response.raise_for_status()
    all_properties = response.json()
    
    # Filter for Airbnb/Hipcamp
    properties_to_delete = []
    for prop in all_properties:
        url_val = (prop.get('url') or '').lower()
        google_url = (prop.get('google_website_uri') or '').lower()
        
        if 'airbnb' in url_val or 'hipcamp' in url_val or 'airbnb' in google_url or 'hipcamp' in google_url:
            properties_to_delete.append(prop)
    
    return properties_to_delete

def delete_properties(supabase_url, supabase_key, property_ids):
    """Delete properties by their IDs."""
    if not property_ids:
        return 0
    
    headers = {
        'apikey': supabase_key,
        'Authorization': f'Bearer {supabase_key}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
    
    deleted_count = 0
    
    # Delete in batches (Supabase can handle multiple IDs)
    batch_size = 100
    for i in range(0, len(property_ids), batch_size):
        batch_ids = property_ids[i:i + batch_size]
        
        # Build filter for this batch
        id_filter = ','.join(str(id) for id in batch_ids)
        
        url = f"{supabase_url}/rest/v1/sage-glamping-data"
        params = {
            'id': f'in.({id_filter})'
        }
        
        response = requests.delete(url, headers=headers, params=params)
        response.raise_for_status()
        
        deleted = response.json()
        deleted_count += len(deleted) if isinstance(deleted, list) else 1
        
        print(f'  Deleted batch {i//batch_size + 1}: {len(batch_ids)} properties')
    
    return deleted_count

def main():
    print('=' * 70)
    print('DELETE AIRBNB & HIPCAMP PROPERTIES')
    print('=' * 70)
    print()
    
    # Get credentials
    supabase_url, supabase_key = get_supabase_credentials()
    
    # Find properties to delete
    print('Searching for properties with Airbnb or Hipcamp URLs...')
    properties_to_delete = find_properties_to_delete(supabase_url, supabase_key)
    
    if not properties_to_delete:
        print('✅ No properties found with Airbnb or Hipcamp URLs')
        print('   All properties have their own professional websites!')
        return
    
    print(f'Found {len(properties_to_delete)} properties to delete:')
    print()
    
    # Show sample of what will be deleted
    for i, prop in enumerate(properties_to_delete[:10], 1):
        url_val = prop.get('url', '') or ''
        google_url = prop.get('google_website_uri', '') or ''
        print(f'  {i}. {prop.get("property_name")} (ID: {prop.get("id")})')
        if url_val and ('airbnb' in url_val.lower() or 'hipcamp' in url_val.lower()):
            print(f'     URL: {url_val[:80]}')
        if google_url and ('airbnb' in google_url.lower() or 'hipcamp' in google_url.lower()):
            print(f'     Google URI: {google_url[:80]}')
    
    if len(properties_to_delete) > 10:
        print(f'  ... and {len(properties_to_delete) - 10} more')
    
    print()
    
    # Confirm deletion
    print(f'⚠️  This will delete {len(properties_to_delete)} properties from the database.')
    print('   These properties will be permanently removed.')
    print()
    
    # Delete properties
    property_ids = [prop['id'] for prop in properties_to_delete]
    
    print('Deleting properties...')
    deleted_count = delete_properties(supabase_url, supabase_key, property_ids)
    
    print()
    print('=' * 70)
    print('DELETION COMPLETE')
    print('=' * 70)
    print(f'✅ Deleted {deleted_count} properties with Airbnb/Hipcamp URLs')
    print()
    print('Remaining properties are professional glamping resorts with their own websites.')

if __name__ == '__main__':
    main()

