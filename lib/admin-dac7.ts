// Client half of platform tax reporting. Every call goes through
// /api/admin/dac7, which checks the caller's Privy token and the `tax.report`
// permission before reading anything with the service-role key.

import type { TaxRegime, TaxStatus } from "@/lib/tax";

export type ReportScope = TaxRegime | 'all';
export type SellerReportStatus = 'reportable' | 'excluded' | 'missing_details' | 'rate_needed' | 'not_in_scope';

export type TaxReportRow = {
  sellerId: string;
  deleted: boolean;
  name: string;
  handle: string | null;
  country: string | null;
  regime: TaxRegime;
  status: SellerReportStatus;
  taxStatus: TaxStatus | null;
  sales: number;
  netCents: number;
  feeCents: number;
  netEur: number | null;
  quarters: { sales: number; netCents: number }[];
};

export type TaxReport = {
  available: boolean;
  fix?: string;
  year: number;
  scope: ReportScope;
  eurPerUsd: number | null;
  rows: TaxReportRow[];
  totals: {
    sellers: number;
    reportable: number;
    excluded: number;
    missingDetails: number;
    rateNeeded: number;
    netCents: number;
  } | null;
};

export type AdminTaxProfile = {
  seller_id: string;
  handle: string | null;
  entity_type: 'individual' | 'entity';
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  birth_city: string | null;
  birth_country: string | null;
  legal_name: string | null;
  business_reg_number: string | null;
  permanent_establishments: string[];
  address_line1: string;
  address_line2: string | null;
  city: string;
  region: string | null;
  postal_code: string | null;
  country: string;
  tin: string | null;
  tin_country: string | null;
  no_tin: boolean;
  vat_number: string | null;
  status: TaxStatus;
  review_note: string | null;
  reviewed_at: string | null;
  updated_at: string;
  created_at: string;
};

export type VatCheck = { valid: boolean | null; name?: string; address?: string; error?: string };

const ENDPOINT = "/api/admin/dac7";

async function call(token: string | null, method: string, body?: any, query = ""): Promise<{ data?: any; error?: string }> {
  if (!token) return { error: "Your admin session has expired — sign in again" };
  try {
    const res = await fetch(ENDPOINT + query, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) return { error: payload?.error ?? `Request failed (${res.status})` };
    return { data: payload };
  } catch {
    return { error: "Could not reach the server" };
  }
}

const reportQuery = (year: number, scope: ReportScope, eurPerUsd: number | null) => {
  const p = new URLSearchParams({ view: 'report', year: String(year), scope });
  if (eurPerUsd) p.set('eurPerUsd', String(eurPerUsd));
  return p;
};

export async function getTaxReport(token: string | null, year: number, scope: ReportScope, eurPerUsd: number | null): Promise<{ report?: TaxReport; error?: string }> {
  const { data, error } = await call(token, 'GET', undefined, '?' + reportQuery(year, scope, eurPerUsd));
  return error ? { error } : { report: data as TaxReport };
}

export async function listTaxProfiles(token: string | null, status: TaxStatus | 'all'): Promise<{ profiles: AdminTaxProfile[]; available: boolean; error?: string }> {
  const { data, error } = await call(token, 'GET', undefined, `?view=profiles&status=${status}`);
  if (error) return { profiles: [], available: true, error };
  return { profiles: data?.profiles ?? [], available: data?.available !== false };
}

export async function reviewTaxProfile(token: string | null, sellerId: string, action: 'verify' | 'reject', note: string, actorLabel?: string | null): Promise<{ profile?: AdminTaxProfile; error?: string }> {
  const { data, error } = await call(token, 'PATCH', { sellerId, action, note, actorLabel });
  return error ? { error } : { profile: data?.profile };
}

export async function checkSellerVat(token: string | null, sellerId: string): Promise<{ vat?: VatCheck; error?: string }> {
  const { data, error } = await call(token, 'PATCH', { sellerId, action: 'check_vat' });
  return error ? { error } : { vat: data?.vat };
}

// The CSV holds every reportable seller's tax ID and bank details, so it is
// fetched with the token and handed to the browser as a blob — never a plain
// link that could be opened, cached or shared without one.
export async function downloadTaxReport(token: string | null, year: number, scope: ReportScope, eurPerUsd: number | null, actorLabel?: string | null): Promise<{ error?: string }> {
  if (!token) return { error: "Your admin session has expired — sign in again" };
  const p = reportQuery(year, scope, eurPerUsd);
  p.set('format', 'csv');
  if (actorLabel) p.set('actorLabel', actorLabel);
  try {
    const res = await fetch(`${ENDPOINT}?${p}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      return { error: payload?.error ?? `Export failed (${res.status})` };
    }
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = `honua-${scope}-${year}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return {};
  } catch {
    return { error: "Could not reach the server" };
  }
}
