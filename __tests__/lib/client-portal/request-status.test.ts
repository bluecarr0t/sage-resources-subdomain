import {
  canClientSubmitPortalRequest,
  canStaffClearPortalRequest,
  clientPortalRequestStatusAfterClientSubmit,
  clientPortalRequestStatusAfterStaffClear,
} from '@/lib/client-portal/request-status';

describe('client portal request state machine', () => {
  it('lets a client submit only open items', () => {
    expect(canClientSubmitPortalRequest('open')).toBe(true);
    expect(canClientSubmitPortalRequest('submitted')).toBe(false);
    expect(canClientSubmitPortalRequest('cleared')).toBe(false);
    expect(clientPortalRequestStatusAfterClientSubmit('open')).toBe('submitted');
    expect(clientPortalRequestStatusAfterClientSubmit('cleared')).toBeNull();
  });

  it('lets staff clear open or submitted items', () => {
    expect(canStaffClearPortalRequest('open')).toBe(true);
    expect(canStaffClearPortalRequest('submitted')).toBe(true);
    expect(canStaffClearPortalRequest('cleared')).toBe(false);
    expect(clientPortalRequestStatusAfterStaffClear('submitted')).toBe('cleared');
    expect(clientPortalRequestStatusAfterStaffClear('cleared')).toBeNull();
  });
});
