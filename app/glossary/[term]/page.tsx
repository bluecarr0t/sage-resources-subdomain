import { Metadata } from "next";
import { getGlossaryTerm, getAllGlossaryTerms, getRelatedTerms } from "@/lib/glossary";
import { notFound } from "next/navigation";
import GlossaryTermTemplate from "@/components/GlossaryTermTemplate";
import Link from "next/link";

interface PageProps {
  params: {
    term: string;
  };
}

export async function generateStaticParams() {
  const terms = getAllGlossaryTerms();
  return terms.map((term) => ({
    term: term.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const glossaryTerm = getGlossaryTerm(params.term);
  
  if (!glossaryTerm) {
    return {
      title: "Glossary Term Not Found | Sage Outdoor Advisory",
    };
  }

  const url = `https://resources.sageoutdooradvisory.com/glossary/${glossaryTerm.slug}`;
  const title = `What is ${glossaryTerm.term}? | Definition & Guide | Sage Outdoor Advisory`;
  const description = `${glossaryTerm.definition} Learn more about ${glossaryTerm.term.toLowerCase()} in outdoor hospitality.`;

  return {
    title,
    description,
    keywords: glossaryTerm.seoKeywords.join(", "),
    openGraph: {
      title,
      description,
      url,
      siteName: "Sage Outdoor Advisory",
      type: "article",
    },
    twitter: {
      card: "summary",
      title,
      description,
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

export default function GlossaryTermPage({ params }: PageProps) {
  const glossaryTerm = getGlossaryTerm(params.term);

  if (!glossaryTerm) {
    notFound();
  }

  const relatedTerms = getRelatedTerms(glossaryTerm);

  return (
    <>
      <GlossaryTermTemplate term={glossaryTerm} relatedTerms={relatedTerms} />
    </>
  );
}

