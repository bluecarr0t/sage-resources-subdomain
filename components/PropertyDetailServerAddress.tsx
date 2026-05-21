import PropertyMailingAddress from '@/components/property/PropertyMailingAddress';
import { splitPropertyMailingAddress } from '@/lib/format-property-mailing-line';
import type { SageProperty } from '@/lib/types/sage';

type PropertyDetailServerAddressProps = {
  property: Pick<SageProperty, 'address' | 'city' | 'state' | 'zip_code'>;
};

/** Crawler-visible mailing address below the location map in the Visit column. */
export default function PropertyDetailServerAddress({ property }: PropertyDetailServerAddressProps) {
  const lines = splitPropertyMailingAddress(property);
  return <PropertyMailingAddress lines={lines} />;
}
