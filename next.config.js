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
    
    // Mark @supabase/supabase-js as external for server-side builds
    // This prevents it from being bundled into server chunks
    if (isServer) {
      // Add to externals to prevent bundling
      if (!config.externals) {
        config.externals = [];
      }
      
      if (Array.isArray(config.externals)) {
        config.externals.push('@supabase/supabase-js');
      } else {
        const originalExternals = config.externals;
        config.externals = [
          '@supabase/supabase-js',
          ...(Array.isArray(originalExternals) ? originalExternals : [originalExternals])
        ];
      }
    }
    
    return config;
  },
  // Exclude test scripts from build
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
}

module.exports = withNextIntl(nextConfig)

