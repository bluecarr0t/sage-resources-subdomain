import {
  buildSlackDeliveryEmailMap,
  resolveSlackDeliveryEmail,
  resolveSlackDeliveryEmailForAccount,
  resolveSlackDeliveryEmailsForAccounts,
} from '@/lib/managed-users/slack-email';

describe('resolveSlackDeliveryEmail', () => {
  it('prefers slack_email over login email', () => {
    expect(
      resolveSlackDeliveryEmail({
        email: 'harsell@sageoutdooradvisory.com',
        slack_email: 'nick@sageoutdooradvisory.com',
      })
    ).toBe('nick@sageoutdooradvisory.com');
  });

  it('falls back to login email when slack_email is unset', () => {
    expect(
      resolveSlackDeliveryEmail({
        email: 'heilala@sageoutdooradvisory.com',
        slack_email: null,
      })
    ).toBe('heilala@sageoutdooradvisory.com');
  });
});

describe('resolveSlackDeliveryEmailsForAccounts', () => {
  const rows = [
    {
      email: 'harsell@sageoutdooradvisory.com',
      slack_email: 'nick.harsell@personal.com',
    },
    {
      email: 'heilala@sageoutdooradvisory.com',
      slack_email: null,
    },
  ];

  it('maps account emails to delivery emails', () => {
    expect(
      resolveSlackDeliveryEmailsForAccounts(
        ['harsell@sageoutdooradvisory.com', 'heilala@sageoutdooradvisory.com'],
        rows
      )
    ).toEqual(['nick.harsell@personal.com', 'heilala@sageoutdooradvisory.com']);
  });

  it('dedupes when two accounts resolve to the same slack email', () => {
    const map = buildSlackDeliveryEmailMap([
      { email: 'a@example.com', slack_email: 'shared@example.com' },
      { email: 'b@example.com', slack_email: 'shared@example.com' },
    ]);

    expect(map.get('a@example.com')).toBe('shared@example.com');
    expect(
      resolveSlackDeliveryEmailsForAccounts(['a@example.com', 'b@example.com'], [
        { email: 'a@example.com', slack_email: 'shared@example.com' },
        { email: 'b@example.com', slack_email: 'shared@example.com' },
      ])
    ).toEqual(['shared@example.com']);
  });

  it('resolves by account email through the map helper', () => {
    const map = buildSlackDeliveryEmailMap(rows);
    expect(resolveSlackDeliveryEmailForAccount('harsell@sageoutdooradvisory.com', rows)).toBe(
      map.get('harsell@sageoutdooradvisory.com')
    );
  });
});
