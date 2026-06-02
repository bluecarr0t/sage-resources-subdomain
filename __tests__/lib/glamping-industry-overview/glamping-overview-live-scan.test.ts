describe('glampingOverviewLiveScanAllowed', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAllowLive = process.env.GLAMPING_OVERVIEW_ALLOW_LIVE_SCAN;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalAllowLive === undefined) {
      delete process.env.GLAMPING_OVERVIEW_ALLOW_LIVE_SCAN;
    } else {
      process.env.GLAMPING_OVERVIEW_ALLOW_LIVE_SCAN = originalAllowLive;
    }
    jest.resetModules();
  });

  async function loadAllowed(): Promise<boolean> {
    const mod = await import(
      '@/lib/glamping-industry-overview/glamping-industry-overview-page-data'
    );
    return mod.isGlampingOverviewLiveScanAllowed();
  }

  it('allows live scan when GLAMPING_OVERVIEW_ALLOW_LIVE_SCAN=1', async () => {
    process.env.GLAMPING_OVERVIEW_ALLOW_LIVE_SCAN = '1';
    process.env.NODE_ENV = 'production';
    await expect(loadAllowed()).resolves.toBe(true);
  });

  it('allows live scan in development without env flag', async () => {
    delete process.env.GLAMPING_OVERVIEW_ALLOW_LIVE_SCAN;
    process.env.NODE_ENV = 'development';
    await expect(loadAllowed()).resolves.toBe(true);
  });

  it('disallows live scan in production without env flag', async () => {
    delete process.env.GLAMPING_OVERVIEW_ALLOW_LIVE_SCAN;
    process.env.NODE_ENV = 'production';
    await expect(loadAllowed()).resolves.toBe(false);
  });
});
