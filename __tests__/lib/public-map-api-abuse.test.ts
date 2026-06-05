import {
  getAbuseBanThreshold,
  isAutoBanEnabled,
  recordPublicMapApiAbuse,
} from '@/lib/public-map-api-abuse';
import {
  addToSet,
  incrementCounterWithTtl,
} from '@/lib/redis';

jest.mock('@/lib/redis', () => ({
  incrementCounterWithTtl: jest.fn(),
  addToSet: jest.fn(),
  getSetMembers: jest.fn(),
  removeFromSet: jest.fn(),
  setIfNotExists: jest.fn(),
}));

const incrementMock = incrementCounterWithTtl as jest.MockedFunction<
  typeof incrementCounterWithTtl
>;
const addToSetMock = addToSet as jest.MockedFunction<typeof addToSet>;

const ORIGINAL_ENV = process.env;

describe('public-map-api-abuse', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.PUBLIC_MAP_API_ABUSE_BAN_THRESHOLD;
    delete process.env.PUBLIC_MAP_API_AUTO_BAN_ENABLED;
    incrementMock.mockReset();
    addToSetMock.mockReset();
    addToSetMock.mockResolvedValue(true);
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('defaults threshold to 10 and reads override', () => {
    expect(getAbuseBanThreshold()).toBe(10);
    process.env.PUBLIC_MAP_API_ABUSE_BAN_THRESHOLD = '3';
    expect(getAbuseBanThreshold()).toBe(3);
  });

  it('auto-ban is off unless explicitly enabled', () => {
    expect(isAutoBanEnabled()).toBe(false);
    process.env.PUBLIC_MAP_API_AUTO_BAN_ENABLED = 'true';
    expect(isAutoBanEnabled()).toBe(true);
  });

  it('ignores unknown / empty IPs', async () => {
    expect(await recordPublicMapApiAbuse('unknown')).toBeNull();
    expect(await recordPublicMapApiAbuse('')).toBeNull();
    expect(incrementMock).not.toHaveBeenCalled();
  });

  it('increments offense count without queuing below threshold', async () => {
    process.env.PUBLIC_MAP_API_ABUSE_BAN_THRESHOLD = '5';
    incrementMock.mockResolvedValue(2);

    const count = await recordPublicMapApiAbuse('9.9.9.9');
    expect(count).toBe(2);
    expect(incrementMock).toHaveBeenCalledWith(
      'public_map_api:abuse:offenses:9.9.9.9',
      3600
    );
    expect(addToSetMock).not.toHaveBeenCalled();
  });

  it('queues an IP as a candidate once the threshold is reached', async () => {
    process.env.PUBLIC_MAP_API_ABUSE_BAN_THRESHOLD = '5';
    incrementMock.mockResolvedValue(5);

    const count = await recordPublicMapApiAbuse('9.9.9.9');
    expect(count).toBe(5);
    expect(addToSetMock).toHaveBeenCalledWith(
      'public_map_api:abuse:candidates',
      '9.9.9.9'
    );
  });

  it('returns null when Redis is unavailable', async () => {
    incrementMock.mockResolvedValue(null);
    expect(await recordPublicMapApiAbuse('9.9.9.9')).toBeNull();
    expect(addToSetMock).not.toHaveBeenCalled();
  });
});
