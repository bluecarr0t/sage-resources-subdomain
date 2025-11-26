import { Metadata } from "next";
import { getAllGlossaryTerms, getGlossaryTermsByCategory } from "@/lib/glossary";
import GlossaryIndex from "@/components/GlossaryIndex";
import Link from "next/link";

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
  },
  robots: {
    index: true,
    follow: true,
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
    const firstLetter = term.term.charAt(0).toUpperCase();
    if (!termsByLetter[firstLetter]) {
      termsByLetter[firstLetter] = [];
    }
    termsByLetter[firstLetter].push(term);
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
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="https://sageoutdooradvisory.com" className="text-2xl font-bold text-gray-900">
              Sage Outdoor Advisory
            </Link>
            <Link
              href="https://sageoutdooradvisory.com/contact-us/"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Outdoor Hospitality Glossary
            </h1>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
              Comprehensive definitions of industry terms for glamping, RV resorts, campgrounds, feasibility studies, and appraisals
            </p>
          </div>
        </div>
      </section>

      {/* Glossary Index Component */}
      <GlossaryIndex
        allTerms={allTerms}
        termsByLetter={termsByLetter}
        termsByCategory={termsByCategory}
        categories={categories}
      />

      {/* CTA Section */}
      <section className="bg-blue-600 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Need Help Understanding These Terms?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Our experts can help you understand how these industry terms apply to your outdoor hospitality project.
          </p>
          <Link
            href="https://sageoutdooradvisory.com/contact-us/"
            className="inline-block px-8 py-4 bg-white text-blue-600 text-lg font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
          >
            Schedule Free Consultation
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Sage Outdoor Advisory</h3>
              <p className="text-gray-400">
                5113 South Harper, Suite 2C – #4001<br />
                Chicago, Illinois 60615
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="/glossary" className="hover:text-white">
                    Glossary
                  </Link>
                </li>
                <li>
                  <Link href="https://sageoutdooradvisory.com/our-services" className="hover:text-white">
                    Services
                  </Link>
                </li>
                <li>
                  <Link href="https://sageoutdooradvisory.com/market-reports" className="hover:text-white">
                    Market Reports
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="https://sageoutdooradvisory.com/contact-us/" className="hover:text-white font-semibold">
                    Schedule Consultation →
                  </Link>
                </li>
                <li>
                  <Link href="https://sageoutdooradvisory.com/clients/" className="hover:text-white">
                    Client Testimonials
                  </Link>
                </li>
                <li>
                  <Link href="https://sageoutdooradvisory.com/about" className="hover:text-white">
                    About
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} Sage Outdoor Advisory. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

