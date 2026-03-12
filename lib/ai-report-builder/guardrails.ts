/**
 * Lightweight validation layer for generated executive summary
 * Optional when ENABLE_GUARDRAILS=true
 * Validates required fields, basic PII filter, no hallucinated URLs
 */

import type { ExecutiveSummaryStructured } from './types';

const PII_EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PII_PHONE = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
const URL_PATTERN = /https?:\/\/[^\s]+/g;

export interface GuardrailsResult {
  passed: boolean;
  errors: string[];
}

export function validateExecutiveSummary(
  parsed: ExecutiveSummaryStructured
): GuardrailsResult {
  const errors: string[] = [];

  if (!parsed || typeof parsed !== 'object') {
    return { passed: false, errors: ['Invalid response: not an object'] };
  }

  const required = ['project_overview', 'demand_indicators', 'pro_forma_reference', 'feasibility_conclusion'];
  const obj = parsed as unknown as Record<string, unknown>;
  for (const key of required) {
    const val = obj[key];
    if (typeof val !== 'string' || val.trim().length < 10) {
      errors.push(`Missing or invalid required field: ${key}`);
    }
  }

  if (!Array.isArray(parsed.citations)) {
    errors.push('citations must be an array');
  }

  const allText = [
    parsed.project_overview,
    parsed.demand_indicators,
    parsed.pro_forma_reference,
    parsed.feasibility_conclusion,
  ]
    .filter(Boolean)
    .join(' ');

  if (allText.match(PII_EMAIL)) {
    errors.push('PII detected: email address in output');
  }
  if (allText.match(PII_PHONE)) {
    errors.push('PII detected: phone number in output');
  }

  if (process.env.ENABLE_GUARDRAILS === 'true') {
    const urls = allText.match(URL_PATTERN);
    if (urls?.length) {
      errors.push('URLs in output (potential hallucination)');
    }
  }

  return {
    passed: errors.length === 0,
    errors,
  };
}
