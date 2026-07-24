export {
  QBO_REMAP_DOC_NUMBER_PREFIX,
  QBO_SOURCE_ITEM_NAME,
  QBO_TARGET_ITEM_NAME,
  QBO_APPRAISAL_DESCRIPTION_TARGET_ITEM_NAME,
  QBO_APPRAISAL_DESCRIPTION_MATCH,
} from '@/lib/quickbooks/constants';
export {
  QBO_REMAP_RULES,
  uniqueRemapTargetItemNames,
} from '@/lib/quickbooks/remap-rules';
export type { RemapRuleDefinition, RemapRuleId } from '@/lib/quickbooks/remap-rules';
export {
  getQuickbooksAppConfig,
  isQuickbooksAppConfigured,
  getQuickbooksEnvironment,
} from '@/lib/quickbooks/config';
export {
  loadQuickbooksConnection,
  getValidAccessToken,
  exchangeAuthorizationCode,
} from '@/lib/quickbooks/tokens';
export {
  ensureTargetItem,
  ensureRemapTargetItems,
  remapMatchingInvoices,
  remapInvoiceById,
} from '@/lib/quickbooks/remap-invoices';
export {
  listRemapHistory,
  recordRemapHistoryEntries,
  resolveRemapHistoryAction,
} from '@/lib/quickbooks/history';
export type {
  QuickbooksRemapHistoryRow,
  QuickbooksRemapHistoryAction,
  QuickbooksRemapHistorySource,
} from '@/lib/quickbooks/history';
export {
  invoiceMatchesRemapCriteria,
  lineMatchesSourceItem,
  lineMatchesRemapRule,
  findMatchingRuleForLine,
  invoiceDocNumberMatchesPrefix,
  invoiceIsVoided,
  invoiceSalesLinesAreAllZero,
  getInvoiceRemapSkipReason,
  remapInvoiceLines,
  sanitizeInvoiceLinesForUpdate,
  cloneTxnTaxDetailForUpdate,
  buildInvoiceRemapUpdatePayload,
  txnTaxDetailChanged,
  totalsDiffer,
} from '@/lib/quickbooks/invoice-match';
export {
  verifyQuickbooksWebhookSignature,
  collectInvoiceIdsFromWebhookPayload,
} from '@/lib/quickbooks/webhooks';
