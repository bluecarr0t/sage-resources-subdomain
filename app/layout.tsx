import { defaultLocale } from './i18n';

// Root layout - middleware handles locale routing
// This layout should rarely be used since middleware redirects "/" to "/en"
// But we provide a minimal structure as fallback
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Just pass through children - middleware handles locale routing
  // The [locale]/layout.tsx provides the actual HTML structure
  return <>{children}</>;
}

