#!/usr/bin/env python3
"""
Image analysis script using OpenAI Vision API or fallback methods
"""
import os
import sys
import base64
import json
from pathlib import Path

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("⚠️  OpenAI package not installed. Install with: pip install openai")

def analyze_image_with_openai(image_path, api_key):
    """Analyze image using OpenAI Vision API"""
    if not OPENAI_AVAILABLE:
        return None
    
    try:
        client = OpenAI(api_key=api_key)
        
        with open(image_path, 'rb') as image_file:
            base64_image = base64.b64encode(image_file.read()).decode('utf-8')
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Describe this image in 3-5 words that would make a good filename. Focus on the main subject, setting, or theme. Return only the description, no other text. Examples: 'mountain-lake-sunset', 'cozy-cabin-interior', 'forest-camping-tent'"
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=50
        )
        
        description = response.choices[0].message.content.strip()
        return description
    except Exception as e:
        print(f"Error analyzing with OpenAI: {e}")
        return None

def generate_filename(description):
    """Generate a clean filename from description"""
    if not description:
        return None
    
    # Clean the description
    filename = description.lower()
    # Remove special characters, keep only alphanumeric, spaces, and hyphens
    filename = ''.join(c if c.isalnum() or c in (' ', '-') else ' ' for c in filename)
    # Replace multiple spaces/hyphens with single hyphen
    filename = '-'.join(filter(None, filename.split()))
    # Limit length
    filename = filename[:100]
    
    return filename

def main():
    images_dir = Path(__file__).parent.parent / 'public' / 'images'
    
    # Check for API key
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("⚠️  OPENAI_API_KEY not found in environment.")
        print("   Set it with: export OPENAI_API_KEY='your-key-here'")
        print("   Or add it to .env.local file")
        return
    
    # Get all image files
    image_files = [
        f for f in images_dir.iterdir()
        if f.is_file() and f.suffix.lower() in ['.jpg', '.jpeg', '.png', '.webp']
        and not f.name.startswith('.')
    ]
    
    if not image_files:
        print("No images found.")
        return
    
    print(f"Found {len(image_files)} image(s) to analyze.\n")
    
    results = []
    for img_path in image_files:
        print(f"Analyzing: {img_path.name}")
        description = analyze_image_with_openai(img_path, api_key)
        
        if description:
            new_name = generate_filename(description)
            if new_name:
                # Preserve extension
                ext = img_path.suffix
                new_path = images_dir / f"{new_name}{ext}"
                
                # Ensure unique filename
                counter = 1
                while new_path.exists() and new_path != img_path:
                    new_path = images_dir / f"{new_name}-{counter}{ext}"
                    counter += 1
                
                results.append({
                    'original': img_path.name,
                    'new': new_path.name,
                    'description': description
                })
                print(f"  → {description}")
                print(f"  → Suggested name: {new_path.name}\n")
            else:
                print(f"  ⚠️  Could not generate filename from description\n")
        else:
            print(f"  ❌ Could not analyze image\n")
    
    # Print summary
    if results:
        print("\n" + "="*60)
        print("📋 Suggested Renames:")
        print("="*60)
        for r in results:
            print(f"  {r['original']}")
            print(f"    → {r['new']}")
            print(f"    Description: {r['description']}\n")
        
        # Ask for confirmation (optional - can be automated)
        print("\nTo apply these renames, run the Node.js script with OPENAI_API_KEY set.")

if __name__ == '__main__':
    main()
