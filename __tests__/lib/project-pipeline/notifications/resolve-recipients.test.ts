import { resolvePipelineJobConsultantRecipients } from '@/lib/project-pipeline/notifications/resolve-recipients';
import type { ManagedUserWorkloadAuthorRow } from '@/lib/project-pipeline/workload-authors';

const managedUsers: ManagedUserWorkloadAuthorRow[] = [
  {
    email: 'marran@sageoutdooradvisory.com',
    display_name: 'Luke Marran',
    first_name: 'Luke',
    last_name: 'Marran',
    division: 'Outdoor',
  },
  {
    email: 'lars@sageoutdooradvisory.com',
    display_name: 'Lars Somebody',
    first_name: 'Lars',
    last_name: 'Somebody',
    division: 'Outdoor',
  },
  {
    email: 'cipriano@sagecommercialadvisory.com',
    display_name: 'Nick Cipriano',
    first_name: 'Nick',
    last_name: 'Cipriano',
    division: 'Commercial',
  },
  {
    email: 'cipriano@sageoutdooradvisory.com',
    display_name: 'Nick Cipriano',
    first_name: 'Nick',
    last_name: 'Cipriano',
    division: 'Outdoor',
  },
];

describe('resolvePipelineJobConsultantRecipients', () => {
  it('resolves consultant emails even when the author is hidden from workload views', () => {
    const recipients = resolvePipelineJobConsultantRecipients({
      appraiserConsultant: 'Nick Harsell',
      managedUsers: [
        {
          email: 'harsell@sageoutdooradvisory.com',
          display_name: 'Nick Harsell',
          first_name: 'Nick',
          last_name: 'Harsell',
          division: 'outdoor',
        },
      ],
    });

    expect(recipients).toEqual(['harsell@sageoutdooradvisory.com']);
  });

  it('maps a consultant name to a managed user email', () => {
    expect(
      resolvePipelineJobConsultantRecipients({
        appraiserConsultant: 'Luke Marran',
        managedUsers,
      })
    ).toEqual(['marran@sageoutdooradvisory.com']);
  });

  it('resolves both consultants on shared appraiser cells', () => {
    const recipients = resolvePipelineJobConsultantRecipients({
      appraiserConsultant: 'Lars / Luke',
      managedUsers,
    });

    expect(recipients).toEqual(
      expect.arrayContaining(['lars@sageoutdooradvisory.com', 'marran@sageoutdooradvisory.com'])
    );
    expect(recipients).toHaveLength(2);
  });

  it('prefers outdoor email when the same person exists on both domains', () => {
    expect(
      resolvePipelineJobConsultantRecipients({
        appraiserConsultant: 'Nick Cipriano',
        managedUsers,
      })
    ).toEqual(['cipriano@sageoutdooradvisory.com']);
  });

  it('skips the actor who made the change', () => {
    expect(
      resolvePipelineJobConsultantRecipients({
        appraiserConsultant: 'Luke Marran',
        managedUsers,
        actorEmail: 'marran@sageoutdooradvisory.com',
      })
    ).toEqual([]);
  });

  it('returns empty when no managed user matches', () => {
    expect(
      resolvePipelineJobConsultantRecipients({
        appraiserConsultant: 'Unknown Person',
        managedUsers,
      })
    ).toEqual([]);
  });
});
