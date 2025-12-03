#!/usr/bin/env python3
"""
Fetch Google Business ratings and review counts using Google Places API (New).
This script reads properties from the CSV and updates them with ratings from Google Places API.
"""

import csv
import os
import sys
import time
import requests
from dotenv import load_dotenv

# Load environment variables (will be loaded in get_api_key if needed)

def get_api_key():
    """Get Google Maps API key from environment."""
    # Try loading from .env.local first
    env_path = '.env.local'
    if os.path.exists(env_path):
        load_dotenv(env_path)
    
    api_key = os.getenv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY')
    if not api_key:
        # Also try regular .env
        load_dotenv('.env')
        api_key = os.getenv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY')
    
    if not api_key:
        print("Error: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not found in environment")
        print("Please ensure the key is set in .env.local or .env file")
        sys.exit(1)
    return api_key

def search_place(api_key, property_name, city, state, address=None):
    """
    Search for a place using Places API (New) Text Search.
    Returns place_id if found, None otherwise.
    """
    # Build search query
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
        print(f"  ⚠ API error for '{property_name}': {e}")
        return None
    
    return None

def get_place_details(api_key, place_id):
    """
    Get detailed place information using Places API (New) Place Details.
    """
    url = f"https://places.googleapis.com/v1/places/{place_id}"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "id,displayName,formattedAddress,rating,userRatingCount"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        return {
            'rating': data.get('rating'),
            'user_rating_count': data.get('userRatingCount'),
            'name': data.get('displayName', {}).get('text', ''),
            'address': data.get('formattedAddress', '')
        }
    except requests.exceptions.RequestException as e:
        print(f"  ⚠ Details API error: {e}")
        return None

def update_csv_with_ratings(csv_file, api_key, delay=0.1):
    """
    Read CSV, fetch ratings for each property, and update the CSV.
    delay: seconds to wait between API calls to respect rate limits
    """
    rows = []
    updated_count = 0
    not_found_count = 0
    error_count = 0
    
    # Read all rows first
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames)
        rows = list(reader)
    
    total = len(rows)
    print(f"Processing {total} properties...")
    print(f"API Key: {api_key[:10]}...{api_key[-4:]}")
    print()
    
    for idx, row in enumerate(rows, 1):
        prop_name = row.get('Property Name', '').strip()
        city = row.get('City', '').strip()
        state = row.get('State', '').strip()
        address = row.get('Address', '').strip()
        current_rating = row.get('Google Rating', '').strip()
        
        # Skip if already has rating
        if current_rating:
            print(f"[{idx}/{total}] ✓ {prop_name} - Already has rating: {current_rating}")
            continue
        
        if not prop_name:
            continue
        
        print(f"[{idx}/{total}] Searching: {prop_name}, {city}, {state}...", end=' ', flush=True)
        
        # Search for place
        place_data = search_place(api_key, prop_name, city, state, address)
        
        if place_data and place_data.get('place_id'):
            rating = place_data.get('rating')
            review_count = place_data.get('user_rating_count')
            
            if rating is not None:
                row['Google Rating'] = str(rating)
                if review_count is not None:
                    row['Google Review Count'] = str(review_count)
                updated_count += 1
                print(f"✓ Found: {rating} stars, {review_count or 'N/A'} reviews")
            else:
                # Try getting details if rating not in search results
                details = get_place_details(api_key, place_data['place_id'])
                if details and details.get('rating') is not None:
                    row['Google Rating'] = str(details['rating'])
                    if details.get('user_rating_count') is not None:
                        row['Google Review Count'] = str(details['user_rating_count'])
                    updated_count += 1
                    print(f"✓ Found: {details['rating']} stars, {details.get('user_rating_count', 'N/A')} reviews")
                else:
                    not_found_count += 1
                    print("✗ No rating found")
        else:
            not_found_count += 1
            print("✗ Not found")
        
        # Rate limiting
        if idx < total:
            time.sleep(delay)
    
    # Write updated rows back
    with open(csv_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print()
    print("=" * 60)
    print(f"Summary:")
    print(f"  ✓ Updated: {updated_count} properties")
    print(f"  ✗ Not found: {not_found_count} properties")
    print(f"  ⚠ Errors: {error_count} properties")
    print(f"  Total processed: {total} properties")
    print("=" * 60)

if __name__ == '__main__':
    csv_file = 'csv/NEW_GLAMPING_RESORTS_2024_2025_WITH_RATINGS.csv'
    
    if not os.path.exists(csv_file):
        print(f"Error: {csv_file} not found!")
        sys.exit(1)
    
    api_key = get_api_key()
    
    print("Google Places API (New) - Rating Fetcher")
    print("=" * 60)
    print()
    
    update_csv_with_ratings(csv_file, api_key, delay=0.1)

