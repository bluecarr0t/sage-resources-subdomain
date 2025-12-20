import { defaultLocale } from '@/i18n';
import './globals.css';

// Root layout - middleware handles locale routing
// This layout is used for routes outside locale routing (like /login)
// Next.js requires <html> and <body> tags in the root layout
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
      </body>
    </html>
  );
}

