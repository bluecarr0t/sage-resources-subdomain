import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import ThemeProvider from '@/components/ThemeProvider';
import ChunkLoadErrorHandler from '@/components/ChunkLoadErrorHandler';
import { defaultLocale, locales, type Locale } from '@/i18n';

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

function resolveHtmlLang(cookieLocale: string | undefined): Locale {
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale;
  }
  return defaultLocale;
}

// Root layout — single <html>/<body> for all routes (fixes duplicate document shell on /[locale]/*)
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const lang = resolveHtmlLang(cookieStore.get('NEXT_LOCALE')?.value);

  return (
    <html lang={lang} suppressHydrationWarning>
      <body>
        <ChunkLoadErrorHandler />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
