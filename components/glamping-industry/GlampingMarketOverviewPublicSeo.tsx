import Link from 'next/link';
import { EDITORIAL_LINK_CLASS, EDITORIAL_TOPO_BG_URL } from '@/components/editorial/EditorialPageShell';
import {
  glampingMarketOverviewFaqsForVariant,
  type GlampingMarketOverviewSeoVariant,
} from '@/lib/glamping-market-overview-seo';
import { GLAMPING_MARKET_SCOPE_SHORT_LABEL } from '@/lib/glamping-market-overview-scope';

type Props = {
  variant?: GlampingMarketOverviewSeoVariant;
};

export function GlampingMarketOverviewPublicSeo({ variant = 'overview' }: Props) {
  const isBrands = variant === 'brands';
  const faqs = glampingMarketOverviewFaqsForVariant(variant);

  return (
    <section
      id="glamping-market-public-seo"
      className="relative border-b border-sage-200/80 bg-[#faf9f3] text-neutral-900"
      aria-labelledby="glamping-market-public-seo-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.02]"
        style={{ backgroundImage: `url(${EDITORIAL_TOPO_BG_URL})` }}
        aria-hidden
      />
      <div className="relative z-10 mx-auto max-w-4xl px-6 py-12 sm:py-16">
        <p className="font-[Georgia] text-[11px] font-medium uppercase tracking-[0.28em] text-neutral-500">
          Sage market research
        </p>
        <h1
          id="glamping-market-public-seo-heading"
          className="mt-3 font-[Georgia] text-2xl font-medium tracking-tight text-neutral-900 sm:text-3xl"
        >
          {isBrands ? 'Top glamping brands in the United States' : 'Glamping market overview — US & Canada'}
        </h1>
        <p className="speakable-answer mt-4 max-w-2xl text-sm leading-relaxed text-neutral-600 sm:text-base">
          {isBrands ? (
            <>
              Compare the largest multi-property glamping operators in the United States by published
              location count, glamping units, and average retail nightly rates. Rankings use Sage
              research on private commercial glamping — the same database that powers our{' '}
              <Link href="/en/map" className={EDITORIAL_LINK_CLASS}>
                interactive property map
              </Link>
              .
            </>
          ) : (
            <>
              Benchmark private commercial glamping supply, unit inventory, and average retail daily
              rates (ADR) across the United States and Canada. Sage aggregates published research into
              property totals, unit-type mix, state and province rankings, and an interactive US map —
              scoped to {GLAMPING_MARKET_SCOPE_SHORT_LABEL.toLowerCase()} operators only.
            </>
          )}
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-600">
          Full metrics unlock after a free email sign-in. No password — we send a secure magic link to
          your inbox.
        </p>

        <div className="mt-8 flex flex-wrap gap-x-4 gap-y-2 text-sm text-neutral-600">
          {!isBrands ? (
            <Link href="/glamping-market-overview/brands" className={EDITORIAL_LINK_CLASS}>
              Top glamping brands →
            </Link>
          ) : (
            <Link href="/glamping-market-overview" className={EDITORIAL_LINK_CLASS}>
              ← Market overview
            </Link>
          )}
          <Link href="/glamping-unit-type-classification" className={EDITORIAL_LINK_CLASS}>
            Unit type taxonomy
          </Link>
          <Link href="/en/map" className={EDITORIAL_LINK_CLASS}>
            Interactive map
          </Link>
          <Link href="/en/glossary" className={EDITORIAL_LINK_CLASS}>
            Glossary
          </Link>
        </div>

        <h2 className="mt-10 text-[11px] font-medium uppercase tracking-widest text-neutral-500">
          Frequently asked questions
        </h2>
        <dl className="mt-4 space-y-6">
          {faqs.map((faq) => (
            <div key={faq.question}>
              <dt className="text-sm font-medium text-neutral-900">{faq.question}</dt>
              <dd className="speakable-answer mt-2 text-sm font-light leading-relaxed text-neutral-600">
                {faq.answer}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
