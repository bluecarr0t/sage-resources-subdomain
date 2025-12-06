import { Metadata } from "next";
import { getAllGlossaryTerms, getGlossaryTermsByCategory } from "@/lib/glossary/index";
import GlossaryIndex from "@/components/GlossaryIndex";
import Footer from "@/components/Footer";
import FloatingHeader from "@/components/FloatingHeader";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Outdoor Hospitality Glossary | Industry Terms & Definitions | Sage Outdoor Advisory",
  description: "Comprehensive glossary of outdoor hospitality industry terms. Learn definitions for glamping, RV resorts, feasibility studies, appraisals, and more.",
  keywords: "outdoor hospitality glossary, glamping terms, RV resort definitions, feasibility study terms, hospitality industry glossary",
  openGraph: {
    title: "Outdoor Hospitality Glossary | Sage Outdoor Advisory",
    description: "Comprehensive glossary of outdoor hospitality industry terms and definitions",
    url: "https://resources.sageoutdooradvisory.com/glossary",
    siteName: "Sage Outdoor Advisory",
    type: "website",
    images: [
      {
        url: "https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/forest-scene.jpg",
        width: 1920,
        height: 1080,
        alt: "Outdoor hospitality glossary background featuring natural landscape gradient",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/forest-scene.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
};

export default function GlossaryPage() {
  const allTerms = getAllGlossaryTerms();
  const categories = [
    "Feasibility & Appraisal",
    "Glamping",
    "RV & Campground",
    "Financial",
    "Real Estate",
    "General"
  ];

  // Group terms by first letter for alphabetical navigation
  const termsByLetter: Record<string, typeof allTerms> = {};
  allTerms.forEach(term => {
    const firstChar = term.term.charAt(0);
    // Group all numeric terms (0-9) under "#"
    const letter = /[0-9]/.test(firstChar) ? "#" : firstChar.toUpperCase();
    if (!termsByLetter[letter]) {
      termsByLetter[letter] = [];
    }
    termsByLetter[letter].push(term);
  });

  // Sort terms alphabetically
  Object.keys(termsByLetter).forEach(letter => {
    termsByLetter[letter].sort((a, b) => a.term.localeCompare(b.term));
  });

  // Get terms by category
  const termsByCategory: Record<string, typeof allTerms> = {};
  categories.forEach(category => {
    termsByCategory[category] = getGlossaryTermsByCategory(category as any);
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Floating Header */}
      <FloatingHeader />

      {/* Hero Section */}
      <section className="relative py-16 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/forest-scene.jpg"
            alt="Outdoor hospitality glossary background featuring natural landscape gradient"
            fill
            className="object-cover"
            priority
            sizes="100vw"
            quality={90}
          />
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-indigo-900/40" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">
              Outdoor Hospitality Glossary
            </h1>
            <p className="text-xl text-white/95 max-w-3xl mx-auto drop-shadow-md">
              Comprehensive definitions of industry terms for glamping, RV resorts, campgrounds, feasibility studies, and appraisals
            </p>
          </div>
        </div>
      </section>

      <main>
      {/* Glossary Index Component */}
      <GlossaryIndex
        allTerms={allTerms}
        termsByLetter={termsByLetter}
        termsByCategory={termsByCategory}
        categories={categories}
      />

      {/* CTA Section */}
      <section className="bg-[#00b6a6] py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Need Help Understanding These Terms?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Our experts can help you understand how these industry terms apply to your outdoor hospitality project.
          </p>
          <Link
            href="https://sageoutdooradvisory.com/contact-us/"
            className="inline-block px-8 py-4 bg-white text-[#006b5f] text-lg font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
          >
            Schedule Free Consultation
          </Link>
        </div>
      </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

