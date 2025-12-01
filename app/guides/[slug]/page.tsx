import { Metadata } from "next";
import { getGuide, getAllGuideSlugs } from "@/lib/guides";
import { notFound } from "next/navigation";
import PillarPageTemplate from "@/components/PillarPageTemplate";

interface PageProps {
  params: {
    slug: string;
  };
}

export async function generateStaticParams() {
  const slugs = getAllGuideSlugs();
  return slugs.map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const guide = getGuide(params.slug);
  
  if (!guide) {
    return {
      title: "Guide Not Found | Sage Outdoor Advisory",
    };
  }

  const url = `https://resources.sageoutdooradvisory.com/guides/${guide.slug}`;
  const imageUrl = `https://sageoutdooradvisory.com/og-image.jpg`;

  return {
    title: guide.title,
    description: guide.metaDescription,
    keywords: guide.keywords?.join(", "),
    openGraph: {
      title: guide.title,
      description: guide.metaDescription,
      url,
      siteName: "Sage Outdoor Advisory",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: guide.hero.headline,
        },
      ],
      locale: "en_US",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: guide.title,
      description: guide.metaDescription,
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

export default function GuidePage({ params }: PageProps) {
  const guide = getGuide(params.slug);

  if (!guide) {
    notFound();
  }

  return <PillarPageTemplate content={guide} />;
}

