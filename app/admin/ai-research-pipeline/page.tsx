import { Metadata } from 'next';
import Link from 'next/link';
import {
  Search,
  Globe,
  FileSearch,
  ShieldCheck,
  Database,
  ChevronDown,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'AI Research Pipeline - Sage Admin',
  description: 'How we discover and enrich glamping property data using Tavily, Firecrawl, and OpenAI',
  robots: { index: false, follow: false },
};

const STEPS = [
  {
    id: 1,
    title: 'Discovery',
    subtitle: 'List qualifying properties',
    description:
      'OpenAI (with optional Tavily search) generates a list of glamping resorts by region and unit type. Only properties that meet our inclusion criteria are included.',
    icon: Search,
    color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  },
  {
    id: 2,
    title: 'Stable data (Tavily)',
    subtitle: 'Identity, location, terrain',
    description:
      'Tavily runs multiple web searches (e.g. Hipcamp, Glamping Hub, property name). We merge the raw page content and send it to GPT to extract stable facts: name, address, unit type, setting, activities.',
    icon: Globe,
    color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200',
  },
  {
    id: 3,
    title: 'Deep scrape (Firecrawl)',
    subtitle: 'Amenities & booking from live pages',
    description:
      'We scrape the property’s own site and listing pages (e.g. Hipcamp, Glamping Hub) with Firecrawl so we get full rendered content. GPT then extracts amenities, booking URLs, check-in info, and rates.',
    icon: FileSearch,
    color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200',
  },
  {
    id: 4,
    title: 'Volatile data (Tavily)',
    subtitle: 'Prices, reviews, social',
    description:
      'Another round of Tavily search targets current pricing and reviews. GPT extracts seasonal rates, ratings, and social links. This pass is kept separate so we can refresh it without re-running stable or deep-scrape data.',
    icon: Globe,
    color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200',
  },
  {
    id: 5,
    title: 'Validation',
    subtitle: 'Range checks & confidence',
    description:
      'We run automated checks: numeric ranges (e.g. rates, coordinates), geographic bounds (e.g. USA/Canada), required fields (name, state, country), and an overall confidence score from GPT’s per-category confidence.',
    icon: ShieldCheck,
    color: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200',
  },
  {
    id: 6,
    title: 'Database',
    subtitle: 'Supabase insert/update',
    description:
      'Validated records are written to the glamping_resorts table (or equivalent). We deduplicate against existing properties before insert. Each row stores source URLs and confidence for traceability.',
    icon: Database,
    color: 'bg-sage-100 dark:bg-sage-900/40 text-sage-800 dark:text-sage-200',
  },
];

const INCLUDE = [
  'At least 4 glamping units',
  'Glamping-unit focused (standalone, beds + linens)',
  'Professional operation',
];

const EXCLUDE = [
  'Tent campgrounds',
  'RV parks or RV resorts',
  'Hotels, motels, or lodges',
  'Fewer than 4 units',
];

export default function AIResearchPipelinePage() {
  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/admin/sage-glamping-data-breakdown"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-sage-600 dark:text-sage-400 hover:text-sage-700 dark:hover:text-sage-300 mb-4"
          >
            ← Back to Sage Glamping Data Breakdown
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">
            AI Research Pipeline
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            How we discover and enrich glamping property data using Tavily, Firecrawl, and OpenAI. This
            pipeline powers the Sage Glamping database and ensures only qualifying resorts are added.
          </p>
        </div>

        {/* Visual pipeline diagram */}
        <section
          className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden"
          aria-label="Pipeline steps"
        >
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Pipeline overview
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Six steps from discovery to database. Tavily and Firecrawl supply web content; OpenAI
              extracts structured data; validation catches errors before insert.
            </p>
          </div>
          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-0">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isLast = index === STEPS.length - 1;
                return (
                  <div key={step.id} className="flex flex-col items-stretch">
                    <div
                      className={`flex flex-col sm:flex-row sm:items-start gap-4 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 ${step.color}`}
                    >
                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 font-bold text-gray-900 dark:text-gray-100"
                          aria-hidden
                        >
                          {step.id}
                        </span>
                        <Icon className="h-6 w-6 text-gray-600 dark:text-gray-400" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {step.title}
                        </h3>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-0.5">
                          {step.subtitle}
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                    {!isLast && (
                      <div className="flex justify-center py-2" aria-hidden>
                        <ChevronDown className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Services at a glance */}
        <section className="mt-8 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              The three services
            </h2>
          </div>
          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-blue-50/50 dark:bg-blue-950/20">
                <p className="font-semibold text-gray-900 dark:text-gray-100">Tavily</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Web search that returns full page content (markdown). Used for discovery, stable
                  facts, and volatile data (prices, reviews).
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-amber-50/50 dark:bg-amber-950/20">
                <p className="font-semibold text-gray-900 dark:text-gray-100">Firecrawl</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Deep scrape of specific URLs (e.g. property site, Hipcamp). Renders JavaScript and
                  returns markdown so we can read amenities and booking details.
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-slate-50 dark:bg-slate-800/40">
                <p className="font-semibold text-gray-900 dark:text-gray-100">OpenAI (GPT)</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Lists entities in discovery; extracts structured data from web content using strict
                  JSON schemas and per-field confidence.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Glamping inclusion criteria */}
        <section className="mt-8 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Glamping resort inclusion criteria
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Only properties that meet all “Include” criteria and none of “Exclude” are added to the
              pipeline.
            </p>
          </div>
          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-400 mb-3">
                  <CheckCircle2 className="h-5 w-5" aria-hidden />
                  Include
                </h3>
                <ul className="space-y-2">
                  {INCLUDE.map((item) => (
                    <li
                      key={item}
                      className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2"
                    >
                      <span className="text-emerald-500 mt-0.5" aria-hidden>
                        •
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="flex items-center gap-2 font-medium text-red-700 dark:text-red-400 mb-3">
                  <XCircle className="h-5 w-5" aria-hidden />
                  Exclude
                </h3>
                <ul className="space-y-2">
                  {EXCLUDE.map((item) => (
                    <li
                      key={item}
                      className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2"
                    >
                      <span className="text-red-500 mt-0.5" aria-hidden>
                        •
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <p className="mt-8 text-sm text-gray-500 dark:text-gray-400">
          For full technical details, see{' '}
          <code className="rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-xs">
            docs/RESEARCH_PIPELINE_ARCHITECTURE.md
          </code>
          .
        </p>
      </div>
    </main>
  );
}
