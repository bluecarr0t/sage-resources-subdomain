"use client";

import { GlossaryTerm } from "@/lib/glossary/index";
import { getGlossaryCategoryAccent } from "@/lib/glossary-category-accent";
import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  EDITORIAL_BODY_CLASS,
  EDITORIAL_CARD_CLASS,
  EDITORIAL_GLOSSARY_TERM_TITLE_CLASS,
  EDITORIAL_DIVIDER_CLASS,
  EDITORIAL_FILTER_ACTIVE_CLASS,
  EDITORIAL_FILTER_IDLE_CLASS,
  EDITORIAL_H2_CLASS,
  EDITORIAL_INPUT_CLASS,
  EDITORIAL_LINK_CLASS,
  EDITORIAL_SECTION_LABEL_CLASS,
} from "@/components/editorial/EditorialPageShell";

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

  const filteredTerms = allTerms.filter(term =>
    term.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
    term.definition.toLowerCase().includes(searchQuery.toLowerCase()) ||
    term.seoKeywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const availableLetters = Object.keys(termsByLetter).sort((a, b) => {
    if (a === "#") return -1;
    if (b === "#") return 1;
    return a.localeCompare(b);
  });

  const tabClass = (active: boolean) =>
    `border-b-2 py-3 text-[11px] font-medium uppercase tracking-widest transition-colors ${
      active
        ? 'border-sage-600 text-neutral-900'
        : 'border-transparent text-neutral-500 hover:text-neutral-800'
    }`;

  return (
    <div>
      <div className="mb-10">
        <input
          type="text"
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={EDITORIAL_INPUT_CLASS}
          aria-label={t('searchPlaceholder')}
        />
      </div>

      <div className={`mb-10 flex gap-8 border-b ${EDITORIAL_DIVIDER_CLASS}`}>
        <button
          type="button"
          onClick={() => {
            setActiveTab("alphabetical");
            setSelectedCategory(null);
          }}
          className={tabClass(activeTab === "alphabetical")}
        >
          {t('tabs.alphabetical')}
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("category");
            setSelectedLetter(null);
          }}
          className={tabClass(activeTab === "category")}
        >
          {t('tabs.byCategory')}
        </button>
      </div>

      {activeTab === "alphabetical" && (
        <div>
          <div className="mb-8 flex flex-wrap gap-2">
            {availableLetters.map((letter) => (
              <button
                key={letter}
                type="button"
                onClick={() => {
                  setSelectedLetter(selectedLetter === letter ? null : letter);
                  if (typeof document !== 'undefined') {
                    document.getElementById(`letter-${letter}`)?.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className={`min-w-[2.25rem] px-3 py-1.5 ${
                  selectedLetter === letter
                    ? EDITORIAL_FILTER_ACTIVE_CLASS
                    : EDITORIAL_FILTER_IDLE_CLASS
                }`}
              >
                {letter}
              </button>
            ))}
          </div>

          {searchQuery ? (
            <div>
              <h2 className={EDITORIAL_H2_CLASS}>
                {t('searchResults', { count: filteredTerms.length })}
              </h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                  <div key={letter} id={`letter-${letter}`} className="mb-12 border-t border-sage-200/80 pt-10 first:border-t-0 first:pt-0">
                    <h2 className="font-[Georgia] text-2xl font-light tracking-tight text-neutral-900">
                      {letter}
                    </h2>
                    <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

      {activeTab === "category" && (
        <div>
          {categories.map((category) => {
            const terms = termsByCategory[category];
            if (terms.length === 0) return null;
            if (selectedCategory && selectedCategory !== category) return null;

            return (
              <div key={category} className="mb-12 border-t border-sage-200/80 pt-10 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-[Georgia] text-base font-medium uppercase tracking-[0.2em] text-neutral-900">
                    {category}
                  </h2>
                  <span className="text-[11px] text-neutral-500">{terms.length} terms</span>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {terms.map((term) => (
                    <GlossaryTermCard key={term.slug} term={term} locale={locale} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {searchQuery && filteredTerms.length === 0 && (
        <div className="py-12 text-center">
          <p className={EDITORIAL_BODY_CLASS}>{t('noResults', { query: searchQuery })}</p>
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className={`mt-4 ${EDITORIAL_LINK_CLASS}`}
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
  const accent = getGlossaryCategoryAccent(term.category);

  return (
    <Link
      href={`/${locale}/glossary/${term.slug}`}
      className={`${EDITORIAL_CARD_CLASS} group ${accent.card}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3
          className={`${EDITORIAL_GLOSSARY_TERM_TITLE_CLASS} transition-colors group-hover:text-sage-800`}
        >
          {term.term}
        </h3>
        <span className={`shrink-0 text-[10px] font-medium uppercase tracking-wider ${accent.label}`}>
          {term.category}
        </span>
      </div>
      <p className={`mt-3 ${EDITORIAL_BODY_CLASS}`}>{t('cardHint')}</p>
      <span className={`mt-4 inline-block text-[11px] uppercase tracking-wider ${EDITORIAL_LINK_CLASS}`}>
        {t('readMore')}
      </span>
    </Link>
  );
}
