/**
 * @jest-environment node
 */

import {
  boothCookieValue,
  cookieMatches,
  isGlampingShowQuizGateEnabled,
  pinMatches,
} from '@/lib/glamping-show-quiz-gate';

describe('glamping-show-quiz booth gate', () => {
  const original = process.env.GLAMPING_SHOW_QUIZ_PIN;

  afterEach(() => {
    if (original === undefined) delete process.env.GLAMPING_SHOW_QUIZ_PIN;
    else process.env.GLAMPING_SHOW_QUIZ_PIN = original;
  });

  it('is off when no PIN is configured', () => {
    delete process.env.GLAMPING_SHOW_QUIZ_PIN;
    expect(isGlampingShowQuizGateEnabled()).toBe(false);
    expect(pinMatches('anything')).toBe(true);
    expect(cookieMatches(undefined)).toBe(true);
  });

  it('accepts only the configured PIN and HMAC cookie', () => {
    process.env.GLAMPING_SHOW_QUIZ_PIN = 'booth-pin';
    expect(isGlampingShowQuizGateEnabled()).toBe(true);
    expect(pinMatches('booth-pin')).toBe(true);
    expect(pinMatches('wrong')).toBe(false);
    expect(cookieMatches(undefined)).toBe(false);
    expect(cookieMatches(boothCookieValue())).toBe(true);
  });
});
