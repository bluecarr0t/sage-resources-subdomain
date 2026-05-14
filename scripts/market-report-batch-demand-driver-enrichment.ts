#!/usr/bin/env npx tsx
/**
 * Batch-oriented demand-driver enrichment — queues work for Tavily/OpenAI research
 * scripts instead of running web research on every market-report request.
 *
 * Usage:
 *   npx tsx scripts/market-report-batch-demand-driver-enrichment.ts --list
 *   npx tsx scripts/market-report-batch-demand-driver-enrichment.ts --job pacific-northwest-ski
 *   npx tsx scripts/market-report-batch-demand-driver-enrichment.ts --job pacific-northwest-wineries
 *
 * Prerequisites: OPENAI_API_KEY, TAVILY_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Jobs shell out to existing pipelines with conservative limits; review output before re-running.
 */

const JOBS = {
  'pacific-northwest-ski': {
    description: 'Discover/enrich ski resorts in OR + WA (tier 2 regional favorites, capped).',
    command: [
      'npx',
      'tsx',
      'scripts/research-ski-resorts-openai.ts',
      '--country',
      'USA',
      '--tier',
      '2',
      '--states',
      'OR,WA',
      '--limit',
      '25',
    ],
  },
  'pacific-northwest-wineries': {
    description: 'Discover/enrich wineries in OR + WA (tier 2, capped).',
    command: [
      'npx',
      'tsx',
      'scripts/research-wineries-openai.ts',
      '--country',
      'USA',
      '--tier',
      '2',
      '--states',
      'OR,WA',
      '--limit',
      '40',
    ],
  },
} as const;

type JobId = keyof typeof JOBS;

function printJobs() {
  console.log('Available --job values:\n');
  for (const [id, def] of Object.entries(JOBS)) {
    console.log(`  ${id}`);
    console.log(`    ${def.description}`);
    console.log(`    → ${def.command.join(' ')}\n`);
  }
  console.log('Also see scripts/audit-demand-driver-or-wa-near-bend.sql for coverage checks.');
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--list') || argv.length === 0) {
    printJobs();
    return;
  }
  const j = argv.indexOf('--job');
  if (j < 0 || !argv[j + 1]) {
    console.error('Missing --job <id>. Use --list.');
    process.exit(1);
  }
  const jobId = argv[j + 1] as JobId;
  const job = JOBS[jobId];
  if (!job) {
    console.error(`Unknown job "${jobId}". Use --list.`);
    process.exit(1);
  }
  const { spawn } = await import('node:child_process');
  console.log(`Running: ${job.command.join(' ')}\n`);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(job.command[0], job.command.slice(1), {
      stdio: 'inherit',
      cwd: process.cwd(),
      shell: false,
    });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`exit ${code}`))));
  });
  console.log('\n✅ Job finished.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
