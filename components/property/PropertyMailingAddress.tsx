import {
  splitPropertyMailingAddress,
  type PropertyMailingAddressLines,
} from '@/lib/format-property-mailing-line';

type PropertyMailingAddressProps = {
  lines: PropertyMailingAddressLines;
  className?: string;
};

export default function PropertyMailingAddress({
  lines,
  className = 'mt-3 max-w-xs text-[11px] font-light leading-relaxed text-neutral-500',
}: PropertyMailingAddressProps) {
  const { streetLine, cityStateZipLine } = lines;
  if (!streetLine && !cityStateZipLine) return null;

  return (
    <div className={className}>
      {streetLine ? <p>{streetLine}</p> : null}
      {cityStateZipLine ? <p className={streetLine ? 'mt-0.5' : undefined}>{cityStateZipLine}</p> : null}
    </div>
  );
}
