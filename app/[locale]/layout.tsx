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
        {/* Chunk loading error handler - prevents 404 errors from being logged */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Handle chunk loading errors gracefully - prevent 404s from being logged
                if (typeof window !== 'undefined' && typeof document !== 'undefined') {
                  // Intercept script tags BEFORE they load to prevent 404s
                  const observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(mutation) {
                      mutation.addedNodes.forEach(function(node) {
                        if (node.nodeName === 'SCRIPT' && node.src) {
                          const src = node.src;
                          // Check if this is a potentially missing chunk
                          if (src.includes('/_next/static/chunks/') || 
                              src.includes('/_next/static/') ||
                              src.includes('webpack-') ||
                              (src.includes('chunks/') && src.includes('resources.sageoutdooradvisory.com'))) {
                            // Add error handler before the script loads
                            node.addEventListener('error', function(e) {
                              e.stopImmediatePropagation();
                              e.preventDefault();
                              e.stopPropagation();
                              // Remove the script to prevent retry
                              if (node.parentNode) {
                                node.parentNode.removeChild(node);
                              }
                              return false;
                            }, true);
                          }
                        }
                      });
                    });
                  });
                  
                  // Start observing when DOM is ready
                  if (document.body) {
                    observer.observe(document.body, { childList: true, subtree: true });
                  } else {
                    document.addEventListener('DOMContentLoaded', function() {
                      observer.observe(document.body, { childList: true, subtree: true });
                    });
                  }
                  
                  // Also observe head for scripts added there
                  if (document.head) {
                    observer.observe(document.head, { childList: true, subtree: true });
                  }
                  
                  // Intercept script loading errors BEFORE they're logged
                  const originalError = window.onerror;
                  window.onerror = function(msg, url, line, col, error) {
                    // Check if it's a chunk loading error
                    if (url && (
                      url.includes('/_next/static/chunks/') || 
                      url.includes('/_next/static/') ||
                      url.includes('webpack-') ||
                      url.includes('chunks/')
                    )) {
                      // Prevent default error handling and console logging
                      return true;
                    }
                    // For other errors, use original handler if it exists
                    if (originalError) {
                      return originalError.apply(this, arguments);
                    }
                    return false;
                  };
                  
                  // Handle script element errors (resource loading) - catch BEFORE network request
                  window.addEventListener('error', function(e) {
                    if (e.target && e.target.tagName === 'SCRIPT' && e.target.src) {
                      const src = e.target.src;
                      if (src.includes('/_next/static/chunks/') || 
                          src.includes('/_next/static/') ||
                          src.includes('webpack-') ||
                          src.includes('chunks/')) {
                        // Prevent the error from propagating
                        e.stopImmediatePropagation();
                        e.preventDefault();
                        e.stopPropagation();
                        // Remove the script element to prevent retry
                        if (e.target.parentNode) {
                          e.target.parentNode.removeChild(e.target);
                        }
                        return false;
                      }
                    }
                  }, true); // Use capture phase to catch early
                  
                  // Handle unhandled promise rejections from chunk loading
                  window.addEventListener('unhandledrejection', function(e) {
                    if (e.reason) {
                      const message = e.reason?.message || String(e.reason);
                      const stack = e.reason?.stack || '';
                      if (message.includes('Loading chunk') || 
                          message.includes('Failed to fetch dynamically imported module') ||
                          message.includes('ChunkLoadError') ||
                          message.includes('404') ||
                          stack.includes('chunks/') ||
                          stack.includes('webpack-')) {
                        e.preventDefault();
                        return false;
                      }
                    }
                  });
                  
                  // Intercept console.error to filter out chunk loading errors
                  const originalConsoleError = console.error;
                  console.error = function(...args) {
                    const message = args.join(' ');
                    if (message.includes('/_next/static/chunks/') ||
                        message.includes('/_next/static/') ||
                        message.includes('webpack-') ||
                        message.includes('Failed to load resource') ||
                        (message.includes('404') && (message.includes('chunks/') || message.includes('webpack-')))) {
                      // Don't log chunk loading errors
                      return;
                    }
                    originalConsoleError.apply(console, args);
                  };
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
