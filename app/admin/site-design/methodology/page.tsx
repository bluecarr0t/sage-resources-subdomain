import { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Calculator Methodology - Site Design | Sage Admin',
  description: 'Methodology and calculations for the Site Design RV park yield and economics calculator',
  robots: {
    index: false,
    follow: false,
  },
};

const tableBase =
  'min-w-full text-sm border-collapse rounded-lg overflow-hidden';
const thBase =
  'text-left font-semibold bg-gray-100 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 px-4 py-3 border-b border-gray-200 dark:border-gray-600';
const tdBase =
  'px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 text-gray-700 dark:text-gray-300';
const tdAlt = 'bg-gray-50/50 dark:bg-gray-800/30';

function Section({
  id,
  num,
  title,
  children,
}: {
  id: string;
  num: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 mt-10 first:mt-0 flex items-baseline gap-2">
        <span className="text-sage-600 dark:text-sage-400 font-mono text-sm tabular-nums">
          {num}.
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h3 className="text-base font-medium text-gray-800 dark:text-gray-200 mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

function FormulaBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-2 py-2 px-3 rounded-md bg-gray-100 dark:bg-gray-800 font-mono text-sm text-gray-800 dark:text-gray-200 overflow-x-auto">
      {children}
    </div>
  );
}

const TOC_ITEMS = [
  { id: 'purpose', num: 1, label: 'Purpose & Scope' },
  { id: 'constants', num: 2, label: 'Constants' },
  { id: 'inputs', num: 3, label: 'Input Parameters' },
  { id: 'calculations', num: 4, label: 'Core Calculations' },
  { id: 'autofill', num: 5, label: 'Auto-Fill Logic' },
  { id: 'overcapacity', num: 6, label: 'Over-Capacity Validation' },
  { id: 'assumptions', num: 7, label: 'Assumptions & Limitations' },
  { id: 'example', num: 8, label: 'Example' },
  { id: 'control', num: 9, label: 'Document Control' },
];

export default function SiteDesignMethodologyPage() {
  return (
    <main className="pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/admin/site-design"
          className="inline-flex items-center gap-1 text-sm text-sage-600 dark:text-sage-400 hover:underline mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Site Design
        </Link>

        <header className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Site Design Calculator — Methodology & Calculations
          </h1>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
            <span>Tool: Site Design (RV Park Yield & Economics)</span>
            <span>·</span>
            <span>Location: /admin/site-design</span>
            <span>·</span>
            <span>Version: March 2026</span>
          </div>
        </header>

        <Card className="mb-8 p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Contents
          </h2>
          <nav className="flex flex-wrap gap-x-4 gap-y-1">
            {TOC_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="text-sm text-sage-600 dark:text-sage-400 hover:underline"
              >
                {item.num}. {item.label}
              </a>
            ))}
          </nav>
        </Card>

        <article className="space-y-8">
          <Section id="purpose" num={1} title="Purpose & Scope">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              The Site Design calculator estimates site count, annual revenue, NOI,
              and estimated value for RV park development based on parcel
              characteristics and site-type configurations.
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-3">
              <strong className="text-gray-900 dark:text-gray-100">Intended uses:</strong>
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-700 dark:text-gray-300">
              <li>
                <strong>Internal use:</strong> Feasibility screening, site mix
                optimization, and client presentations
              </li>
              <li>
                <strong>External use:</strong> Sharing with clients, lenders, and
                partners as a transparent methodology
              </li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-3">
              This document describes all formulas, assumptions, and logic used in
              the calculator. Results are estimates only and should be validated
              with site-specific engineering and market analysis.
            </p>
          </Section>

          <Section id="constants" num={2} title="Constants">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className={tableBase}>
                <thead>
                  <tr>
                    <th className={thBase}>Constant</th>
                    <th className={thBase}>Value</th>
                    <th className={thBase}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={`${tdBase} font-mono`}>SQFT_PER_ACRE</td>
                    <td className={tdBase}>43,560</td>
                    <td className={tdBase}>
                      Square feet per acre (U.S. survey acre)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="inputs" num={3} title="Input Parameters">
            <SubSection title="3.1 Parcel & Road">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className={tableBase}>
                  <thead>
                    <tr>
                      <th className={thBase}>Parameter</th>
                      <th className={thBase}>Symbol</th>
                      <th className={thBase}>Description</th>
                      <th className={thBase}>Typical Range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Gross acreage', 'A_gross', 'Total parcel size in acres', '10–500'],
                      ['Usable %', 'u', 'Share of gross land usable for development', '60–85%'],
                      ['Road width', 'w_road', 'Typical road width in feet', '18–40 ft'],
                      ['Block efficiency', 'e', 'Fraction of pad area usable', '0.70–1.0'],
                    ].map((row, i) => (
                      <tr key={i} className={i % 2 === 1 ? tdAlt : ''}>
                        {row.map((cell, j) => (
                          <td key={j} className={tdBase}>
                            {j === 1 ? <code className="font-mono text-xs">{cell}</code> : cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SubSection>

            <SubSection title="3.2 Operating Assumptions">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className={tableBase}>
                  <thead>
                    <tr>
                      <th className={thBase}>Parameter</th>
                      <th className={thBase}>Symbol</th>
                      <th className={thBase}>Description</th>
                      <th className={thBase}>Typical Range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Operating nights', 'N', 'Nights per year the park operates', '180–365'],
                      ['Operating expense ratio', 'r_opex', 'Operating expenses as % of gross revenue', '40–60%'],
                      ['Cap rate', 'c', 'Capitalization rate for value estimate', '7–12%'],
                    ].map((row, i) => (
                      <tr key={i} className={i % 2 === 1 ? tdAlt : ''}>
                        {row.map((cell, j) => (
                          <td key={j} className={tdBase}>
                            {j === 1 ? <code className="font-mono text-xs">{cell}</code> : cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SubSection>

            <SubSection title="3.3 Site Types">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className={tableBase}>
                  <thead>
                    <tr>
                      <th className={thBase}>Parameter</th>
                      <th className={thBase}>Symbol</th>
                      <th className={thBase}>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Width', 'W', 'Pad width in feet'],
                      ['Depth', 'D', 'Pad depth in feet'],
                      ['ADR', 'P', 'Average daily rate ($)'],
                      ['Occupancy', 'o', 'Occupancy rate (0–100%)'],
                      ['Count', 'n', 'Number of sites'],
                      ['Dev cost', 'C_dev', 'Development cost per site ($)'],
                    ].map((row, i) => (
                      <tr key={i} className={i % 2 === 1 ? tdAlt : ''}>
                        {row.map((cell, j) => (
                          <td key={j} className={tdBase}>
                            {j === 1 ? <code className="font-mono text-xs">{cell}</code> : cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SubSection>
          </Section>

          <Section id="calculations" num={4} title="Core Calculations">
            <SubSection title="4.1 Land Allocation">
              <div className="space-y-2">
                <FormulaBlock>A_net = A_gross × (u / 100)</FormulaBlock>
                <FormulaBlock>S_net = A_net × 43,560</FormulaBlock>
                <FormulaBlock>
                  r_road = max(0.10, min(0.30, 0.12 + (w_road − 18) × 0.008))
                </FormulaBlock>
                <FormulaBlock>S_sites = S_net × (1 − r_road)</FormulaBlock>
              </div>
            </SubSection>

            <SubSection title="4.2 Per-Site-Type Metrics">
              <div className="space-y-2">
                <FormulaBlock>S_pad = W × D</FormulaBlock>
                <FormulaBlock>S_eff = S_pad / e</FormulaBlock>
                <FormulaBlock>n_max = floor(S_sites / S_eff)</FormulaBlock>
                <FormulaBlock>R_sqft = (P × (o/100) × N) / S_eff</FormulaBlock>
              </div>
            </SubSection>

            <SubSection title="4.3 Site Count & Revenue">
              <div className="space-y-2">
                <FormulaBlock>R_site = n × P × (o/100) × N</FormulaBlock>
                <FormulaBlock>R_annual = sum(R_site)</FormulaBlock>
                <FormulaBlock>R_acre = R_annual / A_net</FormulaBlock>
                <FormulaBlock>S_used = sum(n × S_eff)</FormulaBlock>
              </div>
            </SubSection>

            <SubSection title="4.4 Operating & Value Metrics">
              <div className="space-y-2">
                <FormulaBlock>E_opex = R_annual × (r_opex / 100)</FormulaBlock>
                <FormulaBlock>NOI = R_annual − E_opex</FormulaBlock>
                <FormulaBlock>NOI_acre = NOI / A_net</FormulaBlock>
                <FormulaBlock>C_total = sum(n × C_dev)</FormulaBlock>
                <FormulaBlock>V_est = NOI / (c / 100)</FormulaBlock>
              </div>
            </SubSection>
          </Section>

          <Section id="autofill" num={5} title="Auto-Fill Logic">
            <SubSection title="5.1 No Counts Entered (Full Auto-Fill)">
              <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                <li>Compute revenue per sq ft (R_sqft) for each site type</li>
                <li>Select the type with highest R_sqft</li>
                <li>Fill parcel with that type: n = n_max</li>
                <li>Revenue, NOI, and development cost use this allocation</li>
              </ul>
            </SubSection>

            <SubSection title="5.2 Partial Counts Entered">
              <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                <li>Compute land used by entered counts</li>
                <li>Calculate remaining land: S_remain = S_sites − S_used</li>
                <li>Select highest R_sqft among types without counts</li>
                <li>Auto-fill remaining land using n_auto = floor(S_remain / S_eff)</li>
              </ul>
            </SubSection>
          </Section>

          <Section id="overcapacity" num={6} title="Over-Capacity Validation">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              If S_used &gt; S_sites the calculator flags over-capacity.
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-700 dark:text-gray-300">
              <li>Over capacity (sq ft) = S_used − S_sites</li>
              <li>Over capacity (acres) = (S_used − S_sites) / 43,560</li>
            </ul>
          </Section>

          <Section id="assumptions" num={7} title="Assumptions & Limitations">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className={tableBase}>
                <thead>
                  <tr>
                    <th className={thBase}>Assumption</th>
                    <th className={thBase}>Implication</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Block efficiency is uniform', 'Actual layouts may vary'],
                    ['Road allocation based on width only', 'Terrain and layout can change share'],
                    ['ADR and occupancy static', 'Actual performance varies by season'],
                    ['Operating expense ratio flat', 'Scale effects not modeled'],
                    ['Cap rate user input', 'Market specific'],
                    ['No utilities or amenities modeled', 'Development cost per-site only'],
                    ['No phasing or financing', 'Single-phase development assumed'],
                  ].map((row, i) => (
                    <tr key={i} className={i % 2 === 1 ? tdAlt : ''}>
                      <td className={tdBase}>{row[0]}</td>
                      <td className={tdBase}>{row[1]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="example" num={8} title="Example (Standard Preset)">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              Inputs: 50 acres gross, 75% usable, 24 ft roads, 0.9 efficiency,
              365 nights, 45% opex, 9% cap rate
            </p>
            <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
              <li>A_net = 50 × 0.75 = 37.5 acres</li>
              <li>S_net = 37.5 × 43,560 = 1,633,500 sq ft</li>
              <li>Road share r_road = 16.8%</li>
              <li>S_sites = 1,359,180 sq ft</li>
              <li>
                Example site: 45 × 90 ft pull-thru → S_pad = 4,050 sq ft, S_eff
                = 4,500 sq ft, n_max = 302 sites
              </li>
              <li>Annual revenue ≈ $8,492,710</li>
              <li>NOI ≈ $4,670,991</li>
              <li>Estimated value ≈ $51,899,900</li>
            </ul>
          </Section>

          <Section id="control" num={9} title="Document Control">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className={tableBase}>
                <thead>
                  <tr>
                    <th className={thBase}>Version</th>
                    <th className={thBase}>Date</th>
                    <th className={thBase}>Author</th>
                    <th className={thBase}>Changes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={tdBase}>1.0</td>
                    <td className={tdBase}>March 2026</td>
                    <td className={tdBase}>Sage Outdoor Advisory</td>
                    <td className={tdBase}>Initial methodology document</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          <p className="text-sm text-gray-600 dark:text-gray-400 mt-10 pt-6 border-t border-gray-200 dark:border-gray-700">
            This document may be shared internally and externally. For questions
            or updates, contact the Sage Outdoor Advisory team.
          </p>
        </article>
      </div>
    </main>
  );
}
