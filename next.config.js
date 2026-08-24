const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Brand/property generateStaticParams talk to Supabase; 60s default timed out
  // production deploys of the pipeline rotation cron.
  staticPageGenerationTimeout: 180,

  async headers() {
    const frameAncestors = [
      "'self'",
      'https://sageoutdooradvisory.com',
      'https://www.sageoutdooradvisory.com',
    ].join(' ');
    return [
      {
        source: '/:locale(en|es|fr|de)/map',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `frame-ancestors ${frameAncestors}`,
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: '/brand',
        destination: '/glamping-market-overview/brands',
        permanent: true,
      },
      {
        source: '/brands',
        destination: '/glamping-market-overview/brands',
        permanent: true,
      },
      {
        source: '/glamping-industry',
        destination: '/glamping-market-overview',
        permanent: true,
      },
      {
        source: '/glamping-market-snapshot',
        destination: '/glamping-market-overview',
        permanent: true,
      },
      {
        source: '/glamping-pipeline-quarterly',
        destination: '/outdoor-hospitality-pipeline',
        permanent: true,
      },
      {
        source: '/glamping-pipeline-quarterly/:path*',
        destination: '/outdoor-hospitality-pipeline/:path*',
        permanent: true,
      },
      { source: '/admin/active-jobs', destination: '/admin/job-pipeline', permanent: true },
      { source: '/admin/active-jobs/:path*', destination: '/admin/job-pipeline/:path*', permanent: true },
      { source: '/admin/project-pipeline', destination: '/admin/job-pipeline', permanent: true },
      { source: '/admin/project-pipeline/:path*', destination: '/admin/job-pipeline/:path*', permanent: true },
      { source: '/admin/comparables', destination: '/admin/glamping-properties', permanent: false },
      { source: '/admin/comparables/:path+', destination: '/admin/glamping-properties/:path+', permanent: false },
      { source: '/admin/comps', destination: '/admin/glamping-properties', permanent: true },
      { source: '/admin/comps/:path+', destination: '/admin/glamping-properties/:path+', permanent: true },
      {
        source: '/map',
        destination: '/en/map',
        permanent: true,
      },
      {
        source: '/map/:path*',
        destination: '/en/map/:path*',
        permanent: true,
      },
      {
        source: '/partners',
        destination: '/en/partners',
        permanent: true,
      },
      {
        source: '/:locale(en|es|fr|de)/guides/glamping-market-trends-2025',
        destination: '/en/guides/glamping-market-trends-2026',
        permanent: true,
      },
      {
        source: '/guides/glamping-market-trends-2025',
        destination: '/en/guides/glamping-market-trends-2026',
        permanent: true,
      },
      {
        source: '/admin/sage-glamping-data-breakdown',
        destination: '/admin/sage-data',
        permanent: true,
      },
      {
        source: '/admin/sage-glamping-data-breakdown/:path*',
        destination: '/admin/sage-data',
        permanent: true,
      },
    ];
  },

  // Experimental features for faster builds
  experimental: {
    // Optimize package imports to reduce bundle size
    // Note: Do NOT optimize @supabase/supabase-js as it causes build issues
    optimizePackageImports: ['next-intl'],
    // Allow large file uploads (DOCX) - default is 1MB
    serverActions: {
      bodySizeLimit: '110mb',
    },
    // Keep pdf-parse / pdfjs-dist out of the webpack graph. Bundling pdfjs-dist ESM
    // triggers "Object.defineProperty called on non-object" under Next 14 webpack.
    serverComponentsExternalPackages: ['pdf-parse', 'pdfjs-dist'],
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
      {
        protocol: 'https',
        hostname: '**.public.blob.vercel-storage.com',
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

    // Also mark as webpack externals for API routes (serverComponentsExternalPackages
    // alone is not always enough for app-route bundling of pdfjs-dist ESM).
    if (isServer) {
      const externals = ['pdf-parse', 'pdfjs-dist'];
      const prev = config.externals;
      config.externals = [
        ...(Array.isArray(prev) ? prev : prev ? [prev] : []),
        ({ request }, callback) => {
          if (request && externals.some((pkg) => request === pkg || request.startsWith(`${pkg}/`))) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        },
      ];
    }

    return config;
  },
  // Exclude test scripts from build
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
}

module.exports = withNextIntl(nextConfig)

