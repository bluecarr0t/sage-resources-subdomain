import {
  deriveProjectPipelineProjectStatus,
  resolveProjectPipelineProjectStatus,
} from '@/lib/project-pipeline/derive-project-status';

const baseJob = {
  appraiserConsultant: '',
  reviewStatus: 'Not Started',
  sentToClient: 'No',
  dateCompleted: '',
  commercialOutdoor: 'Outdoor',
};

describe('deriveProjectPipelineProjectStatus', () => {
  it('defaults to Not Started', () => {
    expect(deriveProjectPipelineProjectStatus(baseJob)).toBe('Not Started');
  });

  it('moves to In-Progress when a consultant is assigned', () => {
    expect(
      deriveProjectPipelineProjectStatus({
        ...baseJob,
        appraiserConsultant: 'Greg',
      })
    ).toBe('In-Progress');
    expect(
      deriveProjectPipelineProjectStatus({
        ...baseJob,
        appraiserConsultant: 'Wendy / Shari',
      })
    ).toBe('In-Progress');
  });

  it('moves to In Review when review status is In-Progress', () => {
    expect(
      deriveProjectPipelineProjectStatus({
        ...baseJob,
        appraiserConsultant: 'Greg',
        reviewStatus: 'In-Progress',
      })
    ).toBe('In Review');
  });

  it('stays In Review when changes are requested during review', () => {
    expect(
      deriveProjectPipelineProjectStatus({
        ...baseJob,
        appraiserConsultant: 'Greg',
        reviewStatus: 'Changes Requested',
      })
    ).toBe('In Review');
  });

  it('moves to Completed when sent to client is Yes', () => {
    expect(
      deriveProjectPipelineProjectStatus({
        ...baseJob,
        appraiserConsultant: 'Greg',
        reviewStatus: 'In-Progress',
        sentToClient: 'Yes',
      })
    ).toBe('Completed');
    expect(
      deriveProjectPipelineProjectStatus({
        ...baseJob,
        appraiserConsultant: 'Greg',
        reviewStatus: 'In-Progress',
        sentToClient: 'Yes — Sent at 03/02/26 08:57AM',
      })
    ).toBe('Completed');
  });

  it('moves to Completed when Date Completed is set on the sheet', () => {
    expect(
      deriveProjectPipelineProjectStatus({
        ...baseJob,
        commercialOutdoor: 'Outdoor',
        appraiserConsultant: 'Luke',
        reviewStatus: 'Approved - No Changes, Send to Client',
        sentToClient: 'No',
        dateCompleted: '4/5/26',
      })
    ).toBe('Completed');
  });

  it('moves commercial jobs to Completed when Date Completed is set', () => {
    expect(
      deriveProjectPipelineProjectStatus({
        ...baseJob,
        commercialOutdoor: 'Commercial',
        appraiserConsultant: 'Nick',
        reviewStatus: 'Approved - No Changes, Send to Client',
        sentToClient: 'No',
        dateCompleted: '4/5/26',
      })
    ).toBe('Completed');
  });
});

describe('resolveProjectPipelineProjectStatus', () => {
  it('preserves a stored Cancelled status unless completed', () => {
    expect(
      resolveProjectPipelineProjectStatus(
        { ...baseJob, appraiserConsultant: 'Greg' },
        'Cancelled'
      )
    ).toBe('Cancelled');
    expect(
      resolveProjectPipelineProjectStatus(
        { ...baseJob, appraiserConsultant: 'Greg', dateCompleted: '4/5/26' },
        'Cancelled'
      )
    ).toBe('Completed');
  });

  it('preserves a stored On Hold status unless completed', () => {
    expect(
      resolveProjectPipelineProjectStatus(
        { ...baseJob, appraiserConsultant: 'Greg' },
        'On Hold'
      )
    ).toBe('On Hold');
    expect(
      resolveProjectPipelineProjectStatus(
        { ...baseJob, appraiserConsultant: 'Greg', dateCompleted: '4/5/26' },
        'On Hold'
      )
    ).toBe('Completed');
  });

  it('preserves a manual status when the sheet shows completion', () => {
    expect(
      resolveProjectPipelineProjectStatus(
        { ...baseJob, appraiserConsultant: 'Luke', sentToClient: 'Yes' },
        'In-Progress',
        { manual: true }
      )
    ).toBe('In-Progress');
    expect(
      resolveProjectPipelineProjectStatus(
        { ...baseJob, appraiserConsultant: 'Luke', dateCompleted: '4/5/26' },
        'In-Progress',
        { manual: true }
      )
    ).toBe('In-Progress');
    expect(
      resolveProjectPipelineProjectStatus(
        { ...baseJob, appraiserConsultant: 'Greg', sentToClient: 'Yes' },
        'Cancelled',
        { manual: true }
      )
    ).toBe('Cancelled');
  });

  it('preserves a manual status when the sheet does not show completion', () => {
    expect(
      resolveProjectPipelineProjectStatus(
        { ...baseJob, appraiserConsultant: 'Greg' },
        'Cancelled',
        { manual: true }
      )
    ).toBe('Cancelled');
  });
});
