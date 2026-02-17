'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ColumnGroup {
  title: string;
  columns: string[];
  defaultOpen?: boolean;
}

const COLUMN_GROUPS: ColumnGroup[] = [
  {
    title: 'Core Identity',
    columns: [
      'id',
      'property_name',
      'site_name',
      'slug',
      'property_type',
      'research_status',
      'is_glamping_property',
      'is_closed',
    ],
    defaultOpen: true,
  },
  {
    title: 'Source & Tracking',
    columns: [
      'source',
      'discovery_source',
      'date_added',
      'date_updated',
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
    ],
  },
  {
    title: 'Operational',
    columns: [
      'property_total_sites',
      'quantity_of_units',
      'year_site_opened',
      'operating_season_months',
      'number_of_locations',
    ],
  },
  {
    title: 'Unit Details (unit_)',
    columns: [
      'unit_type',
      'unit_capacity',
      'unit_sq_ft',
      'unit_description',
      'unit_bed',
      'unit_shower',
      'unit_water',
      'unit_electricity',
      'unit_picnic_table',
      'unit_wifi',
      'unit_pets',
      'unit_private_bathroom',
      'unit_full_kitchen',
      'unit_kitchenette',
      'unit_ada_accessibility',
      'unit_patio',
      'unit_air_conditioning',
      'unit_gas_fireplace',
      'unit_hot_tub_or_sauna',
      'unit_hot_tub',
      'unit_sauna',
      'unit_cable',
      'rate_unit_rates_by_year',
    ],
  },
  {
    title: 'Pricing',
    columns: [
      'rate_avg_retail_daily_rate',
      'rate_winter_weekday',
      'rate_winter_weekend',
      'rate_spring_weekday',
      'rate_spring_weekend',
      'rate_summer_weekday',
      'rate_summer_weekend',
      'rate_fall_weekday',
      'rate_fall_weekend',
      'rate_category',
    ],
  },
  {
    title: 'Property Amenities (property_)',
    columns: [
      'property_laundry',
      'property_playground',
      'property_pool',
      'property_food_on_site',
      'property_sauna',
      'property_hot_tub',
      'property_restaurant',
      'property_dog_park',
      'property_clubhouse',
      'property_alcohol_available',
      'property_golf_cart_rental',
      'property_waterpark',
      'property_general_store',
      'property_waterfront',
      'property_extended_stay',
      'property_family_friendly',
      'property_remote_work_friendly',
      'property_fitness_room',
      'property_propane_refilling_station',
    ],
  },
  {
    title: 'Contact & Info',
    columns: [
      'url',
      'phone_number',
      'description',
      'minimum_nights',
    ],
  },
  {
    title: 'Other Amenities',
    columns: [
      'unit_campfires',
      'unit_charcoal_grill',
    ],
  },
  {
    title: 'RV-Specific (rv_)',
    columns: [
      'rv_vehicle_length',
      'rv_parking',
      'rv_accommodates_slideout',
      'rv_surface_type',
      'rv_surface_level',
      'rv_vehicles_fifth_wheels',
      'rv_vehicles_class_a_rvs',
      'rv_vehicles_class_b_rvs',
      'rv_vehicles_class_c_rvs',
      'rv_vehicles_toy_hauler',
      'rv_sewer_hook_up',
      'rv_electrical_hook_up',
      'rv_generators_allowed',
      'rv_water_hookup',
    ],
  },
  {
    title: 'Activities (activities_)',
    columns: [
      'activities_fishing',
      'activities_surfing',
      'activities_horseback_riding',
      'activities_paddling',
      'activities_climbing',
      'activities_off_roading_ohv',
      'activities_boating',
      'activities_swimming',
      'activities_wind_sports',
      'activities_snow_sports',
      'activities_whitewater_paddling',
      'activities_fall_fun',
      'activities_hiking',
      'activities_wildlife_watching',
      'activities_biking',
      'activities_canoeing_kayaking',
      'activities_hunting',
      'activities_golf',
      'activities_backpacking',
      'activities_historic_sightseeing',
      'activities_scenic_drives',
      'activities_stargazing',
    ],
  },
  {
    title: 'Settings (setting_)',
    columns: [
      'setting_ranch',
      'setting_beach',
      'setting_coastal',
      'setting_suburban',
      'setting_forest',
      'setting_field',
      'setting_wetlands',
      'setting_hot_spring',
      'setting_desert',
      'setting_canyon',
      'setting_waterfall',
      'setting_swimming_hole',
      'setting_lake',
      'setting_cave',
      'setting_redwoods',
      'setting_farm',
      'river_stream_or_creek',
      'setting_mountainous',
    ],
  },
  {
    title: 'System Metadata',
    columns: [
      'quality_score',
      'created_at',
      'updated_at',
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
