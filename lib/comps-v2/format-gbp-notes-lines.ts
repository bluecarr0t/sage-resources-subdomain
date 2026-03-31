/**
 * Turns a single-line-ish Google Business / Maps note from the model into multiple lines
 * for admin display (use with `whitespace-pre-line` on the wrapper).
 *
 * Breaks before common field starters that typically follow ". " in GBP summaries.
 */
const GBP_LINE_BREAK_BEFORE = new RegExp(
  '\\.\\s+(?=(?:' +
    [
      'Listed\\s(?:name|on)\\b',
      'Primary\\s+type\\b',
      'Source:',
      'Google\\s+Business\\s+Profile\\b',
      'Google\\s+Places\\b',
      'Google\\s+rating\\b',
      'Address:',
      'Phone(?:\\s+on\\s+GBP)?:',
      'Website:',
      'Google\\s+Maps',
      'Maps\\/Knowledge',
      'Knowledge\\s+Panel',
      'No\\s+hours\\b',
    ].join('|') +
    '))',
  'gi'
);

export function formatGbpNotesWithLineBreaks(text: string): string {
  const t = text.trim();
  if (!t) return text;
  return text.replace(GBP_LINE_BREAK_BEFORE, '.\n');
}
