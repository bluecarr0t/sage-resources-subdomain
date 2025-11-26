import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sage Outdoor Advisory - Outdoor Hospitality Expertise",
  description: "Leading consultancy for feasibility studies and appraisals in the outdoor hospitality industry",
  metadataBase: new URL("https://resources.sageoutdooradvisory.com"),
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
      <body>{children}</body>
    </html>
  );
}

