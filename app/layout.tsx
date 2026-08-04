import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import dynamic from 'next/dynamic';
import './globals.css';
import ThemeProvider from '@/components/ThemeProvider';
import ChunkLoadErrorHandler from '@/components/ChunkLoadErrorHandler';
import { resolveHtmlLang } from '@/lib/resolve-html-lang';

const GlampingMarketOverviewPromo = dynamic(
  () => import('@/components/GlampingMarketOverviewPromo'),
  { ssr: false }
);

export const metadata: Metadata = {
  metadataBase: new URL('https://resources.sageoutdooradvisory.com'),
  verification: {
    // Google Search Console: Set NEXT_PUBLIC_GOOGLE_VERIFICATION_CODE in Vercel env vars
    // Get code from https://search.google.com/search-console → HTML tag method
    ...(process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION_CODE && {
      google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION_CODE,
    }),
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

// Root layout — single <html>/<body> for all routes (fixes duplicate document shell on /[locale]/*)
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [headerStore, cookieStore] = await Promise.all([headers(), cookies()]);
  const lang = resolveHtmlLang(
    headerStore.get('x-locale') ?? headerStore.get('x-next-intl-locale'),
    cookieStore.get('NEXT_LOCALE')?.value
  );

  return (
    <html lang={lang} suppressHydrationWarning>
      <body>
        <ChunkLoadErrorHandler />
        <ThemeProvider>
          {children}
          <GlampingMarketOverviewPromo />
        </ThemeProvider>
      </body>
    </html>
  );
}
