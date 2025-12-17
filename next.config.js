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
  webpack: (config, { isServer, webpack }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    
    // Completely replace @supabase/supabase-js with an empty module during server-side builds
    // This prevents the library from being bundled or executed during static generation
    if (isServer) {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /@supabase\/supabase-js/,
          require.resolve('./lib/supabase-server-stub.js')
        )
      );
    }
    
    return config;
  },
  // Exclude test scripts from build
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
}

module.exports = withNextIntl(nextConfig)

