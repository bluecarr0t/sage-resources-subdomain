import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';
import { buildSiteBuilderImagesDocx } from '@/lib/site-builder/build-site-builder-images-docx';

/** 1×1 transparent PNG */
const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('buildSiteBuilderImagesDocx', () => {
  it('produces a docx zip with document.xml and embedded jpeg', async () => {
    const buf = await buildSiteBuilderImagesDocx({
      templateKey: 'rv',
      images: [
        { configName: 'Unit A', imageBase64: TINY_PNG_B64, mediaType: 'image/png' },
        { configName: 'Unit B', imageBase64: TINY_PNG_B64, mediaType: 'image/png' },
      ],
    });
    expect(buf.length).toBeGreaterThan(10_000);
    const zip = new PizZip(buf);
    const doc = zip.file('word/document.xml')?.asText();
    expect(doc).toBeDefined();
    expect(doc).toContain('Site Builder');
    expect(doc).toContain('w:tbl');
    expect(doc).toContain('Unit A');
    expect(doc).toContain('Unit B');
    const media = Object.keys(zip.files).filter((k) => k.startsWith('word/media/siteBuilderImage'));
    expect(media.length).toBeGreaterThanOrEqual(2);
  });

  it('uses glamping template when requested', async () => {
    const glampingPath = path.join(process.cwd(), 'templates', 'glamping', 'template.docx');
    if (!fs.existsSync(glampingPath)) {
      return;
    }
    const buf = await buildSiteBuilderImagesDocx({
      templateKey: 'glamping',
      images: [{ configName: 'Yurt', imageBase64: TINY_PNG_B64, mediaType: 'image/png' }],
    });
    expect(buf.length).toBeGreaterThan(10_000);
  });
});
