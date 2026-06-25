import { projectPipelineRequiresOAuthConnect } from '@/lib/project-pipeline/oauth-gate';

describe('projectPipelineRequiresOAuthConnect', () => {
  it('requires oauth when mirror is empty in oauth mode without an explicit sheets connect', () => {
    expect(
      projectPipelineRequiresOAuthConnect({
        authMode: 'oauth',
        mirroredCount: 0,
        allowOAuthSheets: false,
      })
    ).toBe(true);
  });

  it('does not require oauth when mirrored rows exist', () => {
    expect(
      projectPipelineRequiresOAuthConnect({
        authMode: 'oauth',
        mirroredCount: 3,
        allowOAuthSheets: false,
      })
    ).toBe(false);
  });

  it('does not require oauth when the client explicitly allows oauth sheets', () => {
    expect(
      projectPipelineRequiresOAuthConnect({
        authMode: 'oauth',
        mirroredCount: 0,
        allowOAuthSheets: true,
      })
    ).toBe(false);
  });

  it('does not require oauth in service-account mode', () => {
    expect(
      projectPipelineRequiresOAuthConnect({
        authMode: 'service_account',
        mirroredCount: 0,
        allowOAuthSheets: false,
      })
    ).toBe(false);
  });
});
