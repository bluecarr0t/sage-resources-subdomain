/** Single-line mailing address for property pages (avoids duplicating city when already in `address`). */
export function formatPropertyMailingLine(property: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
}): string | null {
  const address = property.address?.trim();
  const tail = [property.city, property.state, property.zip_code].filter(Boolean).join(', ');

  if (!address) return tail || null;
  if (!tail) return address;

  const city = property.city?.trim();
  if (city && address.toLowerCase().includes(city.toLowerCase())) {
    const rest = [property.state, property.zip_code].filter(Boolean).join(', ');
    return rest ? `${address}, ${rest}` : address;
  }

  return `${address}, ${tail}`;
}

export type PropertyMailingAddressLines = {
  streetLine: string | null;
  cityStateZipLine: string | null;
};

/** Street on line 1; city, state, and zip on line 2 (Visit column below map). */
export function splitPropertyMailingAddress(property: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
}): PropertyMailingAddressLines {
  const address = property.address?.trim() || null;
  const cityStateZipLine =
    [property.city, property.state, property.zip_code].filter(Boolean).join(', ') || null;
  const city = property.city?.trim();

  if (!address) {
    return { streetLine: null, cityStateZipLine };
  }

  if (!city) {
    return { streetLine: address, cityStateZipLine };
  }

  const addressLower = address.toLowerCase();
  const cityLower = city.toLowerCase();
  const cityIndex = addressLower.lastIndexOf(cityLower);

  if (cityIndex > 0) {
    const streetLine = address.slice(0, cityIndex).replace(/,\s*$/, '').trim();
    if (streetLine) {
      return { streetLine, cityStateZipLine };
    }
  }

  return { streetLine: address, cityStateZipLine };
}
