import {
  getClientPortalTrackerStepIndex,
  isClientPortalBlocked,
  isClientPortalExceptionStage,
  mapProjectStatusToClientPortalStage,
} from '@/lib/client-portal/stages';

describe('client portal stages', () => {
  it('maps pipeline statuses to client-facing stages', () => {
    expect(mapProjectStatusToClientPortalStage('Not Started')).toBe('Intake');
    expect(mapProjectStatusToClientPortalStage('In-Progress')).toBe('In progress');
    expect(mapProjectStatusToClientPortalStage('On Hold')).toBe('On hold');
    expect(mapProjectStatusToClientPortalStage('In Review')).toBe('Quality review');
    expect(mapProjectStatusToClientPortalStage('Completed')).toBe('Delivered');
    expect(mapProjectStatusToClientPortalStage('Cancelled')).toBe('Cancelled');
  });

  it('treats on hold and cancelled as exception stages', () => {
    expect(isClientPortalExceptionStage('On hold')).toBe(true);
    expect(isClientPortalExceptionStage('Cancelled')).toBe(true);
    expect(isClientPortalExceptionStage('Intake')).toBe(false);
  });

  it('indexes tracker steps and overlays a blocked state', () => {
    expect(getClientPortalTrackerStepIndex('Intake')).toBe(0);
    expect(getClientPortalTrackerStepIndex('Quality review')).toBe(2);
    expect(getClientPortalTrackerStepIndex('Cancelled')).toBe(-1);
    expect(isClientPortalBlocked(0)).toBe(false);
    expect(isClientPortalBlocked(2)).toBe(true);
  });
});
