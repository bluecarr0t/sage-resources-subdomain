/**
 * RIDB API client utility
 * Handles rate limiting, pagination, and error handling for recreation.gov RIDB API
 */

import {
  RIDBCampsite,
  RIDBFacility,
  RIDBRecArea,
  RIDBAttribute,
  RIDBMedia,
  RIDBFacilityAddress,
  RIDBRecAreaAddress,
  RIDBOrganization,
  RIDBPaginatedResponse,
} from './types/ridb';

const RIDB_API_BASE_URL = 'https://ridb.recreation.gov/api/v1';

// Rate limiting configuration
const DEFAULT_RATE_LIMIT_DELAY_MS = 1000; // 1 second between requests
let lastRequestTime = 0;

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Rate limit requests to respect API limits
 */
async function rateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < DEFAULT_RATE_LIMIT_DELAY_MS) {
    const delay = DEFAULT_RATE_LIMIT_DELAY_MS - timeSinceLastRequest;
    await sleep(delay);
  }
  
  lastRequestTime = Date.now();
}

/**
 * Make a request to the RIDB API with retry logic and timeout
 */
async function makeRequest<T>(
  endpoint: string,
  apiKey: string,
  retries: number = 3
): Promise<T> {
  await rateLimit();
  
  const url = `${RIDB_API_BASE_URL}${endpoint}`;
  const headers = {
    'apikey': apiKey,
    'Accept': 'application/json',
  };

  const TIMEOUT_MS = 30000; // 30 second timeout

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), TIMEOUT_MS);
      });

      // Race between fetch and timeout
      const fetchPromise = fetch(url, { headers });
      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (!response.ok) {
        const errorText = await response.text();
        
        // If it's a 404, return empty result (not an error)
        if (response.status === 404) {
          return { RECDATA: [], METADATA: { RESULTS: { CURRENT_COUNT: 0, TOTAL_COUNT: 0 } } } as T;
        }

        // If it's a rate limit error, wait longer and retry
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
          console.warn(`Rate limited. Waiting ${waitTime}ms before retry...`);
          await sleep(waitTime);
          continue;
        }

        throw new Error(
          `RIDB API error (${response.status}): ${errorText}`
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // If it's a network error or timeout and we have retries left, wait and retry
      if (attempt < retries && (error instanceof TypeError || error instanceof Error)) {
        const backoffDelay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
        console.warn(
          `Request failed (attempt ${attempt}/${retries}), retrying in ${backoffDelay}ms...`,
          error instanceof Error ? error.message : String(error)
        );
        await sleep(backoffDelay);
        continue;
      }
    }
  }

  throw lastError || new Error('Request failed after all retries');
}

/**
 * Fetch all items from a paginated endpoint
 */
async function fetchAllPages<T>(
  endpoint: string,
  apiKey: string,
  limit: number = 50,
  showProgress: boolean = false
): Promise<T[]> {
  const allItems: T[] = [];
  let offset = 0;
  let hasMore = true;
  let totalCount = 0;
  let pageNumber = 0;

  while (hasMore) {
    pageNumber++;
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    
    const paginatedEndpoint = `${endpoint}?${queryParams.toString()}`;
    
    if (showProgress) {
      if (pageNumber === 1) {
        process.stdout.write(`   Fetching page ${pageNumber}...`);
      } else {
        process.stdout.write(`\r   Fetching page ${pageNumber}...`);
      }
    }
    
    try {
      const response = await makeRequest<RIDBPaginatedResponse<T>>(paginatedEndpoint, apiKey);

      if (response.RECDATA && response.RECDATA.length > 0) {
        allItems.push(...response.RECDATA);
        
        totalCount = response.METADATA?.RESULTS?.TOTAL_COUNT || 0;
        const currentCount = response.METADATA?.RESULTS?.CURRENT_COUNT || 0;
        
        if (showProgress) {
          process.stdout.write(`\r   Fetched page ${pageNumber}: ${allItems.length}/${totalCount || '?'} items`);
        }
        
        offset += currentCount;
        hasMore = offset < totalCount;
      } else {
        hasMore = false;
      }
    } catch (error) {
      console.error(`\n   ❌ Error fetching page ${pageNumber}:`, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  if (showProgress) {
    console.log(''); // New line after progress
  }

  return allItems;
}

/**
 * RIDB API Client Class
 */
export class RIDBApiClient {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('RIDB API key is required');
    }
    this.apiKey = apiKey;
  }

  /**
   * Fetch all facilities
   */
  async getAllFacilities(showProgress: boolean = true): Promise<RIDBFacility[]> {
    return fetchAllPages<RIDBFacility>('/facilities', this.apiKey, 50, showProgress);
  }

  /**
   * Fetch a specific facility by ID
   */
  async getFacility(facilityId: string): Promise<RIDBFacility | null> {
    try {
      const response = await makeRequest<RIDBPaginatedResponse<RIDBFacility>>(
        `/facilities/${facilityId}`,
        this.apiKey
      );
      return response.RECDATA?.[0] || null;
    } catch (error) {
      console.error(`Error fetching facility ${facilityId}:`, error);
      return null;
    }
  }

  /**
   * Fetch all campsites for a facility
   */
  async getFacilityCampsites(facilityId: string, showProgress: boolean = false): Promise<RIDBCampsite[]> {
    return fetchAllPages<RIDBCampsite>(
      `/facilities/${facilityId}/campsites`,
      this.apiKey,
      50,
      showProgress
    );
  }

  /**
   * Fetch a specific campsite by ID
   */
  async getCampsite(campsiteId: string): Promise<RIDBCampsite | null> {
    try {
      const response = await makeRequest<RIDBPaginatedResponse<RIDBCampsite>>(
        `/campsites/${campsiteId}`,
        this.apiKey
      );
      return response.RECDATA?.[0] || null;
    } catch (error) {
      console.error(`Error fetching campsite ${campsiteId}:`, error);
      return null;
    }
  }

  /**
   * Fetch attributes for a campsite
   */
  async getCampsiteAttributes(campsiteId: string): Promise<RIDBAttribute[]> {
    try {
      const response = await makeRequest<RIDBPaginatedResponse<RIDBAttribute>>(
        `/campsites/${campsiteId}/attributes`,
        this.apiKey
      );
      return response.RECDATA || [];
    } catch (error) {
      console.error(`Error fetching attributes for campsite ${campsiteId}:`, error);
      return [];
    }
  }

  /**
   * Fetch media for a campsite
   */
  async getCampsiteMedia(campsiteId: string): Promise<RIDBMedia[]> {
    try {
      // RIDB API uses EntityMedia endpoint for campsites
      const response = await makeRequest<RIDBPaginatedResponse<RIDBMedia>>(
        `/campsites/${campsiteId}/media`,
        this.apiKey
      );
      return response.RECDATA || [];
    } catch (error) {
      console.error(`Error fetching media for campsite ${campsiteId}:`, error);
      return [];
    }
  }

  /**
   * Fetch facility addresses
   */
  async getFacilityAddresses(facilityId: string): Promise<RIDBFacilityAddress[]> {
    try {
      const response = await makeRequest<RIDBPaginatedResponse<RIDBFacilityAddress>>(
        `/facilities/${facilityId}/facilityaddresses`,
        this.apiKey
      );
      return response.RECDATA || [];
    } catch (error) {
      console.error(`Error fetching addresses for facility ${facilityId}:`, error);
      return [];
    }
  }

  /**
   * Fetch a recreation area by ID
   */
  async getRecArea(recAreaId: string): Promise<RIDBRecArea | null> {
    try {
      const response = await makeRequest<RIDBPaginatedResponse<RIDBRecArea>>(
        `/recareas/${recAreaId}`,
        this.apiKey
      );
      return response.RECDATA?.[0] || null;
    } catch (error) {
      console.error(`Error fetching recreation area ${recAreaId}:`, error);
      return null;
    }
  }

  /**
   * Fetch recreation area addresses
   */
  async getRecAreaAddresses(recAreaId: string): Promise<RIDBRecAreaAddress[]> {
    try {
      const response = await makeRequest<RIDBPaginatedResponse<RIDBRecAreaAddress>>(
        `/recareas/${recAreaId}/recareaaddresses`,
        this.apiKey
      );
      return response.RECDATA || [];
    } catch (error) {
      console.error(`Error fetching addresses for recreation area ${recAreaId}:`, error);
      return [];
    }
  }

  /**
   * Fetch an organization by ID
   */
  async getOrganization(orgId: string): Promise<RIDBOrganization | null> {
    try {
      const response = await makeRequest<RIDBPaginatedResponse<RIDBOrganization>>(
        `/organizations/${orgId}`,
        this.apiKey
      );
      return response.RECDATA?.[0] || null;
    } catch (error) {
      console.error(`Error fetching organization ${orgId}:`, error);
      return null;
    }
  }
}

/**
 * Create a RIDB API client instance
 */
export function createRIDBClient(): RIDBApiClient {
  const apiKey = process.env.RIDB_API_KEY;
  if (!apiKey) {
    throw new Error('RIDB_API_KEY environment variable is not set');
  }
  return new RIDBApiClient(apiKey);
}

