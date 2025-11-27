import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sage Outdoor Advisory - Outdoor Hospitality Expertise",
  description: "Leading consultancy for feasibility studies and appraisals in the outdoor hospitality industry",
  metadataBase: new URL("https://resources.sageoutdooradvisory.com"),
  verification: {
    // Google Search Console verification code
    // Get this code from: https://search.google.com/search-console
    // After adding your property, choose "HTML tag" verification method
    google: "REPLACE-WITH-YOUR-GOOGLE-VERIFICATION-CODE",
  },
  openGraph: {
    title: "Sage Outdoor Advisory - Outdoor Hospitality Expertise",
    description: "Leading consultancy for feasibility studies and appraisals in the outdoor hospitality industry",
    url: "https://resources.sageoutdooradvisory.com",
    siteName: "Sage Outdoor Advisory",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sage Outdoor Advisory - Outdoor Hospitality Expertise",
    description: "Leading consultancy for feasibility studies and appraisals in the outdoor hospitality industry",
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
  alternates: {
    canonical: "https://resources.sageoutdooradvisory.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}

