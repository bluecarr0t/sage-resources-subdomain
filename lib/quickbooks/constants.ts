/** Invoice DocNumber must start with this prefix to be eligible for remapping. */
export const QBO_REMAP_DOC_NUMBER_PREFIX = 'INV-';

/** Source product/service name assigned by GHL → QBO sync. */
export const QBO_SOURCE_ITEM_NAME = 'Appraisal Review';

/** Target product/service name for matched invoice lines. */
export const QBO_TARGET_ITEM_NAME = 'Feasibility Study - Outdoor Report';

export const QBO_OAUTH_SCOPES = 'com.intuit.quickbooks.accounting';

export const QBO_OAUTH_AUTHORIZE_URL = 'https://appcenter.intuit.com/connect/oauth2';
export const QBO_OAUTH_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

export const QBO_API_BASE_PRODUCTION = 'https://quickbooks.api.intuit.com';
export const QBO_API_BASE_SANDBOX = 'https://sandbox-quickbooks.api.intuit.com';

/** Customer-facing QBO UI host for opening an invoice by txn id. */
export function quickbooksInvoiceUiUrl(
  environment: 'production' | 'sandbox',
  invoiceId: string
): string {
  const host =
    environment === 'sandbox'
      ? 'https://app.sandbox.qbo.intuit.com'
      : 'https://app.qbo.intuit.com';
  return `${host}/app/invoice?txnId=${encodeURIComponent(invoiceId)}`;
}
