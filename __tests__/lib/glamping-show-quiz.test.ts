import {
  GLAMPING_SHOW_QUIZ_PATH,
  ghlQuizTagsToRemove,
  ghlTagsForQuizAnswers,
  parseOptionalPhone,
  parseQuizAnswers,
  parseQuizCompany,
  parseQuizPhone,
  parseQuizRegion,
  formatQuizIdleCountdown,
  quizIdleResetMs,
  quizPhoneRequired,
  quizRoleContactType,
  quizResultCopy,
  resolveQuizOutcome,
} from '@/lib/glamping-show-quiz';
import {
  GHL_GLAMPING_SHOW_QUIZ_TAG,
  GHL_QUIZ_GETTING_CLOSE_TAG,
  GHL_QUIZ_JUST_EXPLORING_TAG,
  GHL_QUIZ_READY_NOW_TAG,
} from '@/lib/ghl/tags';

describe('glamping-show-quiz scoring', () => {
  it('routes land/plans within 3 months to ready now', () => {
    expect(
      resolveQuizOutcome({
        role: 'developer_operator',
        stage: 'has_land',
        need: 'feasibility',
        timeline: '30_days',
      })
    ).toBe('ready_now');
    expect(
      resolveQuizOutcome({
        role: 'existing_operator',
        stage: 'has_plans',
        need: 'appraisal',
        timeline: '1_to_3_months',
      })
    ).toBe('ready_now');
  });

  it('routes idea stage or no timeline to just exploring', () => {
    expect(
      resolveQuizOutcome({
        role: 'landowner',
        stage: 'idea',
        need: 'exploring',
        timeline: '30_days',
      })
    ).toBe('just_exploring');
    expect(
      resolveQuizOutcome({
        role: 'developer_operator',
        stage: 'has_land',
        need: 'feasibility',
        timeline: 'no_timeline',
      })
    ).toBe('just_exploring');
    expect(
      resolveQuizOutcome({
        role: 'existing_operator',
        stage: 'operating',
        need: 'market_data',
        timeline: 'no_timeline',
      })
    ).toBe('just_exploring');
  });

  it('routes land/plans on a 3–12 month clock, or operating, to getting close', () => {
    expect(
      resolveQuizOutcome({
        role: 'developer_operator',
        stage: 'has_plans',
        need: 'appraisal',
        timeline: '3_to_12_months',
      })
    ).toBe('getting_close');
    expect(
      resolveQuizOutcome({
        role: 'existing_operator',
        stage: 'operating',
        need: 'market_data',
        timeline: '1_to_3_months',
      })
    ).toBe('getting_close');
  });

  it('routes urgent market-data asks to getting close instead of ready now', () => {
    expect(
      resolveQuizOutcome({
        role: 'investor_lender',
        stage: 'has_land',
        need: 'market_data',
        timeline: '1_to_3_months',
      })
    ).toBe('getting_close');
  });

  it('does not score vendor/media as ready now even with land and a 30-day clock', () => {
    expect(
      resolveQuizOutcome({
        role: 'vendor_media',
        stage: 'has_land',
        need: 'feasibility',
        timeline: '30_days',
      })
    ).toBe('just_exploring');
  });

  it('routes “just exploring” need away from ready now', () => {
    expect(
      resolveQuizOutcome({
        role: 'developer_operator',
        stage: 'has_plans',
        need: 'exploring',
        timeline: '30_days',
      })
    ).toBe('just_exploring');
  });
});

describe('glamping-show-quiz tags and contact type', () => {
  it('includes the event tag plus role, stage, need, timeline, and outcome tags', () => {
    const answers = {
      role: 'developer_operator' as const,
      stage: 'has_plans' as const,
      need: 'appraisal' as const,
      timeline: '30_days' as const,
    };
    expect(ghlTagsForQuizAnswers(answers, 'ready_now')).toEqual([
      GHL_GLAMPING_SHOW_QUIZ_TAG,
      'Quiz - Developer/Operator',
      'Quiz - Has Plans',
      'Quiz - Appraisal',
      'Quiz - 30 Days',
      GHL_QUIZ_READY_NOW_TAG,
    ]);
    expect(ghlTagsForQuizAnswers(answers, 'getting_close')).toContain(
      GHL_QUIZ_GETTING_CLOSE_TAG
    );
    expect(ghlTagsForQuizAnswers(answers, 'just_exploring')).toContain(
      GHL_QUIZ_JUST_EXPLORING_TAG
    );
  });

  it('strips stale outcome and dimension tags so a retake cannot stack Ready Now with Just Exploring', () => {
    const keep = ghlTagsForQuizAnswers(
      {
        role: 'landowner',
        stage: 'idea',
        need: 'exploring',
        timeline: 'no_timeline',
      },
      'just_exploring'
    );
    const remove = ghlQuizTagsToRemove(keep);
    expect(remove).toContain(GHL_QUIZ_READY_NOW_TAG);
    expect(remove).toContain(GHL_QUIZ_GETTING_CLOSE_TAG);
    expect(remove).toContain('Quiz - Developer/Operator');
    expect(remove).not.toContain(GHL_QUIZ_JUST_EXPLORING_TAG);
    expect(remove).not.toContain('Quiz - Landowner');
    expect(remove).not.toContain(GHL_GLAMPING_SHOW_QUIZ_TAG);
  });

  it('maps quiz roles onto existing GHL Contact Type values', () => {
    expect(quizRoleContactType('landowner')).toBe('other');
    expect(quizRoleContactType('developer_operator')).toBe('developer');
    expect(quizRoleContactType('existing_operator')).toBe('operator');
    expect(quizRoleContactType('investor_lender')).toBe('investor');
    expect(quizRoleContactType('vendor_media')).toBe('other');
  });
});

describe('glamping-show-quiz parsers', () => {
  it('accepts a complete answer payload', () => {
    expect(
      parseQuizAnswers({
        role: 'landowner',
        stage: 'idea',
        need: 'exploring',
        timeline: 'no_timeline',
      })
    ).toEqual({
      role: 'landowner',
      stage: 'idea',
      need: 'exploring',
      timeline: 'no_timeline',
    });
  });

  it('rejects unknown slugs', () => {
    expect(
      parseQuizAnswers({
        role: 'consultant',
        stage: 'idea',
        need: 'exploring',
        timeline: 'no_timeline',
      })
    ).toBeNull();
  });

  it('treats phone as optional and rejects short values', () => {
    expect(parseOptionalPhone('')).toBe('');
    expect(parseOptionalPhone(undefined)).toBe('');
    expect(parseOptionalPhone('(312) 555-0199')).toBe('(312) 555-0199');
    expect(parseOptionalPhone('123')).toBeNull();
  });

  it('requires a phone on Ready Now and allows it to be blank otherwise', () => {
    expect(quizPhoneRequired('ready_now')).toBe(true);
    expect(quizPhoneRequired('getting_close')).toBe(false);
    expect(quizPhoneRequired('just_exploring')).toBe(false);
    expect(parseQuizPhone('', true)).toBeNull();
    expect(parseQuizPhone('312-555-0199', true)).toBe('312-555-0199');
    expect(parseQuizPhone('', false)).toBe('');
  });

  it('treats company as optional and requires a known region code', () => {
    expect(parseQuizCompany('Sage Outdoor')).toBe('Sage Outdoor');
    expect(parseQuizCompany('  ')).toBe('');
    expect(parseQuizCompany(undefined)).toBe('');
    expect(parseQuizRegion('TN')).toBe('TN');
    expect(parseQuizRegion('Utah')).toBeNull();
    expect(parseQuizRegion('')).toBeNull();
    expect(parseQuizRegion('ON')).toBe('ON');
    expect(parseQuizRegion('Other')).toBe('Other');
  });
});

describe('glamping-show-quiz result copy', () => {
  it('mentions bank-accepted appraisals when the need is an appraisal', () => {
    const copy = quizResultCopy('ready_now', 'appraisal');
    expect(copy.body).toMatch(/bank-accepted/i);
    expect(copy.footnote).toMatch(/48 hours/i);
    expect(copy.primaryCtaLabel).toBe('Schedule a meeting');
    expect(copy.qrHint).toBe('Scan with your phone');
    expect(copy.primaryCtaUrl).toContain('https://sageoutdooradvisory.com/contact-us/');
    expect(copy.primaryCtaUrl).toContain('utm_source=glamping_show');
    expect(copy.primaryCtaUrl).toContain('utm_medium=booth_quiz');
    expect(copy.primaryCtaUrl).toContain('utm_campaign=gsa_2026');
    expect(copy.primaryCtaUrl).toContain('utm_content=glamping_show_quiz');
  });

  it('does not mention appraisals when the need is a feasibility study', () => {
    const copy = quizResultCopy('ready_now', 'feasibility');
    expect(copy.body).toMatch(/feasibility/i);
    expect(copy.body).not.toMatch(/appraisal/i);
  });

  it('points getting-close leads at market data assets', () => {
    const copy = quizResultCopy('getting_close', 'market_data');
    expect(copy.body).toMatch(/Glamping Market Overview/);
    expect(copy.body).toMatch(/USA RV Market Report/);
    expect(copy.primaryCtaUrl).toContain('/glamping-market-overview');
    expect(copy.secondaryCtaLabel).toBe('USA RV Market Report');
    expect(copy.secondaryCtaUrl).toContain('sageoutdooradvisory.com/shop');
  });

  it('points just-exploring leads at the Glamping Market Overview', () => {
    const copy = quizResultCopy('just_exploring', 'exploring');
    expect(copy.primaryCtaLabel).toBe('Glamping Market Overview');
    expect(copy.primaryCtaUrl).toContain('/glamping-market-overview');
    expect(copy.primaryCtaUrl).toContain('utm_content=just_exploring');
    expect(copy.body).toMatch(/Glamping Market Overview/);
    expect(copy.body).not.toMatch(/map/i);
    expect(copy.body).not.toMatch(/podcast/i);
    expect(copy.secondaryCtaUrl).toBeUndefined();
  });

  it('idles questions and the contact form at 60s, and the result at 90s', () => {
    expect(quizIdleResetMs('welcome')).toBeNull();
    expect(quizIdleResetMs('role')).toBe(60_000);
    expect(quizIdleResetMs('stage')).toBe(60_000);
    expect(quizIdleResetMs('need')).toBe(60_000);
    expect(quizIdleResetMs('timeline')).toBe(60_000);
    expect(quizIdleResetMs('contact')).toBe(60_000);
    expect(quizIdleResetMs('result')).toBe(90_000);
    expect(formatQuizIdleCountdown(90_000)).toBe('1:30');
    expect(formatQuizIdleCountdown(1_000)).toBe('0:01');
    expect(formatQuizIdleCountdown(0)).toBe('0:00');
  });

  it('keeps the booth path off public listing constants', () => {
    expect(GLAMPING_SHOW_QUIZ_PATH).toBe('/glamping-show-quiz');
  });
});
