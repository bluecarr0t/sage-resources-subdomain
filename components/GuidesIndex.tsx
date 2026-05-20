"use client";

import { GuideContent } from "@/lib/guides";
import Link from "next/link";
import { useState } from "react";
import { createLocaleLinks } from "@/lib/locale-links";
import {
  EDITORIAL_BODY_CLASS,
  EDITORIAL_CARD_CLASS,
  EDITORIAL_DIVIDER_CLASS,
  EDITORIAL_FILTER_ACTIVE_CLASS,
  EDITORIAL_FILTER_IDLE_CLASS,
  EDITORIAL_H2_CLASS,
  EDITORIAL_INPUT_CLASS,
  EDITORIAL_LINK_CLASS,
  EDITORIAL_SECTION_LABEL_CLASS,
} from "@/components/editorial/EditorialPageShell";

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
  locale?: string;
}

export default function GuidesIndex({
  allGuides,
  categories,
  locale = "en",
}: GuidesIndexProps) {
  const links = createLocaleLinks(locale);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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
    <div>
      <div className="mb-10">
        <label className={EDITORIAL_SECTION_LABEL_CLASS}>
          <span className="sr-only">Search guides</span>
          <input
            type="text"
            placeholder="Search guides..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={EDITORIAL_INPUT_CLASS}
          />
        </label>
      </div>

      {!searchQuery && (
        <div className="mb-10 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 ${selectedCategory === null ? EDITORIAL_FILTER_ACTIVE_CLASS : EDITORIAL_FILTER_IDLE_CLASS}`}
          >
            All guides
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() =>
                setSelectedCategory(
                  selectedCategory === category.id ? null : category.id
                )
              }
              className={`px-4 py-2 ${
                selectedCategory === category.id
                  ? EDITORIAL_FILTER_ACTIVE_CLASS
                  : EDITORIAL_FILTER_IDLE_CLASS
              }`}
            >
              {category.name} ({category.guides.length})
            </button>
          ))}
        </div>
      )}

      {searchQuery && (
        <div>
          <h2 className={EDITORIAL_H2_CLASS}>
            Search results ({filteredGuides.length})
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {filteredGuides.map((guide) => (
              <GuideCard key={guide.slug} guide={guide} guideLink={links.guide} />
            ))}
          </div>
        </div>
      )}

      {!searchQuery &&
        displayedCategories.map((category) => (
          <section key={category.id} className="mb-14 border-t border-sage-200/80 pt-12 first:border-t-0 first:pt-0">
            <h2 className="font-[Georgia] text-base font-medium uppercase tracking-[0.2em] text-neutral-900">
              {category.name}
            </h2>
            <p className={`mt-3 max-w-2xl ${EDITORIAL_BODY_CLASS}`}>{category.description}</p>
            <p className="mt-1 text-[11px] text-neutral-500">
              {category.guides.length} guides
            </p>

            {category.pillarPages.length > 0 && (
              <div className="mt-8">
                <h3 className={EDITORIAL_H2_CLASS}>Complete guides</h3>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {category.pillarPages.map((guide) => (
                    <GuideCard
                      key={guide.slug}
                      guide={guide}
                      isPillar
                      guideLink={links.guide}
                    />
                  ))}
                </div>
              </div>
            )}

            {category.clusterPages.length > 0 && (
              <div className="mt-8">
                <h3 className={EDITORIAL_H2_CLASS}>Related guides</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {category.clusterPages.map((guide) => (
                    <GuideCard key={guide.slug} guide={guide} guideLink={links.guide} />
                  ))}
                </div>
              </div>
            )}
          </section>
        ))}

      {searchQuery && filteredGuides.length === 0 && (
        <div className="py-12 text-center">
          <p className={EDITORIAL_BODY_CLASS}>
            No guides found matching &ldquo;{searchQuery}&rdquo;
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className={`mt-4 ${EDITORIAL_LINK_CLASS}`}
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
  guideLink,
}: {
  guide: GuideContent;
  isPillar?: boolean;
  guideLink: (slug: string) => string;
}) {
  const categoryLabels: Record<string, string> = {
    feasibility: "Feasibility",
    appraisal: "Appraisal",
    industry: "Industry",
  };

  return (
    <Link
      href={guideLink(guide.slug)}
      className={`${EDITORIAL_CARD_CLASS} ${isPillar ? 'border-sage-400/90' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-bold text-neutral-900">{guide.hero.headline}</h3>
        <span className="shrink-0 text-[10px] uppercase tracking-wider text-neutral-500">
          {categoryLabels[guide.category]}
        </span>
      </div>
      {isPillar ? (
        <span className="mt-2 inline-block text-[10px] uppercase tracking-widest text-sage-700">
          Complete guide
        </span>
      ) : null}
      <p className={`mt-3 line-clamp-3 ${EDITORIAL_BODY_CLASS}`}>{guide.metaDescription}</p>
      <span className={`mt-4 inline-block text-[11px] uppercase tracking-wider ${EDITORIAL_LINK_CLASS}`}>
        Read guide
      </span>
    </Link>
  );
}
