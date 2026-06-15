export type PipelineQuarterlyUnitMixLine = {
  unitType: string;
  units: number;
  avgRetailDailyRate: number | null;
};

type UnitMixAccumulator = {
  units: number;
  avgRetailDailyRate: number | null;
};

export function pipelineUnitMixLabel(unitType: string | null | undefined): string {
  const trimmed = unitType?.trim();
  return trimmed || 'Unspecified';
}

export function createPipelineUnitMixMap(): Map<string, UnitMixAccumulator> {
  return new Map();
}

export function accumulatePipelineUnitMixLine(
  mixByType: Map<string, UnitMixAccumulator>,
  unitType: string | null | undefined,
  units: number,
  avgRetailDailyRate: number | null
): void {
  if (units <= 0) return;

  const key = pipelineUnitMixLabel(unitType);
  const existing = mixByType.get(key) ?? { units: 0, avgRetailDailyRate: null };
  existing.units += units;
  if (existing.avgRetailDailyRate == null && avgRetailDailyRate != null) {
    existing.avgRetailDailyRate = avgRetailDailyRate;
  }
  mixByType.set(key, existing);
}

export function finalizePipelineUnitMix(
  mixByType: Map<string, UnitMixAccumulator>
): PipelineQuarterlyUnitMixLine[] {
  return [...mixByType.entries()]
    .map(([unitType, value]) => ({
      unitType,
      units: value.units,
      avgRetailDailyRate: value.avgRetailDailyRate,
    }))
    .sort((left, right) => left.unitType.localeCompare(right.unitType, 'en', { sensitivity: 'base' }));
}

export function primaryPipelineUnitMixLine(
  unitMix: readonly PipelineQuarterlyUnitMixLine[]
): PipelineQuarterlyUnitMixLine | null {
  if (!unitMix.length) return null;
  return unitMix.reduce((top, line) => (line.units > top.units ? line : top));
}
