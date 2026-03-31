'use client';

import type { Dispatch, SetStateAction } from 'react';
import { Button, Card } from '@/components/ui';
import MultiSelect from '@/components/MultiSelect';
import CompsV2AddressPlaceInput from '@/components/CompsV2AddressPlaceInput';
import type { ParsedPlaceComponents } from '@/components/CompsV2AddressPlaceInput';
import CompsV2DiscoveryMapColumn from '@/components/CompsV2DiscoveryMapColumn';
import CompsV2DiscoveryProgress from '@/components/CompsV2DiscoveryProgress';
import type { CompsV2PropertyKind } from '@/lib/comps-v2/types';
import { COMPS_V2_PROPERTY_KINDS, QUALITY_TIERS, type QualityTier } from '@/lib/comps-v2/types';
import type { DataSourceKey } from '@/app/admin/comps-v2/comps-v2-page-constants';

type TCompsV2 = (key: string, values?: Record<string, string | number>) => string;

interface CompsV2DiscoverySectionProps {
  t: TCompsV2;
  locationLine: string;
  onLocationLineChange: (value: string) => void;
  onPlaceParsed?: (p: ParsedPlaceComponents) => void;
  placeMapAnchor: { lat: number; lng: number } | null;
  radiusMiles: number;
  setRadiusMiles: (n: number) => void;
  dataSources: Set<DataSourceKey>;
  setDataSources: Dispatch<SetStateAction<Set<DataSourceKey>>>;
  dataSourceOptions: { value: DataSourceKey; label: string }[];
  glampingStrictOnly: boolean;
  kinds: Set<CompsV2PropertyKind>;
  toggleKind: (k: CompsV2PropertyKind) => void;
  kindLabels: Record<CompsV2PropertyKind, string>;
  tiers: Set<QualityTier>;
  toggleTier: (q: QualityTier) => void;
  tierLabels: Record<QualityTier, string>;
  loading: boolean;
  runDiscovery: () => void;
  discoveryRunId: number;
  discoveryServerComplete: boolean;
  discoveryStreamStepIndex: number;
  discoveryStreamWarnings: string[];
  discoveryLiveWebDiag: import('@/lib/comps-v2/web-research-diagnostics').WebResearchDiagnostics | null;
  discoveryStreamMarketCounts: Record<string, number> | null;
  discoveryStreamSourceTimingsMs: Record<string, number> | null;
  discoveryCancelled: boolean;
  firecrawlTopN: number;
  tavilyMaxQueries: number;
  tavilyResultsPerQuery: number;
  onDiscoveryUiFinished: () => void;
}

export default function CompsV2DiscoverySection({
  t,
  locationLine,
  onLocationLineChange,
  onPlaceParsed,
  placeMapAnchor,
  radiusMiles,
  setRadiusMiles,
  dataSources,
  setDataSources,
  dataSourceOptions,
  glampingStrictOnly,
  kinds,
  toggleKind,
  kindLabels,
  tiers,
  toggleTier,
  tierLabels,
  loading,
  runDiscovery,
  discoveryRunId,
  discoveryServerComplete,
  discoveryStreamStepIndex,
  discoveryStreamWarnings,
  discoveryLiveWebDiag,
  discoveryStreamMarketCounts,
  discoveryStreamSourceTimingsMs,
  discoveryCancelled,
  firecrawlTopN,
  tavilyMaxQueries,
  tavilyResultsPerQuery,
  onDiscoveryUiFinished,
}: CompsV2DiscoverySectionProps) {
  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
        <div className="space-y-4 min-w-0">
          <CompsV2AddressPlaceInput
            label={t('locationLine')}
            value={locationLine}
            onChange={onLocationLineChange}
            onPlaceParsed={onPlaceParsed}
            placeholder={t('locationLinePlaceholder')}
            loadingHint={t('addressAutocompleteLoading')}
            noApiKeyHint={t('addressNoApiKeyHint')}
            loadErrorHint={t('previewMapLoadError')}
            suggestionsHint={t('addressSuggestionsHint')}
          />
          <div className="max-w-sm">
            <MultiSelect
              id="comps-v2-data-sources"
              label={t('sources')}
              options={dataSourceOptions}
              selectedValues={[...dataSources]}
              onToggle={(v) => {
                const key = v as DataSourceKey;
                setDataSources((prev) => {
                  const n = new Set(prev);
                  if (n.has(key)) n.delete(key);
                  else n.add(key);
                  return n;
                });
              }}
              onClear={() => setDataSources(new Set())}
              placeholder={t('sourcesPlaceholder')}
              allSelectedText={t('sourcesAllSelected')}
              activeColor="sage"
            />
            {glampingStrictOnly ? (
              <p className="mt-1.5 m-0 text-xs text-gray-500 dark:text-gray-400 leading-snug">
                {t('sourcesGlampingStrictFootnote')}
              </p>
            ) : null}
          </div>

          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">{t('propertyKinds')}</p>
            <div className="flex flex-wrap gap-3">
              {COMPS_V2_PROPERTY_KINDS.map((k) => (
                <label key={k} className="flex items-center gap-2.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={kinds.has(k)}
                    onChange={() => toggleKind(k)}
                    className="h-5 w-5 shrink-0 rounded border-gray-300 accent-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer dark:border-gray-600"
                  />
                  {kindLabels[k]}
                </label>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">{t('qualityTiers')}</p>
            <div className="flex flex-wrap gap-3">
              {QUALITY_TIERS.map((q) => (
                <label key={q} className="flex items-center gap-2.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tiers.has(q)}
                    onChange={() => toggleTier(q)}
                    className="h-5 w-5 shrink-0 rounded border-gray-300 accent-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer dark:border-gray-600"
                  />
                  {tierLabels[q]}
                </label>
              ))}
            </div>
          </div>

          <div className="pt-4 space-y-4">
            <Button type="button" onClick={runDiscovery} disabled={loading}>
              {loading ? t('running') : t('runDiscovery')}
            </Button>

            {loading ? (
              <CompsV2DiscoveryProgress
                runId={discoveryRunId}
                serverComplete={discoveryServerComplete}
                webSearchEnabled={dataSources.has('web_search')}
                streamDriven
                streamActiveStepIndex={discoveryStreamStepIndex}
                streamWarnings={discoveryStreamWarnings}
                streamWebDiagnostics={discoveryLiveWebDiag}
                streamMarketCounts={discoveryStreamMarketCounts}
                streamSourceTimingsMs={discoveryStreamSourceTimingsMs}
                streamCancelled={discoveryCancelled}
                firecrawlTopN={dataSources.has('web_search') ? firecrawlTopN : undefined}
                tavilyMaxQueries={dataSources.has('web_search') ? tavilyMaxQueries : undefined}
                tavilyResultsPerQuery={dataSources.has('web_search') ? tavilyResultsPerQuery : undefined}
                onComplete={onDiscoveryUiFinished}
              />
            ) : null}
          </div>
        </div>

        <div className="min-w-0 lg:border-l lg:border-gray-200 dark:lg:border-gray-700 lg:pl-8">
          <CompsV2DiscoveryMapColumn
            locationLine={locationLine}
            placeAnchor={placeMapAnchor}
            radiusMiles={radiusMiles}
            onRadiusChange={setRadiusMiles}
          />
        </div>
      </div>
    </Card>
  );
}
