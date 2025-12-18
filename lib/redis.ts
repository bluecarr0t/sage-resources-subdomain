import { createClient, RedisClientType } from 'redis';

/**
 * Redis client singleton
 * Supports both REDIS_URL connection string and separate environment variables
 */
let redisClient: RedisClientType | null = null;
let isRedisAvailable = false;
let isConnecting = false;

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
 * Get value from Redis cache
 * @param key Cache key
 * @returns Cached value or null if not found or Redis unavailable
 */
export async function getCache<T = any>(key: string): Promise<T | null> {
  const client = await getRedisClient();
  if (!client) {
    return null;
  }

  try {
    const value = await client.get(key);
    if (value === null) {
      return null;
    }
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`Redis get error for key ${key}:`, error);
    return null;
  }
}

/**
 * Set value in Redis cache
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
    await client.setEx(key, ttlSeconds, serialized);
    return true;
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
