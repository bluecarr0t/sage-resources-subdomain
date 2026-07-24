export {
  getGhlConfig,
  ghlFetch,
  GhlApiError,
  GHL_API_BASE_URL,
  GHL_API_VERSION,
} from '@/lib/ghl/client';
export {
  GHL_JOB_NUMBER_CUSTOM_FIELD_KEY,
  GHL_REPORT_SENT_TO_CLIENT_STAGE_NAME,
  findOpportunitiesByJobNumber,
  findStageIdByName,
  getOpportunityJobNumber,
  moveOpportunityToReportSentToClient,
  normalizeGhlOpportunityFieldKey,
  opportunityMatchesJobNumber,
  resolveReportSentToClientStageId,
  updateOpportunityStage,
} from '@/lib/ghl/opportunities';
export {
  didSentToClientFlipToYes,
  syncGhlOpportunityOnSentToClient,
  syncGhlOpportunityOnSentToClientAsync,
} from '@/lib/ghl/sync-sent-to-client';
