import {
  formatProjectPipelineSheetsAccessError,
  isGoogleSheetsPermissionError,
} from '@/lib/project-pipeline/google-sheets-errors';

describe('google-sheets-errors', () => {
  it('detects permission errors', () => {
    expect(isGoogleSheetsPermissionError(new Error('The caller does not have permission'))).toBe(
      true
    );
    expect(isGoogleSheetsPermissionError(new Error('Quota exceeded'))).toBe(false);
  });

  it('formats a share-sheet message with the service account email', () => {
    const message = formatProjectPipelineSheetsAccessError(
      new Error('The caller does not have permission'),
      {
        GOOGLE_SERVICE_ACCOUNT_EMAIL: 'pipeline@test.iam.gserviceaccount.com',
        GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY:
          '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n',
      }
    );

    expect(message).toContain('pipeline@test.iam.gserviceaccount.com');
    expect(message).toContain('Share');
  });
});
