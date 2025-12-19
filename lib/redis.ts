import { createClient, RedisClientType } from 'redis';
import { createHash } from 'crypto';
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

/**
 * Redis client singleton
 * Supports both REDIS_URL connection string and separate environment variables
 */
let redisClient: RedisClientType | null = null;
let isRedisAvailable = false;
let isConnecting = false;

/**
 * Cache metrics tracking
 */
interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  avgHitTime: number;
  avgMissTime: number;
  compressionStats: {
    compressed: number;
    uncompressed: number;
  };
  hitTimes: number[];
  missTimes: number[];
}

let cacheMetrics: CacheMetrics = {
  hits: 0,
  misses: 0,
  hitRate: 0,
  totalRequests: 0,
  avgHitTime: 0,
  avgMissTime: 0,
  compressionStats: {
    compressed: 0,
    uncompressed: 0,
  },
  hitTimes: [],
  missTimes: [],
};

// Keep only last 1000 timing samples to prevent memory growth
const MAX_TIMING_SAMPLES = 1000;

/**
 * Get or create Redis client instance
 * Returns null if Redis is not configured or unavailable
 */
async function getRedisClient(): Promise<RedisClientType | null> {
  if (redisClient && isRedisAvailable) {
    return redisClient;
  }

  // If already connecting, wait a bit and return existing client
  if (isConnecting && redisClient) {
    return redisClient;
  }

  // Check if Redis is configured
  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST;
  const redisPort = process.env.REDIS_PORT;
  const redisPassword = process.env.REDIS_PASSWORD;
  const redisUsername = process.env.REDIS_USERNAME || 'default';

  // If no Redis configuration, return null (graceful fallback)
  if (!redisUrl && !redisHost) {
    console.warn('Redis not configured - falling back to direct database queries');
    return null;
  }

  try {
    isConnecting = true;
    let client: RedisClientType;

    // Use connection string if provided, otherwise use separate variables
    if (redisUrl) {
      client = createClient({
        url: redisUrl,
      });
    } else if (redisHost) {
      client = createClient({
        username: redisUsername,
        password: redisPassword,
        socket: {
          host: redisHost,
          port: redisPort ? parseInt(redisPort, 10) : 6379,
        },
      });
    } else {
      isConnecting = false;
      return null;
    }

    // Set up error handlers
    client.on('error', (err) => {
      console.error('Redis client error:', err);
      isRedisAvailable = false;
    });

    client.on('connect', () => {
      console.log('Redis client connecting...');
    });

    client.on('ready', () => {
      console.log('Redis client ready');
      isRedisAvailable = true;
      isConnecting = false;
    });

    client.on('end', () => {
      console.log('Redis client connection ended');
      isRedisAvailable = false;
      isConnecting = false;
    });

    // Connect to Redis
    await client.connect();
    
    redisClient = client;
    isRedisAvailable = true;
    isConnecting = false;

    return redisClient;
  } catch (error) {
    console.error('Failed to create Redis client:', error);
    isRedisAvailable = false;
    isConnecting = false;
    return null;
  }
}

/**
 * Hash cache key using SHA-256
 * @param data Data to hash (typically filter parameters)
 * @returns SHA-256 hash as hex string (64 characters)
 */
export function hashCacheKey(data: any): string {
  const hash = createHash('sha256');
  hash.update(JSON.stringify(data));
  return hash.digest('hex');
}

/**
 * Get value from Redis cache
 * Supports both compressed and uncompressed entries
 * Tracks cache metrics (hits, misses, response times)
 * @param key Cache key
 * @returns Cached value or null if not found or Redis unavailable
 */
export async function getCache<T = any>(key: string): Promise<T | null> {
  const startTime = Date.now();
  const client = await getRedisClient();
  if (!client) {
    cacheMetrics.misses++;
    cacheMetrics.totalRequests++;
    updateMetrics();
    return null;
  }

  try {
    const value = await client.get(key);
    const responseTime = Date.now() - startTime;
    
    if (value === null) {
      // Cache miss
      cacheMetrics.misses++;
      cacheMetrics.totalRequests++;
      if (cacheMetrics.missTimes.length >= MAX_TIMING_SAMPLES) {
        cacheMetrics.missTimes.shift();
      }
      cacheMetrics.missTimes.push(responseTime);
      updateMetrics();
      return null;
    }

    // Cache hit - parse value (may be compressed or uncompressed)
    let parsedValue: T;
    
    try {
      // Try to parse as JSON first (uncompressed format)
      const parsed = JSON.parse(value);
      
      // Check if it's a compressed entry
      if (parsed && typeof parsed === 'object' && 'compressed' in parsed && parsed.compressed === true) {
        // Decompress the data
        const compressedBuffer = Buffer.from(parsed.data, 'base64');
        const decompressed = await gunzipAsync(compressedBuffer);
        parsedValue = JSON.parse(decompressed.toString()) as T;
      } else {
        // Uncompressed entry
        parsedValue = parsed as T;
      }
    } catch (parseError) {
      // Fallback: try to parse as plain JSON (backward compatibility)
      try {
        parsedValue = JSON.parse(value) as T;
      } catch (fallbackError) {
        console.error(`Redis parse error for key ${key}:`, fallbackError);
        cacheMetrics.misses++;
        cacheMetrics.totalRequests++;
        updateMetrics();
        return null;
      }
    }

    // Cache hit
    cacheMetrics.hits++;
    cacheMetrics.totalRequests++;
    if (cacheMetrics.hitTimes.length >= MAX_TIMING_SAMPLES) {
      cacheMetrics.hitTimes.shift();
    }
    cacheMetrics.hitTimes.push(responseTime);
    updateMetrics();
    
    return parsedValue;
  } catch (error) {
    console.error(`Redis get error for key ${key}:`, error);
    cacheMetrics.misses++;
    cacheMetrics.totalRequests++;
    updateMetrics();
    return null;
  }
}

/**
 * Update cache metrics (hit rate, average times)
 */
function updateMetrics(): void {
  cacheMetrics.hitRate = cacheMetrics.totalRequests > 0
    ? (cacheMetrics.hits / cacheMetrics.totalRequests) * 100
    : 0;
  
  if (cacheMetrics.hitTimes.length > 0) {
    const sum = cacheMetrics.hitTimes.reduce((a, b) => a + b, 0);
    cacheMetrics.avgHitTime = sum / cacheMetrics.hitTimes.length;
  }
  
  if (cacheMetrics.missTimes.length > 0) {
    const sum = cacheMetrics.missTimes.reduce((a, b) => a + b, 0);
    cacheMetrics.avgMissTime = sum / cacheMetrics.missTimes.length;
  }
}

/**
 * Set value in Redis cache
 * Compresses payloads >100KB before storing
 * Tracks compression statistics
 * @param key Cache key
 * @param value Value to cache (will be JSON stringified)
 * @param ttlSeconds Time to live in seconds (default: 14 days)
 * @returns true if successful, false otherwise
 */
export async function setCache(
  key: string,
  value: any,
  ttlSeconds: number = 1209600 // 14 days default
): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) {
    return false;
  }

  try {
    const serialized = JSON.stringify(value);
    const sizeBytes = Buffer.byteLength(serialized, 'utf8');
    const COMPRESSION_THRESHOLD = 100 * 1024; // 100KB

    if (sizeBytes > COMPRESSION_THRESHOLD) {
      // Compress large payloads
      try {
        const compressed = await gzipAsync(Buffer.from(serialized, 'utf8'));
        const compressedBase64 = compressed.toString('base64');
        const compressedEntry = JSON.stringify({
          compressed: true,
          data: compressedBase64,
        });
        
        await client.setEx(key, ttlSeconds, compressedEntry);
        cacheMetrics.compressionStats.compressed++;
        return true;
      } catch (compressionError) {
        // Fallback to uncompressed if compression fails
        console.warn(`Compression failed for key ${key}, storing uncompressed:`, compressionError);
        await client.setEx(key, ttlSeconds, serialized);
        cacheMetrics.compressionStats.uncompressed++;
        return true;
      }
    } else {
      // Store uncompressed for small payloads
      await client.setEx(key, ttlSeconds, serialized);
      cacheMetrics.compressionStats.uncompressed++;
      return true;
    }
  } catch (error) {
    console.error(`Redis set error for key ${key}:`, error);
    return false;
  }
}

/**
 * Delete a key from Redis cache
 * @param key Cache key to delete
 * @returns true if successful, false otherwise
 */
export async function deleteCache(key: string): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) {
    return false;
  }

  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error(`Redis delete error for key ${key}:`, error);
    return false;
  }
}

/**
 * Check if a key exists in Redis
 * @param key Cache key to check
 * @returns true if key exists, false otherwise
 */
export async function existsCache(key: string): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) {
    return false;
  }

  try {
    const result = await client.exists(key);
    return result === 1;
  } catch (error) {
    console.error(`Redis exists error for key ${key}:`, error);
    return false;
  }
}

/**
 * Delete all keys matching a pattern
 * @param pattern Pattern to match (e.g., 'properties:*')
 * @returns Number of keys deleted
 */
export async function deleteCachePattern(pattern: string): Promise<number> {
  const client = await getRedisClient();
  if (!client) {
    return 0;
  }

  try {
    // Use SCAN instead of KEYS for better performance in production
    const keys: string[] = [];
    let cursor = 0;
    
    do {
      const result = await client.scan(cursor, {
        MATCH: pattern,
        COUNT: 100,
      });
      cursor = typeof result === 'object' && 'cursor' in result ? result.cursor : 0;
      const resultKeys = typeof result === 'object' && 'keys' in result ? result.keys : [];
      keys.push(...resultKeys);
    } while (cursor !== 0);

    if (keys.length === 0) {
      return 0;
    }
    
    // Delete keys in batches to avoid blocking
    await client.del(keys);
    return keys.length;
  } catch (error) {
    console.error(`Redis delete pattern error for pattern ${pattern}:`, error);
    return 0;
  }
}

/**
 * Check if Redis is available and connected
 * @returns true if Redis is available, false otherwise
 */
export function isRedisConnected(): boolean {
  return isRedisAvailable && redisClient !== null;
}

/**
 * Close Redis connection (useful for cleanup in tests)
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isRedisAvailable = false;
    isConnecting = false;
  }
}

/**
 * Get current cache metrics
 * @returns Current cache metrics object
 */
export function getCacheMetrics(): CacheMetrics {
  return { ...cacheMetrics };
}

/**
 * Reset cache metrics (useful for testing)
 */
export function resetCacheMetrics(): void {
  cacheMetrics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalRequests: 0,
    avgHitTime: 0,
    avgMissTime: 0,
    compressionStats: {
      compressed: 0,
      uncompressed: 0,
    },
    hitTimes: [],
    missTimes: [],
  };
}

/**
 * Log cache metrics to console (formatted output)
 * Can be controlled by environment variable ENABLE_CACHE_METRICS_LOG
 */
export function logCacheMetrics(): void {
  const shouldLog = process.env.ENABLE_CACHE_METRICS_LOG === 'true' || 
                    process.env.NODE_ENV === 'development';
  
  if (!shouldLog) {
    return;
  }

  const metrics = getCacheMetrics();
  console.log('=== Redis Cache Metrics ===');
  console.log(`Total Requests: ${metrics.totalRequests}`);
  console.log(`Cache Hits: ${metrics.hits} (${metrics.hitRate.toFixed(2)}%)`);
  console.log(`Cache Misses: ${metrics.misses} (${(100 - metrics.hitRate).toFixed(2)}%)`);
  console.log(`Avg Hit Time: ${metrics.avgHitTime.toFixed(2)}ms`);
  console.log(`Avg Miss Time: ${metrics.avgMissTime.toFixed(2)}ms`);
  console.log(`Compressed Entries: ${metrics.compressionStats.compressed}`);
  console.log(`Uncompressed Entries: ${metrics.compressionStats.uncompressed}`);
  console.log('==========================');
}
