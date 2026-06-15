import type { ReactNode } from 'react';
import Link from 'next/link';
import { EDITORIAL_TOPO_BG_URL } from '@/components/editorial/EditorialPageShell';

export function PipelineQuarterlyPageShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col bg-[#faf9f3] text-neutral-900">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.015]"
        style={{ backgroundImage: `url(${EDITORIAL_TOPO_BG_URL})` }}
        aria-hidden
      />
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-x-visible px-6 pt-16 pb-24 sm:pt-24 sm:pb-32">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
              Pipeline Quarterly
            </p>
            <h1 className="mt-2 font-[Georgia] text-2xl font-medium tracking-tight text-neutral-900 sm:text-3xl">
              {title}
            </h1>
            {subtitle ? (
              <div className="mt-2 text-sm font-light leading-relaxed text-neutral-600">
                {subtitle}
              </div>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
        {children}
      </main>
      <footer className="relative z-10 mt-auto w-full py-6 text-center">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs font-light text-neutral-500">
            Powered by{' '}
            <a
              href="https://sageoutdooradvisory.com/"
              className="text-neutral-500 underline-offset-2 transition-colors hover:text-neutral-900 hover:underline"
              rel="noopener noreferrer"
            >
              Sage Outdoor Advisory
            </a>
            {' · '}
            <Link
              href="/glamping-market-overview"
              className="text-neutral-500 underline-offset-2 transition-colors hover:text-neutral-900 hover:underline"
            >
              Market Overview
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
