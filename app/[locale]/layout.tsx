import type { Metadata } from "next";
import { Suspense } from "react";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/i18n';
import { Analytics } from '@vercel/analytics/next';
import dynamic from 'next/dynamic';
import '../globals.css';

// Dynamically import GoogleAnalytics to prevent SSR issues with useSearchParams
const DynamicGoogleAnalytics = dynamic(() => import('@/components/GoogleAnalytics'), {
  ssr: false,
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  metadataBase: new URL("https://resources.sageoutdooradvisory.com"),
  verification: {
    // Google Search Console verification code
    // Get this code from: https://search.google.com/search-console
    // After adding your property, choose "HTML tag" verification method
    google: "REPLACE-WITH-YOUR-GOOGLE-VERIFICATION-CODE",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: { locale: string };
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: LocaleLayoutProps) {
  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Load messages for the locale
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        {/* Chunk loading error handler - client-side only to avoid hydration mismatch */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Handle chunk loading errors gracefully - prevent them from appearing in console
                if (typeof window !== 'undefined') {
                  // Intercept script loading errors for Next.js chunks
                  const originalError = window.onerror;
                  window.onerror = function(msg, url, line, col, error) {
                    // Check if it's a chunk loading error
                    if (url && (url.includes('/_next/static/chunks/') || url.includes('/_next/static/'))) {
                      // Silently handle - Next.js will handle retry/fallback
                      return true; // Prevent default error handling
                    }
                    // For other errors, use original handler if it exists
                    if (originalError) {
                      return originalError.apply(this, arguments);
                    }
                    return false;
                  };
                  
                  // Handle script element errors (resource loading)
                  window.addEventListener('error', function(e) {
                    if (e.target && e.target.tagName === 'SCRIPT' && e.target.src) {
                      const src = e.target.src;
                      if (src.includes('/_next/static/chunks/') || src.includes('/_next/static/')) {
                        e.stopImmediatePropagation();
                        e.preventDefault();
                        return true;
                      }
                    }
                  }, true);
                  
                  // Handle unhandled promise rejections from chunk loading
                  window.addEventListener('unhandledrejection', function(e) {
                    if (e.reason) {
                      const message = e.reason?.message || String(e.reason);
                      if (message.includes('Loading chunk') || 
                          message.includes('Failed to fetch dynamically imported module') ||
                          message.includes('ChunkLoadError')) {
                        e.preventDefault();
                        return true;
                      }
                    }
                  });
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        <Suspense fallback={null}>
          <DynamicGoogleAnalytics />
        </Suspense>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
