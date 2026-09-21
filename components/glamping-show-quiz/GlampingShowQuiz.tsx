'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import Image from 'next/image';
import { CheckCircle2, LineChart } from 'lucide-react';
import { Button, Input, Select } from '@/components/ui';
import {
  EDITORIAL_BUTTON_OUTLINE_CLASS,
  EDITORIAL_BUTTON_PRIMARY_CLASS,
  EDITORIAL_INPUT_CLASS,
} from '@/components/editorial/EditorialPageShell';
import { QuizQrCode } from '@/components/glamping-show-quiz/QuizQrCode';
import { trackFormSubmission } from '@/lib/analytics';
import {
  GLAMPING_SHOW_QUIZ_DURATION_LABEL,
  GLAMPING_SHOW_QUIZ_TITLE,
  QUIZ_CA_REGION_OPTIONS,
  QUIZ_FLOW_STEPS,
  QUIZ_REGION_OTHER,
  QUIZ_ROLE_OPTIONS,
  QUIZ_TIMELINE_OPTIONS,
  QUIZ_US_REGION_OPTIONS,
  formatQuizIdleCountdown,
  formatQuizPhoneInput,
  impliedQuizNeed,
  impliedQuizStage,
  impliedQuizTimeline,
  parseQuizCompany,
  parseQuizPhone,
  quizIdleResetMs,
  quizNeedOptionsForRole,
  quizResultCopy,
  quizSkipsNeedAndTimeline,
  quizSkipsStage,
  quizStageOptionsForRole,
  quizStagePrompt,
  quizVisibleQuestionCount,
  quizVisibleQuestionNumber,
  resolveQuizOutcome,
  type QuizFlowStep,
  type QuizNeed,
  type QuizOutcome,
  type QuizResultCopy,
  type QuizRole,
  type QuizStage,
  type QuizTimeline,
} from '@/lib/glamping-show-quiz';

const QUIZ_LOGO_SRC = '/logos/sage-logo-stacked.png';

type QuizStep = QuizFlowStep;

const STEP_ORDER: QuizStep[] = [...QUIZ_FLOW_STEPS];

type ContactDraft = {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  region: string;
  phone: string;
  newsletterOptIn: boolean;
};

const EMPTY_CONTACT: ContactDraft = {
  firstName: '',
  lastName: '',
  email: '',
  company: '',
  region: '',
  phone: '',
  newsletterOptIn: false,
};

const OPTION_BUTTON_CLASS =
  'w-full min-h-[3.5rem] rounded-none border border-sage-200/90 bg-white/70 px-4 py-3 text-left text-base font-light text-neutral-800 transition-colors hover:border-sage-400 hover:bg-white focus:outline-none focus:ring-2 focus:ring-sage-300 sm:text-lg';

export function GlampingShowQuiz() {
  const [step, setStep] = useState<QuizStep>('welcome');
  const [role, setRole] = useState<QuizRole | null>(null);
  const [stage, setStage] = useState<QuizStage | null>(null);
  const [need, setNeed] = useState<QuizNeed | null>(null);
  const [timeline, setTimeline] = useState<QuizTimeline | null>(null);
  const [contact, setContact] = useState<ContactDraft>(EMPTY_CONTACT);
  const [outcome, setOutcome] = useState<QuizOutcome | null>(null);
  const [marketOverviewUrl, setMarketOverviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const idleUntilRef = useRef<number | null>(null);
  const idleTimerRef = useRef<number | null>(null);

  const resetQuiz = useCallback(() => {
    setStep('welcome');
    setRole(null);
    setStage(null);
    setNeed(null);
    setTimeline(null);
    setContact(EMPTY_CONTACT);
    setOutcome(null);
    setMarketOverviewUrl(null);
    setSubmitting(false);
    setError(null);
  }, []);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current == null) return;
    window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = null;
  }, []);

  const armIdle = useCallback(
    (idleMs: number) => {
      clearIdleTimer();
      idleUntilRef.current = Date.now() + idleMs;
      idleTimerRef.current = window.setTimeout(resetQuiz, idleMs);
    },
    [clearIdleTimer, resetQuiz]
  );

  const bumpActivity = useCallback(() => {
    const idleMs = quizIdleResetMs(step);
    if (idleMs == null || submitting) return;
    armIdle(idleMs);
    if (step === 'result') {
      setRemainingMs(idleMs);
    }
  }, [armIdle, step, submitting]);

  useEffect(() => {
    const idleMs = quizIdleResetMs(step);
    if (idleMs == null || submitting) {
      idleUntilRef.current = null;
      setRemainingMs(null);
      clearIdleTimer();
      return undefined;
    }
    armIdle(idleMs);
    setRemainingMs(idleMs);
    return () => clearIdleTimer();
  }, [armIdle, clearIdleTimer, step, submitting]);

  useEffect(() => {
    if (step !== 'result') return undefined;
    const tick = window.setInterval(() => {
      const until = idleUntilRef.current;
      if (until == null) return;
      setRemainingMs(Math.max(0, until - Date.now()));
    }, 250);
    return () => window.clearInterval(tick);
  }, [step]);

  useEffect(() => {
    if (quizIdleResetMs(step) == null) return undefined;
    const onActivity = () => bumpActivity();
    window.addEventListener('pointerdown', onActivity);
    window.addEventListener('keydown', onActivity);
    window.addEventListener('touchstart', onActivity);
    return () => {
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('touchstart', onActivity);
    };
  }, [step, bumpActivity]);

  const questionTotal = quizVisibleQuestionCount(role, step);
  const qNumber = quizVisibleQuestionNumber(step, role);

  const progress = useMemo(() => {
    if (qNumber === 0) return step === 'contact' ? 90 : step === 'result' ? 100 : 0;
    return (qNumber / questionTotal) * 80;
  }, [qNumber, questionTotal, step]);

  function goBack() {
    if (step === 'contact' && quizSkipsNeedAndTimeline(role)) {
      setError(null);
      setStep('role');
      return;
    }
    if (step === 'need' && quizSkipsStage(role)) {
      setError(null);
      setStep('role');
      return;
    }
    const index = STEP_ORDER.indexOf(step);
    if (index <= 0) return;
    setError(null);
    setStep(STEP_ORDER[index - 1] ?? 'welcome');
  }

  function selectRole(value: QuizRole) {
    setRole(value);
    setError(null);
    if (quizSkipsNeedAndTimeline(value)) {
      setStage(impliedQuizStage(value) ?? 'idea');
      setNeed(impliedQuizNeed(value) ?? 'exploring');
      setTimeline(impliedQuizTimeline(value) ?? 'no_timeline');
      setStep('contact');
      return;
    }
    const implied = impliedQuizStage(value);
    if (implied) {
      setStage(implied);
      setNeed(null);
      setTimeline(null);
      setStep('need');
      return;
    }
    setStage(null);
    setNeed(null);
    setTimeline(null);
    setStep('stage');
  }

  function selectStage(value: QuizStage) {
    setStage(value);
    setStep('need');
  }

  function selectNeed(value: QuizNeed) {
    setNeed(value);
    setStep('timeline');
  }

  function selectTimeline(value: QuizTimeline) {
    setTimeline(value);
    setStep('contact');
  }

  async function handleContactSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!role || !stage || !need || !timeline) {
      setError('Please complete the quiz.');
      return;
    }

    setSubmitting(true);
    setError(null);
    const clientOutcome = resolveQuizOutcome({ role, stage, need, timeline });
    const company = parseQuizCompany(contact.company);
    if (company === null) {
      setSubmitting(false);
      setError('Please enter your company or project name.');
      return;
    }
    const phone = parseQuizPhone(contact.phone);
    if (phone === null) {
      setSubmitting(false);
      setError('Please enter a phone number so we can follow up.');
      return;
    }

    try {
      const res = await fetch('/api/glamping-show-quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          company: contact.company,
          region: contact.region,
          phone: contact.phone,
          newsletterOptIn: contact.newsletterOptIn,
          role,
          stage,
          need,
          timeline,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            outcome?: QuizOutcome;
            marketOverviewUrl?: string;
          }
        | null;

      if (!res.ok || !data?.ok) {
        setError(data?.error ?? 'Something went wrong. Please try again.');
        trackFormSubmission('glamping_show_quiz', 'booth', false);
        return;
      }

      trackFormSubmission('glamping_show_quiz', 'booth', true);
      setOutcome(data.outcome ?? clientOutcome);
      setMarketOverviewUrl(
        typeof data.marketOverviewUrl === 'string' && data.marketOverviewUrl
          ? data.marketOverviewUrl
          : null
      );
      setStep('result');
    } catch {
      trackFormSubmission('glamping_show_quiz', 'booth', false);
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const result = outcome && need ? quizResultCopy(outcome, need) : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-8 sm:px-8 sm:py-12">
      <header className="mb-8 flex items-center justify-between gap-4">
        <Image
          src={QUIZ_LOGO_SRC}
          alt="Sage Outdoor Advisory"
          width={500}
          height={250}
          className="h-20 w-auto sm:h-24"
          priority
          unoptimized
        />
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500">
          The Glamping Show
        </p>
      </header>

      {step !== 'welcome' && step !== 'result' ? (
        <div className="mb-6" aria-hidden>
          <div className="h-1 w-full bg-sage-100">
            <div
              className="h-1 bg-sage-600 transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          {qNumber > 0 ? (
            <p className="mt-2 text-[11px] uppercase tracking-widest text-neutral-500">
              Question {qNumber} of {questionTotal}
            </p>
          ) : (
            <p className="mt-2 text-[11px] uppercase tracking-widest text-neutral-500">
              Almost done
            </p>
          )}
        </div>
      ) : null}

      {step === 'welcome' ? (
        <section className="flex flex-1 flex-col justify-center -translate-y-10 sm:-translate-y-14">
          <p className="font-[Georgia] text-sm font-medium uppercase tracking-[0.28em] text-neutral-900">
            {GLAMPING_SHOW_QUIZ_DURATION_LABEL}
          </p>
          <h1 className="mt-3 font-[Georgia] text-3xl font-medium tracking-tight text-neutral-900 sm:text-4xl">
            {GLAMPING_SHOW_QUIZ_TITLE}
          </h1>
          <p className="mt-4 max-w-xl text-base font-light leading-relaxed text-neutral-600 sm:text-lg">
            A few questions. We’ll point you to schedule a meeting or glamping
            market data, whichever fits where you are today.
          </p>
          <div className="mt-10">
            <button
              type="button"
              className={`${EDITORIAL_BUTTON_PRIMARY_CLASS} min-h-12 px-8 text-sm`}
              onClick={() => setStep('role')}
            >
              Start the quiz
            </button>
          </div>
        </section>
      ) : null}

      {step === 'role' ? (
        <QuestionBlock
          prompt="What best describes you?"
          onBack={goBack}
        >
          {QUIZ_ROLE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={OPTION_BUTTON_CLASS}
              onClick={() => selectRole(option.value)}
            >
              {option.label}
            </button>
          ))}
        </QuestionBlock>
      ) : null}

      {step === 'stage' ? (
        <QuestionBlock
          prompt={quizStagePrompt(role)}
          onBack={goBack}
        >
          {quizStageOptionsForRole(role).map((option) => (
            <button
              key={option.value}
              type="button"
              className={OPTION_BUTTON_CLASS}
              onClick={() => selectStage(option.value)}
            >
              {option.label}
            </button>
          ))}
        </QuestionBlock>
      ) : null}

      {step === 'need' ? (
        <QuestionBlock
          prompt="What would help you most right now?"
          onBack={goBack}
        >
          {quizNeedOptionsForRole(role).map((option) => (
            <button
              key={option.value}
              type="button"
              className={OPTION_BUTTON_CLASS}
              onClick={() => selectNeed(option.value)}
            >
              {option.label}
            </button>
          ))}
        </QuestionBlock>
      ) : null}

      {step === 'timeline' ? (
        <QuestionBlock
          prompt="When do you need it?"
          onBack={goBack}
        >
          {QUIZ_TIMELINE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={OPTION_BUTTON_CLASS}
              onClick={() => selectTimeline(option.value)}
            >
              {option.label}
            </button>
          ))}
        </QuestionBlock>
      ) : null}

      {step === 'contact' ? (
        <section>
          <h2 className="font-[Georgia] text-2xl font-medium tracking-tight text-neutral-900 sm:text-3xl">
            How should we follow up?
          </h2>
          <p className="mt-2 text-sm font-light text-neutral-600">
            We’ll use this to send your result and route the right Sage teammate.
          </p>
          <form
            onSubmit={handleContactSubmit}
            onInput={bumpActivity}
            className="mt-6 space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="First name"
                name="firstName"
                autoComplete="given-name"
                required
                value={contact.firstName}
                onChange={(event) =>
                  setContact((prev) => ({ ...prev, firstName: event.target.value }))
                }
                className={EDITORIAL_INPUT_CLASS}
              />
              <Input
                label="Last name"
                name="lastName"
                autoComplete="family-name"
                required
                value={contact.lastName}
                onChange={(event) =>
                  setContact((prev) => ({ ...prev, lastName: event.target.value }))
                }
                className={EDITORIAL_INPUT_CLASS}
              />
            </div>
            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={contact.email}
              onChange={(event) =>
                setContact((prev) => ({ ...prev, email: event.target.value }))
              }
              className={EDITORIAL_INPUT_CLASS}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                required
                maxLength={14}
                value={contact.phone}
                onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                  if (event.metaKey || event.ctrlKey || event.altKey) return;
                  if (event.key.length !== 1) return;
                  if (!/\d/.test(event.key)) {
                    event.preventDefault();
                  }
                }}
                onChange={(event) =>
                  setContact((prev) => ({
                    ...prev,
                    phone: formatQuizPhoneInput(event.target.value),
                  }))
                }
                className={EDITORIAL_INPUT_CLASS}
              />
              <Select
                label="Project state or region"
                name="region"
                autoComplete="address-level1"
                required
                value={contact.region}
                onChange={(event) => {
                  const target = event.target;
                  if (!(target instanceof HTMLSelectElement)) return;
                  setContact((prev) => ({ ...prev, region: target.value }));
                }}
                className={EDITORIAL_INPUT_CLASS}
              >
                <option value="">Select a state or region</option>
                <optgroup label="United States">
                  {QUIZ_US_REGION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Canada">
                  {QUIZ_CA_REGION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
                <option value={QUIZ_REGION_OTHER}>Outside the US and Canada</option>
              </Select>
            </div>
            <Input
              label="Company or project"
              name="company"
              autoComplete="organization"
              required
              value={contact.company}
              onChange={(event) =>
                setContact((prev) => ({ ...prev, company: event.target.value }))
              }
              className={EDITORIAL_INPUT_CLASS}
            />
            <label className="flex items-start gap-3 text-sm font-light text-neutral-700">
              <input
                type="checkbox"
                className="mt-0.5 h-6 w-6 shrink-0 cursor-pointer rounded border-sage-300 accent-sage-600 text-sage-600 focus:ring-2 focus:ring-sage-400"
                checked={contact.newsletterOptIn}
                onChange={(event) =>
                  setContact((prev) => ({
                    ...prev,
                    newsletterOptIn: event.target.checked,
                  }))
                }
              />
              Send me Sage Outdoor Advisory's updates: market reports, the
              glamping map, and The Outdoor Hospitality Podcast.
            </label>
            {error ? (
              <p className="text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                className={EDITORIAL_BUTTON_OUTLINE_CLASS}
                onClick={goBack}
                disabled={submitting}
              >
                Back
              </button>
              <Button type="submit" size="lg" disabled={submitting}>
                {submitting ? 'Saving…' : 'See my result'}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {step === 'result' && result ? (
        <section className="flex flex-1 flex-col">
          <ResultIdentity outcome={result.outcome} />
          <div className="flex flex-1 flex-col gap-8 sm:flex-row sm:items-start">
            <div className="flex-1">
              <ResultHeading result={result} />
              <p className="mt-4 text-base font-light leading-relaxed text-neutral-700">
                {result.body}
              </p>
              {result.footnote ? (
                <p className="mt-3 text-sm font-light text-neutral-500">{result.footnote}</p>
              ) : null}
              {remainingMs != null ? (
                <p className="mt-6 text-[11px] font-medium uppercase tracking-widest text-neutral-500">
                  Resets in {formatQuizIdleCountdown(remainingMs)}
                </p>
              ) : null}
              <button
                type="button"
                className="mt-8 text-[11px] font-medium uppercase tracking-widest text-neutral-500 underline-offset-4 hover:text-neutral-800 hover:underline"
                onClick={resetQuiz}
              >
                Start over
              </button>
            </div>
            <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start">
              <QuizQrCode
                url={marketOverviewUrl ?? result.primaryCtaUrl}
                label={result.primaryCtaLabel}
                hint={result.qrHint}
                size={result.secondaryCtaUrl ? 'sm' : 'md'}
              />
              {result.secondaryCtaUrl && result.secondaryCtaLabel ? (
                <QuizQrCode
                  url={result.secondaryCtaUrl}
                  label={result.secondaryCtaLabel}
                  hint={result.qrHint}
                  size="sm"
                />
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ResultIdentity({ outcome }: { outcome: QuizOutcome }) {
  switch (outcome) {
    case 'ready_now':
      return (
        <span
          className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-sage-600 text-white"
          aria-hidden
        >
          <CheckCircle2 className="h-6 w-6" strokeWidth={2.25} />
        </span>
      );
    case 'getting_close':
    case 'just_exploring':
      return (
        <span
          className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-sage-100 text-sage-800"
          aria-hidden
        >
          <LineChart className="h-6 w-6" strokeWidth={2.25} />
        </span>
      );
    default: {
      const _exhaustive: never = outcome;
      return _exhaustive;
    }
  }
}

function ResultHeading({ result }: { result: QuizResultCopy }) {
  switch (result.outcome) {
    case 'ready_now':
      return (
        <>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-sage-600">
            {result.visitorLabel}
          </p>
          <h2 className="mt-2 font-[Georgia] text-2xl font-medium tracking-tight text-sage-700 sm:text-3xl">
            {result.headline}
          </h2>
        </>
      );
    case 'getting_close':
    case 'just_exploring':
      return (
        <>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-sage-700">
            {result.visitorLabel}
          </p>
          <h2 className="mt-2 font-[Georgia] text-2xl font-medium tracking-tight text-sage-800 sm:text-3xl">
            {result.headline}
          </h2>
        </>
      );
    default: {
      const _exhaustive: never = result.outcome;
      return _exhaustive;
    }
  }
}

function QuestionBlock({
  prompt,
  onBack,
  children,
}: {
  prompt: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="font-[Georgia] text-2xl font-medium tracking-tight text-neutral-900 sm:text-3xl">
        {prompt}
      </h2>
      <div className="mt-6 flex flex-col gap-3">{children}</div>
      <button
        type="button"
        className="mt-6 text-[11px] font-medium uppercase tracking-widest text-neutral-500 underline-offset-4 hover:text-neutral-800 hover:underline"
        onClick={onBack}
      >
        Back
      </button>
    </section>
  );
}
