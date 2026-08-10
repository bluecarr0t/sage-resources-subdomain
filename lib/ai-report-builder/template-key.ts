/** Map market_type to template key in storage (rv/template.docx, glamping/template.docx) */
export function getTemplateKeyForMarketType(marketType?: string | null): string {
  if (!marketType) return 'rv';
  const t = marketType.toLowerCase();
  if (t === 'glamping') return 'glamping';
  if (t === 'rv' || t === 'rv_glamping') return 'rv';
  return 'rv';
}
