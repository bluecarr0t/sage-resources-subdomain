'use client';

import { GoogleMapsProvider } from '@/components/GoogleMapsProvider';
import CompsV2DeepEnrichSection from '@/app/admin/comps-v2/CompsV2DeepEnrichSection';
import CompsV2DiscoverySection from '@/app/admin/comps-v2/CompsV2DiscoverySection';
import CompsV2PageAlerts from '@/app/admin/comps-v2/CompsV2PageAlerts';
import CompsV2ResultsSection from '@/app/admin/comps-v2/CompsV2ResultsSection';
import CompsV2SummarySection from '@/app/admin/comps-v2/CompsV2SummarySection';
import { useCompsV2PageState } from '@/app/admin/comps-v2/useCompsV2PageState';

export default function CompsV2Page() {
  return (
    <GoogleMapsProvider>
      <CompsV2PageContent />
    </GoogleMapsProvider>
  );
}

function CompsV2PageContent() {
  const s = useCompsV2PageState();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{s.t('title')}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{s.t('subtitle')}</p>
      </div>

      <CompsV2PageAlerts
        t={s.t}
        error={s.error}
        loading={s.loading}
        discoveryEarlyTavilyErrors={s.discoveryEarlyTavilyErrors}
        webResearch={s.webResearch}
        webResearchFirecrawlTopNUsed={s.webResearchFirecrawlTopNUsed}
      />

      <CompsV2DiscoverySection
        t={s.t}
        locationLine={s.locationLine}
        onLocationLineChange={s.onLocationLineChange}
        onPlaceParsed={s.onPlaceParsed}
        placeMapAnchor={s.placeMapAnchor}
        radiusMiles={s.radiusMiles}
        setRadiusMiles={s.setRadiusMiles}
        dataSources={s.dataSources}
        setDataSources={s.setDataSources}
        dataSourceOptions={s.dataSourceOptions}
        glampingStrictOnly={s.glampingStrictOnly}
        kinds={s.kinds}
        toggleKind={s.toggleKind}
        kindLabels={s.kindLabels}
        tiers={s.tiers}
        toggleTier={s.toggleTier}
        tierLabels={s.tierLabels}
        loading={s.loading}
        runDiscovery={() => void s.runDiscovery()}
        discoveryRunId={s.discoveryRunId}
        discoveryServerComplete={s.discoveryServerComplete}
        discoveryStreamStepIndex={s.discoveryStreamStepIndex}
        discoveryStreamWarnings={s.discoveryStreamWarnings}
        discoveryLiveWebDiag={s.discoveryLiveWebDiag}
        discoveryStreamMarketCounts={s.discoveryStreamMarketCounts}
        discoveryStreamSourceTimingsMs={s.discoveryStreamSourceTimingsMs}
        discoveryCancelled={s.discoveryCancelled}
        firecrawlTopN={s.firecrawlTopN}
        tavilyMaxQueries={s.tavilyMaxQueries}
        tavilyResultsPerQuery={s.tavilyResultsPerQuery}
        onDiscoveryUiFinished={s.onDiscoveryUiFinished}
      />

      <CompsV2SummarySection
        t={s.t}
        sourceLabel={s.sourceLabel}
        counts={s.counts}
        summaryStats={s.summaryStats}
        summaryCurrency={s.summaryCurrency}
        compositionRawRowsTotal={s.compositionRawRowsTotal}
        webResearch={s.webResearch}
        webResearchFirecrawlTopNUsed={s.webResearchFirecrawlTopNUsed}
        searchContext={s.searchContext}
        discoveryCorrelationId={s.discoveryCorrelationId}
        discoverySourceTimingsMs={s.discoverySourceTimingsMs}
        tierLabels={s.tierLabels}
        downloadXlsx={s.downloadXlsx}
        downloadCsv={s.downloadCsv}
        sortedFilteredCandidates={s.sortedFilteredCandidates}
        gapFillLoading={s.gapFillLoading}
        runGapFillOnly={() => void s.runGapFillOnly()}
        kinds={s.kinds}
      />

      <CompsV2ResultsSection
        t={s.t}
        sourceLabel={s.sourceLabel}
        candidates={s.candidates}
        filteredCandidates={s.filteredCandidates}
        sortedFilteredCandidates={s.sortedFilteredCandidates}
        resultsSearch={s.resultsSearch}
        setResultsSearch={s.setResultsSearch}
        filterSourceTables={s.filterSourceTables}
        setFilterSourceTables={s.setFilterSourceTables}
        dataSourceFilterOptions={s.dataSourceFilterOptions}
        filterTiers={s.filterTiers}
        setFilterTiers={s.setFilterTiers}
        tierFilterOptions={s.tierFilterOptions}
        resultsViewMode={s.resultsViewMode}
        setResultsViewMode={s.setResultsViewMode}
        resultsSort={s.resultsSort}
        onResultsSortHeaderClick={s.onResultsSortHeaderClick}
        geocode={s.geocode}
        locationLine={s.locationLine}
        selected={s.selected}
        toggleSelect={s.toggleSelect}
        tierLabels={s.tierLabels}
        summaryCurrency={s.summaryCurrency}
      />

      <CompsV2DeepEnrichSection
        t={s.t}
        selectedSize={s.selected.size}
        deepLoading={s.deepLoading}
        deepCancelling={s.deepCancelling}
        runDeep={() => void s.runDeep()}
        cancelDeepEnrich={s.cancelDeepEnrich}
        deepRunId={s.deepRunId}
        deepServerComplete={s.deepServerComplete}
        onDeepEnrichUiFinished={s.onDeepEnrichUiFinished}
        deepResults={s.deepResults}
        deepExportCandidatesLength={s.deepExportCandidates.length}
        downloadDeepXlsx={s.downloadDeepXlsx}
        downloadDeepCsv={s.downloadDeepCsv}
      />
    </div>
  );
}
