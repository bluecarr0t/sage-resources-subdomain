import fs from 'fs';
import path from 'path';

describe('all-sage-unique-property-count', () => {
  it('counts unique published Property Name values', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'lib/all-sage-unique-property-count.ts'),
      'utf8'
    );
    expect(source).toContain("from '@/lib/published-property-pages'");
    expect(source).toContain(".eq('research_status', PUBLISHED_RESEARCH_STATUS)");
    expect(source).toContain("select('property_name')");
    expect(source).toContain('normalizePropertyName(name)');
    expect(source).toContain('uniqueNames.size');
  });
});
