import { defaultLocale } from '@/i18n';

// Root layout - middleware handles locale routing
// This layout should rarely be used since middleware redirects "/" to "/en"
// But we provide a minimal structure as fallback
// Next.js requires <html> and <body> tags in the root layout
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Minimal HTML structure required by Next.js
  // The [locale]/layout.tsx provides the actual HTML structure with lang attribute
  return (
    <html>
      <body>
        {children}
      </body>
    </html>
  );
}

