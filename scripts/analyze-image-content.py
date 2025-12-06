#!/usr/bin/env python3
"""
Analyze image content using visual features to generate descriptive filenames
"""
import sys
from pathlib import Path
from PIL import Image
import colorsys

def get_dominant_colors(image, k=3):
    """Get dominant colors from image"""
    # Resize for faster processing
    image = image.resize((150, 150))
    pixels = list(image.getdata())
    
    # Group similar colors
    color_groups = {}
    for r, g, b in pixels:
        # Quantize colors to reduce variations
        r, g, b = r // 32 * 32, g // 32 * 32, b // 32 * 32
        key = (r, g, b)
        color_groups[key] = color_groups.get(key, 0) + 1
    
    # Get top colors
    top_colors = sorted(color_groups.items(), key=lambda x: x[1], reverse=True)[:k]
    return [color for color, _ in top_colors]

def color_to_name(r, g, b):
    """Convert RGB to descriptive color name"""
    h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)
    
    if v < 0.2:
        return 'dark'
    elif v > 0.8:
        return 'light'
    elif s < 0.3:
        return 'gray'
    elif h < 0.05 or h > 0.95:
        return 'red'
    elif h < 0.1:
        return 'orange'
    elif h < 0.2:
        return 'yellow'
    elif h < 0.4:
        return 'green'
    elif h < 0.6:
        return 'cyan'
    elif h < 0.7:
        return 'blue'
    elif h < 0.85:
        return 'purple'
    else:
        return 'pink'

def analyze_brightness(image):
    """Analyze overall brightness"""
    gray = image.convert('L')
    pixels = list(gray.getdata())
    avg_brightness = sum(pixels) / len(pixels) / 255
    
    if avg_brightness < 0.3:
        return 'dark'
    elif avg_brightness > 0.7:
        return 'bright'
    else:
        return 'medium'

def analyze_composition(image):
    """Analyze image composition"""
    width, height = image.size
    aspect_ratio = width / height
    
    if aspect_ratio > 2.0:
        return 'panoramic'
    elif aspect_ratio > 1.3:
        return 'landscape'
    elif aspect_ratio < 0.7:
        return 'portrait'
    elif aspect_ratio < 0.5:
        return 'tall'
    else:
        return 'square'

def analyze_image_content(image_path):
    """Analyze image and generate descriptive name"""
    try:
        with Image.open(image_path) as img:
            # Convert to RGB if needed
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Get image properties
            width, height = img.size
            composition = analyze_composition(img)
            brightness = analyze_brightness(img)
            dominant_colors = get_dominant_colors(img, k=2)
            
            # Generate color descriptions
            color_names = [color_to_name(r, g, b) for r, g, b in dominant_colors]
            primary_color = color_names[0] if color_names else 'colorful'
            
            # Create descriptive name
            parts = []
            
            # Add brightness/color description
            if brightness == 'dark' and primary_color != 'dark':
                parts.append(f'{primary_color}-dark')
            elif brightness == 'bright' and primary_color != 'light':
                parts.append(f'{primary_color}-bright')
            else:
                parts.append(primary_color)
            
            # Add composition
            parts.append(composition)
            
            # Add size indicator if very large
            if width > 3000 or height > 3000:
                parts.append('large')
            
            filename = '-'.join(parts)
            return filename
            
    except Exception as e:
        print(f"Error analyzing {image_path}: {e}", file=sys.stderr)
        return None

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python analyze-image-content.py <image_path>")
        sys.exit(1)
    
    image_path = Path(sys.argv[1])
    if not image_path.exists():
        print(f"Error: Image not found: {image_path}", file=sys.stderr)
        sys.exit(1)
    
    result = analyze_image_content(image_path)
    if result:
        print(result)
    else:
        sys.exit(1)
