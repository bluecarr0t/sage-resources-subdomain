/**
 * Sage AI Tools - Read-only Supabase query tools for the AI assistant.
 * These tools allow the AI to query data but never modify it.
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';

const ALLOWED_TABLES = [
  'all_glamping_properties',
  'hipcamp',
  'campspot',
  'all_roverpass_data_new',
  'reports',
  'county-population',
  'ski_resorts',
  'national-parks',
] as const;

type AllowedTable = (typeof ALLOWED_TABLES)[number];

const PROPERTIES_FILTERABLE_COLUMNS = [
  'state',
  'city',
  'country',
  'unit_type',
  'property_type',
  'source',
  'discovery_source',
  'research_status',
  'is_glamping_property',
  'is_closed',
] as const;

const PROPERTIES_SUMMARY_COLUMNS = [
  'id',
  'property_name',
  'city',
  'state',
  'country',
  'unit_type',
  'property_type',
  'url',
  'property_total_sites',
  'quantity_of_units',
  'rate_avg_retail_daily_rate',
  'research_status',
] as const;

export function createSageAiTools(supabase: SupabaseClient) {
  return {
    list_tables: tool({
      description:
        'List available database tables and views that can be queried. Returns table names with brief descriptions.',
      inputSchema: z.object({}),
      execute: async () => {
        return {
          tables: [
            {
              name: 'all_glamping_properties',
              description:
                'Glamping properties database with location, pricing, amenities, and operational data (Glamping only)',
              row_count_estimate: 'thousands',
              category: 'Glamping',
            },
            {
              name: 'hipcamp',
              description:
                'Hipcamp listings with campsite and glamping data including pricing and availability (Glamping & RV)',
              row_count_estimate: 'thousands',
              category: 'Glamping & RV',
            },
            {
              name: 'campspot',
              description:
                'Campspot RV park and campground data with site info and amenities (RV only)',
              row_count_estimate: 'thousands',
              category: 'RV',
            },
            {
              name: 'all_roverpass_data_new',
              description:
                'Roverpass RV park data with reservations, pricing, and park details (RV only)',
              row_count_estimate: 'thousands',
              category: 'RV',
            },
            {
              name: 'reports',
              description:
                'Feasibility study reports with client info, study details, and project data',
              row_count_estimate: 'hundreds',
              category: 'Reports',
            },
            {
              name: 'county-population',
              description:
                'US county population data for demographic analysis and market research',
              row_count_estimate: 'thousands',
              category: 'Demographics',
            },
            {
              name: 'ski_resorts',
              description:
                'Ski resorts and snow parks data including location, trails, lifts, and mountain attractions',
              row_count_estimate: 'hundreds',
              category: 'Attractions',
            },
            {
              name: 'national-parks',
              description:
                'National Parks data including location, acreage, visitor statistics, and park details',
              row_count_estimate: 'hundreds',
              category: 'Attractions',
            },
          ],
        };
      },
    }),

    query_properties: tool({
      description:
        'Query glamping properties with optional filters. Returns property data including name, location, pricing, and amenities. Use filters to narrow results. Limit defaults to 50.',
      inputSchema: z.object({
        filters: z
          .object({
            state: z.string().optional().describe('US state abbreviation (e.g., TX, CA, CO)'),
            city: z.string().optional().describe('City name'),
            country: z.string().optional().describe('Country (e.g., USA, Canada)'),
            unit_type: z
              .string()
              .optional()
              .describe('Type of glamping unit (e.g., cabin, yurt, tent, treehouse)'),
            property_type: z.string().optional().describe('Property type classification'),
            is_glamping_property: z
              .enum(['Yes', 'No'])
              .optional()
              .describe('Filter to glamping properties only'),
            is_closed: z.enum(['Yes', 'No']).optional().describe('Filter by open/closed status'),
          })
          .optional()
          .describe('Filters to apply to the query'),
        columns: z
          .array(z.string())
          .optional()
          .describe(
            'Specific columns to return. If not provided, returns summary columns: id, property_name, city, state, country, unit_type, property_type, url, property_total_sites, quantity_of_units, rate_avg_retail_daily_rate, research_status'
          ),
        limit: z.number().min(1).max(500).optional().default(50).describe('Max rows to return'),
        offset: z.number().min(0).optional().default(0).describe('Offset for pagination'),
        order_by: z.string().optional().describe('Column to order by'),
        order_ascending: z.boolean().optional().default(true).describe('Sort direction'),
      }),
      execute: async ({ filters, columns, limit, offset, order_by, order_ascending }) => {
        const selectColumns = columns?.length ? columns.join(', ') : PROPERTIES_SUMMARY_COLUMNS.join(', ');

        let query = supabase
          .from('all_glamping_properties')
          .select(selectColumns, { count: 'exact' })
          .range(offset ?? 0, (offset ?? 0) + (limit ?? 50) - 1);

        if (filters) {
          if (filters.state) query = query.ilike('state', filters.state);
          if (filters.city) query = query.ilike('city', `%${filters.city}%`);
          if (filters.country) query = query.ilike('country', `%${filters.country}%`);
          if (filters.unit_type) query = query.ilike('unit_type', `%${filters.unit_type}%`);
          if (filters.property_type) query = query.ilike('property_type', `%${filters.property_type}%`);
          if (filters.is_glamping_property) query = query.eq('is_glamping_property', filters.is_glamping_property);
          if (filters.is_closed) query = query.eq('is_closed', filters.is_closed);
        }

        if (order_by) {
          query = query.order(order_by, { ascending: order_ascending ?? true });
        }

        const { data, error, count } = await query;

        if (error) {
          return { error: error.message, data: null, total_count: 0 };
        }

        return {
          data: data ?? [],
          total_count: count ?? 0,
          returned_count: data?.length ?? 0,
          limit: limit ?? 50,
          offset: offset ?? 0,
        };
      },
    }),

    query_hipcamp: tool({
      description:
        'Query Hipcamp listings (Glamping & RV). Returns campsite and glamping data including location, pricing, and availability.',
      inputSchema: z.object({
        filters: z
          .object({
            state: z.string().optional().describe('US state - can be abbreviation (TX) or full name (Texas)'),
            city: z.string().optional().describe('City name'),
            country: z.string().optional().describe('Country'),
          })
          .optional(),
        columns: z
          .array(z.string())
          .optional()
          .describe('Specific columns to return'),
        limit: z.number().min(1).max(500).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      }),
      execute: async ({ filters, columns, limit, offset }) => {
        const selectColumns = columns?.length ? columns.join(', ') : '*';

        let query = supabase
          .from('hipcamp')
          .select(selectColumns, { count: 'exact' })
          .range(offset ?? 0, (offset ?? 0) + (limit ?? 50) - 1);

        if (filters) {
          if (filters.state) query = query.ilike('state', `%${filters.state}%`);
          if (filters.city) query = query.ilike('city', `%${filters.city}%`);
          if (filters.country) query = query.ilike('country', `%${filters.country}%`);
        }

        const { data, error, count } = await query;

        if (error) {
          return { error: error.message, data: null, total_count: 0 };
        }

        return {
          data: data ?? [],
          total_count: count ?? 0,
          returned_count: data?.length ?? 0,
        };
      },
    }),

    query_campspot: tool({
      description:
        'Query Campspot RV site data. Contains RV site listings scraped from Campspot. To explore the data, first query without filters to see available columns and sample data.',
      inputSchema: z.object({
        filters: z
          .record(z.string())
          .optional()
          .describe('Key-value filters to apply. Query without filters first to see available columns.'),
        columns: z
          .array(z.string())
          .optional()
          .describe('Specific columns to return. Leave empty to see all columns.'),
        limit: z.number().min(1).max(500).optional().default(20),
        offset: z.number().min(0).optional().default(0),
      }),
      execute: async ({ filters, columns, limit, offset }) => {
        const selectColumns = columns?.length ? columns.join(', ') : '*';

        let query = supabase
          .from('campspot')
          .select(selectColumns, { count: 'exact' })
          .range(offset ?? 0, (offset ?? 0) + (limit ?? 20) - 1);

        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            query = query.ilike(key, `%${value}%`);
          }
        }

        const { data, error, count } = await query;

        if (error) {
          return { error: error.message, data: null, total_count: 0 };
        }

        return {
          data: data ?? [],
          total_count: count ?? 0,
          returned_count: data?.length ?? 0,
        };
      },
    }),

    query_roverpass: tool({
      description:
        'Query RoverPass RV site data. Contains RV site listings scraped from RoverPass. To explore the data, first query without filters to see available columns and sample data.',
      inputSchema: z.object({
        filters: z
          .record(z.string())
          .optional()
          .describe('Key-value filters to apply. Query without filters first to see available columns.'),
        columns: z
          .array(z.string())
          .optional()
          .describe('Specific columns to return. Leave empty to see all columns.'),
        limit: z.number().min(1).max(500).optional().default(20),
        offset: z.number().min(0).optional().default(0),
      }),
      execute: async ({ filters, columns, limit, offset }) => {
        const selectColumns = columns?.length ? columns.join(', ') : '*';

        let query = supabase
          .from('all_roverpass_data_new')
          .select(selectColumns, { count: 'exact' })
          .range(offset ?? 0, (offset ?? 0) + (limit ?? 20) - 1);

        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            query = query.ilike(key, `%${value}%`);
          }
        }

        const { data, error, count } = await query;

        if (error) {
          return { error: error.message, data: null, total_count: 0 };
        }

        return {
          data: data ?? [],
          total_count: count ?? 0,
          returned_count: data?.length ?? 0,
        };
      },
    }),

    query_reports: tool({
      description:
        'Query feasibility study reports. Returns report metadata including client, study details, and status.',
      inputSchema: z.object({
        filters: z
          .object({
            client_id: z.string().optional().describe('Filter by client ID'),
            state: z.string().optional().describe('US state abbreviation'),
            city: z.string().optional().describe('City name'),
          })
          .optional(),
        columns: z
          .array(z.string())
          .optional()
          .describe('Specific columns to return'),
        limit: z.number().min(1).max(100).optional().default(25),
        offset: z.number().min(0).optional().default(0),
      }),
      execute: async ({ filters, columns, limit, offset }) => {
        const selectColumns = columns?.length ? columns.join(', ') : '*';

        let query = supabase
          .from('reports')
          .select(selectColumns, { count: 'exact' })
          .range(offset ?? 0, (offset ?? 0) + (limit ?? 25) - 1)
          .order('created_at', { ascending: false });

        if (filters) {
          if (filters.client_id) query = query.eq('client_id', filters.client_id);
          if (filters.state) query = query.ilike('state', filters.state);
          if (filters.city) query = query.ilike('city', `%${filters.city}%`);
        }

        const { data, error, count } = await query;

        if (error) {
          return { error: error.message, data: null, total_count: 0 };
        }

        return {
          data: data ?? [],
          total_count: count ?? 0,
          returned_count: data?.length ?? 0,
        };
      },
    }),

    query_county_population: tool({
      description:
        'Query US county population data for demographic analysis. Useful for market research and understanding population density near properties.',
      inputSchema: z.object({
        filters: z
          .object({
            state: z.string().optional().describe('US state name or abbreviation'),
            county: z.string().optional().describe('County name'),
          })
          .optional(),
        columns: z
          .array(z.string())
          .optional()
          .describe('Specific columns to return'),
        limit: z.number().min(1).max(500).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      }),
      execute: async ({ filters, columns, limit, offset }) => {
        const selectColumns = columns?.length ? columns.join(', ') : '*';

        let query = supabase
          .from('county-population')
          .select(selectColumns, { count: 'exact' })
          .range(offset ?? 0, (offset ?? 0) + (limit ?? 50) - 1);

        if (filters) {
          if (filters.state) query = query.ilike('state', `%${filters.state}%`);
          if (filters.county) query = query.ilike('county', `%${filters.county}%`);
        }

        const { data, error, count } = await query;

        if (error) {
          return { error: error.message, data: null, total_count: 0 };
        }

        return {
          data: data ?? [],
          total_count: count ?? 0,
          returned_count: data?.length ?? 0,
        };
      },
    }),

    query_ski_resorts: tool({
      description:
        'Query ski resorts and snow parks. Returns data about ski mountains including trails, lifts, location, and facilities. Use for questions about skiing, snowboarding, or mountain attractions.',
      inputSchema: z.object({
        filters: z
          .object({
            state: z.string().optional().describe('US state abbreviation'),
            name: z.string().optional().describe('Resort name (partial match)'),
          })
          .optional(),
        columns: z
          .array(z.string())
          .optional()
          .describe('Specific columns to return'),
        limit: z.number().min(1).max(500).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      }),
      execute: async ({ filters, columns, limit, offset }) => {
        const selectColumns = columns?.length ? columns.join(', ') : '*';

        let query = supabase
          .from('ski_resorts')
          .select(selectColumns, { count: 'exact' })
          .range(offset ?? 0, (offset ?? 0) + (limit ?? 50) - 1);

        if (filters) {
          if (filters.state) query = query.ilike('state', filters.state);
          if (filters.name) query = query.ilike('name', `%${filters.name}%`);
        }

        const { data, error, count } = await query;

        if (error) {
          return { error: error.message, data: null, total_count: 0 };
        }

        return {
          data: data ?? [],
          total_count: count ?? 0,
          returned_count: data?.length ?? 0,
        };
      },
    }),

    query_national_parks: tool({
      description:
        'Query National Parks data. Returns information about US National Parks including location, acreage, visitor statistics, and park details.',
      inputSchema: z.object({
        filters: z
          .object({
            state: z.string().optional().describe('US state abbreviation'),
            name: z.string().optional().describe('Park name (partial match)'),
          })
          .optional(),
        columns: z
          .array(z.string())
          .optional()
          .describe('Specific columns to return'),
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      }),
      execute: async ({ filters, columns, limit, offset }) => {
        const selectColumns = columns?.length ? columns.join(', ') : '*';

        let query = supabase
          .from('national-parks')
          .select(selectColumns, { count: 'exact' })
          .range(offset ?? 0, (offset ?? 0) + (limit ?? 50) - 1);

        if (filters) {
          if (filters.state) query = query.ilike('state', `%${filters.state}%`);
          if (filters.name) query = query.ilike('name', `%${filters.name}%`);
        }

        const { data, error, count } = await query;

        if (error) {
          return { error: error.message, data: null, total_count: 0 };
        }

        return {
          data: data ?? [],
          total_count: count ?? 0,
          returned_count: data?.length ?? 0,
        };
      },
    }),

    count_rows: tool({
      description: 'Get the count of rows in a table, optionally with filters.',
      inputSchema: z.object({
        table: z.enum(ALLOWED_TABLES).describe('Table to count rows from'),
        filters: z
          .record(z.string())
          .optional()
          .describe('Key-value pairs for equality filters'),
      }),
      execute: async ({ table, filters }) => {
        let query = supabase.from(table).select('*', { count: 'exact', head: true });

        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            query = query.eq(key, value);
          }
        }

        const { count, error } = await query;

        if (error) {
          return { error: error.message, count: null };
        }

        return { table, count: count ?? 0, filters: filters ?? {} };
      },
    }),

    get_column_values: tool({
      description:
        'Get distinct values for a column in the properties table. Useful for understanding what filter values are available.',
      inputSchema: z.object({
        column: z
          .enum(PROPERTIES_FILTERABLE_COLUMNS)
          .describe('Column to get distinct values for'),
        limit: z.number().min(1).max(100).optional().default(50),
      }),
      execute: async ({ column, limit }) => {
        const { data, error } = await supabase
          .from('all_glamping_properties')
          .select(column)
          .not(column, 'is', null)
          .limit(1000);

        if (error) {
          return { error: error.message, values: null };
        }

        const uniqueValues = [...new Set(data?.map((row) => (row as Record<string, unknown>)[column]).filter(Boolean))];
        const sortedValues = uniqueValues.sort().slice(0, limit ?? 50);

        return {
          column,
          values: sortedValues,
          total_unique: uniqueValues.length,
        };
      },
    }),

    get_property_details: tool({
      description: 'Get full details for a specific property by ID or name.',
      inputSchema: z.object({
        id: z.number().optional().describe('Property ID'),
        property_name: z.string().optional().describe('Property name (partial match)'),
      }),
      execute: async ({ id, property_name }) => {
        if (!id && !property_name) {
          return { error: 'Must provide either id or property_name', data: null };
        }

        let query = supabase.from('all_glamping_properties').select('*');

        if (id) {
          query = query.eq('id', id);
        } else if (property_name) {
          query = query.ilike('property_name', `%${property_name}%`);
        }

        const { data, error } = await query.limit(5);

        if (error) {
          return { error: error.message, data: null };
        }

        return {
          data: data ?? [],
          count: data?.length ?? 0,
        };
      },
    }),

    aggregate_properties: tool({
      description:
        'Get aggregate statistics for properties grouped by a column. Useful for summaries like "count by state" or "average rate by unit type".',
      inputSchema: z.object({
        group_by: z
          .enum(PROPERTIES_FILTERABLE_COLUMNS)
          .describe('Column to group results by'),
        filters: z
          .object({
            state: z.string().optional(),
            country: z.string().optional(),
            unit_type: z.string().optional(),
            is_glamping_property: z.enum(['Yes', 'No']).optional(),
          })
          .optional(),
      }),
      execute: async ({ group_by, filters }) => {
        let query = supabase
          .from('all_glamping_properties')
          .select(`${group_by}, rate_avg_retail_daily_rate, property_total_sites`);

        if (filters) {
          if (filters.state) query = query.ilike('state', filters.state);
          if (filters.country) query = query.ilike('country', `%${filters.country}%`);
          if (filters.unit_type) query = query.ilike('unit_type', `%${filters.unit_type}%`);
          if (filters.is_glamping_property) query = query.eq('is_glamping_property', filters.is_glamping_property);
        }

        const { data, error } = await query.limit(5000);

        if (error) {
          return { error: error.message, aggregates: null };
        }

        const groups: Record<
          string,
          { count: number; avg_rate: number | null; total_sites: number; rate_sum: number; rate_count: number }
        > = {};

        for (const row of data ?? []) {
          const rowData = row as Record<string, unknown>;
          const key = String(rowData[group_by] ?? 'Unknown');
          if (!groups[key]) {
            groups[key] = { count: 0, avg_rate: null, total_sites: 0, rate_sum: 0, rate_count: 0 };
          }
          groups[key].count++;
          if (rowData.rate_avg_retail_daily_rate != null) {
            groups[key].rate_sum += Number(rowData.rate_avg_retail_daily_rate);
            groups[key].rate_count++;
          }
          if (rowData.property_total_sites != null) {
            groups[key].total_sites += Number(rowData.property_total_sites);
          }
        }

        const aggregates = Object.entries(groups)
          .map(([value, stats]) => ({
            [group_by]: value,
            count: stats.count,
            avg_daily_rate: stats.rate_count > 0 ? Math.round((stats.rate_sum / stats.rate_count) * 100) / 100 : null,
            total_sites: stats.total_sites,
          }))
          .sort((a, b) => b.count - a.count);

        return {
          group_by,
          aggregates,
          total_groups: aggregates.length,
        };
      },
    }),

    execute_safe_sql: tool({
      description:
        'DISABLED - This tool is currently unavailable. Use the other query tools instead (query_properties, query_hipcamp, query_campspot, query_roverpass, aggregate_properties, etc.).',
      inputSchema: z.object({
        sql: z
          .string()
          .describe(
            'The SQL SELECT query to execute. Must be read-only and query only allowed tables.'
          ),
        explanation: z
          .string()
          .describe('Brief explanation of what this query does'),
      }),
      execute: async () => {
        return {
          error: 'This tool is currently disabled. Please use the other query tools instead: query_properties, query_hipcamp, query_campspot, query_roverpass, aggregate_properties, get_property_details, or count_rows.',
          data: null,
        };
      },
    }),

    generate_python_code: tool({
      description: `Generate Python code for data analysis or visualization. The code will be executed in the user's browser using Pyodide (Python in WebAssembly).

Available libraries: numpy, pandas, matplotlib.

IMPORTANT RULES:
- If you need data from a previous query, use the special variable 'data' which will contain the query results as a list of dictionaries
- For charts, use matplotlib and call plt.show() at the end
- Use print() for any text output you want to display
- The code runs in a sandbox with no network or file access
- Keep code simple and focused on the task

Example for creating a chart from query data:
\`\`\`python
import pandas as pd
import matplotlib.pyplot as plt

df = pd.DataFrame(data)
df.groupby('state').size().plot(kind='bar')
plt.title('Properties by State')
plt.xlabel('State')
plt.ylabel('Count')
plt.tight_layout()
plt.show()
\`\`\``,
      inputSchema: z.object({
        code: z.string().describe('The Python code to execute'),
        description: z.string().describe('Brief description of what this code does'),
        uses_query_data: z
          .boolean()
          .optional()
          .describe('Set to true if this code needs data from a previous query tool result'),
      }),
      execute: async ({ code, description, uses_query_data }) => {
        return {
          type: 'python_code',
          code,
          description,
          uses_query_data: uses_query_data ?? false,
          message:
            'Python code generated. Click "Run" to execute it in your browser.',
        };
      },
    }),

    // External API Tools

    google_places_search: tool({
      description:
        'Search for places using Google Places API. Useful for finding businesses, attractions, campgrounds, or any location-based information. Returns place names, addresses, ratings, and place IDs.',
      inputSchema: z.object({
        query: z.string().describe('Search query (e.g., "glamping near Austin TX", "RV parks in Colorado")'),
        location: z
          .object({
            lat: z.number().describe('Latitude'),
            lng: z.number().describe('Longitude'),
          })
          .optional()
          .describe('Optional center point for location-biased search'),
        radius: z
          .number()
          .min(1)
          .max(50000)
          .optional()
          .describe('Search radius in meters (max 50000)'),
        type: z
          .string()
          .optional()
          .describe('Place type filter (e.g., campground, lodging, rv_park, tourist_attraction)'),
      }),
      execute: async ({ query, location, radius, type }) => {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          return { error: 'Google Places API key not configured', data: null };
        }

        try {
          const params = new URLSearchParams({
            query,
            key: apiKey,
          });

          if (location) {
            params.append('location', `${location.lat},${location.lng}`);
          }
          if (radius) {
            params.append('radius', radius.toString());
          }
          if (type) {
            params.append('type', type);
          }

          const response = await fetch(
            `https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`
          );

          if (!response.ok) {
            return { error: `Google Places API error: ${response.status}`, data: null };
          }

          const result = await response.json();

          if (result.status !== 'OK' && result.status !== 'ZERO_RESULTS') {
            return { error: `Google Places API status: ${result.status}`, data: null };
          }

          const places = (result.results || []).slice(0, 20).map((place: {
            name: string;
            formatted_address: string;
            place_id: string;
            rating?: number;
            user_ratings_total?: number;
            types?: string[];
            geometry?: { location: { lat: number; lng: number } };
            opening_hours?: { open_now: boolean };
            price_level?: number;
          }) => ({
            name: place.name,
            address: place.formatted_address,
            place_id: place.place_id,
            rating: place.rating,
            total_ratings: place.user_ratings_total,
            types: place.types,
            location: place.geometry?.location,
            open_now: place.opening_hours?.open_now,
            price_level: place.price_level,
          }));

          return {
            data: places,
            total_count: places.length,
            query,
          };
        } catch (err) {
          return {
            error: `Failed to search places: ${err instanceof Error ? err.message : String(err)}`,
            data: null,
          };
        }
      },
    }),

    google_place_details: tool({
      description:
        'Get detailed information about a specific place using its place_id from Google Places API. Returns reviews, contact info, hours, and more.',
      inputSchema: z.object({
        place_id: z.string().describe('The Google Place ID to get details for'),
        fields: z
          .array(z.string())
          .optional()
          .describe('Specific fields to return (e.g., reviews, website, phone). If not specified, returns common fields.'),
      }),
      execute: async ({ place_id, fields }) => {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          return { error: 'Google Places API key not configured', data: null };
        }

        try {
          const defaultFields = [
            'name',
            'formatted_address',
            'formatted_phone_number',
            'website',
            'rating',
            'user_ratings_total',
            'reviews',
            'opening_hours',
            'price_level',
            'types',
            'url',
          ];

          const params = new URLSearchParams({
            place_id,
            key: apiKey,
            fields: (fields || defaultFields).join(','),
          });

          const response = await fetch(
            `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`
          );

          if (!response.ok) {
            return { error: `Google Places API error: ${response.status}`, data: null };
          }

          const result = await response.json();

          if (result.status !== 'OK') {
            return { error: `Google Places API status: ${result.status}`, data: null };
          }

          return {
            data: result.result,
            place_id,
          };
        } catch (err) {
          return {
            error: `Failed to get place details: ${err instanceof Error ? err.message : String(err)}`,
            data: null,
          };
        }
      },
    }),

    web_search: tool({
      description:
        'Search the web using Tavily API. Useful for finding current information about glamping trends, competitor research, industry news, or any general web search. Returns relevant snippets and URLs.',
      inputSchema: z.object({
        query: z.string().describe('Search query'),
        search_depth: z
          .enum(['basic', 'advanced'])
          .optional()
          .default('basic')
          .describe('Search depth - basic is faster, advanced is more thorough'),
        include_domains: z
          .array(z.string())
          .optional()
          .describe('Limit search to specific domains (e.g., ["hipcamp.com", "glamping.com"])'),
        exclude_domains: z
          .array(z.string())
          .optional()
          .describe('Exclude specific domains from results'),
        max_results: z
          .number()
          .min(1)
          .max(10)
          .optional()
          .default(5)
          .describe('Maximum number of results to return'),
      }),
      execute: async ({ query, search_depth, include_domains, exclude_domains, max_results }) => {
        const apiKey = process.env.TAVILY_API_KEY;
        if (!apiKey) {
          return { error: 'Tavily API key not configured', data: null };
        }

        try {
          const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              api_key: apiKey,
              query,
              search_depth: search_depth || 'basic',
              include_domains: include_domains || [],
              exclude_domains: exclude_domains || [],
              max_results: max_results || 5,
              include_answer: true,
            }),
          });

          if (!response.ok) {
            return { error: `Tavily API error: ${response.status}`, data: null };
          }

          const result = await response.json();

          return {
            answer: result.answer,
            results: result.results?.map((r: { title: string; url: string; content: string; score: number }) => ({
              title: r.title,
              url: r.url,
              content: r.content,
              relevance_score: r.score,
            })),
            query,
          };
        } catch (err) {
          return {
            error: `Failed to search web: ${err instanceof Error ? err.message : String(err)}`,
            data: null,
          };
        }
      },
    }),

    scrape_webpage: tool({
      description:
        'Scrape content from a webpage using Firecrawl. Useful for extracting detailed information from competitor websites, property listings, or any webpage. Returns clean markdown content.',
      inputSchema: z.object({
        url: z.string().url().describe('The URL of the webpage to scrape'),
        formats: z
          .array(z.enum(['markdown', 'html', 'rawHtml', 'links', 'screenshot']))
          .optional()
          .default(['markdown'])
          .describe('Output formats to return'),
        only_main_content: z
          .boolean()
          .optional()
          .default(true)
          .describe('Extract only main content, excluding headers/footers/navs'),
        wait_for: z
          .number()
          .min(0)
          .max(30000)
          .optional()
          .describe('Milliseconds to wait for dynamic content to load'),
      }),
      execute: async ({ url, formats, only_main_content, wait_for }) => {
        const apiKey = process.env.FIRECRAWL_API_KEY;
        if (!apiKey) {
          return { error: 'Firecrawl API key not configured', data: null };
        }

        try {
          const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              url,
              formats: formats || ['markdown'],
              onlyMainContent: only_main_content !== false,
              waitFor: wait_for,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            return { error: `Firecrawl API error: ${response.status} - ${errorText}`, data: null };
          }

          const result = await response.json();

          if (!result.success) {
            return { error: result.error || 'Scraping failed', data: null };
          }

          return {
            url,
            markdown: result.data?.markdown,
            html: result.data?.html,
            links: result.data?.links,
            metadata: result.data?.metadata,
          };
        } catch (err) {
          return {
            error: `Failed to scrape webpage: ${err instanceof Error ? err.message : String(err)}`,
            data: null,
          };
        }
      },
    }),

    crawl_website: tool({
      description:
        'Crawl multiple pages from a website using Firecrawl. Useful for comprehensive research on a competitor or property website. Returns content from multiple pages.',
      inputSchema: z.object({
        url: z.string().url().describe('The starting URL to crawl from'),
        max_pages: z
          .number()
          .min(1)
          .max(20)
          .optional()
          .default(5)
          .describe('Maximum number of pages to crawl (max 20)'),
        include_paths: z
          .array(z.string())
          .optional()
          .describe('Only crawl pages matching these path patterns (e.g., ["/blog/*", "/properties/*"])'),
        exclude_paths: z
          .array(z.string())
          .optional()
          .describe('Exclude pages matching these path patterns'),
      }),
      execute: async ({ url, max_pages, include_paths, exclude_paths }) => {
        const apiKey = process.env.FIRECRAWL_API_KEY;
        if (!apiKey) {
          return { error: 'Firecrawl API key not configured', data: null };
        }

        try {
          // Start crawl job
          const startResponse = await fetch('https://api.firecrawl.dev/v1/crawl', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              url,
              limit: max_pages || 5,
              includePaths: include_paths,
              excludePaths: exclude_paths,
              scrapeOptions: {
                formats: ['markdown'],
                onlyMainContent: true,
              },
            }),
          });

          if (!startResponse.ok) {
            return { error: `Firecrawl API error: ${startResponse.status}`, data: null };
          }

          const startResult = await startResponse.json();
          
          if (!startResult.success || !startResult.id) {
            return { error: 'Failed to start crawl job', data: null };
          }

          // Poll for results (with timeout)
          const crawlId = startResult.id;
          let attempts = 0;
          const maxAttempts = 30;

          while (attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 2000));

            const statusResponse = await fetch(`https://api.firecrawl.dev/v1/crawl/${crawlId}`, {
              headers: {
                Authorization: `Bearer ${apiKey}`,
              },
            });

            if (!statusResponse.ok) {
              return { error: `Failed to check crawl status: ${statusResponse.status}`, data: null };
            }

            const statusResult = await statusResponse.json();

            if (statusResult.status === 'completed') {
              return {
                url,
                pages_crawled: statusResult.data?.length || 0,
                pages: statusResult.data?.map((page: { metadata?: { url?: string; title?: string }; markdown?: string }) => ({
                  url: page.metadata?.url,
                  title: page.metadata?.title,
                  content: page.markdown?.slice(0, 2000) + (page.markdown && page.markdown.length > 2000 ? '...' : ''),
                })),
              };
            }

            if (statusResult.status === 'failed') {
              return { error: 'Crawl job failed', data: null };
            }

            attempts++;
          }

          return { error: 'Crawl job timed out', data: null };
        } catch (err) {
          return {
            error: `Failed to crawl website: ${err instanceof Error ? err.message : String(err)}`,
            data: null,
          };
        }
      },
    }),
  };
}

export type SageAiTools = ReturnType<typeof createSageAiTools>;
