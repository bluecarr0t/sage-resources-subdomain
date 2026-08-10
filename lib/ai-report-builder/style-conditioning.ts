/**
 * Helpers to wrap section user prompts with style exemplars + FACTS framing.
 */

import type { EnrichedInput } from './types';
import type { StyleCorpusSection } from './style-corpus-types';
import { retrieveStyleExemplars } from './style-corpus-retrieve';
import { SAGE_STYLE_SYSTEM_PROMPT, buildSageJsonSystemPrompt } from './sage-style-system-prompt';

export { SAGE_STYLE_SYSTEM_PROMPT, buildSageJsonSystemPrompt };

export async function wrapWithStyleConditioning(params: {
  enriched: EnrichedInput;
  section: StyleCorpusSection;
  taskInstructions: string;
  factsBlock: string;
}): Promise<{ system: string; user: string }> {
  const exemplars = await retrieveStyleExemplars(params.enriched, params.section);
  const user = [
    `SECTION: ${params.section}`,
    `MARKET: ${params.enriched.market_type ?? 'outdoor_hospitality'}`,
    exemplars ? `\n${exemplars}\n` : '',
    params.taskInstructions.trim(),
    '\nFACTS (use only these numbers; never invent):\n',
    params.factsBlock.trim(),
    '\nWrite the section. Use only FACTS for every number. Match STYLE_EXAMPLES tone/structure when present.',
  ]
    .filter(Boolean)
    .join('\n');

  return { system: SAGE_STYLE_SYSTEM_PROMPT, user };
}
