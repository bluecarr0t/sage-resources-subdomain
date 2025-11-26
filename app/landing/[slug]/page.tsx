import { Metadata } from "next";
import { getLandingPage, getAllLandingPageSlugs } from "@/lib/landing-pages";
import { notFound } from "next/navigation";
import LandingPageTemplate from "@/components/LandingPageTemplate";

interface PageProps {
  params: {
    slug: string;
  };
}

export async function generateStaticParams() {
  const slugs = getAllLandingPageSlugs();
  return slugs.map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const page = getLandingPage(params.slug);
  
  if (!page) {
    return {
      title: "Page Not Found | Sage Outdoor Advisory",
    };
  }

  const url = `https://resources.sageoutdooradvisory.com/landing/${page.slug}`;
  const imageUrl = `https://sageoutdooradvisory.com/og-image.jpg`;

  return {
    title: page.title,
    description: page.metaDescription,
    keywords: page.keywords?.join(", "),
    openGraph: {
      title: page.title,
      description: page.metaDescription,
      url,
      siteName: "Sage Outdoor Advisory",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: page.hero.headline,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.metaDescription,
      images: [imageUrl],
    },
    alternates: {
      canonical: url,
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
}

export default function LandingPage({ params }: PageProps) {
  const page = getLandingPage(params.slug);

  if (!page) {
    notFound();
  }

  return <LandingPageTemplate content={page} />;
}

