/**
 * Sage AI — UX / conversation tools: browser-side Python generation,
 * follow-up suggestions, and clickable clarifying questions. Extracted from
 * tools.ts — behavior-preserving.
 */

import { tool } from 'ai';
import { z } from 'zod';

/** Unit Type Search workflow excludes Glamping Tent(s) from clarifying_question pills. */
function filterExcludedUnitTypeClarifyingOptions(
  question: string,
  options: string[]
): string[] {
  if (!/unit\s*type/i.test(question)) return options;
  return options.filter((o) => !/^glamping\s*tents?$/i.test(o.trim()));
}

export type CreateUxToolsOptions = {
  /** When false, `generate_python_code` is omitted (canvas tools handle viz). Default true. */
  pythonEnabled?: boolean;
};

export function createUxTools(opts?: CreateUxToolsOptions) {
  const pythonEnabled = opts?.pythonEnabled !== false;

  const suggestFollowups = tool({
    description: `Emit a small, structured list of follow-up questions the user might ask next. Call this AT MOST ONCE per assistant turn, after you've given the primary answer. Keep questions short, actionable, and grounded in the conversation so far.`,
    inputSchema: z.object({
      suggestions: z
        .array(
          z
            .string()
            .min(10)
            .max(140)
            .describe(
              'A short, self-contained follow-up question phrased as the user would type it.'
            )
        )
        .min(1)
        .max(5)
        .describe('1–5 follow-up prompts ordered from most to least useful.'),
    }),
    execute: async ({ suggestions }) => {
      const normalized = Array.from(
        new Set(
          suggestions
            .map((s) => s.trim().replace(/\s+/g, ' '))
            .filter((s) => s.length >= 10 && s.length <= 140)
        )
      ).slice(0, 5);
      return {
        type: 'followup_suggestions' as const,
        suggestions: normalized,
      };
    },
  });

  const clarifyingQuestion = tool({
    description: `Ask the user a clarifying question with 2–6 clickable answer options. Use this WHENEVER you need the user to confirm a choice, pick a scope, narrow ambiguous input, or answer a yes/no — INSTEAD of asking the question in prose. The UI renders the options as buttons; clicking one sends that exact text back as the user's next message. Only fall back to a prose question when the answer is genuinely free-form (e.g. "What's your budget?"). Call AT MOST ONCE per assistant turn and only when the question is the immediate next step in the conversation.`,
    inputSchema: z.object({
      question: z
        .string()
        .min(3)
        .max(500)
        .describe(
          'The question to ask the user. Phrase it naturally — this text is rendered verbatim above the buttons.'
        ),
      options: z
        .array(
          z
            .string()
            .min(1)
            .max(120)
            .describe(
              'A single answer option, phrased the way the user would say it (e.g. "Whole Texas, statewide" not "yes_statewide"). Sent verbatim as the next user message when clicked.'
            )
        )
        .min(2)
        .max(6)
        .describe('2–6 mutually distinct answer options, ordered from most to least likely.'),
    }),
    execute: async ({ question, options }) => {
      const trimmedQuestion = question.trim();
      const normalizedOptions = filterExcludedUnitTypeClarifyingOptions(
        trimmedQuestion,
        Array.from(
          new Set(
            options
              .map((o) => o.trim().replace(/\s+/g, ' '))
              .filter((o) => o.length >= 1 && o.length <= 120)
          )
        ).slice(0, 6)
      );
      return {
        type: 'clarifying_question' as const,
        question: trimmedQuestion,
        options: normalizedOptions,
      };
    },
  });

  const conversationTools = {
    suggest_followups: suggestFollowups,
    clarifying_question: clarifyingQuestion,
  };

  if (!pythonEnabled) {
    return conversationTools;
  }

  return {
    generate_python_code: tool({
      description: `Generate Python code for data analysis or visualization. The code is executed in the USER'S BROWSER using Pyodide (Python compiled to WebAssembly). Nothing runs server-side.

ALLOWED IMPORTS (everything else will be REJECTED before execution):
  - Pre-installed scientific stack: numpy (np), pandas (pd), matplotlib / matplotlib.pyplot (plt)
  - Stdlib helpers: io, base64, sys, json, math, statistics, datetime, re, collections, itertools, functools, typing, random, string, decimal, fractions

NOT AVAILABLE (do not import or attempt to use):
  - Network: urllib, requests, httpx, socket
  - Filesystem / OS: os, pathlib, subprocess, shutil
  - Plotting alternatives: seaborn, plotly, bokeh, altair (use matplotlib instead)
  - SciPy / scikit-learn / statsmodels — not preloaded

IMPORTANT RULES:
- If you need data from a previous query, use the special variable 'data' which will contain the query results as a list of dictionaries.
- When analyzing all_sage_data rows: quantity_of_units is the exact unit count per record — sum it for total units or unit-weighted metrics; do not substitute row count unless the user asked for row/listing counts.
- For **retail ADR / rate averages and medians**, do not re-invent the pipeline in Python: \`aggregate_properties\` and \`count_unique_properties\` already return **IQR-robust, unit-weighted** effective ADR. For **headline chain / brand** peak vs simple seasonal averages, use \`chain_retail_rate_kpis\` (explicit peak + avg of filled cells, no calendar-year blend). If you must average rates in \`data\` yourself, weight by \`quantity_of_units\` and say your number is an unaudited recompute (and prefer calling the tools instead).
- For charts, use matplotlib and call plt.show() at the end.
- Use print() for any text output you want to display.
- Execution time is bounded (~30s wall-clock); WASM cannot be hard-killed mid-computation, so avoid infinite loops or O(n^4)-style work over large arrays.
- Treat the runtime as offline and ephemeral — no network, no filesystem, no shell.

Example for creating a chart from query data:
\`\`\`python
import pandas as pd
import matplotlib.pyplot as plt

df = pd.DataFrame(data)
df.groupby('state').size().plot(kind='bar')
plt.title('Properties by State')
plt.xlabel('State')
plt.ylabel('Count')
plt.tight_layout()
plt.show()
\`\`\``,
      inputSchema: z.object({
        code: z.string().describe('The Python code to execute'),
        description: z.string().describe('Brief description of what this code does'),
        uses_query_data: z
          .boolean()
          .optional()
          .describe('Set to true if this code needs data from a previous query tool result'),
      }),
      execute: async ({ code, description, uses_query_data }) => {
        return {
          type: 'python_code',
          code,
          description,
          uses_query_data: uses_query_data ?? false,
          message:
            'Python code generated. Click "Run" to execute it in your browser.',
        };
      },
    }),
    ...conversationTools,
  };
}
