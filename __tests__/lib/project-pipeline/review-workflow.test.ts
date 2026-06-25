import {
  applyProjectPipelineReviewAction,
  canResubmitProjectPipelineForReview,
  canRespondToProjectPipelineReview,
  canSubmitProjectPipelineForReview,
  canViewProjectPipelineReviewNotes,
  filterProjectPipelineJobReviewNotesForViewer,
} from '@/lib/project-pipeline/review-workflow';
import type { ProjectPipelineJob } from '@/lib/project-pipeline/types';

function sampleJob(overrides: Partial<ProjectPipelineJob> = {}): ProjectPipelineJob {
  return {
    jobNumber: 'JOB-1',
    client: 'Client',
    propertyLocation: 'Location',
    appraiserConsultant: 'Luke Marran',
    projMgr: '',
    contractStart: '',
    dueDate: '',
    dateCompleted: '',
    commercialOutdoor: 'Outdoor',
    propertyType: '',
    service: '',
    reviewStatus: '',
    sentToClient: 'No',
    authorSlackUsername: '',
    clientEmail: '',
    projectStatus: 'In Progress',
    sheetRowIndex: 2,
    ...overrides,
  };
}

describe('review-workflow permissions', () => {
  it('allows authors to submit when review status is empty', () => {
    expect(canSubmitProjectPipelineForReview(sampleJob(), 'Luke Marran')).toBe(true);
  });

  it('blocks submit when already in progress', () => {
    expect(
      canSubmitProjectPipelineForReview(
        sampleJob({ reviewStatus: 'In-Progress' }),
        'Luke Marran'
      )
    ).toBe(false);
  });

  it('allows admins to submit when review status is empty', () => {
    expect(
      canSubmitProjectPipelineForReview(
        sampleJob({ appraiserConsultant: '' }),
        'Admin User',
        { isAdmin: true }
      )
    ).toBe(true);
  });

  it('blocks admins from submitting when already in progress', () => {
    expect(
      canSubmitProjectPipelineForReview(
        sampleJob({ reviewStatus: 'In-Progress' }),
        'Admin User',
        { isAdmin: true }
      )
    ).toBe(false);
  });

  it('allows admins to resubmit when changes were requested', () => {
    expect(
      canResubmitProjectPipelineForReview(
        sampleJob({ reviewStatus: 'Changes Requested', appraiserConsultant: '' }),
        'Admin User',
        { isAdmin: true }
      )
    ).toBe(true);
  });

  it('allows resubmit only when changes were requested', () => {
    expect(
      canResubmitProjectPipelineForReview(
        sampleJob({ reviewStatus: 'Changes Requested' }),
        'Luke Marran'
      )
    ).toBe(true);
    expect(canResubmitProjectPipelineForReview(sampleJob(), 'Luke Marran')).toBe(false);
  });

  it('allows reviewers to respond when a submission is in review', () => {
    expect(
      canRespondToProjectPipelineReview(
        sampleJob({ reviewStatus: 'In-Progress' }),
        'Admin User',
        { isAdmin: true }
      )
    ).toBe(true);
    expect(
      canRespondToProjectPipelineReview(
        sampleJob({ reviewStatus: 'In-Progress' }),
        'Luke Marran'
      )
    ).toBe(false);
    expect(
      canRespondToProjectPipelineReview(
        sampleJob({ reviewStatus: 'Changes Requested' }),
        'Admin User',
        { isAdmin: true }
      )
    ).toBe(false);
  });

  it('hides review notes from non-author consultants', () => {
    const job = sampleJob({
      reviewNotes: [
        {
          id: '1',
          type: 'submit_for_review',
          note: 'Ready',
          createdAt: '2026-06-24T00:00:00.000Z',
          createdByEmail: 'author@sage.com',
          createdByDisplayName: 'Luke Marran',
        },
      ],
    });

    const filtered = filterProjectPipelineJobReviewNotesForViewer(job, {
      displayName: 'Other Consultant',
      isAdmin: false,
    });
    expect(filtered.reviewNotes).toEqual([]);
  });

  it('shows review notes to admins and authors', () => {
    const job = sampleJob({
      reviewNotes: [
        {
          id: '1',
          type: 'review_feedback',
          note: 'Looks good',
          reviewStatus: 'Approved - Ready for Client',
          createdAt: '2026-06-24T00:00:00.000Z',
          createdByEmail: 'admin@sage.com',
          createdByDisplayName: 'Admin',
        },
      ],
    });

    expect(
      canViewProjectPipelineReviewNotes(job, { displayName: 'Luke Marran', isAdmin: false })
    ).toBe(true);
    expect(
      filterProjectPipelineJobReviewNotesForViewer(job, {
        displayName: 'Luke Marran',
        isAdmin: false,
      }).reviewNotes
    ).toHaveLength(1);
    expect(
      filterProjectPipelineJobReviewNotesForViewer(job, {
        displayName: 'Someone Else',
        isAdmin: true,
      }).reviewNotes
    ).toHaveLength(1);
  });
});

describe('applyProjectPipelineReviewAction', () => {
  it('submits for review with note and status', () => {
    const updated = applyProjectPipelineReviewAction({
      job: sampleJob(),
      action: 'submit_for_review',
      note: 'Please review',
      actorEmail: 'luke@sage.com',
      actorDisplayName: 'Luke Marran',
      managedUser: { role: 'author' },
    });

    expect(updated.reviewStatus).toBe('In-Progress');
    expect(updated.projectStatus).toBe('In Review');
    expect(updated.reviewNotes).toHaveLength(1);
    expect(updated.reviewNotes?.[0]?.type).toBe('submit_for_review');
  });

  it('requires a note when requesting changes', () => {
    expect(() =>
      applyProjectPipelineReviewAction({
        job: sampleJob({ reviewStatus: 'In-Progress' }),
        action: 'review_feedback',
        note: '',
        reviewStatus: 'Changes Requested',
        actorEmail: 'admin@sage.com',
        actorDisplayName: 'Admin',
        managedUser: { role: 'admin' },
      })
    ).toThrow('A note is required when requesting changes');
  });

  it('records approved feedback without a note using the status label', () => {
    const updated = applyProjectPipelineReviewAction({
      job: sampleJob({ reviewStatus: 'In-Progress' }),
      action: 'review_feedback',
      note: '',
      reviewStatus: 'Approved - No Changes, Send to Client',
      actorEmail: 'admin@sage.com',
      actorDisplayName: 'Admin',
      managedUser: { role: 'admin' },
    });

    expect(updated.reviewStatus).toBe('Approved - No Changes, Send to Client');
    expect(updated.reviewNotes).toHaveLength(1);
    expect(updated.reviewNotes?.[0]?.note).toBe('Approved - No Changes, Send to Client');
  });

  it('keeps project status In Review when changes are requested', () => {
    const updated = applyProjectPipelineReviewAction({
      job: sampleJob({ reviewStatus: 'In-Progress' }),
      action: 'review_feedback',
      note: 'Please revise scope.',
      reviewStatus: 'Changes Requested',
      actorEmail: 'admin@sage.com',
      actorDisplayName: 'Admin',
      managedUser: { role: 'admin' },
    });

    expect(updated.reviewStatus).toBe('Changes Requested');
    expect(updated.projectStatus).toBe('In Review');
  });

  it('allows admins to submit for review', () => {
    const updated = applyProjectPipelineReviewAction({
      job: sampleJob({ appraiserConsultant: '' }),
      action: 'submit_for_review',
      note: 'Please review',
      actorEmail: 'admin@sage.com',
      actorDisplayName: 'Admin',
      managedUser: { role: 'admin' },
    });

    expect(updated.reviewStatus).toBe('In-Progress');
    expect(updated.reviewNotes).toHaveLength(1);
  });
});
