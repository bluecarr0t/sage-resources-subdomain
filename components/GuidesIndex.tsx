"use client";

import { GuideContent } from "@/lib/guides";
import Link from "next/link";
import { useState } from "react";

interface Category {
  id: string;
  name: string;
  description: string;
  guides: GuideContent[];
  pillarPages: GuideContent[];
  clusterPages: GuideContent[];
}

interface GuidesIndexProps {
  allGuides: GuideContent[];
  categories: Category[];
}

export default function GuidesIndex({
  allGuides,
  categories,
}: GuidesIndexProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filter guides based on search
  const filteredGuides = allGuides.filter((guide) =>
    guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    guide.metaDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
    guide.hero.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
    guide.keywords?.some((keyword) =>
      keyword.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const displayedCategories = selectedCategory
    ? categories.filter((cat) => cat.id === selectedCategory)
    : categories;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative">
          <input
            type="text"
            placeholder="Search guides..."
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

      {/* Category Filter */}
      {!searchQuery && (
        <div className="mb-8 flex flex-wrap gap-3">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              selectedCategory === null
                ? "bg-[#006b5f] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All Guides
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() =>
                setSelectedCategory(
                  selectedCategory === category.id ? null : category.id
                )
              }
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                selectedCategory === category.id
                  ? "bg-[#006b5f] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {category.name} ({category.guides.length})
            </button>
          ))}
        </div>
      )}

      {/* Search Results */}
      {searchQuery && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Search Results ({filteredGuides.length})
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGuides.map((guide) => (
              <GuideCard key={guide.slug} guide={guide} />
            ))}
          </div>
        </div>
      )}

      {/* Guides by Category */}
      {!searchQuery &&
        displayedCategories.map((category) => {
          return (
            <div key={category.id} className="mb-16">
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  {category.name}
                </h2>
                <p className="text-gray-600 text-lg">{category.description}</p>
                <span className="text-gray-600 text-sm">
                  ({category.guides.length} guides)
                </span>
              </div>

              {/* Pillar Pages (Complete Guides) */}
              {category.pillarPages.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">
                    Complete Guides
                  </h3>
                  <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-6">
                    {category.pillarPages.map((guide) => (
                      <GuideCard
                        key={guide.slug}
                        guide={guide}
                        isPillar={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Cluster Pages */}
              {category.clusterPages.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">
                    Related Guides
                  </h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {category.clusterPages.map((guide) => (
                      <GuideCard key={guide.slug} guide={guide} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

      {/* No Results */}
      {searchQuery && filteredGuides.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">
            No guides found matching &ldquo;{searchQuery}&rdquo;
          </p>
          <button
            onClick={() => setSearchQuery("")}
            className="mt-4 text-[#006b5f] hover:text-[#005a4f] underline"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}

function GuideCard({
  guide,
  isPillar = false,
}: {
  guide: GuideContent;
  isPillar?: boolean;
}) {
  const categoryLabels: Record<string, string> = {
    feasibility: "Feasibility",
    appraisal: "Appraisal",
    industry: "Industry",
  };

  return (
    <Link
      href={`/guides/${guide.slug}`}
      className={`block bg-white border-2 rounded-lg p-6 hover:shadow-lg transition-all ${
        isPillar
          ? "border-[#006b5f] hover:border-[#005a4f]"
          : "border-gray-200 hover:border-[#006b5f]"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {guide.hero.headline}
          </h3>
          {isPillar && (
            <span className="inline-block text-xs bg-[#006b5f] text-white px-3 py-1 rounded-full font-semibold mb-2">
              Complete Guide
            </span>
          )}
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            isPillar
              ? "bg-[#006b5f]/10 text-[#006b5f]"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          {categoryLabels[guide.category]}
        </span>
      </div>
      <p className="text-gray-600 text-sm line-clamp-3 mb-4">
        {guide.metaDescription}
      </p>
      <div className="flex items-center text-[#006b5f] text-sm font-medium">
        Read guide →
      </div>
    </Link>
  );
}
