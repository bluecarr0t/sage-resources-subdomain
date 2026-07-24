const OUTDOOR_PROPERTY_TYPE_RE =
  /glamping|rv\s*(park|resort)|campground|outdoor|marina|cabin|yurt|treehouse/i;

export type PipelineOutdoorFields = {
  commercial_outdoor?: string | null;
  property_type?: string | null;
};

/** True when a project-pipeline job is outdoor-hospitality relevant. */
export function isOutdoorPipelineRow(row: PipelineOutdoorFields): boolean {
  const commercial = (row.commercial_outdoor ?? '').trim().toLowerCase();
  if (commercial === 'outdoor') return true;
  return OUTDOOR_PROPERTY_TYPE_RE.test(row.property_type ?? '');
}

/** Test alias — same as isOutdoorPipelineRow. */
export const isOutdoorPipelineRowForTest = isOutdoorPipelineRow;
