/**
 * Earthy pipeline stage palette — sage-teal proposed, terracotta under construction, deep forest open.
 * Aligns with tailwind `sage` scale (#f6f7f6 … #2c362c) and `sage.teal`.
 */

export const PIPELINE_PROPOSED_COLORS = {
  accent: '#6ba89e',
  fill: '#c5ddd8',
  fillHover: '#8fb8b2',
  fillSelected: '#4a7a72',
  badgeBg: '#e8f2f0',
  badgeText: '#3d6b63',
  accentClass: 'bg-[#6ba89e]',
  fillClass: 'bg-[#c5ddd8]',
  badgeClass: 'bg-[#e8f2f0] text-[#3d6b63]',
  mapCardActiveClass: 'bg-[#eef6f4]/70',
  mapButtonActiveClass: 'border-[#4a7a72] bg-[#4a7a72] text-white',
  mapFill: '#8fb8b2',
  mapFillHover: '#6ba89e',
  mapFillSelected: '#4a7a72',
  mapFillMin: '#e8f2f0',
} as const;

export const PIPELINE_UNDER_CONSTRUCTION_COLORS = {
  accent: '#c9986a',
  fill: '#e8cdb0',
  fillHover: '#d9b08c',
  fillSelected: '#9a6f42',
  badgeBg: '#f3e8dc',
  badgeText: '#6b4f2e',
  accentClass: 'bg-[#c9986a]',
  fillClass: 'bg-[#e8cdb0]',
  badgeClass: 'bg-[#f3e8dc] text-[#6b4f2e]',
  mapCardActiveClass: 'bg-[#f8f0e8]/70',
  mapButtonActiveClass: 'border-[#9a6f42] bg-[#9a6f42] text-white',
  mapFill: '#d9b08c',
  mapFillHover: '#c9986a',
  mapFillSelected: '#9a6f42',
  mapFillMin: '#f3e8dc',
} as const;

export const PIPELINE_OPEN_COLORS = {
  accent: '#5c7a5c',
  fill: '#a3b5a3',
  fillHover: '#7a927a',
  fillSelected: '#3d503d',
  badgeBg: '#e3e7e3',
  badgeText: '#2c362c',
  accentClass: 'bg-[#5c7a5c]',
  fillClass: 'bg-[#a3b5a3]',
  badgeClass: 'bg-[#e3e7e3] text-[#2c362c]',
  mapCardActiveClass: 'bg-sage-50/70',
  mapButtonActiveClass: 'border-[#3d503d] bg-[#3d503d] text-white',
} as const;

/** Map highlight when a state has both proposed and under-construction activity. */
export const PIPELINE_BOTH_STAGES_COLORS = {
  fill: '#b8c4b8',
  fillHover: '#9aa89e',
  fillSelected: '#6f7a62',
  mapFill: '#b8c4b8',
  mapFillHover: '#9aa89e',
  mapFillSelected: '#6f7a62',
  mapFillMin: '#eef2f0',
} as const;
