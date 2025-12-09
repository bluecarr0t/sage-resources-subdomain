"use client";

import { GlossaryTerm } from "@/lib/glossary/index";
import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface GlossaryIndexProps {
  allTerms: GlossaryTerm[];
  termsByLetter: Record<string, GlossaryTerm[]>;
  termsByCategory: Record<string, GlossaryTerm[]>;
  categories: string[];
  locale: string;
}

export default function GlossaryIndex({
  allTerms,
  termsByLetter,
  termsByCategory,
  categories,
  locale,
}: GlossaryIndexProps) {
  const t = useTranslations('glossary');
  const [activeTab, setActiveTab] = useState<"alphabetical" | "category">("alphabetical");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter terms based on search
  const filteredTerms = allTerms.filter(term =>
    term.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
    term.definition.toLowerCase().includes(searchQuery.toLowerCase()) ||
    term.seoKeywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Get letters that have terms, with "#" first for numeric terms
  const availableLetters = Object.keys(termsByLetter).sort((a, b) => {
    if (a === "#") return -1;
    if (b === "#") return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative">
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-6 py-4 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-[#006b5f] focus:border-[#006b5f]"
          />
          <svg
            className="absolute right-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8 border-b border-gray-200">
        <div className="flex space-x-8">
          <button
            onClick={() => {
              setActiveTab("alphabetical");
              setSelectedCategory(null);
            }}
            className={`py-4 px-2 border-b-2 font-semibold ${
              activeTab === "alphabetical"
                ? "border-[#006b5f] text-[#006b5f]"
                : "border-transparent text-gray-600 hover:text-gray-700"
            }`}
          >
            {t('tabs.alphabetical')}
          </button>
          <button
            onClick={() => {
              setActiveTab("category");
              setSelectedLetter(null);
            }}
            className={`py-4 px-2 border-b-2 font-semibold ${
              activeTab === "category"
                ? "border-[#006b5f] text-[#006b5f]"
                : "border-transparent text-gray-600 hover:text-gray-700"
            }`}
          >
            {t('tabs.byCategory')}
          </button>
        </div>
      </div>

      {/* Alphabetical View */}
      {activeTab === "alphabetical" && (
        <div>
          {/* Letter Navigation */}
          <div className="mb-6 flex flex-wrap gap-2">
            {availableLetters.map((letter) => (
              <button
                key={letter}
                onClick={() => {
                  setSelectedLetter(selectedLetter === letter ? null : letter);
                  if (typeof document !== 'undefined') {
                    document.getElementById(`letter-${letter}`)?.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  selectedLetter === letter
                    ? "bg-[#006b5f] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {letter}
              </button>
            ))}
          </div>

          {/* Terms by Letter */}
          {searchQuery ? (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {t('searchResults', { count: filteredTerms.length })}
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTerms.map((term) => (
                  <GlossaryTermCard key={term.slug} term={term} locale={locale} />
                ))}
              </div>
            </div>
          ) : (
            <div>
              {availableLetters.map((letter) => {
                const terms = termsByLetter[letter];
                if (selectedLetter && selectedLetter !== letter) return null;
                
                return (
                  <div key={letter} id={`letter-${letter}`} className="mb-12">
                    <h2 className="text-3xl font-bold text-gray-900 mb-6 border-b-2 border-gray-200 pb-2">
                      {letter}
                    </h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {terms.map((term) => (
                        <GlossaryTermCard key={term.slug} term={term} locale={locale} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Category View */}
      {activeTab === "category" && (
        <div>
          {categories.map((category) => {
            const terms = termsByCategory[category];
            if (terms.length === 0) return null;
            if (selectedCategory && selectedCategory !== category) return null;

            return (
              <div key={category} className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-bold text-gray-900">{category}</h2>
                  <span className="text-gray-600">({terms.length} terms)</span>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {terms.map((term) => (
                    <GlossaryTermCard key={term.slug} term={term} locale={locale} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* No Results */}
      {searchQuery && filteredTerms.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">{t('noResults', { query: searchQuery })}</p>
          <button
            onClick={() => setSearchQuery("")}
            className="mt-4 text-[#006b5f] hover:text-[#005a4f] underline"
          >
            {t('clearSearch')}
          </button>
        </div>
      )}
    </div>
  );
}

function GlossaryTermCard({ term, locale }: { term: GlossaryTerm; locale: string }) {
  const t = useTranslations('glossary');
  
  return (
    <Link
      href={`/${locale}/glossary/${term.slug}`}
      className="block bg-white border border-gray-200 rounded-lg p-6 hover:border-[#006b5f] hover:shadow-lg transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-xl font-bold text-gray-900">{term.term}</h3>
        <span className="text-xs bg-[#006b5f]/10 text-[#006b5f] px-2 py-1 rounded-full">
          {term.category}
        </span>
      </div>
      <p className="text-gray-600 text-sm line-clamp-2">{term.definition}</p>
      <div className="mt-4 flex items-center text-[#006b5f] text-sm font-medium">
        {t('readMore')} →
      </div>
    </Link>
  );
}

