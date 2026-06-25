import {
  getProjectPipelineAuthMode,
  isProjectPipelineConfigured,
} from '@/lib/project-pipeline/auth';

describe('project-pipeline auth', () => {
  it('prefers service account over oauth when both are set', () => {
    expect(
      getProjectPipelineAuthMode({
        GOOGLE_SERVICE_ACCOUNT_EMAIL: 'sa@test.iam.gserviceaccount.com',
        GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
        NEXT_PUBLIC_GOOGLE_SHEETS_OAUTH_CLIENT_ID: '123.apps.googleusercontent.com',
      })
    ).toBe('service_account');
  });

  it('uses oauth when only client id is set', () => {
    expect(
      getProjectPipelineAuthMode({
        NEXT_PUBLIC_GOOGLE_SHEETS_OAUTH_CLIENT_ID: '123.apps.googleusercontent.com',
      })
    ).toBe('oauth');
  });

  it('returns null when nothing is configured', () => {
    expect(getProjectPipelineAuthMode({})).toBeNull();
    expect(isProjectPipelineConfigured({})).toBe(false);
  });

  it('is configured with oauth client id only', () => {
    expect(
      isProjectPipelineConfigured({
        NEXT_PUBLIC_GOOGLE_SHEETS_OAUTH_CLIENT_ID: '123.apps.googleusercontent.com',
      })
    ).toBe(true);
  });
});
