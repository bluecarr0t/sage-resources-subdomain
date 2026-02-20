/**
 * Convert exact rate to a rough range to avoid revealing precise scraped data
 */
export function getRoughRateRange(rate: string | number | null): string | null {
  if (rate === null || rate === undefined) return null;

  const numRate = typeof rate === 'number' ? rate : parseFloat(String(rate));
  if (isNaN(numRate)) return null;

  if (numRate < 50) return '$0-50';
  if (numRate < 100) return '$50-100';
  if (numRate < 150) return '$100-150';
  if (numRate < 200) return '$150-200';
  if (numRate < 300) return '$200-300';
  if (numRate < 500) return '$300-500';
  return '$500+';
}

/**
 * Get a single rough rate range that encompasses both min and max values
 * Never displays "$0" - always uses the actual minimum value from the data
 */
export function getRoughRateRangeFromMinMax(min: number | null, max: number | null): string | null {
  if (min === null || max === null) return null;

  const numMin = typeof min === 'number' ? min : parseFloat(String(min));
  const numMax = typeof max === 'number' ? max : parseFloat(String(max));

  if (isNaN(numMin) || isNaN(numMax)) return null;

  const actualMin = Math.max(1, numMin);

  const minRange = getRoughRateRange(actualMin);
  const maxRange = getRoughRateRange(numMax);

  if (minRange === maxRange) return minRange;

  if (actualMin < 50) {
    if (numMax < 50) return '< $50';
    let upperBound: number | string;
    if (numMax < 100) upperBound = 100;
    else if (numMax < 150) upperBound = 150;
    else if (numMax < 200) upperBound = 200;
    else if (numMax < 300) upperBound = 300;
    else if (numMax < 500) upperBound = 500;
    else upperBound = '500+';

    if (upperBound === '500+') return '< $500+';
    return `< $50 - $${upperBound}`;
  }

  let lowerBound: number;
  if (actualMin < 100) lowerBound = 50;
  else if (actualMin < 150) lowerBound = 100;
  else if (actualMin < 200) lowerBound = 150;
  else if (actualMin < 300) lowerBound = 200;
  else if (actualMin < 500) lowerBound = 300;
  else lowerBound = 500;

  let upperBound: number | string;
  if (numMax < 100) upperBound = 100;
  else if (numMax < 150) upperBound = 150;
  else if (numMax < 200) upperBound = 200;
  else if (numMax < 300) upperBound = 300;
  else if (numMax < 500) upperBound = 500;
  else upperBound = '500+';

  if (upperBound === '500+') {
    if (lowerBound === 500) return '$500+';
    return `$${lowerBound}+`;
  }

  if (lowerBound === upperBound) {
    return getRoughRateRange(numMax);
  }

  return `$${lowerBound}-${upperBound}`;
}
