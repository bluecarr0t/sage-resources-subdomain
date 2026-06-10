import type { Metadata } from 'next';
import Link from 'next/link';
import { GlampingUnitTypeClassificationDiagram } from '@/components/glamping-unit-classification/GlampingUnitTypeClassificationDiagram';
import { EDITORIAL_TOPO_BG_URL } from '@/components/editorial/EditorialPageShell';
import FloatingHeader from '@/components/FloatingHeader';
import Footer from '@/components/Footer';
import { countGlampingUnitClassificationSubtypes } from '@/lib/glamping-unit-type-classification';

export const metadata: Metadata = {
  title: 'Glamping Unit Type Classification | Sage Outdoor Advisory',
  description:
    'Interactive taxonomy of glamping unit types and subtypes — canvas tents, domes, cabins, treehouses, and canonical labels used in Sage market data.',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Glamping Unit Type Classification',
    description:
      'Explore families and canonical subtypes for glamping accommodations in the Sage database.',
    url: 'https://resources.sageoutdooradvisory.com/glamping-unit-type-classification',
    siteName: 'Sage Outdoor Advisory',
    type: 'website',
  },
};

export default function GlampingUnitTypeClassificationPage() {
  const subtypeCount = countGlampingUnitClassificationSubtypes();

  return (
    <div className="relative flex min-h-screen flex-col bg-[#faf9f3] text-neutral-900">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.015]"
        style={{ backgroundImage: `url(${EDITORIAL_TOPO_BG_URL})` }}
        aria-hidden
      />
      <FloatingHeader locale="en" showFullNav showSpacer={false} />
      <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-6 pt-16 pb-24 sm:pt-24 sm:pb-32">
        <header className="mb-10 border-b border-sage-200/80 pb-10">
          <p className="font-[Georgia] text-sm font-medium uppercase tracking-[0.28em] text-neutral-900 sm:text-base">
            Reference
          </p>
          <h1 className="mt-3 font-[Georgia] text-3xl font-medium tracking-tight text-neutral-900 sm:text-4xl">
            Glamping unit type classification
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-neutral-600 sm:text-base">
            How Sage groups physical accommodations for glamping and outdoor hospitality — from
            safari tents and yurts to cabins, pods, and specialty builds.{' '}
            <span className="tabular-nums text-neutral-800">{subtypeCount}</span> canonical subtypes
            across interactive families below.
          </p>
          <p className="mt-4 text-sm text-neutral-600">
            Related:{' '}
            <Link
              href="/en/glossary"
              className="font-medium text-[#006b5f] underline decoration-[#006b5f]/30 underline-offset-2 hover:decoration-[#006b5f]"
            >
              Outdoor hospitality glossary
            </Link>
            {' · '}
            <Link
              href="/glamping-market-overview"
              className="font-medium text-[#006b5f] underline decoration-[#006b5f]/30 underline-offset-2 hover:decoration-[#006b5f]"
            >
              Glamping market overview
            </Link>
          </p>
        </header>

        <GlampingUnitTypeClassificationDiagram />
      </main>
      <Footer locale="en" />
    </div>
  );
}
