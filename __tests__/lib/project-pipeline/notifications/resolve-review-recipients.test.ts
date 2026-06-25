import {
  resolvePipelineDueDateChangeRecipients,
  resolvePipelineReviewStatusChangeRecipients,
} from '@/lib/project-pipeline/notifications/resolve-review-recipients';

const managedUsers = [
  {
    email: 'heilala@sageoutdooradvisory.com',
    display_name: 'Shari Heilala',
    first_name: 'Shari',
    last_name: 'Heilala',
    division: 'outdoor',
  },
  {
    email: 'marran@sageoutdooradvisory.com',
    display_name: 'Luke Marran',
    first_name: 'Luke',
    last_name: 'Marran',
    division: 'outdoor',
  },
];

describe('resolvePipelineReviewStatusChangeRecipients', () => {
  it('notifies the project manager when a job is submitted for review', () => {
    const recipients = resolvePipelineReviewStatusChangeRecipients({
      appraiserConsultant: 'Luke Marran',
      projMgr: 'Shari',
      previousStatus: '',
      newStatus: 'In-Progress',
      managedUsers,
      actorEmail: 'marran@sageoutdooradvisory.com',
    });

    expect(recipients).toEqual(['heilala@sageoutdooradvisory.com']);
  });

  it('still notifies the project manager when they are also the submitter', () => {
    const recipients = resolvePipelineReviewStatusChangeRecipients({
      appraiserConsultant: 'Nick Harsell',
      projMgr: 'Nick Harsell',
      previousStatus: '',
      newStatus: 'In-Progress',
      managedUsers: [
        {
          email: 'harsell@sageoutdooradvisory.com',
          display_name: 'Nick Harsell',
          first_name: 'Nick',
          last_name: 'Harsell',
          division: 'outdoor',
        },
      ],
      actorEmail: 'harsell@sageoutdooradvisory.com',
    });

    expect(recipients).toEqual(['harsell@sageoutdooradvisory.com']);
  });

  it('does not route Nick Harsell projects to Nick Cipriano', () => {
    const recipients = resolvePipelineReviewStatusChangeRecipients({
      appraiserConsultant: 'Nick Harsell',
      projMgr: 'Nick Harsell',
      previousStatus: '',
      newStatus: 'In-Progress',
      managedUsers: [
        {
          email: 'harsell@sageoutdooradvisory.com',
          display_name: 'Nick Harsell',
          first_name: 'Nick',
          last_name: 'Harsell',
          division: 'outdoor',
        },
        {
          email: 'cipriano@sageoutdooradvisory.com',
          display_name: 'Nick Cipriano',
          first_name: 'Nick',
          last_name: 'Cipriano',
          division: 'outdoor',
        },
      ],
      actorEmail: 'harsell@sageoutdooradvisory.com',
    });

    expect(recipients).toEqual(['harsell@sageoutdooradvisory.com']);
  });

  it('notifies the author when changes are requested', () => {
    const recipients = resolvePipelineReviewStatusChangeRecipients({
      appraiserConsultant: 'Luke Marran',
      projMgr: 'Shari',
      previousStatus: 'In-Progress',
      newStatus: 'Changes Requested',
      managedUsers,
      actorEmail: 'heilala@sageoutdooradvisory.com',
    });

    expect(recipients).toEqual(['marran@sageoutdooradvisory.com']);
  });

  it('notifies the author and project manager for other review status changes', () => {
    const recipients = resolvePipelineReviewStatusChangeRecipients({
      appraiserConsultant: 'Luke Marran',
      projMgr: 'Shari',
      previousStatus: 'In-Progress',
      newStatus: 'Complete',
      managedUsers,
    });

    expect(recipients).toEqual(
      expect.arrayContaining([
        'marran@sageoutdooradvisory.com',
        'heilala@sageoutdooradvisory.com',
      ])
    );
    expect(recipients).toHaveLength(2);
  });

  it('still notifies the consultant when they are also the reviewer approving the job', () => {
    const recipients = resolvePipelineReviewStatusChangeRecipients({
      appraiserConsultant: 'Nick Harsell',
      projMgr: 'Nick Harsell',
      previousStatus: 'In-Progress',
      newStatus: 'Approved - No Changes, Send to Client',
      managedUsers: [
        {
          email: 'harsell@sageoutdooradvisory.com',
          display_name: 'Nick Harsell',
          first_name: 'Nick',
          last_name: 'Harsell',
          division: 'outdoor',
        },
      ],
      actorEmail: 'harsell@sageoutdooradvisory.com',
    });

    expect(recipients).toEqual(['harsell@sageoutdooradvisory.com']);
  });

  it('still notifies the consultant when they are also the reviewer requesting changes', () => {
    const recipients = resolvePipelineReviewStatusChangeRecipients({
      appraiserConsultant: 'Nick Harsell',
      projMgr: 'Nick Harsell',
      previousStatus: 'In-Progress',
      newStatus: 'Changes Requested',
      managedUsers: [
        {
          email: 'harsell@sageoutdooradvisory.com',
          display_name: 'Nick Harsell',
          first_name: 'Nick',
          last_name: 'Harsell',
          division: 'outdoor',
        },
      ],
      actorEmail: 'harsell@sageoutdooradvisory.com',
    });

    expect(recipients).toEqual(['harsell@sageoutdooradvisory.com']);
  });
});

describe('resolvePipelineDueDateChangeRecipients', () => {
  it('notifies the author and project manager', () => {
    const recipients = resolvePipelineDueDateChangeRecipients({
      appraiserConsultant: 'Luke Marran',
      projMgr: 'Shari',
      managedUsers,
    });

    expect(recipients).toEqual(
      expect.arrayContaining([
        'marran@sageoutdooradvisory.com',
        'heilala@sageoutdooradvisory.com',
      ])
    );
    expect(recipients).toHaveLength(2);
  });

  it('dedupes when the author and project manager are the same person', () => {
    const recipients = resolvePipelineDueDateChangeRecipients({
      appraiserConsultant: 'Shari Heilala',
      projMgr: 'Shari',
      managedUsers,
    });

    expect(recipients).toEqual(['heilala@sageoutdooradvisory.com']);
  });
});
