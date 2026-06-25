import { fetchProjectPipelineJobs } from '@/lib/project-pipeline/fetch-jobs';

const tabs = ['2025 Jobs', '2024 Jobs', '2021', '2026 Jobs', '2023 Vanessa Only', '2022', '2020'];

async function main() {
  for (const sheetName of tabs) {
    try {
      const { jobs } = await fetchProjectPipelineJobs({ sheetName, bypassCache: true });
      const counts = new Map<string, number[]>();
      for (const job of jobs) {
        const n = job.jobNumber.trim();
        if (!n) continue;
        const rows = counts.get(n) ?? [];
        rows.push(job.sheetRowIndex);
        counts.set(n, rows);
      }
      const dups = [...counts.entries()].filter(([, rows]) => rows.length > 1);
      console.log(`\n${sheetName}: ${dups.length} duplicate job numbers`);
      for (const [jobNumber, rows] of dups.slice(0, 20)) {
        console.log(`  ${jobNumber} at rows ${rows.join(', ')}`);
      }
      if (dups.length > 20) console.log(`  ... and ${dups.length - 20} more`);
    } catch (e) {
      console.log(`${sheetName}: fetch failed - ${e instanceof Error ? e.message : e}`);
    }
  }
}

main();
