'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ColumnGroup {
  title: string;
  columns: string[];
  defaultOpen?: boolean;
}

// Organized column groups based on the actual table structure
const COLUMN_GROUPS: ColumnGroup[] = [
  {
    title: 'Basic Information',
    columns: [
      'id',
      'property_name',
      'site_name',
      'unit_type',
      'property_type',
      'slug',
      'description',
      'source',
      'duplicatenote',
    ],
    defaultOpen: true,
  },
  {
    title: 'Dates & Tracking',
    columns: [
      'date_added',
      'date_updated',
      'created_at',
      'updated_at',
      'year_site_opened',
    ],
  },
  {
    title: 'Location',
    columns: [
      'address',
      'city',
      'state',
      'zip_code',
      'country',
      'lat',
      'lon',
      'getting_there',
    ],
  },
  {
    title: 'Capacity & Sites',
    columns: [
      'property__total_sites',
      'quantity_of_units',
      'unit_capacity',
      '__of_locations',
    ],
  },
  {
    title: 'Operating Season',
    columns: [
      'operating_season__months_',
      'operating_season__excel_format_',
    ],
  },
  {
    title: '2024 Pricing & Performance',
    columns: [
      'occupancy_rate_2024',
      'avg__retail_daily_rate_2024',
      'high_rate_2024',
      'low_rate_2024',
      'retail_daily_rate__fees__2024',
      'revpar_2024',
    ],
  },
  {
    title: '2025 Pricing & Performance',
    columns: [
      'occupancy_rate_2025',
      'retail_daily_rate_ytd',
      'retail_daily_rate__fees__ytd',
      'high_rate_2025',
      'low_rate_2025',
      'revpar_2025',
      'high_month_2025',
      'high_avg__occupancy_2025',
      'low_month_2025',
      'low_avg__occupancy_2025',
    ],
  },
  {
    title: 'Future Pricing Forecast',
    columns: [
      'avg__rate__next_12_months_',
      'high_rate__next_12_months_',
      'low_rate__next_12_months_',
    ],
  },
  {
    title: 'Seasonal Rates',
    columns: [
      'winter_weekday',
      'winter_weekend',
      'spring_weekday',
      'spring_weekend',
      'summer_weekday',
      'summer_weekend',
      'fall_weekday',
      'fall_weekend',
    ],
  },
  {
    title: 'Basic Amenities',
    columns: [
      'toilet',
      'shower',
      'water',
      'wifi',
      'laundry',
      'trash',
      'cooking_equipment',
      'picnic_table',
      'campfires',
      'playground',
    ],
  },
  {
    title: 'Recreation & Entertainment',
    columns: [
      'pool',
      'hot_tub___sauna',
      'unit_hot_tub',
      'unit_suana',
      'property_hot_tub',
      'property_suana',
      'pets',
      'ranch',
      'waterpark',
      'dog_park',
      'clubhouse',
    ],
  },
  {
    title: 'RV & Vehicle Features',
    columns: [
      'rv___vehicle_length',
      'rv___parking',
      'rv___accommodates_slideout',
      'rv___surface_type',
      'rv___surface_level',
      'rv___vehicles__fifth_wheels',
      'rv___vehicles__class_a_rvs',
      'rv___vehicles__class_b_rvs',
      'rv___vehicles__class_c_rvs',
      'rv___vehicles__toy_hauler',
      'generators_allowed',
    ],
  },
  {
    title: 'Utilities & Hookups',
    columns: [
      'electricity',
      'sewer_hook_up',
      'electrical_hook_up',
      'water_hookup',
      'cable',
    ],
  },
  {
    title: 'Activities',
    columns: [
      'fishing',
      'surfing',
      'horseback_riding',
      'paddling',
      'climbing',
      'off_roading__ohv_',
      'boating',
      'swimming',
      'wind_sports',
      'snow_sports',
      'whitewater_paddling',
      'fall_fun',
      'hiking',
      'wildlife_watching',
      'biking',
      'canoeing___kayaking',
    ],
  },
  {
    title: 'Location Features',
    columns: [
      'beach',
      'coastal',
      'suburban',
      'forest',
      'field',
      'wetlands',
      'hot_spring',
      'desert',
      'canyon',
      'waterfall',
      'swimming_hole',
      'lake',
      'cave',
      'redwoods',
      'farm',
      'river__stream__or_creek',
      'mountainous',
      'waterfront',
    ],
  },
  {
    title: 'Food & Dining',
    columns: [
      'sage___p__amenity__food_on_site',
      'restaurant',
      'alcohol_available',
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
    ],
  },
  {
    title: 'Accommodation Features',
    columns: [
      'private_bathroom',
      'kitchen',
      'patio',
      'charcoal_grill',
      'minimum_nights',
    ],
  },
  {
    title: 'Services & Rentals',
    columns: [
      'golf_cart_rental',
      'general_store',
    ],
  },
  {
    title: 'Google Places Data',
    columns: [
      'google_place_id',
      'google_website_uri',
      'google_place_types',
      'google_primary_type',
      'google_primary_type_display_name',
      'google_photos',
      'google_icon_uri',
      'google_icon_background_color',
      'google_reservable',
      'google_rating',
      'google_user_rating_total',
      'google_business_status',
      'google_opening_hours',
      'google_current_opening_hours',
      'google_parking_options',
      'google_price_level',
      'google_payment_options',
      'google_wheelchair_accessible_parking',
      'google_wheelchair_accessible_entrance',
      'google_wheelchair_accessible_restroom',
      'google_wheelchair_accessible_seating',
      'google_allows_dogs',
    ],
  },
  {
    title: 'Property Status & Classification',
    columns: [
      'is_glamping_property',
      'is_closed',
      'rate_category',
      'quality_score',
      'url',
      'phone_number',
    ],
  },
];

export default function AdminColumnsView() {
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    new Set(COLUMN_GROUPS.filter(g => g.defaultOpen).map(g => g.title))
  );
  const [allColumns, setAllColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchColumns = async () => {
      try {
        // Fetch one row to get all column names
        const { data, error } = await supabase
          .from('all_glamping_properties')
          .select('*')
          .limit(1);

        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }

        if (data && data.length > 0) {
          const columns = Object.keys(data[0]);
          setAllColumns(columns);
        }
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch columns');
        setLoading(false);
      }
    };

    fetchColumns();
  }, []);

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(title)) {
        newSet.delete(title);
      } else {
        newSet.add(title);
      }
      return newSet;
    });
  };

  const getGroupColumns = (group: ColumnGroup): string[] => {
    // Return columns that exist in the actual table
    return group.columns.filter(col => allColumns.includes(col));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading columns...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        Error: {error}
      </div>
    );
  }

  // Find columns that aren't in any group
  const groupedColumns = new Set(
    COLUMN_GROUPS.flatMap(g => getGroupColumns(g))
  );
  const ungroupedColumns = allColumns.filter(col => !groupedColumns.has(col));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Table Columns ({allColumns.length} total)
          </h2>
          <p className="text-sm text-gray-600">
            Click on a group to expand/collapse and view the columns
          </p>
        </div>

        <div className="space-y-2">
          {COLUMN_GROUPS.map((group) => {
            const groupColumns = getGroupColumns(group);
            if (groupColumns.length === 0) return null;

            const isOpen = openGroups.has(group.title);
            
            return (
              <div
                key={group.title}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleGroup(group.title)}
                  className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left transition-colors"
                >
                  <span className="font-semibold text-gray-900">
                    {group.title} ({groupColumns.length})
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${
                      isOpen ? 'transform rotate-180' : ''
                    }`}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isOpen && (
                  <div className="p-4 bg-white border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {groupColumns.map((column) => (
                        <div
                          key={column}
                          className="px-3 py-2 bg-gray-50 rounded text-sm font-mono text-gray-800 hover:bg-gray-100 transition-colors"
                        >
                          {column}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {ungroupedColumns.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleGroup('Other Columns')}
                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left transition-colors"
              >
                <span className="font-semibold text-gray-900">
                  Other Columns ({ungroupedColumns.length})
                </span>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${
                    openGroups.has('Other Columns') ? 'transform rotate-180' : ''
                  }`}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {openGroups.has('Other Columns') && (
                <div className="p-4 bg-white border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {ungroupedColumns.map((column) => (
                      <div
                        key={column}
                        className="px-3 py-2 bg-gray-50 rounded text-sm font-mono text-gray-800 hover:bg-gray-100 transition-colors"
                      >
                        {column}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
