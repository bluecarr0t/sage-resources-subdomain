# Redis Cache Setup Guide

This project uses Redis Cloud for caching map page data to improve performance. The cache stores property statistics and filtered property lists with a 14-day TTL.

## Step 1: Get Your Redis Cloud Credentials

1. Go to [Redis Cloud Console](https://cloud.redis.io/)
2. Sign in or create a free account
3. Create a new database or select an existing one
4. Navigate to your database configuration
5. Copy your connection details:
   - **Connection URL** (recommended) - Format: `redis://default:password@host:port`
   - OR separate values:
     - **Host** (e.g., `redis-12345.redis.cloud.redislabs.com`)
     - **Port** (usually `12345` or `6379`)
     - **Password** (your database password)

## Step 2: Add Redis Configuration to `.env.local`

Add Redis configuration to your `.env.local` file in the project root:

### Option 1: Using Connection URL (Recommended)

```env
# Redis Cloud Configuration
REDIS_URL=redis://default:your_password@your_host:your_port
```

### Option 2: Using Separate Variables (Recommended for Redis Cloud)

```env
# Redis Cloud Configuration
REDIS_HOST=your-redis-host.redis.cloud.redislabs.com
REDIS_PORT=12345
REDIS_PASSWORD=your-redis-password
REDIS_USERNAME=default
```

**Example from Redis Cloud:**
```env
REDIS_HOST=redis-14591.crce197.us-east-2-1.ec2.cloud.redislabs.com
REDIS_PORT=14591
REDIS_PASSWORD=E7Q43kxBJGmc6fX4LC2GHYg5nuehw0KB
REDIS_USERNAME=default
```

## Step 3: Where to Find Your Connection Details

### Redis Cloud Dashboard

1. Log in to [Redis Cloud Console](https://cloud.redis.io/)
2. Select your subscription
3. Click on your database
4. Go to the **Configuration** or **Connect** tab
5. You'll see:
   - **Public endpoint** (host and port)
   - **Default user password** (or you can create a new user)

### Connection URL Format

The connection URL format is:
```
redis://[username]:[password]@[host]:[port]
```

Example:
```
redis://default:your_password@redis-14591.crce197.us-east-2-1.ec2.cloud.redislabs.com:14591
```

**Your Redis Cloud Connection:**
- Host: `redis-14591.crce197.us-east-2-1.ec2.cloud.redislabs.com`
- Port: `14591`

## Step 4: Cache Strategy

### Cache Keys

- `property-statistics` - Statistics data (unique properties, states, provinces, countries)
- `properties:${filterHash}` - Filtered property lists with hash of filter parameters

### TTL (Time To Live)

- **14 days** (1,209,600 seconds) - balances freshness with performance
- Data updates every 2-3 weeks, so 14 days ensures cache is refreshed before next update cycle

### Cache Invalidation

The cache can be manually invalidated by calling:

```typescript
import { revalidatePropertiesCache } from '@/lib/revalidate-properties-cache';

// Clear all property-related caches
await revalidatePropertiesCache();
```

This should be called after updating property data in the database.

## Step 5: Graceful Fallback

If Redis is not configured or unavailable, the application will:
- Log a warning message
- Fall back to direct database queries
- Continue to function normally (no errors)

This ensures the application works even if Redis is temporarily unavailable.

## Step 6: Test Your Connection

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Visit `http://localhost:3001/map` to test your Redis connection
3. Check the server logs for:
   - `Redis client connected` - Connection successful
   - `Redis not configured` - Redis not set up (will use database fallback)

## Production Deployment (Vercel)

When deploying to Vercel, add the Redis environment variable:

1. Go to your Vercel project settings
2. Navigate to **Settings** → **Environment Variables**
3. Add:
   - `REDIS_URL` (if using connection string)
   - OR `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (if using separate variables)

**Note:** Make sure to add these for all environments (Production, Preview, Development) if needed.

## Troubleshooting

### Connection Fails

- **Check credentials**: Verify your host, port, and password are correct
- **Check network**: Ensure your deployment platform can reach Redis Cloud
- **Check Redis Cloud status**: Verify your database is active in Redis Cloud console
- **Check firewall**: Ensure your Redis Cloud database allows connections from your IP/deployment platform

### Cache Not Working

- **Check logs**: Look for Redis connection errors in server logs
- **Verify environment variables**: Ensure `REDIS_URL` or `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD` are set correctly
- **Test connection**: Try connecting with a Redis client tool to verify credentials

### Application Still Works Without Redis

This is expected! The application gracefully falls back to direct database queries if Redis is unavailable. You'll see a warning in the logs but the app will continue to function.

## Redis Cloud Free Tier

Redis Cloud offers a free tier that includes:
- 30MB of memory
- Up to 30 connections
- Suitable for development and small production workloads

For production with high traffic, consider upgrading to a paid plan.

## Additional Resources

- [Redis Cloud Documentation](https://docs.redis.com/)
- [Redis Cloud Console](https://cloud.redis.io/)
- [redis (node-redis) Documentation](https://github.com/redis/node-redis)
