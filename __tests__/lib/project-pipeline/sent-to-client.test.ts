import {
  getSentToClientSelectClassName,
  isProjectPipelineSentToClientYes,
  normalizeProjectPipelineSentToClient,
} from '@/lib/project-pipeline/sent-to-client';

describe('normalizeProjectPipelineSentToClient', () => {
  it('normalizes exact yes and no values', () => {
    expect(normalizeProjectPipelineSentToClient('yes')).toBe('Yes');
    expect(normalizeProjectPipelineSentToClient('NO')).toBe('No');
    expect(normalizeProjectPipelineSentToClient('')).toBe('No');
  });

  it('normalizes sheet timestamps that start with Yes', () => {
    expect(
      normalizeProjectPipelineSentToClient('Yes — Sent at 03/02/26 08:57AM')
    ).toBe('Yes');
    expect(isProjectPipelineSentToClientYes('Yes — Sent at 03/02/26 08:57AM')).toBe(
      true
    );
  });
});

describe('getSentToClientSelectClassName', () => {
  it('returns green text styles for Yes', () => {
    expect(getSentToClientSelectClassName('Yes')).toContain('text-green');
    expect(getSentToClientSelectClassName('Yes')).not.toContain('/20');
    expect(getSentToClientSelectClassName('Yes')).toContain('bg-white');
  });

  it('returns red text styles for No', () => {
    expect(getSentToClientSelectClassName('No')).toContain('text-red');
    expect(getSentToClientSelectClassName('No')).not.toContain('/20');
  });

  it('returns green styles for timestamped Yes values from the sheet', () => {
    expect(getSentToClientSelectClassName('Yes — Sent at 03/02/26 08:57AM')).toContain(
      'green'
    );
  });
});
