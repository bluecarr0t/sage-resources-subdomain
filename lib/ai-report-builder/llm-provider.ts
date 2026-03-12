/**
 * LLM provider abstraction for report generation
 * Supports OpenAI (default) and Anthropic Claude via LLM_PROVIDER env var
 */

import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export type LLMProvider = 'openai' | 'anthropic';

export interface ChatCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json_object';
}

export async function chatCompletion(
  systemMessage: string,
  userMessage: string,
  options: ChatCompletionOptions = {}
): Promise<string> {
  const provider = (process.env.LLM_PROVIDER ?? 'openai').toLowerCase() as LLMProvider;

  if (provider === 'anthropic') {
    return chatCompletionAnthropic(systemMessage, userMessage, options);
  }

  return chatCompletionOpenAI(systemMessage, userMessage, options);
}

async function chatCompletionOpenAI(
  systemMessage: string,
  userMessage: string,
  options: ChatCompletionOptions
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error('OPENAI_API_KEY is required');

  const openai = new OpenAI({ apiKey });

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage },
    ],
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens ?? 1200,
    ...(options.responseFormat === 'json_object' && { response_format: { type: 'json_object' } }),
  });

  const content = res.choices[0]?.message?.content?.trim();
  if (!content) throw new Error('OpenAI returned empty response');
  return content;
}

async function chatCompletionAnthropic(
  systemMessage: string,
  userMessage: string,
  options: ChatCompletionOptions
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic');

  const anthropic = new Anthropic({ apiKey });

  const res = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: options.maxTokens ?? 1200,
    system: systemMessage,
    messages: [{ role: 'user', content: userMessage }],
  });

  const block = res.content.find((b) => b.type === 'text');
  const content = block && 'text' in block ? block.text.trim() : '';
  if (!content) throw new Error('Anthropic returned empty response');
  return content;
}
