#!/usr/bin/env python3
"""
Monitor Google Places data coverage progress.
"""

import os
import time
import requests
from dotenv import load_dotenv

load_dotenv('.env.local')
url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
key = os.getenv('SUPABASE_SECRET_KEY')

headers = {
    'apikey': key,
    'Authorization': f'Bearer {key}',
    'Content-Type': 'application/json'
}

def check_coverage():
    """Check current Google data coverage."""
    response = requests.get(
        f'{url}/rest/v1/sage-glamping-data?select=id,google_phone_number,google_website_uri,google_primary_type',
        headers=headers
    )
    
    if response.status_code == 200:
        all_data = response.json()
        total = len(all_data)
        
        with_phone = sum(1 for r in all_data if r.get('google_phone_number'))
        with_website = sum(1 for r in all_data if r.get('google_website_uri'))
        with_type = sum(1 for r in all_data if r.get('google_primary_type'))
        with_any = sum(1 for r in all_data if r.get('google_phone_number') or r.get('google_website_uri') or r.get('google_primary_type'))
        
        return {
            'total': total,
            'with_phone': with_phone,
            'with_website': with_website,
            'with_type': with_type,
            'with_any': with_any,
            'without': total - with_any
        }
    return None

if __name__ == '__main__':
    print('Monitoring Google Places data coverage...')
    print('Press Ctrl+C to stop')
    print()
    
    initial = check_coverage()
    if initial:
        print(f'Initial coverage: {initial["with_any"]}/{initial["total"]} ({initial["with_any"]/initial["total"]*100:.1f}%)')
        print()
    
    try:
        while True:
            current = check_coverage()
            if current:
                print(f'\r[{time.strftime("%H:%M:%S")}] Coverage: {current["with_any"]}/{current["total"]} ({current["with_any"]/current["total"]*100:.1f}%) | Phone: {current["with_phone"]} | Website: {current["with_website"]} | Type: {current["with_type"]} | Remaining: {current["without"]}', end='', flush=True)
            
            if initial and current["with_any"] > initial["with_any"]:
                print(f'\n  ✓ Progress: +{current["with_any"] - initial["with_any"]} properties updated')
                initial = current
            
            time.sleep(5)  # Check every 5 seconds
    except KeyboardInterrupt:
        print('\n\nMonitoring stopped.')
        final = check_coverage()
        if final and initial:
            print(f'\nFinal coverage: {final["with_any"]}/{final["total"]} ({final["with_any"]/final["total"]*100:.1f}%)')
            print(f'Properties updated: +{final["with_any"] - initial["with_any"]}')

