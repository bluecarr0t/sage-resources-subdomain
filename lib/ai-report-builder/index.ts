/**
 * AI Report Builder - Create Report Draft
 */

export * from './types';
export { enrichReportInput } from './enrich';
export { deriveDevelopmentCosts } from './development-costs';
export { unitMixToCostConfigs } from './unit-mix-to-cost-config';
export {
  generateExecutiveSummary,
  generateLetterOfTransmittal,
  generateSWOTAnalysis,
  generateSiteAnalysis,
  generateDemandIndicators,
} from './generate';
export {
  generateAreaAnalysis,
  generateSupplyCompetition,
  generateIndustryOverview,
} from './sections/area-supply-industry';
export { assembleDraftDocx } from './assemble-docx';
export type {
  AssembleDocxDiagnostics,
  AssembleDraftDocxResult,
  SectionHitStatus,
} from './assemble-docx';
export {
  buildIdentityReplacements,
  replacePlainTextInDocument,
  findRemainingSampleFingerprints,
  stripAuthorHighlightXml,
} from './assemble-docx-identity';
export { getTemplateKeyForMarketType } from './template-key';
export { assembleDraftXlsx } from './assemble-xlsx';
export { applyXlsxDriverMap } from './xlsx-driver-maps';
export { factCheckExecutiveSummary } from './fact-check';
export { normalizeTerminology } from './terminology';
export { fetchPastReportComps } from './fetch-past-report-comps';
export {
  parseEngagementLetterPdf,
  heuristicExtractEngagementLetter,
  type EngagementLetterExtract,
} from './parse-engagement-letter';
export { parseEngagementLetterText } from './engagement-letter-fields';
export { parseStdbUpload, applyStdbToWorkbook } from './stdb-import';
export { runReportQaGates } from './qa-gates';
export { executeGenerateDraft } from './execute-generate-draft';
export { assertXlsxMatchesModel, assertXlsxBufferMatchesModel } from './xlsx-model-assert';
export {
  buildAssumptionEvidence,
  markAssumptionsReviewed,
  patchUnitAssumption,
} from './assumption-helpers';
export type { AssumptionEvidence } from './assumption-helpers';
export { extractSeasonalRates, attachSubjectDistanceToWebComps, gapFillComparableDetails } from './tavily-comp-research';
export {
  selectProposedComparables,
  buildComparablesKeyFindings,
  buildComparablesSectionPlainText,
  COMPARABLES_SECTION_MAX,
} from './comparables-section';
export { consumeDraftProgressNdjson } from './draft-ndjson-client';
export type { DraftProgressEvent, DraftProgressPhase } from './draft-progress-events';
export {
  buildStaticMapUrl,
  buildStateAreaMapUrl,
  buildLocalAreaMapUrl,
  buildProximityStaticMapUrl,
  buildParksProximityMapUrl,
  fetchStaticMapImage,
  fetchAreaMapImage,
  fetchParksProximityMapImage,
  renderOsmStaticMap,
  latLngToTileXY,
  fetchWeatherSparkImages,
  prioritizeWeatherSparkChartUrls,
  formatParksVisitationForPrompt,
} from './figures';
export type { AreaMapKind, FetchedImageBuffer, ProximityMapMarker } from './figures';
export {
  captureWeatherSparkChartImages,
  orderCharts,
  selectChartsForEmbed,
} from './weatherspark-charts';
export type {
  WeatherSparkChartImage,
  WeatherSparkChartKey,
} from './weatherspark-charts';
export {
  TOURISM_FIGURE_SLOTS,
  buildTourismAuthorChecklistMarkdown,
  buildTourismAnalystTasks,
  buildTourismSlotPlaceholderTexts,
  resolveStateTourismSourceHints,
  findTnTourismFingerprintsInText,
  TN_TOURISM_FINGERPRINTS,
} from './tourism-author-checklist';
export type {
  TourismFigureSlot,
  TourismFigureSlotId,
  TourismAuthorChecklistInput,
  StateTourismSourceHints,
} from './tourism-author-checklist';
export {
  parseAreaAnalysisSections,
  parseLabeledSections,
  formatAreaAnalysisSections,
} from './area-analysis-sections';
export {
  formatDriveTimeFromMiles,
  selectNationalParkRows,
  selectStateParkRows,
  buildCombinedNpsTableRows,
} from './park-visitation';
export {
  buildScopeOfWorkContent,
  buildClientProvidedItems,
  buildScopeOfWorkSteps,
} from './scope-of-work';
export {
  buildExecutiveSummaryContent,
  executiveSummaryContentToLabeledText,
} from './executive-summary';
export type { ExecSummaryLine, ExecutiveSummaryContent } from './executive-summary';
export {
  buildLetterOfTransmittalText,
  buildLetterOfTransmittalContent,
  buildCertificationContent,
  formatReportDate,
  buildCostAssumptionBullet,
  formatLotIrrLabel,
  amenitiesPhrase,
} from './front-matter';
export {
  resolveClientSalutation,
  inferGenderFromFirstName,
} from './salutation';
export {
  retargetLinkedExcelWorkbook,
  annotateLinkedExcelTables,
} from './assemble-docx-excel-links';
export {
  assertReportLlmConfigured,
  chatCompletion,
  isReportClaudeEnabled,
  resolveReportLlmModel,
  resolveReportLlmFallbackModel,
  hasGatewayAuth,
  DEFAULT_CLAUDE_MODEL,
} from './llm-provider';
export {
  SAGE_STYLE_SYSTEM_PROMPT,
  SAGE_STYLE_SYSTEM_PROMPT_VERSION,
  buildSageJsonSystemPrompt,
} from './sage-style-system-prompt';
export { retrieveStyleExemplars, retrieveSimilarSummaries } from './rag-retrieve';
export {
  redactStyleCorpusText,
  hasForeignGeographyFingerprint,
} from './style-corpus-redact';
export {
  enqueueStyleCorpusExtractForReport,
  upsertStyleCorpusFromDocxBuffer,
} from './style-corpus-ingest';
export {
  findUnsourcedNumericClaims,
  scoreStyleRubric,
  extractNumericClaims,
} from './eval-number-fidelity';
export { generateShadowDraftBundle, uploadShadowDraftBundle } from './shadow-draft';
