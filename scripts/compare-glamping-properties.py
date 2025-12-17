#!/usr/bin/env python3
"""
Compare glamping.com and US News glamping properties with existing all_glamping_properties
and create/update a CSV file with missing properties.
"""

import csv
import sys
import os
from typing import List, Dict, Set
from datetime import datetime

# Properties found on glamping.com North America page
GLAMPING_COM_PROPERTIES = [
    {
        'Property Name': 'The Resort at Paws Up',
        'City': 'Greenough',
        'State': 'MT',
        'Country': 'USA',
        'Url': 'https://www.glamping.com/property/the-resort-at-paws-up/',
        'Source': 'Glamping.com',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'the green o',
        'City': 'Greenough',
        'State': 'MT',
        'Country': 'USA',
        'Url': 'https://www.glamping.com/property/the-green-o/',
        'Source': 'Glamping.com',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Conestoga Ranch',
        'City': 'Garden City',
        'State': 'UT',
        'Country': 'USA',
        'Url': 'https://www.glamping.com/property/conestoga-ranch/',
        'Source': 'Glamping.com',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Capitol Reef Resort',
        'City': 'Torrey',
        'State': 'UT',
        'Country': 'USA',
        'Url': 'https://www.glamping.com/property/capitol-reef-resort/',
        'Source': 'Glamping.com',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Ventana Big Sur, an Alila Resort',
        'City': 'Big Sur',
        'State': 'CA',
        'Country': 'USA',
        'Url': 'https://www.glamping.com/property/ventana-big-sur-an-alila-resort/',
        'Source': 'Glamping.com',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Westgate River Ranch',
        'City': 'River Ranch',
        'State': 'FL',
        'Country': 'USA',
        'Url': 'https://www.glamping.com/property/westgate-river-ranch/',
        'Source': 'Glamping.com',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Little Arrow Outdoor Resort',
        'City': 'Townsend',
        'State': 'TN',
        'Country': 'USA',
        'Url': 'https://www.glamping.com/property/little-arrow-outdoor-resort/',
        'Source': 'Glamping.com',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Huttopia Adirondack',
        'City': 'Lake Luzerne',
        'State': 'NY',
        'Country': 'USA',
        'Url': 'https://www.glamping.com/property/huttopia-adirondack/',
        'Source': 'Glamping.com',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'The Griffin Ranch',
        'City': 'Myakka City',
        'State': 'FL',
        'Country': 'USA',
        'Url': 'https://www.glamping.com/property/the-griffin-ranch/',
        'Source': 'Glamping.com',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Dunton Hot Springs',
        'City': 'Dolores',
        'State': 'CO',
        'Country': 'USA',
        'Url': 'https://www.glamping.com/property/dunton-hot-springs/',
        'Source': 'Glamping.com',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Ithaca by Firelight Camp',
        'City': 'Ithaca',
        'State': 'NY',
        'Country': 'USA',
        'Url': 'https://www.glamping.com/property/ithaca-by-firelight-camp/',
        'Source': 'Glamping.com',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Shawnee Inn & Golf Resort',
        'City': 'Shawnee on Delaware',
        'State': 'PA',
        'Country': 'USA',
        'Url': 'https://www.glamping.com/property/shawnee-inn-golf-resort/',
        'Source': 'Glamping.com',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Huttopia White Mountain',
        'City': 'Albany',
        'State': 'NH',
        'Country': 'USA',
        'Url': 'https://www.glamping.com/property/huttopia-white-mountain/',
        'Source': 'Glamping.com',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Huttopia Sutton',
        'City': 'Sutton',
        'State': 'QC',
        'Country': 'Canada',
        'Url': 'https://www.glamping.com/property/huttopia-sutton/',
        'Source': 'Glamping.com',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Camp Rockaway',
        'City': 'Rockaway Beach',
        'State': 'NY',
        'Country': 'USA',
        'Url': 'https://www.glamping.com/property/camp-rockaway/',
        'Source': 'Glamping.com',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Costanoa Lodge and Resort',
        'City': 'Pescadero',
        'State': 'CA',
        'Country': 'USA',
        'Url': 'https://www.glamping.com/property/costanoa-lodge-and-resort/',
        'Source': 'Glamping.com',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Headwaters Jupiter',
        'City': 'Jupiter',
        'State': 'FL',
        'Country': 'USA',
        'Url': 'https://www.glamping.com/property/headwaters-jupiter/',
        'Source': 'Glamping.com',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Blue Bear Mountain Camp',
        'City': 'Todd',
        'State': 'NC',
        'Country': 'USA',
        'Url': 'https://www.glamping.com/property/blue-bear-mountain-camp/',
        'Source': 'Glamping.com',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Shash Dine EcoRetreat',
        'City': 'Page',
        'State': 'AZ',
        'Country': 'USA',
        'Url': 'https://www.glamping.com/property/shash-dine-ecoretreat/',
        'Source': 'Glamping.com',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'The Lodge and Spa at Brush Creek Ranch',
        'City': 'Saratoga',
        'State': 'WY',
        'Country': 'USA',
        'Url': 'https://www.glamping.com/property/the-lodge-and-spa-at-brush-creek-ranch/',
        'Source': 'Glamping.com',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Mustang Monument',
        'City': 'Wells',
        'State': 'NV',
        'Country': 'USA',
        'Url': 'https://www.glamping.com/property/mustang-monument/',
        'Source': 'Glamping.com',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'The Fields',
        'City': 'South Haven',
        'State': 'MI',
        'Country': 'USA',
        'Url': 'https://www.glamping.com/property/the-fields/',
        'Source': 'Glamping.com',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
]

# Properties from US News Travel - Top Glamping Resorts in the US
US_NEWS_PROPERTIES = [
    {
        'Property Name': 'Under Canvas Yellowstone',
        'City': 'West Yellowstone',
        'State': 'MT',
        'Country': 'USA',
        'Url': 'https://travel.usnews.com/features/top-glamping-resorts-in-the-us',
        'Source': 'US News Travel',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'El Cosmico',
        'City': 'Marfa',
        'State': 'TX',
        'Country': 'USA',
        'Url': 'https://travel.usnews.com/features/top-glamping-resorts-in-the-us',
        'Source': 'US News Travel',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Dunton River Camp',
        'City': 'Dolores',
        'State': 'CO',
        'Country': 'USA',
        'Url': 'https://travel.usnews.com/features/top-glamping-resorts-in-the-us',
        'Source': 'US News Travel',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Safari West',
        'City': 'Santa Rosa',
        'State': 'CA',
        'Country': 'USA',
        'Url': 'https://travel.usnews.com/features/top-glamping-resorts-in-the-us',
        'Source': 'US News Travel',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Beaver Island Retreat',
        'City': 'Beaver Island',
        'State': 'MI',
        'Country': 'USA',
        'Url': 'https://travel.usnews.com/features/top-glamping-resorts-in-the-us',
        'Source': 'US News Travel',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Glamp Michigan',
        'City': 'Benzonia',
        'State': 'MI',
        'Country': 'USA',
        'Url': 'https://travel.usnews.com/features/top-glamping-resorts-in-the-us',
        'Source': 'US News Travel',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Loving Heart Retreats',
        'City': 'Wimberley',
        'State': 'TX',
        'Country': 'USA',
        'Url': 'https://travel.usnews.com/features/top-glamping-resorts-in-the-us',
        'Source': 'US News Travel',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
]

# Properties from Field Mag - California Glamping Guide
FIELD_MAG_CALIFORNIA_PROPERTIES = [
    {
        'Property Name': 'Waldhaus Retreat',
        'City': 'La Honda',
        'State': 'CA',
        'Country': 'USA',
        'Url': 'https://www.fieldmag.com/articles/glamping-california-best-spots',
        'Source': 'Field Mag',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Running Springs Ranch',
        'City': 'Ukiah',
        'State': 'CA',
        'Country': 'USA',
        'Url': 'https://www.fieldmag.com/articles/glamping-california-best-spots',
        'Source': 'Field Mag',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Pinecone Treehouse',
        'City': 'Bonny Doon',
        'State': 'CA',
        'Country': 'USA',
        'Url': 'https://www.fieldmag.com/articles/glamping-california-best-spots',
        'Source': 'Field Mag',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Wildhaven',
        'City': 'Sonoma',
        'State': 'CA',
        'Country': 'USA',
        'Url': 'https://www.fieldmag.com/articles/glamping-california-best-spots',
        'Source': 'Field Mag',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Treehouse in Vineyard',
        'City': 'Los Gatos',
        'State': 'CA',
        'Country': 'USA',
        'Url': 'https://www.fieldmag.com/articles/glamping-california-best-spots',
        'Source': 'Field Mag',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Glamping Tent',
        'City': 'Soquel',
        'State': 'CA',
        'Country': 'USA',
        'Url': 'https://www.fieldmag.com/articles/glamping-california-best-spots',
        'Source': 'Field Mag',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': '1972 Airstream',
        'City': 'Atascadero',
        'State': 'CA',
        'Country': 'USA',
        'Url': 'https://www.fieldmag.com/articles/glamping-california-best-spots',
        'Source': 'Field Mag',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Spartan Trailer',
        'City': 'Arroyo Grande',
        'State': 'CA',
        'Country': 'USA',
        'Url': 'https://www.fieldmag.com/articles/glamping-california-best-spots',
        'Source': 'Field Mag',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'El Capitan Canyon',
        'City': 'Santa Barbara',
        'State': 'CA',
        'Country': 'USA',
        'Url': 'https://www.fieldmag.com/articles/glamping-california-best-spots',
        'Source': 'Field Mag',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'La Boheme',
        'City': 'Los Angeles',
        'State': 'CA',
        'Country': 'USA',
        'Url': 'https://www.fieldmag.com/articles/glamping-california-best-spots',
        'Source': 'Field Mag',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Bohemian Bus',
        'City': 'Ojai',
        'State': 'CA',
        'Country': 'USA',
        'Url': 'https://www.fieldmag.com/articles/glamping-california-best-spots',
        'Source': 'Field Mag',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Pool Ranch',
        'City': 'Borrego Springs',
        'State': 'CA',
        'Country': 'USA',
        'Url': 'https://www.fieldmag.com/articles/glamping-california-best-spots',
        'Source': 'Field Mag',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Blue Sky Center',
        'City': 'New Cuyama',
        'State': 'CA',
        'Country': 'USA',
        'Url': 'https://www.fieldmag.com/articles/glamping-california-best-spots',
        'Source': 'Field Mag',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Speakeasy Lodge',
        'City': 'Cuyama',
        'State': 'CA',
        'Country': 'USA',
        'Url': 'https://www.fieldmag.com/articles/glamping-california-best-spots',
        'Source': 'Field Mag',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Bad Moon',
        'City': 'Idyllwild',
        'State': 'CA',
        'Country': 'USA',
        'Url': 'https://www.fieldmag.com/articles/glamping-california-best-spots',
        'Source': 'Field Mag',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Wylder Hope Valley',
        'City': 'Hope Valley',
        'State': 'CA',
        'Country': 'USA',
        'Url': 'https://www.fieldmag.com/articles/glamping-california-best-spots',
        'Source': 'Field Mag',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Autocamp Yosemite',
        'City': 'Yosemite',
        'State': 'CA',
        'Country': 'USA',
        'Url': 'https://www.fieldmag.com/articles/glamping-california-best-spots',
        'Source': 'Field Mag',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    # Note: Ventana Big Sur, Mendocino Grove, Treebones Resort are already in the list above
    # but listed separately in Field Mag article, so we'll let the comparison handle duplicates
]

# Under Canvas locations from https://www.undercanvas.com/camps/
UNDER_CANVAS_PROPERTIES = [
    {
        'Property Name': 'Under Canvas White Mountains',
        'City': 'Glen',
        'State': 'NH',
        'Country': 'USA',
        'Url': 'https://www.undercanvas.com/camps/white-mountains/',
        'Source': 'Under Canvas',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Under Canvas Acadia',
        'City': 'Mount Desert',
        'State': 'ME',
        'Country': 'USA',
        'Url': 'https://www.undercanvas.com/camps/acadia/',
        'Source': 'Under Canvas',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Under Canvas Bryce Canyon',
        'City': 'Cannonville',
        'State': 'UT',
        'Country': 'USA',
        'Url': 'https://www.undercanvas.com/camps/bryce-canyon/',
        'Source': 'Under Canvas',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Under Canvas Columbia River Gorge',
        'City': 'Mosier',
        'State': 'OR',
        'Country': 'USA',
        'Url': 'https://www.undercanvas.com/camps/columbia-river-gorge/',
        'Source': 'Under Canvas',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Under Canvas Glacier',
        'City': 'West Glacier',
        'State': 'MT',
        'Country': 'USA',
        'Url': 'https://www.undercanvas.com/camps/glacier/',
        'Source': 'Under Canvas',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Under Canvas Grand Canyon',
        'City': 'Valle',
        'State': 'AZ',
        'Country': 'USA',
        'Url': 'https://www.undercanvas.com/camps/grand-canyon/',
        'Source': 'Under Canvas',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Under Canvas Great Smoky Mountains',
        'City': 'Pigeon Forge',
        'State': 'TN',
        'Country': 'USA',
        'Url': 'https://www.undercanvas.com/camps/great-smoky-mountains/',
        'Source': 'Under Canvas',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Under Canvas Lake Powell – Grand Staircase',
        'City': 'Page',
        'State': 'AZ',
        'Country': 'USA',
        'Url': 'https://www.undercanvas.com/camps/lake-powell-grand-staircase/',
        'Source': 'Under Canvas',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Under Canvas Moab',
        'City': 'Moab',
        'State': 'UT',
        'Country': 'USA',
        'Url': 'https://www.undercanvas.com/camps/moab/',
        'Source': 'Under Canvas',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Under Canvas Mount Rushmore',
        'City': 'Keystone',
        'State': 'SD',
        'Country': 'USA',
        'Url': 'https://www.undercanvas.com/camps/mount-rushmore/',
        'Source': 'Under Canvas',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Under Canvas North Yellowstone – Paradise Valley',
        'City': 'Emigrant',
        'State': 'MT',
        'Country': 'USA',
        'Url': 'https://www.undercanvas.com/camps/north-yellowstone-paradise-valley/',
        'Source': 'Under Canvas',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Under Canvas West Yellowstone',
        'City': 'West Yellowstone',
        'State': 'MT',
        'Country': 'USA',
        'Url': 'https://www.undercanvas.com/camps/west-yellowstone/',
        'Source': 'Under Canvas',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Under Canvas Yosemite',
        'City': 'Midpines',
        'State': 'CA',
        'Country': 'USA',
        'Url': 'https://www.undercanvas.com/camps/yosemite/',
        'Source': 'Under Canvas',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Under Canvas Zion',
        'City': 'Virgin',
        'State': 'UT',
        'Country': 'USA',
        'Url': 'https://www.undercanvas.com/camps/zion/',
        'Source': 'Under Canvas',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    # Other Under Canvas brands
    {
        'Property Name': 'ULUM Moab',
        'City': 'Moab',
        'State': 'UT',
        'Country': 'USA',
        'Url': 'https://www.undercanvas.com/camps/',
        'Source': 'Under Canvas',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Bar N Ranch',
        'City': 'West Yellowstone',
        'State': 'MT',
        'Country': 'USA',
        'Url': 'https://www.undercanvas.com/camps/',
        'Source': 'Under Canvas',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
]

# Postcard Cabins locations from Marriott Outdoor Collection
POSTCARD_CABINS_PROPERTIES = [
    # Northeast
    {
        'Property Name': 'Postcard Cabins Blake Brook',
        'City': 'New Boston',
        'State': 'NH',
        'Country': 'USA',
        'Url': 'https://www.marriott.com/brands/outdoor-collection/locations.mi',
        'Source': 'Postcard Cabins',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Postcard Cabins Machimoodus',
        'City': 'East Haddam',
        'State': 'CT',
        'Country': 'USA',
        'Url': 'https://www.marriott.com/brands/outdoor-collection/locations.mi',
        'Source': 'Postcard Cabins',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Postcard Cabins Eastern Catskills',
        'City': 'Catskill',
        'State': 'NY',
        'Country': 'USA',
        'Url': 'https://www.marriott.com/brands/outdoor-collection/locations.mi',
        'Source': 'Postcard Cabins',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Postcard Cabins Western Catskills',
        'City': 'Catskill',
        'State': 'NY',
        'Country': 'USA',
        'Url': 'https://www.marriott.com/brands/outdoor-collection/locations.mi',
        'Source': 'Postcard Cabins',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Postcard Cabins Beaver Creek',
        'City': 'Beaver',
        'State': 'PA',
        'Country': 'USA',
        'Url': 'https://www.marriott.com/brands/outdoor-collection/locations.mi',
        'Source': 'Postcard Cabins',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Postcard Cabins Shenandoah North',
        'City': 'Stanardsville',
        'State': 'VA',
        'Country': 'USA',
        'Url': 'https://www.marriott.com/brands/outdoor-collection/locations.mi',
        'Source': 'Postcard Cabins',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Postcard Cabins Shenandoah',
        'City': 'Stanardsville',
        'State': 'VA',
        'Country': 'USA',
        'Url': 'https://www.marriott.com/brands/outdoor-collection/locations.mi',
        'Source': 'Postcard Cabins',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    # Southeast
    {
        'Property Name': 'Postcard Cabins Chattahoochee',
        'City': 'Sautee Nacoochee',
        'State': 'GA',
        'Country': 'USA',
        'Url': 'https://www.marriott.com/brands/outdoor-collection/locations.mi',
        'Source': 'Postcard Cabins',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Postcard Cabins Talladega Valley',
        'City': 'Talladega',
        'State': 'AL',
        'Country': 'USA',
        'Url': 'https://www.marriott.com/brands/outdoor-collection/locations.mi',
        'Source': 'Postcard Cabins',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Postcard Cabins Asheboro',
        'City': 'Asheboro',
        'State': 'NC',
        'Country': 'USA',
        'Url': 'https://www.marriott.com/brands/outdoor-collection/locations.mi',
        'Source': 'Postcard Cabins',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Postcard Cabins Lake Hartwell',
        'City': 'Anderson',
        'State': 'SC',
        'Country': 'USA',
        'Url': 'https://www.marriott.com/brands/outdoor-collection/locations.mi',
        'Source': 'Postcard Cabins',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Postcard Cabins Dale Hollow',
        'City': 'Celina',
        'State': 'TN',
        'Country': 'USA',
        'Url': 'https://www.marriott.com/brands/outdoor-collection/locations.mi',
        'Source': 'Postcard Cabins',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Postcard Cabins Homochitto',
        'City': 'Natchez',
        'State': 'MS',
        'Country': 'USA',
        'Url': 'https://www.marriott.com/brands/outdoor-collection/locations.mi',
        'Source': 'Postcard Cabins',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Postcard Cabins Gilchrist Springs',
        'City': 'High Springs',
        'State': 'FL',
        'Country': 'USA',
        'Url': 'https://www.marriott.com/brands/outdoor-collection/locations.mi',
        'Source': 'Postcard Cabins',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    # Midwest
    {
        'Property Name': 'Postcard Cabins Barber Creek',
        'City': 'Barber Creek',
        'State': 'IL',
        'Country': 'USA',
        'Url': 'https://www.marriott.com/brands/outdoor-collection/locations.mi',
        'Source': 'Postcard Cabins',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Postcard Cabins Starved Rock',
        'City': 'Ottawa',
        'State': 'IL',
        'Country': 'USA',
        'Url': 'https://www.marriott.com/brands/outdoor-collection/locations.mi',
        'Source': 'Postcard Cabins',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Postcard Cabins Hocking Hills',
        'City': 'Logan',
        'State': 'OH',
        'Country': 'USA',
        'Url': 'https://www.marriott.com/brands/outdoor-collection/locations.mi',
        'Source': 'Postcard Cabins',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Postcard Cabins The Thumb',
        'City': 'Bad Axe',
        'State': 'MI',
        'Country': 'USA',
        'Url': 'https://www.marriott.com/brands/outdoor-collection/locations.mi',
        'Source': 'Postcard Cabins',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Postcard Cabins Brown County',
        'City': 'Nashville',
        'State': 'IN',
        'Country': 'USA',
        'Url': 'https://www.marriott.com/brands/outdoor-collection/locations.mi',
        'Source': 'Postcard Cabins',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Postcard Cabins Ozark Highlands',
        'City': 'Branson',
        'State': 'MO',
        'Country': 'USA',
        'Url': 'https://www.marriott.com/brands/outdoor-collection/locations.mi',
        'Source': 'Postcard Cabins',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Postcard Cabins Wild Rose',
        'City': 'Wild Rose',
        'State': 'WI',
        'Country': 'USA',
        'Url': 'https://www.marriott.com/brands/outdoor-collection/locations.mi',
        'Source': 'Postcard Cabins',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Postcard Cabins Kettle River',
        'City': 'Sandstone',
        'State': 'MN',
        'Country': 'USA',
        'Url': 'https://www.marriott.com/brands/outdoor-collection/locations.mi',
        'Source': 'Postcard Cabins',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Postcard Cabins St. Francois',
        'City': 'Farmington',
        'State': 'MO',
        'Country': 'USA',
        'Url': 'https://www.marriott.com/brands/outdoor-collection/locations.mi',
        'Source': 'Postcard Cabins',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    # Southwest
    {
        'Property Name': 'Postcard Cabins Hill Country',
        'City': 'Dripping Springs',
        'State': 'TX',
        'Country': 'USA',
        'Url': 'https://www.marriott.com/brands/outdoor-collection/locations.mi',
        'Source': 'Postcard Cabins',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Postcard Cabins Piney Woods',
        'City': 'Tyler',
        'State': 'TX',
        'Country': 'USA',
        'Url': 'https://www.marriott.com/brands/outdoor-collection/locations.mi',
        'Source': 'Postcard Cabins',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Postcard Cabins Brazos Valley',
        'City': 'College Station',
        'State': 'TX',
        'Country': 'USA',
        'Url': 'https://www.marriott.com/brands/outdoor-collection/locations.mi',
        'Source': 'Postcard Cabins',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    # West
    {
        'Property Name': 'Postcard Cabins Big Bear',
        'City': 'Big Bear Lake',
        'State': 'CA',
        'Country': 'USA',
        'Url': 'https://www.marriott.com/brands/outdoor-collection/locations.mi',
        'Source': 'Postcard Cabins',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Postcard Cabins Mount Adams',
        'City': 'Trout Lake',
        'State': 'WA',
        'Country': 'USA',
        'Url': 'https://www.marriott.com/brands/outdoor-collection/locations.mi',
        'Source': 'Postcard Cabins',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Postcard Cabins Skagit Valley',
        'City': 'Mount Vernon',
        'State': 'WA',
        'Country': 'USA',
        'Url': 'https://www.marriott.com/brands/outdoor-collection/locations.mi',
        'Source': 'Postcard Cabins',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
]

# Huttopia locations from North America website
HUTTOPIA_PROPERTIES = [
    # USA locations
    {
        'Property Name': 'Huttopia Berkshires',
        'City': 'Hancock',
        'State': 'MA',
        'Country': 'USA',
        'Url': 'https://canada-usa.huttopia.com/en/',
        'Source': 'Huttopia',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Huttopia Lake George - Adirondacks',
        'City': 'Lake George',
        'State': 'NY',
        'Country': 'USA',
        'Url': 'https://canada-usa.huttopia.com/en/',
        'Source': 'Huttopia',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Huttopia Paradise Springs',
        'City': 'Valyermo',
        'State': 'CA',
        'Country': 'USA',
        'Url': 'https://canada-usa.huttopia.com/en/',
        'Source': 'Huttopia',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Huttopia Southern Maine',
        'City': 'Sanford',
        'State': 'ME',
        'Country': 'USA',
        'Url': 'https://canada-usa.huttopia.com/en/',
        'Source': 'Huttopia',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    {
        'Property Name': 'Huttopia Wine Country',
        'City': 'Sonoma',
        'State': 'CA',
        'Country': 'USA',
        'Url': 'https://canada-usa.huttopia.com/en/',
        'Source': 'Huttopia',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
    # Canada locations
    {
        'Property Name': 'Huttopia Les Deux Lacs – Laurentides',
        'City': 'Lac-Supérieur',
        'State': 'QC',
        'Country': 'Canada',
        'Url': 'https://canada-usa.huttopia.com/en/',
        'Source': 'Huttopia',
        'Date Added': datetime.now().strftime('%Y-%m-%d'),
    },
]


def normalize_property_name(name: str) -> str:
    """Normalize property name for comparison."""
    return name.lower().strip()


def read_existing_properties(csv_file: str) -> Set[str]:
    """Read existing property names from CSV."""
    existing = set()
    try:
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                prop_name = row.get('Property Name', '').strip()
                if prop_name:
                    existing.add(normalize_property_name(prop_name))
    except Exception as e:
        print(f'Error reading CSV: {e}')
        sys.exit(1)
    
    return existing


def find_missing_properties(existing: Set[str], glamping_props: List[Dict]) -> List[Dict]:
    """Find properties that are not in the existing dataset."""
    missing = []
    
    # Create a mapping for fuzzy matching
    fuzzy_matches = {
        'ventana big sur, an alila resort': 'ventana big sur',
        'costanoa lodge and resort': 'costanoa lodge',
        'the fields': 'the fields of michigan',
        'dunton river camp': 'dunton hot springs',
        'under canvas yellowstone': 'undercanvas yellowstone',
        'under canvas west yellowstone': 'undercanvas yellowstone',
        'under canvas white mountains': 'undercanvas white mountains',
        'under canvas yosemite': 'undercanvas yosemite',
        'under canvas zion': 'undercanvas zion',
        'under canvas grand canyon': 'undercanvas grand canyon',
        'under canvas moab': 'undercanvas moab',
        'under canvas glacier': 'undercanvas glacier',
        'under canvas bryce canyon': 'undercanvas bryce canyon',
        'under canvas great smoky mountains': 'undercanvas great smoky mountains',
        'under canvas acadia': 'undercanvas acadia',
        'under canvas mount rushmore': 'undercanvas mount rushmore',
        'under canvas columbia river gorge': 'undercanvas columbia river gorge',
        'under canvas lake powell – grand staircase': 'undercanvas lake powell',
        'under canvas north yellowstone – paradise valley': 'undercanvas yellowstone',
        'wildhaven': 'wildhaven yosemite',
        'mendocino grove': 'mendocino grove',
        'treebones resort': 'treebones resort',
        'autocamp yosemite': 'autocamp yosemite',
        'el capitan canyon': 'el capitan canyon',
        'bar n ranch': 'bar n ranch',
        'postcard cabins big bear': 'postcard cabins big bear',
        'postcard cabins shenandoah': 'postcard cabins shenandoah',
        'postcard cabins chattahoochee': 'postcard cabins chattahoochee',
        'postcard cabins ozark highlands': 'postcard cabins ozark highlands',
        'postcard cabins wild rose': 'postcard cabins wild rose',
        'postcard cabins homochitto': 'postcard cabins homochitto',
        'huttopia berkshires': 'huttopia berkshires',
        'huttopia lake george - adirondacks': 'huttopia adirondacks',
        'huttopia paradise springs': 'huttopia paradise springs',
        'huttopia southern maine': 'huttopia southern maine',
        'huttopia wine country': 'huttopia huttopia wine country',
        'huttopia sutton': 'huttopia sutton',
    }
    
    for prop in glamping_props:
        prop_name = normalize_property_name(prop['Property Name'])
        
        # Check exact match
        if prop_name in existing:
            print(f'  ✓ Found existing (exact): {prop["Property Name"]}')
            continue
        
        # Check fuzzy match
        fuzzy_match = fuzzy_matches.get(prop_name)
        if fuzzy_match and fuzzy_match in existing:
            print(f'  ~ Found existing (similar): {prop["Property Name"]} (matches: {fuzzy_match})')
            continue
        
        # Check if any existing property contains this name or vice versa
        found_similar = False
        for existing_name in existing:
            if prop_name in existing_name or existing_name in prop_name:
                # Skip if one is clearly a subset of the other (but not too short)
                if len(prop_name) > 10 and len(existing_name) > 10:
                    print(f'  ~ Found existing (contains): {prop["Property Name"]} (similar to: {existing_name})')
                    found_similar = True
                    break
        
        if not found_similar:
            missing.append(prop)
    
    return missing


def read_existing_csv_properties(csv_file: str) -> List[Dict]:
    """Read existing properties from the output CSV file if it exists."""
    existing_in_output = []
    if os.path.exists(csv_file):
        try:
            with open(csv_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    prop_name = row.get('Property Name', '').strip()
                    if prop_name:
                        existing_in_output.append(normalize_property_name(prop_name))
        except Exception as e:
            print(f'Warning: Could not read existing output CSV: {e}')
    return existing_in_output


def create_csv_output(missing_props: List[Dict], output_file: str, append_mode: bool = False):
    """Create or append to CSV file with missing properties."""
    if not missing_props:
        print('\nNo missing properties found!')
        return
    
    # Get all possible column names from the existing CSV structure
    # Based on the CSV structure we saw
    fieldnames = [
        'Source',
        'Property Name',
        'Site Name',
        'Unit Type',
        'Property Type',
        'Property: Total Sites',
        'Quantity of Units',
        'Unit Guest Capacity',
        'Year Site Opened',
        'Operating Season (months)',
        '# of Locations',
        'Address',
        'City',
        'State',
        'Zip Code',
        'Country',
        'Occupancy rate 2023',
        'Retail Daily Rate 2024',
        'Retail Daily Rate(+fees) 2024',
        'Occupancy rate 2024',
        'RavPAR 2024',
        '2024 - Fall Weekday',
        '2024 - Fall Weekend',
        '2025 - Winter Weekday',
        '2025 - Winter Weekend',
        '2025 - Spring Weekday',
        '2025 - Spring Weekend',
        '2025 - Summer Weekday',
        '2025 - Summer Weekend',
        'INTERNAL NOTES ONLY,',
        'Url',
        'Description',
        'Getting there',
        'Latitude',
        'Longitude',
        'Campfires',
        'Toilet',
        'Pets',
        'Water',
        'Shower',
        'Trash',
        'Cooking equipment',
        'Picnic Table',
        'Wifi',
        'Laundry',
        'Hot Tub',
        'Playground',
        'RV - Vehicle Length',
        'RV - Parking',
        'RV - Accommodates Slideout',
        'RV - Surface Type',
        'RV - Surface level',
        'RV - Vehicles: Fifth Wheels',
        'RV - Vehicles: Class A RVs',
        'RV - Vehicles: Class B RVs',
        'RV - Vehicles: Class C RVs',
        'RV - Vehicles: Toy Hauler',
        'Date Added',
        'Date Updated',
    ]
    
    # Create rows with all fields
    rows = []
    for prop in missing_props:
        row = {field: '' for field in fieldnames}
        # Fill in known fields
        for key, value in prop.items():
            if key in fieldnames:
                row[key] = value
        rows.append(row)
    
    # Read existing rows if appending
    existing_rows = []
    file_exists = os.path.exists(output_file) and append_mode
    if file_exists:
        try:
            with open(output_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                existing_rows = list(reader)
                # Ensure fieldnames match
                if reader.fieldnames:
                    fieldnames = list(reader.fieldnames)
        except Exception as e:
            print(f'Warning: Could not read existing CSV for appending: {e}')
            file_exists = False
    
    # Write CSV
    mode = 'a' if file_exists else 'w'
    with open(output_file, mode, encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        writer.writerows(rows)
    
    action = 'Updated' if file_exists else 'Created'
    print(f'\n✅ {action} CSV file: {output_file}')
    print(f'   Added {len(missing_props)} missing properties')


def main():
    csv_file = 'csv/Main/sage-glamping-combined-with-google-data-FIXED.csv'
    output_file = 'csv/glamping-com-north-america-missing-properties.csv'
    
    print('=' * 70)
    print('Comparing Glamping.com, US News, Field Mag, Under Canvas, Postcard Cabins & Huttopia Properties with Existing Data')
    print('=' * 70)
    print()
    
    # Read existing properties from main database
    print(f'Reading existing properties from: {csv_file}')
    existing = read_existing_properties(csv_file)
    print(f'Found {len(existing)} unique properties in existing CSV')
    print()
    
    # Read existing properties from output CSV (to avoid duplicates)
    existing_in_output = read_existing_csv_properties(output_file)
    if existing_in_output:
        print(f'Found {len(existing_in_output)} properties already in output CSV')
        # Add to existing set for comparison
        existing.update(existing_in_output)
    print()
    
    all_new_properties = []
    
    # Check Glamping.com properties
    print(f'Checking {len(GLAMPING_COM_PROPERTIES)} properties from Glamping.com...')
    missing_glamping = find_missing_properties(existing, GLAMPING_COM_PROPERTIES)
    all_new_properties.extend(missing_glamping)
    print()
    
    # Check US News properties
    print(f'Checking {len(US_NEWS_PROPERTIES)} properties from US News Travel...')
    missing_usnews = find_missing_properties(existing, US_NEWS_PROPERTIES)
    all_new_properties.extend(missing_usnews)
    print()
    
    # Check Field Mag California properties
    print(f'Checking {len(FIELD_MAG_CALIFORNIA_PROPERTIES)} properties from Field Mag California...')
    missing_fieldmag = find_missing_properties(existing, FIELD_MAG_CALIFORNIA_PROPERTIES)
    all_new_properties.extend(missing_fieldmag)
    print()
    
    # Check Under Canvas properties
    print(f'Checking {len(UNDER_CANVAS_PROPERTIES)} properties from Under Canvas...')
    missing_undercanvas = find_missing_properties(existing, UNDER_CANVAS_PROPERTIES)
    all_new_properties.extend(missing_undercanvas)
    print()
    
    # Check Postcard Cabins properties
    print(f'Checking {len(POSTCARD_CABINS_PROPERTIES)} properties from Postcard Cabins...')
    missing_postcard = find_missing_properties(existing, POSTCARD_CABINS_PROPERTIES)
    all_new_properties.extend(missing_postcard)
    print()
    
    # Check Huttopia properties
    print(f'Checking {len(HUTTOPIA_PROPERTIES)} properties from Huttopia...')
    missing_huttopia = find_missing_properties(existing, HUTTOPIA_PROPERTIES)
    all_new_properties.extend(missing_huttopia)
    print()
    
    # Remove duplicates from all_new_properties
    seen_names = set()
    unique_new_properties = []
    for prop in all_new_properties:
        prop_name = normalize_property_name(prop['Property Name'])
        if prop_name not in seen_names:
            seen_names.add(prop_name)
            unique_new_properties.append(prop)
    
    print(f'Found {len(unique_new_properties)} total missing properties:')
    for i, prop in enumerate(unique_new_properties, 1):
        print(f'  {i}. {prop["Property Name"]} ({prop["City"]}, {prop["State"]}) - {prop["Source"]}')
    print()
    
    # Append to CSV (or create if doesn't exist)
    append_mode = os.path.exists(output_file)
    create_csv_output(unique_new_properties, output_file, append_mode=append_mode)
    
    print()
    print('=' * 70)
    print('Comparison complete!')
    print('=' * 70)


if __name__ == '__main__':
    main()
