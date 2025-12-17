const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Experimental features for faster builds
  experimental: {
    // Optimize package imports to reduce bundle size
    // Note: Do NOT optimize @supabase/supabase-js as it causes build issues
    optimizePackageImports: ['next-intl'],
  },
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'sageoutdooradvisory.com',
      },
      {
        protocol: 'https',
        hostname: 'b0evzueuuq9l227n.public.blob.vercel-storage.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Compiler optimizations
  compiler: {
    // Remove console.log in production (keep errors and warnings)
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    
    // Externalize @supabase/supabase-js during server-side build to prevent bundling
    // This prevents the Supabase library code from executing during static generation
    if (isServer) {
      config.externals = config.externals || [];
      // Handle both array and function formats of externals
      if (Array.isArray(config.externals)) {
        config.externals.push('@supabase/supabase-js');
      } else if (typeof config.externals === 'function') {
        const originalExternals = config.externals;
        config.externals = async (context, request, callback) => {
          if (request === '@supabase/supabase-js') {
            return callback(null, `commonjs @supabase/supabase-js`);
          }
          return originalExternals(context, request, callback);
        };
      }
    }
    
    // Handle chunk loading errors gracefully
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            default: {
              ...config.optimization.splitChunks?.cacheGroups?.default,
              minChunks: 2,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    
    return config;
  },
  // Exclude test scripts from build
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
}

module.exports = withNextIntl(nextConfig)

