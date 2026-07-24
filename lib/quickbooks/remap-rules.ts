import {
  QBO_APPRAISAL_DESCRIPTION_MATCH,
  QBO_APPRAISAL_DESCRIPTION_TARGET_ITEM_NAME,
  QBO_SOURCE_ITEM_NAME,
  QBO_TARGET_ITEM_NAME,
} from '@/lib/quickbooks/constants';

export type RemapRuleId = 'appraisal_description' | 'appraisal_review_item';

export type RemapRuleMatch =
  | { kind: 'exact_item_or_description'; value: string }
  | { kind: 'description_contains'; value: string };

export type RemapRuleDefinition = {
  id: RemapRuleId;
  label: string;
  match: RemapRuleMatch;
  targetItemName: string;
  /**
   * When remapping an exact-item rule, replace Description with the target name
   * if Description is empty or equals the source value.
   */
  replaceDescriptionWhenExact?: boolean;
};

/**
 * Ordered remap rules (first match wins per line).
 * 1) Description contains "Appraisal" → Appraisal Services - Outdoor Resort
 * 2) Item/Description is exactly "Appraisal Review" → Feasibility Study - Outdoor Resort
 */
export const QBO_REMAP_RULES: RemapRuleDefinition[] = [
  {
    id: 'appraisal_description',
    label: `Description contains "${QBO_APPRAISAL_DESCRIPTION_MATCH}"`,
    match: {
      kind: 'description_contains',
      value: QBO_APPRAISAL_DESCRIPTION_MATCH,
    },
    targetItemName: QBO_APPRAISAL_DESCRIPTION_TARGET_ITEM_NAME,
  },
  {
    id: 'appraisal_review_item',
    label: `Product/Service is "${QBO_SOURCE_ITEM_NAME}"`,
    match: {
      kind: 'exact_item_or_description',
      value: QBO_SOURCE_ITEM_NAME,
    },
    targetItemName: QBO_TARGET_ITEM_NAME,
    replaceDescriptionWhenExact: true,
  },
];

export function uniqueRemapTargetItemNames(
  rules: RemapRuleDefinition[] = QBO_REMAP_RULES
): string[] {
  return [...new Set(rules.map((rule) => rule.targetItemName))];
}
