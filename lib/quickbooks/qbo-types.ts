export type QboRef = {
  value: string;
  name?: string;
};

export type QboSalesItemLineDetail = {
  ItemRef?: QboRef;
  Qty?: number;
  UnitPrice?: number;
  TaxCodeRef?: QboRef;
  [key: string]: unknown;
};

export type QboInvoiceLine = {
  Id?: string;
  LineNum?: number;
  Description?: string;
  Amount?: number;
  DetailType?: string;
  SalesItemLineDetail?: QboSalesItemLineDetail;
  [key: string]: unknown;
};

export type QboTaxLineDetail = {
  TaxRateRef?: QboRef;
  PercentBased?: boolean;
  TaxPercent?: number;
  NetAmountTaxable?: number;
  [key: string]: unknown;
};

export type QboTaxLine = {
  Amount?: number;
  DetailType?: string;
  TaxLineDetail?: QboTaxLineDetail;
  [key: string]: unknown;
};

export type QboTxnTaxDetail = {
  TxnTaxCodeRef?: QboRef;
  TotalTax?: number;
  TaxLine?: QboTaxLine[];
  [key: string]: unknown;
};

export type QboInvoice = {
  Id: string;
  SyncToken: string;
  DocNumber?: string;
  TxnDate?: string;
  TotalAmt?: number;
  Balance?: number;
  PrivateNote?: string;
  TxnTaxDetail?: QboTxnTaxDetail;
  sparse?: boolean;
  Line?: QboInvoiceLine[];
  CustomerRef?: QboRef;
  [key: string]: unknown;
};

export type QboItem = {
  Id: string;
  SyncToken: string;
  Name: string;
  Type?: string;
  Active?: boolean;
  IncomeAccountRef?: QboRef;
  Description?: string;
  UnitPrice?: number;
  sparse?: boolean;
  [key: string]: unknown;
};

export type QboQueryResponse<T> = {
  QueryResponse?: {
    Invoice?: T[];
    Item?: T[];
    startPosition?: number;
    maxResults?: number;
    totalCount?: number;
  };
  Fault?: {
    Error?: Array<{ Message?: string; Detail?: string; code?: string }>;
  };
};

export type RemapInvoiceMatch = {
  invoiceId: string;
  docNumber: string;
  syncToken: string;
  txnDate: string | null;
  matchedLineIds: string[];
  matchedDescriptions: string[];
};

export type RemapInvoiceAppliedRule = {
  ruleId: string;
  targetItemName: string;
  lineIds: string[];
};

export type RemapInvoiceResult = RemapInvoiceMatch & {
  updated: boolean;
  error?: string;
  appliedRules?: RemapInvoiceAppliedRule[];
};

export type RemapInvoicesSummary = {
  dryRun: boolean;
  scanned: number;
  matched: number;
  updated: number;
  skipped: number;
  errors: number;
  targetItemId: string;
  targetItemName: string;
  targetItems?: Array<{ id: string; name: string }>;
  results: RemapInvoiceResult[];
};
