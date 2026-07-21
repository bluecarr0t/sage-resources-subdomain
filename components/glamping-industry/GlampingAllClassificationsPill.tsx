/**
 * Scope chip used when a section stays on all service tiers while the page
 * classification filter is set (e.g. Amenity Impact nationally, or any chart
 * under a US region selection).
 */
export function GlampingAllClassificationsPill() {
  return (
    <span className="inline-flex items-center rounded-sm bg-sage-700 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-yellow-300">
      All classifications
    </span>
  );
}
