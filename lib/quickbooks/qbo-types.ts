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

export type QboInvoice = {
  Id: string;
  SyncToken: string;
  DocNumber?: string;
  TxnDate?: string;
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

export type RemapInvoiceResult = RemapInvoiceMatch & {
  updated: boolean;
  error?: string;
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
  results: RemapInvoiceResult[];
};
