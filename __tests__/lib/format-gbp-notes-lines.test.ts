import { formatGbpNotesWithLineBreaks } from '@/lib/comps-v2/format-gbp-notes-lines';

describe('formatGbpNotesWithLineBreaks', () => {
  it('breaks Live Oak–style GBP sentences onto separate lines', () => {
    const input =
      'Listed name: Live Oak Lake. Primary type: Resort hotel. Google rating: 4.8 stars (519 reviews). Address: 1445 Spring Lake Rd, Waco, TX 76705, USA. Phone: (254) 522-9843. Website: http://liveoaklake.com/. Google Maps/Knowledge Panel URL: https://maps.google.com/?cid=1. No hours or price level data present in the GBP block.';
    const out = formatGbpNotesWithLineBreaks(input);
    expect(out.split('\n').map((l) => l.trim())).toEqual([
      'Listed name: Live Oak Lake.',
      'Primary type: Resort hotel.',
      'Google rating: 4.8 stars (519 reviews).',
      'Address: 1445 Spring Lake Rd, Waco, TX 76705, USA.',
      'Phone: (254) 522-9843.',
      'Website: http://liveoaklake.com/.',
      'Google Maps/Knowledge Panel URL: https://maps.google.com/?cid=1.',
      'No hours or price level data present in the GBP block.',
    ]);
  });

  it('leaves short text unchanged when no field boundaries match', () => {
    expect(formatGbpNotesWithLineBreaks('No GBP data in context.')).toBe('No GBP data in context.');
  });
});
