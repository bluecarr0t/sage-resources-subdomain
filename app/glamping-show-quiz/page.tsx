import type { Metadata } from 'next';
import { GlampingShowQuiz } from '@/components/glamping-show-quiz/GlampingShowQuiz';
import { QuizKioskShell } from '@/components/glamping-show-quiz/QuizKioskShell';
import { EDITORIAL_TOPO_BG_URL } from '@/components/editorial/EditorialPageShell';
import { GLAMPING_SHOW_QUIZ_TITLE } from '@/lib/glamping-show-quiz';

export const metadata: Metadata = {
  title: `${GLAMPING_SHOW_QUIZ_TITLE} | Sage Outdoor Advisory`,
  description: 'Takes less than 60 seconds. A booth quiz for The Glamping Show.',
  referrer: 'no-referrer',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      nosnippet: true,
      noarchive: true,
    },
  },
};

export default function GlampingShowQuizPage() {
  return (
    <QuizKioskShell>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-none bg-[#faf9f3] text-neutral-900">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.015]"
          style={{ backgroundImage: `url(${EDITORIAL_TOPO_BG_URL})` }}
          aria-hidden
        />
        <main className="relative z-10 flex min-h-0 flex-1 flex-col">
          <GlampingShowQuiz />
        </main>
      </div>
    </QuizKioskShell>
  );
}
