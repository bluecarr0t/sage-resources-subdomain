import { existsSync } from 'fs';
import path from 'path';

const repoRoot = path.join(__dirname, '../..');

describe('llms.txt single source of truth', () => {
  it('does not ship a static public/llms.txt that can diverge from the route', () => {
    expect(existsSync(path.join(repoRoot, 'public/llms.txt'))).toBe(false);
  });

  it('serves llms.txt from the dynamic App Router generator only', () => {
    expect(existsSync(path.join(repoRoot, 'app/llms.txt/route.ts'))).toBe(true);
  });
});
