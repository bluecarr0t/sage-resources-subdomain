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
  formatQuizPhoneInput,
  quizIdleResetMs,
  quizNeedOptionsForRole,
  quizPhoneRequired,
  quizRoleContactType,
  quizResultCopy,
  quizMarketOverviewBoothUrl,
  quizSendsMarketOverview,
  quizSkipsNeedAndTimeline,
  quizSkipsStage,
  quizStageOptionsForRole,
  quizStagePrompt,
  quizVisibleQuestionCount,
  quizVisibleQuestionNumber,
  resolveQuizOutcome,
  impliedQuizStage,
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

  it('routes existing operators who need a study this quarter to ready now without a land/plans answer', () => {
    expect(
      resolveQuizOutcome({
        role: 'existing_operator',
        stage: 'operating',
        need: 'appraisal',
        timeline: '30_days',
      })
    ).toBe('ready_now');
  });

  it('skips the stage question for existing operators but not investors', () => {
    expect(quizSkipsStage('existing_operator')).toBe(true);
    expect(quizSkipsStage('investor_lender')).toBe(false);
    expect(quizSkipsStage('developer_operator')).toBe(false);
    expect(impliedQuizStage('existing_operator')).toBe('operating');
    expect(impliedQuizStage('investor_lender')).toBeNull();
    expect(quizVisibleQuestionCount('existing_operator')).toBe(3);
    expect(quizVisibleQuestionCount('investor_lender')).toBe(4);
    expect(quizVisibleQuestionNumber('need', 'existing_operator')).toBe(2);
    expect(quizVisibleQuestionNumber('stage', 'investor_lender')).toBe(2);
    expect(quizVisibleQuestionNumber('timeline', 'investor_lender')).toBe(4);
    expect(quizVisibleQuestionNumber('need', 'developer_operator')).toBe(3);
  });

  it('routes investors who need a study this quarter to ready now on an operating deal', () => {
    expect(
      resolveQuizOutcome({
        role: 'investor_lender',
        stage: 'operating',
        need: 'appraisal',
        timeline: '30_days',
      })
    ).toBe('ready_now');
  });

  it('does not score screening investors as ready now even with a study this quarter', () => {
    expect(
      resolveQuizOutcome({
        role: 'investor_lender',
        stage: 'idea',
        need: 'feasibility',
        timeline: '30_days',
      })
    ).toBe('just_exploring');
    expect(
      resolveQuizOutcome({
        role: 'investor_lender',
        stage: 'has_land',
        need: 'feasibility',
        timeline: '30_days',
      })
    ).toBe('ready_now');
  });

  it('sends vendor/media to the contact form instead of project-stage questions', () => {
    expect(quizSkipsStage('vendor_media')).toBe(true);
    expect(quizSkipsNeedAndTimeline('vendor_media')).toBe(true);
    expect(quizSkipsNeedAndTimeline('existing_operator')).toBe(false);
    expect(quizVisibleQuestionCount('vendor_media', 'role')).toBe(4);
    expect(quizVisibleQuestionCount('vendor_media', 'contact')).toBe(1);
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

describe('glamping-show-quiz role-branched questions', () => {
  it('customizes the stage prompt and options for landowners and developers', () => {
    expect(quizStagePrompt('landowner')).toBe('Where are you with the land?');
    expect(quizStageOptionsForRole('landowner').map((option) => option.value)).toEqual([
      'idea',
      'has_land',
      'has_plans',
    ]);
    expect(quizStagePrompt('developer_operator')).toBe(
      'How far along is the project?'
    );
    expect(
      quizStageOptionsForRole('developer_operator').map((option) => option.value)
    ).toEqual(['idea', 'has_land', 'has_plans', 'operating']);
  });

  it('asks investors a deal-stage question with the same scoring slugs', () => {
    expect(quizStagePrompt('investor_lender')).toBe('What kind of deal is this?');
    expect(
      quizStageOptionsForRole('investor_lender').map((option) => option.value)
    ).toEqual(['idea', 'has_land', 'has_plans', 'operating']);
    expect(quizStageOptionsForRole('investor_lender')[3]?.label).toBe(
      'Operating asset'
    );
  });

  it('customizes need copy for existing operators', () => {
    expect(quizNeedOptionsForRole('existing_operator')[0]?.label).toBe(
      'Feasibility for expansion or a new site'
    );
    expect(quizNeedOptionsForRole('existing_operator')[1]?.label).toBe(
      'Appraisal, refinance, or sale'
    );
    expect(quizNeedOptionsForRole('landowner')[0]?.label).toBe('Feasibility study');
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

  it('does not tag implied idea/exploring answers on vendor/media contacts', () => {
    expect(
      ghlTagsForQuizAnswers(
        {
          role: 'vendor_media',
          stage: 'idea',
          need: 'exploring',
          timeline: 'no_timeline',
        },
        'just_exploring'
      )
    ).toEqual([
      GHL_GLAMPING_SHOW_QUIZ_TAG,
      'Quiz - Vendor/Media',
      GHL_QUIZ_JUST_EXPLORING_TAG,
    ]);
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

  it('formats US phone digits as (541) 632-2366 and ignores letters', () => {
    expect(formatQuizPhoneInput('')).toBe('');
    expect(formatQuizPhoneInput('5')).toBe('(5');
    expect(formatQuizPhoneInput('541')).toBe('(541)');
    expect(formatQuizPhoneInput('5416')).toBe('(541) 6');
    expect(formatQuizPhoneInput('5416322366')).toBe('(541) 632-2366');
    expect(formatQuizPhoneInput('541-632-2366abc')).toBe('(541) 632-2366');
    expect(formatQuizPhoneInput('(541) 632-2366 extra')).toBe('(541) 632-2366');
  });

  it('requires a phone number for every outcome', () => {
    expect(quizPhoneRequired()).toBe(true);
    expect(parseQuizPhone('')).toBeNull();
    expect(parseQuizPhone('312-555-0199')).toBe('312-555-0199');
  });

  it('requires a company or project name and a known region code', () => {
    expect(parseQuizCompany('Sage Outdoor')).toBe('Sage Outdoor');
    expect(parseQuizCompany('  ')).toBeNull();
    expect(parseQuizCompany(undefined)).toBeNull();
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
    expect(copy.visitorLabel).toBe('Schedule a meeting');
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
    expect(copy.visitorLabel).toBe('Glamping market data');
    expect(copy.body).toMatch(/Glamping Market Overview/);
    expect(copy.body).toMatch(/your email/);
    expect(copy.body).toMatch(/USA RV Market Report/);
    expect(copy.qrHint).toBe('Scan to open on your phone');
    expect(copy.primaryCtaUrl).toContain('/glamping-market-overview');
    expect(copy.secondaryCtaLabel).toBe('USA RV Market Report');
    expect(copy.secondaryCtaUrl).toContain('sageoutdooradvisory.com/shop');
  });

  it('points just-exploring leads at the Glamping Market Overview', () => {
    const copy = quizResultCopy('just_exploring', 'exploring');
    expect(copy.visitorLabel).toBe('Glamping market data');
    expect(copy.primaryCtaLabel).toBe('Glamping Market Overview');
    expect(copy.primaryCtaUrl).toContain('/glamping-market-overview');
    expect(copy.primaryCtaUrl).toContain('utm_content=just_exploring');
    expect(copy.body).toMatch(/Glamping Market Overview/);
    expect(copy.body).toMatch(/your email/);
    expect(copy.body).toMatch(/Scan to open it on your phone/);
    expect(copy.body).not.toMatch(/map/i);
    expect(copy.body).not.toMatch(/podcast/i);
    expect(copy.qrHint).toBe('Scan to open on your phone');
    expect(copy.secondaryCtaUrl).toBeUndefined();
  });

  it('mints a booth QR URL for market-data outcomes only', () => {
    expect(quizSendsMarketOverview('getting_close')).toBe(true);
    expect(quizSendsMarketOverview('just_exploring')).toBe(true);
    expect(quizSendsMarketOverview('ready_now')).toBe(false);
    const url = quizMarketOverviewBoothUrl('token-1', 'just_exploring');
    expect(url).toContain('/api/glamping-show-quiz/open-market-overview');
    expect(url).toContain('booth=token-1');
    expect(url).toContain('utm_content=just_exploring');
    expect(url).toContain('utm_source=glamping_show');
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
