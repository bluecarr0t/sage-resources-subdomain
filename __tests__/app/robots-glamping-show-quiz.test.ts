import robots from '@/app/robots';
import { GLAMPING_SHOW_QUIZ_PATH } from '@/lib/glamping-show-quiz';

describe('robots.txt', () => {
  it('disallows the unlisted Glamping Show quiz on every user-agent rule', () => {
    const manifest = robots();
    const rules = Array.isArray(manifest.rules) ? manifest.rules : [manifest.rules];
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) {
      const disallow = rule.disallow;
      const paths = Array.isArray(disallow) ? disallow : [disallow];
      expect(paths).toContain(GLAMPING_SHOW_QUIZ_PATH);
    }
  });
});
