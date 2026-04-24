import { Metadata } from 'next';
import Link from 'next/link';
import {
  Rss,
  FileText,
  Globe,
  Search,
  Sparkles,
  Filter,
  Database,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Discovery Pipeline Automation - Sage Admin',
  description:
    'How new glamping resorts are found from news articles and RSS feeds and added to the database',
  robots: { index: false, follow: false },
};

const STEPS = [
  {
    id: 1,
    title: 'Gather article URLs',
    subtitle: 'RSS, Tavily search, or manual',
    description:
      'Article links come from one of four sources: Google News RSS feeds (e.g. "glamping resort", "glamping opening 2025"), Tavily web search for glamping-related news, a single URL you provide (manual article), or a local text file. Each URL is tracked so we don’t process the same article twice.',
    icon: Rss,
    color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  },
  {
    id: 2,
    title: 'Fetch & extract article text',
    subtitle: 'Download and clean the page',
    description:
      'We fetch each article URL and use HTML parsing (Cheerio) to pull out the main story text—skipping nav, ads, and sidebars. The cleaned text is truncated to a safe length so it can be sent to the AI. Google News links may be followed to the original source if needed.',
    icon: FileText,
    color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200',
  },
  {
    id: 3,
    title: 'Extract properties with AI',
    subtitle: 'OpenAI finds glamping mentions',
    description:
      'The article text is sent to OpenAI (GPT). The model is prompted to find every North American glamping resort or property mentioned and return structured data: name, city, state, country, address, URL, description, unit types, and other fields. Only USA and Canada properties are kept.',
    icon: Sparkles,
    color: 'bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-200',
  },
  {
    id: 4,
    title: 'Deduplicate',
    subtitle: 'Skip properties we already have',
    description:
      'Extracted property names are compared to the existing database (all_glamping_properties). Fuzzy matching helps avoid duplicates with slight name differences. Only properties that are not already in the database move on to the next step.',
    icon: Filter,
    color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200',
  },
  {
    id: 5,
    title: 'Enrich with AI',
    subtitle: 'Add details for each new property',
    description:
      'Each new property is sent to OpenAI again with a research-style prompt. The model fills in as much detail as it can: address, website, description, amenities, coordinates, phone number, etc. This gives us a richer record before it goes into the database.',
    icon: Sparkles,
    color: 'bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-200',
  },
  {
    id: 6,
    title: 'Insert into database',
    subtitle: 'Save with discovery source',
    description:
      'Enriched records are inserted into all_glamping_properties with research_status = "in_progress". Each row is tagged with its discovery source (e.g. "Google News RSS", "Tavily Search", "Manual Article") so we can see where new properties came from. Processed article URLs are stored so we don’t re-run them. New properties do not appear on the public map until they are approved.',
    icon: Database,
    color: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200',
  },
  {
    id: 7,
    title: 'Approval & publish',
    subtitle: 'Review and make live on the map',
    description:
      'Newly inserted properties start in "In progress" for review. The team works them in the Sage Glamping Data Breakdown and can run enrichment scripts to fill in more detail. When a property is approved, research_status is set to "Published". Only published properties appear on the public map. This step ensures quality control before new discoveries go live.',
    icon: CheckCircle2,
    color: 'bg-sage-100 dark:bg-sage-900/40 text-sage-800 dark:text-sage-200',
  },
];

const SOURCES = [
  {
    name: 'Google News RSS',
    description: 'RSS feeds for queries like "glamping resort" and "glamping opening 2025". Run with --rss.',
    icon: Rss,
  },
  {
    name: 'Tavily Search',
    description: 'Web search for glamping news articles. Run with --tavily. Requires TAVILY_API_KEY.',
    icon: Search,
  },
  {
    name: 'Manual Article',
    description: 'Process a single article URL. Run with --url <url>.',
    icon: Globe,
  },
  {
    name: 'Local Text File',
    description: 'Process article text from a file. Run with --text <path>.',
    icon: FileText,
  },
];

const TECH = [
  { name: 'rss-parser', purpose: 'Parse RSS feeds (Google News) to get article URLs' },
  { name: 'Cheerio', purpose: 'Parse HTML and extract main article text from web pages' },
  { name: 'OpenAI (GPT-4o)', purpose: 'Extract property names/details from text; enrich with research-style prompts' },
  { name: 'Tavily', purpose: 'Optional web search to find glamping-related news article URLs' },
  { name: 'Supabase', purpose: 'Store properties in all_glamping_properties and track processed URLs' },
];

export default function DiscoveryPipelineAutomationPage() {
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
            Discovery Pipeline Automation
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            How new glamping resorts are found from news articles and RSS feeds and added to the
            database. This pipeline runs via script or automation; the steps and tech below are in
            simple terms for the internal team.
          </p>
        </div>

        {/* Pipeline steps */}
        <section
          className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden"
          aria-label="Pipeline steps"
        >
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Pipeline steps
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              From article URLs to live on the map: seven steps (including approval).
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

        {/* Research status (approval workflow) */}
        <section className="mt-8 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Research status (approval workflow)
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Each property has a research_status that controls whether it appears on the map.
            </p>
          </div>
          <div className="p-6 sm:p-8">
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="font-medium text-slate-600 dark:text-slate-400 shrink-0">New</span>
                <span className="text-gray-600 dark:text-gray-400">
                  Just added by the discovery pipeline. Not yet reviewed; not shown on the map.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-medium text-amber-600 dark:text-amber-400 shrink-0">In progress</span>
                <span className="text-gray-600 dark:text-gray-400">
                  Being enriched or reviewed. Not shown on the map until approved.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-medium text-emerald-600 dark:text-emerald-400 shrink-0">Published</span>
                <span className="text-gray-600 dark:text-gray-400">
                  Approved and visible on the public map. Set research_status to &quot;published&quot; after review.
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* Input sources */}
        <section className="mt-8 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Where article URLs come from
            </h2>
          </div>
          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SOURCES.map(({ name, description, icon: Icon }) => (
                <div
                  key={name}
                  className="flex gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50/50 dark:bg-gray-800/30"
                >
                  <Icon className="h-5 w-5 text-sage-600 dark:text-sage-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Production runs & cron */}
        <section className="mt-8 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/80 dark:bg-emerald-950/30">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Production runs (writes to the database)
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              The admin dashboard shows <span className="text-amber-700 dark:text-amber-400">(dry)</span> when a run used{' '}
              <code className="rounded bg-gray-100 dark:bg-gray-800 px-1 py-0.5 text-xs">--dry-run</code>. That flag is{' '}
              <strong>not</strong> set by Vercel cron or <code className="text-xs">npm run discover:glamping</code>. Dry
              history usually means someone ran the script manually with <code className="text-xs">--dry-run</code> or an
              external job did. There is no glamping discovery workflow under <code className="text-xs">.github/</code> in
              this repo—check other automation if you still see only dry runs.
            </p>
          </div>
          <div className="p-6 sm:p-8 space-y-4 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Manual (one Tavily article, real insert)</p>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-gray-100 dark:bg-gray-800 p-3 text-xs">
                {`npm run discover:glamping:once
# same as: npx tsx scripts/discover-glamping-from-news.ts --tavily --limit 1`}
              </pre>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Needs <code className="text-xs">NEXT_PUBLIC_SUPABASE_URL</code>,{' '}
                <code className="text-xs">SUPABASE_SERVICE_ROLE_KEY</code> (or <code className="text-xs">SUPABASE_SECRET_KEY</code>),{' '}
                <code className="text-xs">OPENAI_API_KEY</code>, <code className="text-xs">TAVILY_API_KEY</code> in{' '}
                <code className="text-xs">.env.local</code> (or your shell).
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Vercel cron</p>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                Path <code className="text-xs">/api/cron/discover-glamping</code>, schedule <code className="text-xs">0 15 * * *</code> UTC (
                <code className="text-xs">vercel.json</code>). Same env vars on the project. If <code className="text-xs">CRON_SECRET</code> is
                set, only requests with <code className="text-xs">Authorization: Bearer &lt;CRON_SECRET&gt;</code> succeed; Vercel is expected to
                send that header for cron invocations.
              </p>
            </div>
          </div>
        </section>

        {/* Tech stack */}
        <section className="mt-8 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Tech stack (simple terms)
            </h2>
          </div>
          <div className="p-6 sm:p-8">
            <ul className="space-y-3">
              {TECH.map(({ name, purpose }) => (
                <li
                  key={name}
                  className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 text-sm"
                >
                  <code className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-0.5 font-mono text-gray-800 dark:text-gray-200 shrink-0">
                    {name}
                  </code>
                  <span className="text-gray-600 dark:text-gray-400">{purpose}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Script: <code className="rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-xs">scripts/discover-glamping-from-news.ts</code>. Logic lives in{' '}
              <code className="rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-xs">lib/glamping-discovery/</code>.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
