import {
  canClientAccessPortalJob,
  getClientPortalEligibilityReasons,
  isClientPortalJobEligible,
  isClientPortalService,
} from '@/lib/client-portal/eligibility';

const eligible = {
  commercialOutdoor: 'Outdoor',
  service: 'Feasibility Study',
  contractStart: '1/15/26',
  clientEmail: 'client@example.com',
};

describe('client portal eligibility', () => {
  it('accepts Outdoor feasibility studies and appraisals with contract and email', () => {
    expect(isClientPortalJobEligible(eligible)).toBe(true);
    expect(
      isClientPortalJobEligible({ ...eligible, service: 'Appraisal' })
    ).toBe(true);
  });

  it('rejects commercial jobs and unsupported services', () => {
    expect(
      getClientPortalEligibilityReasons({
        ...eligible,
        commercialOutdoor: 'Commercial',
      })
    ).toContain('not_outdoor');
    expect(isClientPortalService('Market Analysis')).toBe(false);
    expect(
      getClientPortalEligibilityReasons({
        ...eligible,
        service: 'Revenue Projection',
      })
    ).toContain('unsupported_service');
  });

  it('requires a signed contract and a valid client email', () => {
    expect(
      getClientPortalEligibilityReasons({ ...eligible, contractStart: '' })
    ).toContain('missing_contract');
    expect(
      getClientPortalEligibilityReasons({ ...eligible, clientEmail: 'not-an-email' })
    ).toContain('invalid_email');
  });
});

describe('canClientAccessPortalJob', () => {
  const engagement = { enabled: true, invitedEmail: 'client@example.com' };

  it('allows staff even without an invite', () => {
    expect(
      canClientAccessPortalJob({
        isStaff: true,
        eligible: false,
        sessionEmail: 'nick@sageoutdooradvisory.com',
        engagement: null,
      })
    ).toBe(true);
  });

  it('allows the invited client on an enabled eligible job', () => {
    expect(
      canClientAccessPortalJob({
        isStaff: false,
        eligible: true,
        sessionEmail: 'CLIENT@example.com',
        engagement,
      })
    ).toBe(true);
  });

  it('rejects the wrong email and disabled engagements', () => {
    expect(
      canClientAccessPortalJob({
        isStaff: false,
        eligible: true,
        sessionEmail: 'other@example.com',
        engagement,
      })
    ).toBe(false);
    expect(
      canClientAccessPortalJob({
        isStaff: false,
        eligible: true,
        sessionEmail: 'client@example.com',
        engagement: { enabled: false, invitedEmail: 'client@example.com' },
      })
    ).toBe(false);
  });
});
