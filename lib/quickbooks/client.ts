import { getQuickbooksAppConfig } from '@/lib/quickbooks/config';
import { getValidAccessToken } from '@/lib/quickbooks/tokens';
import type { QboInvoice, QboItem, QboQueryResponse } from '@/lib/quickbooks/qbo-types';

function escapeQboQueryLiteral(value: string): string {
  return value.replace(/'/g, "\\'");
}

async function qboFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const config = getQuickbooksAppConfig();
  if (!config) {
    throw new Error('QuickBooks app is not configured.');
  }

  const { accessToken, realmId } = await getValidAccessToken();
  const url = `${config.apiBaseUrl}/v3/company/${encodeURIComponent(realmId)}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const json = (await res.json()) as T & {
    Fault?: {
      Error?: Array<{ Message?: string; Detail?: string }>;
    };
  };

  if (!res.ok) {
    const fault = json.Fault?.Error?.[0];
    throw new Error(
      fault?.Detail || fault?.Message || `QuickBooks API error (${res.status})`
    );
  }

  return json;
}

export async function qboQuery<T>(query: string): Promise<QboQueryResponse<T>> {
  const path = `/query?query=${encodeURIComponent(query)}&minorversion=75`;
  return qboFetch<QboQueryResponse<T>>(path);
}

export async function qboGetInvoice(invoiceId: string): Promise<QboInvoice> {
  const json = await qboFetch<{ Invoice: QboInvoice }>(
    `/invoice/${encodeURIComponent(invoiceId)}?minorversion=75`
  );
  return json.Invoice;
}

export async function qboUpdateInvoice(invoice: QboInvoice): Promise<QboInvoice> {
  const json = await qboFetch<{ Invoice: QboInvoice }>('/invoice?minorversion=75', {
    method: 'POST',
    body: JSON.stringify(invoice),
  });
  return json.Invoice;
}

export async function qboFindItemByName(name: string): Promise<QboItem | null> {
  const escaped = escapeQboQueryLiteral(name);
  const response = await qboQuery<QboItem>(
    `select * from Item where Name = '${escaped}' maxresults 1`
  );
  return response.QueryResponse?.Item?.[0] ?? null;
}

export async function qboCreateServiceItem(input: {
  name: string;
  incomeAccountRefValue: string;
  description?: string;
  unitPrice?: number;
}): Promise<QboItem> {
  const payload = {
    Name: input.name,
    Type: 'Service',
    IncomeAccountRef: { value: input.incomeAccountRefValue },
    Description: input.description ?? input.name,
    UnitPrice: input.unitPrice,
  };
  const json = await qboFetch<{ Item: QboItem }>('/item?minorversion=75', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return json.Item;
}

export async function qboListInvoicesPage(input: {
  startPosition: number;
  maxResults?: number;
}): Promise<QboInvoice[]> {
  const maxResults = input.maxResults ?? 100;
  const response = await qboQuery<QboInvoice>(
    `select * from Invoice startposition ${input.startPosition} maxresults ${maxResults}`
  );
  return response.QueryResponse?.Invoice ?? [];
}

function formatQboTimestamp(date: Date): string {
  // QBO query expects ISO-8601; strip milliseconds for broader compatibility.
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export async function qboListInvoicesUpdatedSince(input: {
  updatedSince: Date;
  startPosition: number;
  maxResults?: number;
}): Promise<QboInvoice[]> {
  const maxResults = input.maxResults ?? 100;
  const since = formatQboTimestamp(input.updatedSince);
  const response = await qboQuery<QboInvoice>(
    `select * from Invoice where MetaData.LastUpdatedTime > '${since}' startposition ${input.startPosition} maxresults ${maxResults}`
  );
  return response.QueryResponse?.Invoice ?? [];
}
