import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import type { AbstractIntlMessages } from 'next-intl';
import type { Metadata } from 'next';
import { isClientPortalEnabled } from '@/lib/client-portal/is-enabled';
import enMessages from '@/messages/en.json';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Client portal | Sage Outdoor Advisory',
  description:
    'Follow the status of your outdoor hospitality feasibility study or appraisal.',
  robots: { index: false, follow: false },
};

export default function ClientPortalLayout({ children }: { children: ReactNode }) {
  if (!isClientPortalEnabled()) {
    notFound();
  }

  return (
    <NextIntlClientProvider locale="en" messages={enMessages as unknown as AbstractIntlMessages}>
      <div className="min-h-screen bg-[#f3f2ec] text-neutral-900">
        <header className="border-b border-[#c7d2c7] bg-[#faf9f3]">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4">
            <a href="https://sageoutdooradvisory.com/" className="inline-flex items-center">
              <img
                src="/logos/sage-logo-dark.png"
                alt="Sage Outdoor Advisory"
                className="h-8 w-auto"
              />
            </a>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-10">{children}</main>
      </div>
    </NextIntlClientProvider>
  );
}
